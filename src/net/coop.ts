import { faintGuard } from '../core/gameTypes';
import * as THREE from 'three';
import { applySnapshot, snapshot } from '../core/save';
import { newGameData, useGame, type GameState } from '../core/store';
import { Walker } from '../agents/walker';
import { costumeById } from '../data/costumes';
import { SLEEP_FROM, type DayStats } from '../core/gameTypes';
import { answerAskById, applyRemoteAsk, clearAsk, sharedAsk, type SharedAsk } from '../core/counterAsk';
import { cleanActionArgs } from './actionArgs';
import { idToken } from './firebase';
import { apiUrl, wsUrl } from './serverUrl';
import { useSession, type AlleyPeer } from './session';

/**
 * Hẻm online 2–4 người (xem server/index.ts). Mọi thành viên quyền như nhau:
 *  - "Máy chạy" (người online đầu tiên) chạy mô phỏng, 5 lần/giây gửi toàn bộ trạng thái tiệm + vị trí
 *    khách/nhân viên cho người khác, và ghi tiến trình về server (mỗi 30 giây, sang ngày, khi rời tab).
 *  - Người khác không chạy mô phỏng: mọi thao tác (hàm trong store) và mọi chỉnh trực tiếp trạng thái tiệm
 *    được gửi cho máy chạy làm thay, nên kết quả luôn khớp nhau.
 *  - Máy chạy rời đi: server giao quyền cho người kế tiếp, người đó chạy tiếp từ trạng thái vừa nhận.
 */

/** Trạng thái riêng từng máy (giao diện, chỗ đứng, trang phục của mỗi người), không đồng bộ. */
const LOCAL_STATE = new Set<string>(['hint', 'message', 'panel', 'buildMode', 'placing', 'stylePreview', 'costume']);
/** Trường đồng bộ qua sharedState nhưng không gửi PATCH ngược lại (chỉ runner tự cập nhật). */
export const NO_PATCH = new Set<string>(['location', 'atBranch']);
/** Hàm chạy tại chỗ: giao diện, hoặc chỉ đọc. (Xuất ra cho test phủ kín phân loại thao tác.) */
export const LOCAL_ACTIONS = new Set<string>(['notify', 'openPanel', 'closePanel', 'setBuildMode', 'setPlacing', 'priceOf', 'tick', 'takeFromShelf', 'setCostume']);
/** Thao tác cố ý lặp nhanh (giữ phím lau nhà): không gộp lần bấm trùng — máy khách phải lau nhanh như chơi đơn. */
export const REPEATABLE = new Set<string>(['addDirt']);
/** Giá trị trả về tạm của thao tác gửi đi, cho giao diện đọc kết quả dạng danh sách. */
const PROXY_RESULT: Record<string, unknown> = { replaceEmptySlots: [] };
/** Chỉnh thẳng trạng thái (không qua hàm), ví dụ bật/tắt tuỳ chọn. */
const PATCH = '__patch';
/** Máy khách trả lời câu hỏi ở quầy (mặc cả/ghi sổ/tiền lẻ): args = [mã câu hỏi, phương án]. */
export const ANSWER_ASK = '__answerAsk';
/** Người đang nằm giường chờ cả hẻm ngủ thì đứng dậy: rút phiếu ngủ. */
export const CANCEL_SLEEP = '__cancelSleep';

/**
 * Thao tác sửa đúng một chỗ (ô kệ, món đồ, giá một món). Người khác vừa sửa chỗ đó trong GUARD_MS thì
 * từ chối, để hai người không đè lên nhau mà không biết. Trả về khoá của chỗ bị sửa.
 * (Xuất ra cho test phủ kín: mọi thao tác của store phải nằm trong bảng này hoặc là thuần cục bộ.)
 */
