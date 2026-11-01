/**
 * Logic thuần của hẻm online (Tạp Hóa 3D) — tách khỏi server/index.ts để test được:
 * không đụng ws/firebase/mongo/network, chỉ tính toán quyết định rồi trả về kế hoạch để người gọi gửi.
 */

/** Giới hạn số người trong một hẻm. */
export const MAX_MEMBERS = 4;

/** Bỏ chữ dễ nhầm (0/O, 1/I/L) cho mã đọc qua điện thoại. */
export const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;

/** Sinh mã hẻm (rng truyền vào để test được tính ổn định). */
export const newAlleyCode = (rng: () => number = Math.random) =>
  Array.from({ length: CODE_LEN }, () => CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]).join('');

/**
 * Người đang online trong một hẻm (phiên bản thuần, không giữ ws).
 * `ready` = đã có trạng thái tiệm của hẻm (vừa vào làm máy chạy và nạp tiến trình, hoặc đã nhận trạng thái
 * đầu tiên từ máy chạy). Chưa ready thì không được bầu làm máy chạy — nếu bầu sớm sẽ không có gì để chạy.
 */
export interface RoomPeer { id: number; name: string; visible: boolean; ready?: boolean }

/** Cấu trúc phòng một hẻm: danh sách peer, máy đang chạy (runner), và các khoá công việc. */
export interface Room {
  peers: RoomPeer[];
  /** id của peer đang chạy mô phỏng; null = chưa ai. */
  runner: number | null;
  /** key công việc -> id peer đang giữ (vd. 'build' để sửa bố cục). */
  locks: Map<string, number>;
}

export interface HandOffPlan {
  /** Peer được nâng thành máy chạy; null = không đổi. */
  promote: number | null;
  /** Peer phải rớt xuống (máy chạy cũ); null = không ai. */
  demote: number | null;
  /** Thông báo cho cả hẻm; null = không báo. */
  notify: string | null;
}

/**
 * Máy chạy ẩn tab thì game trên máy đó đứng (trình duyệt ngừng vẽ), cả hẻm đứng theo:
 * giao quyền chạy cho người đang mở tab. Ai cũng ẩn tab thì giữ nguyên.
 * Thuần: trả về kế hoạch (promote/demote/notify), người gọi tự gửi ws.
 */
export function handOffPlan(peers: RoomPeer[], runner: number | null, reason: 'left' | 'hidden', oldName: string): HandOffPlan {
  const current = runner != null ? peers.find((p) => p.id === runner) : undefined;
  if (current?.visible) return { promote: null, demote: null, notify: null };
  // Chỉ bầu người đã ready (có trạng thái tiệm). Không ready mà lên máy chạy sẽ không có gì để chạy và
  // dễ ghi đè tiến trình bằng bản lưu cá nhân.
  const next = peers.find((p) => p.visible && p.id !== runner && p.ready !== false)
    ?? (current ? undefined : peers.find((p) => p.visible && p.ready !== false));
  if (!next) return { promote: null, demote: null, notify: null };
  const why = reason === 'hidden' ? `${oldName} vừa ẩn tab` : `${oldName} đã rời hẻm`;
  return { promote: next.id, demote: current ? current.id : null, notify: `🏪 ${why}, máy ${next.name} đang chạy tiệm` };
}

/**
 * Khoá một công việc (vd. 'build' = sửa bố cục) để mỗi lúc chỉ một người làm.
 * Thuần: nhận/trả map khoá, trả về kết quả để người gọi gửi lock-denied/quảng bá.
 */
export function tryLock(locks: Map<string, number>, key: string, actor: number, on: boolean):
  { granted: boolean; deniedBy?: number } {
  const holder = locks.get(key);
  if (on) {
    if (holder != null && holder !== actor) return { granted: false, deniedBy: holder };
    locks.set(key, actor);
    return { granted: true };
  }
  // tắt: chỉ người đang giữ được nhả
  if (holder === actor) locks.delete(key);
  return { granted: true };
}

/** Nhả toàn bộ khoá một peer đang giữ (khi người đó rời đi); trả về các key đã nhả. */
export function releaseLocksFor(locks: Map<string, number>, peerId: number): string[] {
  const released: string[] = [];
  for (const [key, id] of locks) if (id === peerId) { locks.delete(key); released.push(key); }
  return released;
}

