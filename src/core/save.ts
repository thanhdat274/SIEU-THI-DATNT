import Dexie, { type EntityTable } from 'dexie';
import { forecastFrom } from '../data/weather';
import { initialWeather, migrateTiers, newGameData, useGame } from './store';

/**
 * Phiên bản cấu trúc bản lưu. Đổi cấu trúc (đổi tên, tách, gộp trường) thì tăng số này và thêm một bước
 * vào MIGRATIONS; chỉ thêm trường mới thì không cần, `applySnapshot` tự bù giá trị mặc định.
 */
export const SAVE_VERSION = 1;

/** MIGRATIONS[n] nâng bản lưu từ phiên bản n lên n+1 (dùng cho cả bản trong máy lẫn bản cloud). */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // 1: (d) => ({ ...d, tenMoi: d.tenCu }),
};

/** Các trường được lưu; còn lại (giao diện, khách đang đi) là tạm thời. */
export type SaveData = ReturnType<typeof newGameData> & { saveVersion?: number };

function migrate(data: Partial<SaveData>): Partial<SaveData> {
  let d = data as Record<string, unknown>;
  for (let v = data.saveVersion ?? 1; v < SAVE_VERSION; v++) d = MIGRATIONS[v]?.(d) ?? d;
  return { ...d, saveVersion: SAVE_VERSION } as Partial<SaveData>;
}

/** Chụp lại trạng thái cần lưu (dùng cho máy, cloud và gửi cho bạn chơi cùng). */
export function snapshot(): SaveData {
  const s = useGame.getState();
  return {
    day: s.day, minutes: s.minutes, money: s.money, level: s.level, xp: s.xp,
    storage: s.storage, storageLots: s.storageLots, furniture: s.furniture, shelfHeat: s.shelfHeat, impulseHinted: s.impulseHinted, prices: s.prices, happyHour: s.happyHour, stats: s.stats,
    shopTier: s.shopTier, pendingUpgrade: s.pendingUpgrade, style: s.style,
    staff: s.staff, candidates: s.candidates, autoOpen: s.autoOpen, autoRoutine: s.autoRoutine, autoSwap: s.autoSwap, totals: s.totals, questLog: s.questLog, warehouseTier: s.warehouseTier,
    reviews: s.reviews, deliveries: s.deliveries, demand: s.demand, demandToday: s.demandToday,
    sales: s.sales, salesToday: s.salesToday, regulars: s.regulars, reservations: s.reservations, market: s.market,
    contracts: s.contracts, repLog: s.repLog, community: s.community, opening: s.opening, costume: s.costume, event: s.event,
    giftStreak: s.giftStreak, giftLastDay: s.giftLastDay, wheelLastDay: s.wheelLastDay, wheelBoost: s.wheelBoost, shopName: s.shopName,
    history: s.history, activeCombos: s.activeCombos, order: s.order, ordersDone: s.ordersDone, cookJobs: s.cookJobs, phoneOrders: s.phoneOrders, phoneSlot: s.phoneSlot, phoneHintDay: s.phoneHintDay, phoneOrdersDone: s.phoneOrdersDone, debts: s.debts, allowCredit: s.allowCredit, biz: s.biz, vendorDay: s.vendorDay, vendorOffer: s.vendorOffer, skills: s.skills, titles: s.titles, fakeCash: s.fakeCash, branch: s.branch,
    weatherSeed: s.weatherSeed, weather: s.weather, forecast: s.forecast,
    saveVersion: SAVE_VERSION,
  };
}