export const GUARDED: Record<string, (args: unknown[]) => string> = {
  stockTier: (a) => `tier:${a[0]}:${a[1]}`,
  unstockTier: (a) => `tier:${a[0]}:${a[1]}`,
  moveFurniture: (a) => `furn:${a[0]}`,
  moveMainCounter: () => 'counter',
  sellFurniture: (a) => `furn:${a[0]}`,
  repairFurniture: (a) => `furn:${a[0]}`,
  paint: (a) => `style:${a[0]}`,
  setPrice: (a) => `price:${a[0]}`,
  expandFarm: () => 'farm:land',
  feedPen: (a) => `pen:${a[0]}`,
  buyAnimal: (a) => `buyAnimal:${a[0]}`,
  sellFattened: (a) => `pen:${a[0]}`,
  collectPen: (a) => `pen:${a[0]}`,
  plantCrop: (a) => `plot:${a[0]}`,
  waterPlot: (a) => `plot:${a[0]}`,
  fertilizePlot: (a) => `plot:${a[0]}`,
  harvestPlot: (a) => `plot:${a[0]}`,
  waterGarden: () => 'farm:water',
  deliverFarmOrder: () => 'farm:order',
  cleanupFarm: () => 'farm:cleanup',
  buyFarmBuilding: (a) => `farm:building:${a[0]}`,
  upgradeFarmBuilding: (a) => `farm:building:${a[0]}`,
  // Quán nước đầu ngõ: cả cụm mua/tuyển/nghỉ/đổi giá là một chỗ chung "quan"
  buyQuanNuoc: () => 'quan',
  hireQuanNuoc: () => 'quan',
  buyTiemXoi: () => 'xoi', hireTiemXoi: () => 'xoi', fireTiemXoi: () => 'xoi',
  fireQuanNuoc: () => 'quan',
  setQuanNuocPrice: () => 'quan',
};
const GUARD_MS = 3000;
/** Thao tác gửi đi chưa có kết quả quá lâu thì thôi chờ (mất gói, máy chạy vừa đổi). */
const PENDING_TIMEOUT = 4000;

interface Actor { id: number; x: number; z: number; ry: number; color: number; hat?: number }
interface Pose { x: number; z: number; ry: number }

type Msg =
  | { type: 'welcome'; selfId: number; room: number; role: 'runner' | 'player'; alley: { id: string; name: string }; peers: AlleyPeer[]; data?: Record<string, unknown> | null }
  | { type: 'error'; error: string }
  | { type: 'peers'; peers: AlleyPeer[]; joined?: string; left?: string }
  | { type: 'promote' }
  | { type: 'demote' }
  | { type: 'state'; game: Partial<GameState>; actors: Actor[]; ask?: SharedAsk | null }
  | { type: 'pose'; from: number; pose: Pose; look?: string }
  | { type: 'notify'; text: string }
  | { type: 'sys'; text: string }
  | { type: 'act'; from: number; seq?: number; name: string; args: unknown[] }
  | { type: 'result'; seq: number; ok: boolean; messages: string[] }
  | { type: 'locks'; locks: { key: string; id: number; name: string }[]; started?: string }
  | { type: 'lock-denied'; key: string; by: string };

interface World {
  scene: THREE.Scene;
  player: { mesh: THREE.Object3D };
  /** Khách và nhân viên đang đi trong thành phố (chỉ máy chạy có). */
  actors: () => Walker[];
  /** Xoá khách/nhân viên đang đi khi máy này thôi chạy tiệm (từ giờ nhận bản từ máy chạy mới). */
  resetSim: () => void;
}

let ws: WebSocket | null = null;
let world: World | null = null;
/** Đã có trạng thái tiệm của hẻm (máy chạy nạp tiến trình lúc vào, hoặc người khác nhận trạng thái đầu tiên). */
let gotState = false;
/** Nhân vật của các thành viên khác đang online. */
const others = new Map<number, { walker: Walker; target: THREE.Vector3; ry: number; name: string; look: string }>();
/** Khách và nhân viên do máy chạy gửi sang (người không chạy dùng). */
const puppets = new Map<number, { walker: Walker; target: THREE.Vector3; ry: number }>();
let sendTimer = 0;
let poseTimer = 0;
/** Đang nạp trạng thái nhận được: không gửi ngược lại thành thao tác. */
let applyingRemote = false;
/** Hàm thật của store, giữ lại để trả về khi được giao quyền chạy. */
let originals: Partial<GameState> | null = null;