/** Kiểm tra một người có được tham gia hẻm (chưa có mặt + chưa đủ người). */
export function canJoin(members: { uid: string }[], uid: string): boolean {
  return !members.some((m) => m.uid === uid) && members.length < MAX_MEMBERS;
}

/** Một bản checkpoint hợp lệ để ghi về server (bắt buộc có day và money là số). */
export function isValidCheckpoint(d: unknown): d is Record<string, unknown> {
  const o = d as Record<string, unknown> | null;
  return !!o && typeof o === 'object' && typeof o.day === 'number' && typeof o.money === 'number';
}

// ---------- Giới hạn tần suất REST (token bucket theo uid) ----------
/** Số request REST mỗi người mỗi phút (mức nạp token đều). */
export const REST_RATE = 30;
/** Dung lượng xô REST: số request gửi dồn tức thì trước khi bị chặn. */
export const REST_BURST = 10;
/** Map bucket vượt cỡ này thì quét dán mục cũ, không thì rỉ bộ nhớ. */
export const BUCKET_MAX = 10_000;

/** Xô token của một uid: số token còn lại và lần cuối lấy token (ms epoch). */
export interface TokenBucket { tokens: number; updatedAt: number }

/**
 * Lấy một token cho `uid` tại thời điểm `now` (ms). Token nạp đều theo REST_RATE, xô đầy tối đa
 * REST_BURST. Quá hạn mức thì từ chối kèm `retryAfter` (giây) để trả header Retry-After.
 * Thuần: chỉ đọc/ghi đúng Map được truyền vào.
 */
export function takeToken(
  bucket: Map<string, TokenBucket>, uid: string, now: number,
  ratePerMin: number = REST_RATE, burst: number = REST_BURST,
): { ok: boolean; retryAfter: number } {
  const perMs = ratePerMin / 60_000;
  const b = bucket.get(uid) ?? { tokens: burst, updatedAt: now };
  b.tokens = Math.min(burst, b.tokens + (now - b.updatedAt) * perMs);
  b.updatedAt = now;
  bucket.set(uid, b);
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { ok: true, retryAfter: 0 };
  }
  // Đợi đến khi nạp đủ 1 token nữa (làm tròn lên theo giây)
  return { ok: false, retryAfter: Math.max(1, Math.ceil((1 - b.tokens) / perMs / 1000)) };
}

/**
 * Dọn bucket khi Map phình quá BUCKET_MAX: bỏ các xô đã đủ lâu để nạp đầy token
 * (xoá chúng cũng như reset về xô mới, không lỏng hạn mức). Vẫn quá thì xoá sạch.
 */
export function pruneBuckets(
  bucket: Map<string, TokenBucket>, now: number, ratePerMin: number = REST_RATE, burst: number = REST_BURST,
): void {
  if (bucket.size <= BUCKET_MAX) return;
  const idleMs = (burst / (ratePerMin / 60_000)) * 2;
  for (const [key, b] of bucket) if (now - b.updatedAt > idleMs) bucket.delete(key);
  if (bucket.size > BUCKET_MAX) bucket.clear();
}

// ---------- Giới hạn tin nhắn WS (mỗi kết nối một bộ đếm) ----------
/** Cửa sổ đếm tin nhắn WS. */
export const WS_WINDOW_MS = 5_000;
/** Tin `pose` (di chuyển, gửi dày) được hạn mức riêng rộng. */
export const WS_POSE_RATE = 240;
/** Hạn mức cho mọi tin nhắn WS khác trong một cửa sổ. */
export const WS_MSG_RATE = 60;
/** Vi phạm quá WS_MAX_STRIKES lần trong cửa sổ này thì ngắt kết nối. */
export const WS_STRIKE_WINDOW_MS = 30_000;
export const WS_MAX_STRIKES = 3;

/** Bộ đếm tin nhắn của một kết nối WS. */
export interface WsRateState {
  poseCount: number; poseSince: number;
  msgCount: number; msgSince: number;
  /** Số lần vi phạm liên tiếp trong cửa sổ vi phạm hiện tại. */
  strikes: number; strikeSince: number;
}

export const newWsRate = (): WsRateState =>
  ({ poseCount: 0, poseSince: 0, msgCount: 0, msgSince: 0, strikes: 0, strikeSince: 0 });

export type WsVerdict = 'allow' | 'drop' | 'terminate';