/** Nạp một bản lưu (có thể là bản cũ thiếu trường mới, hoặc phiên bản cấu trúc cũ). */
export function applySnapshot(raw: Partial<SaveData>) {
  const data = migrate(raw);
  const fresh = newGameData();
  const merged = { ...fresh, ...data, stats: { ...fresh.stats, ...data.stats }, totals: { ...fresh.totals, ...data.totals }, biz: { ...fresh.biz, ...data.biz } };
  // Kệ kho, tủ lạnh kho từng đặt trong tiệm: giờ đã có nhà kho riêng, hoàn tiền mua
  const OLD_WAREHOUSE: Record<string, number> = { stockRack: 200000, coldStorage: 250000 };
  const refund = merged.furniture.reduce((n, f) => n + (OLD_WAREHOUSE[f.type] ?? 0), 0);
  merged.furniture = merged.furniture.filter((f) => !OLD_WAREHOUSE[f.type]).map(migrateTiers);
  merged.money += refund;
  // Bản lưu trước khi có hạt giống thời tiết: dự báo chỉ là một ngày, tính lại cho khớp hạt giống mới
  if (typeof data.weatherSeed !== 'number') {
    const seed = initialWeather().weatherSeed;
    merged.weatherSeed = seed;
    merged.forecast = forecastFrom(seed, merged.day, merged.weather);
  }
  useGame.setState(merged);
}

type LocalSave = { id: string; savedAt: number; data: SaveData };

/** Lưu trong IndexedDB: dung lượng lớn, không bị giới hạn ~5MB như localStorage. */
class SaveDb extends Dexie {
  saves!: EntityTable<LocalSave, 'id'>;
  constructor() {
    super('taphoa3d');
    this.version(1).stores({ saves: 'id, savedAt' });
  }
}
const db = new SaveDb();

const MAIN = 'main';
/** Bản cuối ngày hôm trước: dùng khi bản chính hỏng, hoặc khi người chơi muốn quay lại. */
const BACKUP = 'backup';
/** Bản chính bị hỏng được cất riêng (không ghi đè mất) để còn cứu tay. */
const CORRUPT = 'corrupt';
/** IndexedDB ghi bất đồng bộ nên có thể không kịp khi đóng tab; lúc đó ghi thêm bản này vào localStorage. */
const EMERGENCY_KEY = 'taphoa3d-emergency';
/** Bản lưu cũ trong localStorage, trước khi chuyển sang IndexedDB. */
const LEGACY_KEYS = ['taphoa3d-save-v1', 'taphoa3d-save-v1-backup'];
const LOCAL_KEYS = [EMERGENCY_KEY, ...LEGACY_KEYS];

/** Bản lưu đọc được và đủ các trường cốt lõi; thiếu trường mới thì `applySnapshot` tự bù. */
function isValid(save: unknown): save is LocalSave {
  const d = (save as LocalSave | undefined)?.data;
  return typeof (save as LocalSave | undefined)?.savedAt === 'number' && !!d && typeof d === 'object'
    && Number.isInteger(d.day) && d.day >= 1
    && Number.isFinite(d.money) && Number.isInteger(d.level) && d.level >= 1
    && Array.isArray(d.furniture);
}