/** Người không chạy: thao tác đã gửi, chờ máy chạy báo kết quả. Khoá = tên + tham số, để bấm lặp không gửi hai lần. */
const pending = new Map<number, { key: string; timer: ReturnType<typeof setTimeout>; done: (ok: boolean) => void }>();
let nextSeq = 1;
/** Kết quả thật (máy chạy báo về) của thao tác vừa gửi — xem lastActionResult. */
let lastSent: Promise<boolean> = Promise.resolve(true);

/**
 * Máy khách: thao tác gửi đi trả ngay giá trị tạm (`true`); UI nào cần biết thật sự thành công hay không
 * (vd. xoá giỏ hàng sau khi đặt) thì chờ promise này. Chơi đơn / máy chạy: luôn `true` ngay.
 */
export const lastActionResult = (): Promise<boolean> => (isGuest() ? lastSent : Promise.resolve(true));
const setPendingFlag = () => {
  const busy = pending.size > 0;
  if (useSession.getState().netBusy === busy) return;
  useSession.setState({ netBusy: busy });
  document.body.classList.toggle('net-busy', busy);
};

/** Máy chạy: ai vừa sửa chỗ nào (xem GUARDED). */
const touched = new Map<string, { by: number; at: number }>();
/** Máy chạy đang làm thao tác của người này (null = của chính mình). */
let currentActor: number | null = null;

const role = () => useSession.getState().coop?.role;
/** Máy này không chạy mô phỏng (đang ở hẻm và người khác là máy chạy). */
export const isGuest = () => role() === 'player';
/** Đang ở trong một hẻm online (dù là máy chạy hay không). */
export const inAlley = () => !!useSession.getState().coop;
export const partnerPositions = () => [...others.values()].map((o) => o.walker.position);

export function initCoop(w: World) {
  world = w;
  // Người không chạy chỉnh trực tiếp trạng thái tiệm (vd. bật/tắt tuỳ chọn): gửi cho máy chạy
  useGame.subscribe((s, prev) => {
    if (role() !== 'player' || applyingRemote) return;
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(s) as (keyof GameState)[]) {
      if (s[key] !== prev[key] && typeof s[key] !== 'function' && !LOCAL_STATE.has(key) && !NO_PATCH.has(key)) patch[key] = s[key];
    }
    if (Object.keys(patch).length) send({ type: 'act', name: PATCH, args: [patch] });
  });
  // Máy chạy: lời nhắn trong game cũng hiện cho mọi người
  useGame.subscribe((s, prev) => {
    if (role() === 'runner' && s.message && s.message !== prev.message) send({ type: 'notify', text: s.message });
  });
  // Chế độ xây: mỗi lúc một người, xin khoá ở server (bị từ chối thì thoát ra)
  useGame.subscribe((s, prev) => {
    if (!inAlley() || s.buildMode === prev.buildMode) return;
    send({ type: 'lock', key: 'build', on: s.buildMode });
  });
}

/** Ai đang giữ chỗ này (khác người đang làm) trong GUARD_MS vừa qua; null nếu được sửa. */
function guardConflict(key: string, actor: number): string | null {
  const t = touched.get(key);
  if (!t || t.by === actor || Date.now() - t.at > GUARD_MS) return null;
  return useSession.getState().coop?.peers.find((p) => p.id === t.by)?.name ?? 'Người khác';
}

/** Máy chạy: bọc các thao tác sửa một chỗ để chặn hai người sửa cùng chỗ cùng lúc. */
function installGuards() {
  const state = useGame.getState();
  const wrapped: Record<string, unknown> = {};
  for (const [name, keyOf] of Object.entries(GUARDED)) {
    const fn = state[name as keyof GameState] as (...a: unknown[]) => unknown;
    if (typeof fn !== 'function' || (fn as { guarded?: boolean }).guarded) continue;
    const guard = (...args: unknown[]) => {
      const actor = currentActor ?? useSession.getState().coop?.selfId ?? 0;
      const key = keyOf(args);
      const by = guardConflict(key, actor);
      if (by) {
        useGame.getState().notify(`⛔ ${by} vừa sửa chỗ này, đợi một chút rồi thử lại`);
        return false;
      }
      touched.set(key, { by: actor, at: Date.now() });
      return fn(...args);
    };
    guard.guarded = true;
    wrapped[name] = guard;
  }
  useGame.setState(wrapped as Partial<GameState>);
  installSleepVote();
}