/**
 * Xét một tin nhắn WS (theo `type`) của một kết nối tại thời điểm `now` (ms):
 *  - 'allow': cho xử lý tin.
 *  - 'drop' : tin vượt hạn mức, bỏ đi nhưng giữ kết nối.
 *  - 'terminate': vi phạm đủ WS_MAX_STRIKES lần trong WS_STRIKE_WINDOW_MS → caller ngắt kết nối.
 * Heartbeat ping/pong của thư viện ws chạy ở tầng khung, không đi qua đây.
 */
export function wsAllow(state: WsRateState, type: string, now: number): WsVerdict {
  const isPose = type === 'pose';
  const countKey = isPose ? 'poseCount' : 'msgCount';
  const sinceKey = isPose ? 'poseSince' : 'msgSince';
  if (now - state[sinceKey] >= WS_WINDOW_MS) {
    state[countKey] = 0;
    state[sinceKey] = now;
  }
  state[countKey]++;
  if (state[countKey] <= (isPose ? WS_POSE_RATE : WS_MSG_RATE)) return 'allow';
  // Vi phạm: đếm liên tiếp; qua cửa sổ vi phạm mà im lặng thì đếm lại từ đầu
  if (now - state.strikeSince >= WS_STRIKE_WINDOW_MS) {
    state.strikes = 0;
    state.strikeSince = now;
  }
  state.strikes++;
  return state.strikes >= WS_MAX_STRIKES ? 'terminate' : 'drop';
}

// ---------- Kiểm tra bản lưu PUT /api/save ----------
/** Đồng bộ khi bump src/core/save.ts SAVE_VERSION. */
export const MAX_SAVE_VERSION = 2;

/**
 * Bản lưu gửi lên PUT /api/save không hợp lệ thì trả về lý do (đưa thẳng vào lỗi 400), hợp lệ trả null.
 * Nhánh `force` cũng phải qua đây: force chỉ được bỏ qua xung đột ghi, không bỏ qua kiểm tra dữ liệu.
 */
export function invalidSaveReason(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Bản lưu phải là một đối tượng.';
  const d = data as Record<string, unknown>;
  const version = d.saveVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > MAX_SAVE_VERSION) {
    return `saveVersion phải là số nguyên từ 1 đến ${MAX_SAVE_VERSION}.`;
  }
  for (const key of ['day', 'money', 'level'] as const) {
    if (typeof d[key] !== 'number' || !Number.isFinite(d[key])) return `${key} phải là số hữu hạn.`;
  }
  return null;
}

// ---------- Dọn hẻm bỏ hoang (TTL) ----------
/** Hẻm rỗng thành viên im lặng quá lâu thì bị dọn. */
export const ALLEY_TTL_MS = 48 * 60 * 60 * 1000;
/** Chu kỳ quét dọn trên server. */
export const ALLEY_SWEEP_MS = 30 * 60 * 1000;

/** Đủ dữ liệu để xét xoá một hẻm (hồ sơ trên store). */
export interface SweepableAlley { _id: string; members: unknown[]; lastActive?: number; updatedAt?: string }

/** Hẻm rỗng thành viên mà quá ALLEY_TTL_MS không hoạt động thì bị dọn; còn người thì luôn giữ. */
export function isStaleAlley(a: SweepableAlley, now: number): boolean {
  if (a.members.length !== 0) return false;
  // Hẻm cũ chưa có lastActive thì dựa vào updatedAt
  const last = a.lastActive ?? (a.updatedAt ? Date.parse(a.updatedAt) || 0 : 0);
  return now - last > ALLEY_TTL_MS;
}

/** Chọn các hẻm cần xoá trong một loạt hồ sơ; trả về _id để caller xoá khỏi store. */
export function sweepStaleAlleys(docs: SweepableAlley[], now: number): string[] {
  return docs.filter((d) => isStaleAlley(d, now)).map((d) => d._id);
}

/**
 * Chủ hẻm rời đi mà còn thành viên: người vào sớm nhất còn lại kế nhiệm
 * (thứ tự mảng members là thứ tự vào hẻm). Role máy chạy/ready của từng máy đang
 * online là trạng thái phiên, không đổi theo.
 */
export function nextOwner(members: { uid: string; name?: string }[], leavingUid: string): string | null {
  for (const m of members) if (m.uid !== leavingUid) return m.uid;
  return null;
}