function readLocalStorage(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearLocalStorage() {
  try {
    for (const key of LOCAL_KEYS) localStorage.removeItem(key);
  } catch {
    // bỏ qua: trình duyệt chặn lưu trữ
  }
}

// Bản sao trong bộ nhớ để màn đăng nhập và HUD đọc đồng bộ; nạp từ IndexedDB một lần bằng `initSaves`.
let main: LocalSave | null = null;
let backup: LocalSave | null = null;
let writes: Promise<unknown> = Promise.resolve();
/** Ghi IndexedDB lần lượt theo thứ tự gọi, để bản cũ không đè bản mới. */
const queue = (job: () => Promise<unknown>) => (writes = writes.then(job).catch((err) => console.warn('[save]', err)));

/** Gọi một lần trước khi hiện màn đăng nhập: nạp bản lưu, chuyển bản localStorage cũ sang, nhận bản khẩn cấp. */
export async function initSaves() {
  try {
    const [m, b] = await db.saves.bulkGet([MAIN, BACKUP]);
    if (m && !isValid(m)) {
      console.warn('[save] Bản lưu chính bị hỏng, dùng bản backup');
      await db.saves.put({ ...(m as LocalSave), id: CORRUPT });
    }
    main = isValid(m) ? m : null;
    backup = isValid(b) ? b : null;
  } catch (err) {
    console.warn('[save] Không mở được IndexedDB', err);
  }
  // Bản trong localStorage (bản khẩn cấp lúc đóng tab, hoặc bản cũ) mới hơn thì dùng
  let changed = false;
  for (const key of LOCAL_KEYS) {
    const old = readLocalStorage(key);
    if (isValid(old) && old.savedAt > (main?.savedAt ?? 0)) {
      if (main && main.data.day !== old.data.day) backup = { ...main, id: BACKUP };
      main = { ...old, id: MAIN };
      changed = true;
    }
  }
  if (!main && backup) {
    main = { ...backup, id: MAIN };
    changed = true;
  }
  const m = main, b = backup;
  if (changed) await queue(() => db.saves.bulkPut([m, b].filter((x): x is LocalSave => !!x)));
  clearLocalStorage();
}

/**
 * Lưu vào máy. `emergency`: tab sắp đóng, ghi thêm vào localStorage (đồng bộ nên chắc chắn kịp).
 * Tự lưu chạy liên tục nên backup chỉ đổi khi sang ngày mới: "bản trước" luôn là cuối ngày hôm qua
 * (đầu ngày hôm nay), một mốc đáng quay về chứ không phải bản của một giây trước.
 */
export function saveGame(emergency = false): boolean {
  const next: LocalSave = { id: MAIN, savedAt: Date.now(), data: snapshot() };
  if (main && main.data.day !== next.data.day) backup = { ...main, id: BACKUP };
  main = next;
  const b = backup;
  queue(() => db.saves.bulkPut(b ? [b, next] : [next]));
  if (!emergency) return true;
  try {
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** Bản lưu trong máy (chưa nạp), để so với cloud. */
export const readLocalSave = (): LocalSave | null => main;

/** Bản cuối ngày hôm trước, để người chơi quay lại. */
export const readBackupSave = (): LocalSave | null => backup;

export function loadGame(): boolean {
  if (!main) return false;
  applySnapshot(main.data);
  return true;
}

/** Quay về bản lưu trước. Bản đang chơi thành backup, nên khôi phục lần nữa là trở lại như cũ. */
export function restoreBackup(): boolean {
  if (!backup) return false;
  const prev = backup;
  const current: LocalSave = { id: BACKUP, savedAt: Date.now(), data: snapshot() };
  applySnapshot(prev.data);
  main = { id: MAIN, savedAt: Date.now(), data: snapshot() };
  backup = current;
  const m = main;
  queue(() => db.saves.bulkPut([current, m]));
  return true;
}

export function resetGame() {
  main = backup = null;
  queue(() => db.saves.clear());
  clearLocalStorage();
  useGame.setState({ ...newGameData(), shopOpen: false, panel: null, buildMode: false, placing: null });
}

/**
 * Tự lưu khi đang chơi: sau mỗi thay đổi (gộp trong 1 giây), mỗi 30 giây, và ngay khi đóng/ẩn tab
 * (lúc đó ghi thêm bản khẩn cấp đồng bộ). `canSave` chặn lưu ở màn đăng nhập (chưa nạp bản lưu,
 * ghi lúc này sẽ đè mất tiệm) và khi đang là khách trong phòng người khác.
 * `onCloud`: đẩy lên cloud khi đã đăng nhập, thưa hơn (mỗi 2 phút và khi rời tab) để không dội server.
 */
export function startAutosave(canSave: () => boolean, onCloud?: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let cloudDirty = false;
  const flush = (emergency = false) => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (!dirty || !canSave()) return;
    dirty = false;
    cloudDirty = true;
    saveGame(emergency);
  };
  const cloud = () => {
    if (!cloudDirty || !canSave()) return;
    cloudDirty = false;
    onCloud?.();
  };
  useGame.subscribe((s, prev) => {
    // Đồng hồ chạy mỗi khung hình: chỉ đổi giờ thì để mốc 30 giây lo
    if (s === prev) return;
    dirty = true;
    if (!timer && Object.keys(s).some((k) => k !== 'minutes' && s[k as keyof typeof s] !== prev[k as keyof typeof prev])) {
      timer = setTimeout(flush, 1000);
    }
  });
  setInterval(flush, 30000);
  setInterval(cloud, 120000);
  const leave = () => {
    flush(true);
    cloud();
  };
  window.addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
  });
}