/** Máy chạy: ai trong hẻm đang nằm giường chờ sang ngày (id người chơi), của ngày sleepDay. */
const sleepers = new Set<number>();
let sleepDay = -1;
let realSleep: (() => boolean) | null = null;

/**
 * Máy chạy: ở hẻm, đi ngủ là bỏ phiếu — cả hẻm (mọi người đang online) cùng nằm giường mới sang
 * ngày, không để một người ngủ là kéo cả hẻm sang ngày giữa lúc người khác còn đang bán.
 */
function installSleepVote() {
  const fn = useGame.getState().sleep as (() => boolean) & { vote?: boolean };
  if (fn.vote) return;
  realSleep = fn;
  const vote = () => {
    const s = useGame.getState();
    if (s.minutes < SLEEP_FROM) return fn();
    if (sleepDay !== s.day) {
      sleepers.clear();
      sleepDay = s.day;
    }
    const actor = currentActor ?? useSession.getState().coop?.selfId ?? 0;
    sleepers.add(actor);
    if (settleSleep()) return true;
    const peers = useSession.getState().coop?.peers ?? [];
    const name = peers.find((p) => p.id === actor)?.name ?? 'Một người';
    const waiting = peers.filter((p) => !sleepers.has(p.id)).map((p) => p.name).join(', ');
    s.notify(`💤 Đã lên giường (${sleepers.size}/${peers.length}) — chờ ${waiting} cùng ngủ mới sang ngày`);
    if (currentActor != null) send({ type: 'notify', text: `💤 ${name} đã đi ngủ (${sleepers.size}/${peers.length})` });
    return true;
  };
  vote.vote = true;
  useGame.setState({ sleep: vote });
  // Thức khuya tới giờ ngất: có người đã nằm giường thì sang ngày, không phạt tiền cả hẻm
  faintGuard.spare = () => {
    if (!sleepers.size || useGame.getState().day !== sleepDay) return false;
    sleepers.clear();
    return true;
  };
}

/** Máy chạy: đủ phiếu (mọi người còn trong hẻm đã nằm giường) thì sang ngày. */
function settleSleep(): boolean {
  const peers = useSession.getState().coop?.peers ?? [];
  if (!sleepers.size || !realSleep || useGame.getState().day !== sleepDay) return false;
  if (peers.some((p) => !sleepers.has(p.id))) return false;
  sleepers.clear();
  return realSleep();
}

/** Đứng dậy khỏi giường lúc đang chờ cả hẻm: rút phiếu (máy khách gửi cho máy chạy). */
export function cancelSleep() {
  if (isGuest()) return void send({ type: 'act', name: CANCEL_SLEEP, args: [] });
  sleepers.delete(useSession.getState().coop?.selfId ?? 0);
}

/**
 * Máy chạy làm thao tác của người khác: lời nhắn sinh ra lúc làm chỉ gửi riêng cho người đó
 * (kèm thành công/thất bại), không hiện lên máy chạy.
 */
function runRemote(from: number, name: string, args: unknown[]): { ok: boolean; messages: string[] } {
  const game = useGame.getState();
  const fn = game[name as keyof GameState];
  if (typeof fn !== 'function' || LOCAL_ACTIONS.has(name)) return { ok: false, messages: [] };
  const messages: string[] = [];
  const realNotify = game.notify;
  useGame.setState({ notify: (text: string) => void messages.push(text) });
  currentActor = from;
  let ok = false;
  try {
    const raw = (fn as (...a: unknown[]) => unknown)(...args);
    if (typeof raw === 'object' && raw !== null && 'ok' in raw) {
      ok = Boolean((raw as { ok: boolean }).ok);
    } else {
      ok = raw !== false;
    }
  } catch (err) {
    console.warn('[coop] thao tác lỗi', name, err);
  } finally {
    currentActor = null;
    useGame.setState({ notify: realNotify });
  }
  return { ok, messages };
}

const send = (msg: object) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));

// ---------- Danh sách hẻm (REST) ----------

export interface AlleySummary {
  id: string; name: string; members: { uid: string; name: string }[];
  day: number; level: number; money: number; updatedAt: string; online: number;
}

async function api<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
  const token = await idToken();
  if (!token) throw new Error('Cần đăng nhập Google để chơi hẻm online.');
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/alleys${path}`), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Không kết nối được server. Kiểm tra "npm run server" đang chạy.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Server trả lỗi ${res.status}`);
  return json as T;
}

export const listAlleys = () => api<AlleySummary[]>('GET', '');
export const createAlley = (name: string) => api<AlleySummary>('POST', '', { name });
export const joinAlley = (code: string) => api<AlleySummary>('POST', `/${encodeURIComponent(code.trim().toUpperCase())}/join`);
export const quitAlley = (id: string) => api<{ ok: true }>('POST', `/${encodeURIComponent(id)}/leave`);

// ---------- Vào hẻm (WebSocket) ----------

/** Vào hẻm; xong khi đã có trạng thái tiệm để chơi (máy chạy: từ server, người khác: từ máy chạy). */
export function enterAlley(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl());
    let ready = false;
    socket.onopen = async () => socket.send(JSON.stringify({ type: 'enter', alley: id, token: await idToken(), visible: document.visibilityState === 'visible' }));
    socket.onerror = () => !ready && reject(new Error('Không kết nối được server hẻm online. Kiểm tra "npm run server" đang chạy.'));
    socket.onclose = () => {
      if (!ready) return reject(new Error('Mất kết nối khi vào hẻm.'));
      ws = null;
      useSession.setState({ coop: null });
      clearOthers();
      useGame.getState().notify('🔌 Mất kết nối hẻm online. Quay về màn hình chính…');
      setTimeout(() => location.reload(), 2500);
    };
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data) as Msg;
      if (msg.type === 'error' && !ready) {
        reject(new Error(msg.error));
        socket.close();
        return;
      }
      if (msg.type === 'welcome') {
        ws = socket;
        useSession.setState({
          coop: { role: msg.role, alley: msg.alley.id, name: msg.alley.name, selfId: msg.selfId, room: msg.room ?? 0, peers: msg.peers },
        });
        if (msg.role === 'runner') {
          // Hẻm mới tạo chưa có tiến trình: bắt đầu tiệm mới.
          // Hẻm chơi chung mặc định bật LỊCH TỰ ĐỘNG (autoRoutine=true) để 8h tự mở cửa, 22h30 tự
          // đóng — thay vì để newGameData() ép về false khiến hẻm không bao giờ tự mở cửa lúc 8h.
          if (msg.data) applySnapshot(msg.data);
          else useGame.setState({ ...newGameData(), autoRoutine: true, shopOpen: false, panel: null });
          installGuards();
          gotState = true;
          send({ type: 'ready' });
          ready = true;
          resolve();
        } else installProxies();
        for (const p of msg.peers) if (p.id !== msg.selfId) addOther(p);
        return;
      }
      // Người không chạy: vào game khi nhận trạng thái đầu tiên
      if (msg.type === 'state' && !ready) {
        onMessage(msg);
        gotState = true;
        send({ type: 'ready' });
        ready = true;
        resolve();
        return;
      }
      onMessage(msg);
    };
  });
}

/** Thay các hàm thao tác trong store bằng bản gửi cho máy chạy. */
function installProxies() {
  const state = useGame.getState();
  originals = {};
  const proxies: Record<string, unknown> = {};
  for (const [name, fn] of Object.entries(state)) {
    if (typeof fn !== 'function' || LOCAL_ACTIONS.has(name)) continue;
    (originals as Record<string, unknown>)[name] = fn;
    proxies[name] = (...rawArgs: unknown[]) => {
      const args = cleanActionArgs(rawArgs);
      const result = name in PROXY_RESULT ? PROXY_RESULT[name] : true;
      // Bấm lặp lúc kết quả lần trước chưa về: bỏ qua, không gửi hai lần
      const key = name + JSON.stringify(args);
      if (!REPEATABLE.has(name) && [...pending.values()].some((p) => p.key === key)) return result;
      const seq = nextSeq++;
      let done: (ok: boolean) => void = () => {};
      lastSent = new Promise<boolean>((r) => (done = r));
      pending.set(seq, { key, done, timer: setTimeout(() => (pending.delete(seq), setPendingFlag(), done(false)), PENDING_TIMEOUT) });
      setPendingFlag();
      send({ type: 'act', seq, name, args });
      return result;
    };
  }
  applyingRemote = true;
  useGame.setState(proxies as Partial<GameState>);
  applyingRemote = false;
}

/** Được giao quyền chạy: trả lại hàm thật, chạy tiếp từ trạng thái vừa nhận. */
function becomeRunner() {
  if (originals) {
    applyingRemote = true;
    useGame.setState(originals);
    applyingRemote = false;
    originals = null;
  }
  for (const p of puppets.values()) {
    world?.scene.remove(p.walker.mesh);
    p.walker.dispose();
  }
  puppets.clear();
  // Câu hỏi đang hiện là của máy chạy cũ (khách đó không có ở máy này): bỏ
  clearAsk();
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.done(false);
  }
  pending.clear();
  setPendingFlag();
  useSession.setState((s) => ({ coop: s.coop && { ...s.coop, role: 'runner' } }));
  installGuards();
  useGame.getState().notify('🏪 Máy bạn đang chạy tiệm cho cả hẻm');
  checkpoint();
}

/** Thôi chạy tiệm (tab này bị ẩn, đã giao cho người đang mở tab): chuyển sang nhận trạng thái như người chơi thường. */
function becomePlayer() {
  checkpoint();
  touched.clear();
  sleepers.clear();
  // Khách đang chờ câu trả lời bị dọn cùng mô phỏng: bỏ câu hỏi, từ giờ nhận câu hỏi từ máy chạy mới
  clearAsk();
  useSession.setState((s) => ({ coop: s.coop && { ...s.coop, role: 'player' } }));
  installProxies();
  world?.resetSim();
}

function onMessage(msg: Msg) {
  const game = useGame.getState();
  switch (msg.type) {
    case 'peers': {
      const self = useSession.getState().coop?.selfId;
      useSession.setState((s) => ({ coop: s.coop && { ...s.coop, peers: msg.peers } }));
      const ids = new Set(msg.peers.map((p) => p.id));
      for (const [id, o] of others) {
        if (ids.has(id)) continue;
        world?.scene.remove(o.walker.mesh);
        o.walker.dispose();
        others.delete(id);
      }
      for (const p of msg.peers) if (p.id !== self) addOther(p);
      // Người còn thiếu phiếu vừa rời hẻm: những người còn lại đã ngủ hết thì sang ngày
      if (role() === 'runner') settleSleep();
      if (msg.joined) game.notify(`👋 ${msg.joined} đã vào hẻm`);
      if (msg.left) game.notify(`👋 ${msg.left} đã rời hẻm`);
      break;
    }
    case 'promote':
      becomeRunner();
      break;
    case 'demote':
      becomePlayer();
      break;
    case 'pose':
      setPose(msg.from, msg.pose, msg.look);
      break;
    case 'notify':
      game.notify(msg.text);
      break;
    case 'sys':
      // Tin hệ thống của server (đổi chủ hẻm...): mọi người trong phòng đều thấy, kể cả người không chạy
      game.notify(msg.text);
      break;
    case 'act':
      if (role() !== 'runner' || !Array.isArray(msg.args)) return;
      if (msg.name === PATCH) {
        const patch = msg.args[0] as Record<string, unknown>;
        if (!patch || typeof patch !== 'object') return;
        // Chỉ nhận trường dữ liệu tiệm đã có, không cho ghi đè hàm hay trạng thái giao diện
        const safe = Object.fromEntries(Object.entries(patch).filter(([k]) =>
          k in game && typeof game[k as keyof GameState] !== 'function' && !LOCAL_STATE.has(k) && !NO_PATCH.has(k)));
        useGame.setState(safe as Partial<GameState>);
        return;
      }
      if (msg.name === CANCEL_SLEEP) {
        sleepers.delete(msg.from);
        return;
      }
      if (msg.name === ANSWER_ASK) {
        // Ai trong hẻm bấm trả lời trước thì chốt; câu đã đổi/đã chốt thì bỏ qua
        if (answerAskById(Number(msg.args[0]), Number(msg.args[1]))) sendState();
        return;
      }
      {
        const result = runRemote(msg.from, msg.name, msg.args);
        // Gửi trạng thái mới trước, rồi kết quả: người bấm thấy số liệu đổi cùng lúc với lời nhắn
        sendState();
        if (msg.seq != null) send({ type: 'result', to: msg.from, seq: msg.seq, ...result });
      }
      break;
    case 'result': {
      const p = pending.get(msg.seq);
      if (p) {
        clearTimeout(p.timer);
        p.done(msg.ok);
      }
      pending.delete(msg.seq);
      setPendingFlag();
      for (const text of msg.messages) game.notify(text);
      if (!msg.ok && !msg.messages.length) game.notify('⚠️ Thao tác không thực hiện được');
      break;
    }
    case 'locks':
      useSession.setState({ alleyLocks: msg.locks });
      if (msg.started) game.notify(`🔨 ${msg.started} đang sửa bố cục tiệm`);
      break;
    case 'lock-denied':
      if (msg.key === 'build' && game.buildMode) {
        useGame.setState({ buildMode: false, placing: null });
        game.notify(`🔨 ${msg.by} đang sửa bố cục, đợi bạn ấy xong nhé`);
      }
      break;
    case 'state':
      if (role() !== 'player') return;
      applyingRemote = true;
      useGame.setState(msg.game);
      applyingRemote = false;
      showDaySummary(game.day, msg.game);
      syncPuppets(msg.actors);
      // Câu hỏi ở quầy của máy chạy: hiện cho cả hẻm (thế giới đang dừng chờ — ai cũng thấy vì sao)
      applyRemoteAsk(msg.ask ?? null, (id, choice) => send({ type: 'act', name: ANSWER_ASK, args: [id, choice] }));
      break;
  }
}

/** Máy khách: hẻm vừa sang ngày thì mở bảng tổng kết ngày hôm qua (máy chạy ghi ở lastSummary). */
function showDaySummary(prevDay: number, next: Partial<GameState>) {
  const sum = next.lastSummary as { day: number; stats: DayStats } | null | undefined;
  if (!sum || next.day !== prevDay + 1 || sum.day !== prevDay) return;
  useGame.setState({ panel: { type: 'summary', day: sum.day, stats: sum.stats } });
}

/** Nhân vật của thành viên khác, mặc đúng trang phục người đó đang chọn. */
function otherWalker(name: string, look: string) {
  const options = costumeById(look)?.options ?? {};
  // Dáng nhân vật chính (nón lá mặc định) chứ không phải dáng khách
  const walker = new Walker(options.bodyColor ?? 0xe67e22, options.hatColor, 'customer', undefined, { ...options, profession: 'player' });
  // Nhãn trên đầu chỉ vừa vài chữ: lấy tên gọi (chữ cuối của họ tên)
  walker.setBadge(`🧑 ${name.split(' ').slice(-1)[0]}`);
  return walker;
}

function addOther(p: AlleyPeer) {
  if (others.has(p.id) || !world) return;
  const walker = otherWalker(p.name, 'default');
  world.scene.add(walker.mesh);
  others.set(p.id, { walker, target: new THREE.Vector3(), ry: 0, name: p.name, look: 'default' });
}

function clearOthers() {
  for (const o of [...others.values(), ...puppets.values()]) {
    world?.scene.remove(o.walker.mesh);
    o.walker.dispose();
  }
  others.clear();
  puppets.clear();
}

function setPose(id: number, pose: Pose, look?: string) {
  const o = others.get(id);
  if (!o) return;
  // Người đó đổi trang phục: dựng lại nhân vật tại chỗ
  if (look && look !== o.look && world) {
    const walker = otherWalker(o.name, look);
    walker.position.copy(o.walker.position);
    o.walker.dispose();
    world.scene.remove(o.walker.mesh);
    world.scene.add(walker.mesh);
    o.walker = walker;
    o.look = look;
  }
  if (o.target.lengthSq() === 0) o.walker.position.set(pose.x, 0, pose.z);
  o.target.set(pose.x, 0, pose.z);
  o.ry = pose.ry;
}

function syncPuppets(actors: Actor[]) {
  if (!world) return;
  const seen = new Set<number>();
  for (const a of actors) {
    seen.add(a.id);
    let p = puppets.get(a.id);
    if (!p) {
      const walker = new Walker(a.color, a.hat);
      walker.position.set(a.x, 0, a.z);
      world.scene.add(walker.mesh);
      p = { walker, target: new THREE.Vector3(), ry: 0 };
      puppets.set(a.id, p);
    }
    p.target.set(a.x, 0, a.z);
    p.ry = a.ry;
  }
  for (const [id, p] of puppets) {
    if (seen.has(id)) continue;
    p.walker.dispose();
    world.scene.remove(p.walker.mesh);
    puppets.delete(id);
  }
}

const pose = (o: THREE.Object3D): Pose => ({
  x: +o.position.x.toFixed(2), z: +o.position.z.toFixed(2), ry: +o.rotation.y.toFixed(2),
});

/** Trạng thái tiệm gửi cho người khác: mọi trường dữ liệu, trừ hàm và trạng thái giao diện. */
function sharedState(): Partial<GameState> {
  const s = useGame.getState();
  return Object.fromEntries(Object.entries(s).filter(([k, v]) => typeof v !== 'function' && !LOCAL_STATE.has(k))) as Partial<GameState>;
}

/** Máy chạy ghi tiến trình hẻm về server. */
export function checkpoint() {
  // Chưa có trạng thái hẻm thì không ghi — tránh đè tiến trình hẻm bằng bản lưu cá nhân của máy này.
  if (role() === 'runner' && gotState) send({ type: 'checkpoint', data: snapshot() });
}

let checkpointTimer = 0;

/** Gọi mỗi khung hình: kéo mượt các nhân vật nhận được. */
export function updateCoop(dt: number) {
  if (!useSession.getState().coop || !world) return;
  const k = Math.min(1, dt * 10);
  for (const o of [...others.values(), ...puppets.values()]) {
    o.walker.position.lerp(o.target, k);
    o.walker.mesh.rotation.y = o.ry;
  }
}

/**
 * Gửi vị trí/trạng thái/tiến trình. Chạy bằng hẹn giờ chứ không theo khung hình: tab bị ẩn hay cửa sổ
 * thu nhỏ thì trình duyệt dừng vẽ, nhưng máy chạy vẫn phải gửi để người khác không bị treo.
 */
const NET_STEP = 0.1;
setInterval(() => {
  const coop = useSession.getState().coop;
  if (!coop || !world) return;
  const dt = NET_STEP;
  poseTimer -= dt;
  if (poseTimer <= 0) {
    poseTimer = 0.1;
    if (coop.peers.length > 1) send({ type: 'pose', pose: pose(world.player.mesh), look: useGame.getState().costume || 'default' });
  }
  if (coop.role !== 'runner') return;
  checkpointTimer -= dt;
  if (checkpointTimer <= 0) {
    checkpointTimer = 30;
    checkpoint();
  }
  sendTimer -= dt;
  if (sendTimer > 0 || coop.peers.length < 2) return;
  sendState();
}, NET_STEP * 1000);

function sendState() {
  if (!world) return;
  sendTimer = 0.2;
  const actors = world.actors().map((w) => ({ ...pose(w.mesh), id: w.id, color: w.color, hat: w.hatColor }));
  send({ type: 'state', game: sharedState(), actors, ask: sharedAsk() });
}

// Rời/ẩn tab: máy chạy ghi tiến trình ngay
window.addEventListener('pagehide', checkpoint);
document.addEventListener('visibilitychange', () => {
  const visible = document.visibilityState === 'visible';
  if (!visible) checkpoint();
  // Server dựa vào đây để giao quyền chạy cho người đang mở tab
  send({ type: 'visibility', visible });
});

/** Rời hẻm (máy chạy ghi tiến trình trước khi đi). */
export function leaveRoom() {
  checkpoint();
  ws?.close();
}
