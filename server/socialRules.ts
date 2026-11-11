/**
 * Logic thuần của "Online không đồng bộ" (SPEC-CHIEU-RONG §6) — tách khỏi server/index.ts
 * để test được: không đụng mongo/firebase/network, chỉ tính quyết định rồi trả về, theo mẫu room.ts.
 *
 * Định hướng gian lận (§6.3): không cố chống, chỉ thiết kế để gian lận vô nghĩa — mọi thứ đều có trần,
 * xếp hạng chỉ dùng chỉ số có trần tự nhiên, và có lớp kiểm tốc độ tiến nhẹ phía server.
 */

/** Bỏ chữ dễ nhầm (0/O, 1/I/L) cho mã kết bạn đọc qua điện thoại — cùng bộ với mã hẻm. */
export const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;
/** Sinh mã bạn bè (rng truyền vào để test được). */
export const newFriendCode = (rng: () => number = Math.random) =>
  Array.from({ length: CODE_LEN }, () => CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]).join('');

/** Tối đa số bạn bè của một người. */
export const MAX_FRIENDS = 30;
/** Tên tiệm trưng lên danh thiếp tối đa bao nhiêu ký tự. */
export const SHOP_NAME_MAX = 40;
/** Tên chủ hiển thị (tên Google cố ý rút gọn) tối đa. */
export const OWNER_NAME_MAX = 24;

// ───────────────── Lọc tên tiệm / tên chủ ─────────────────
// Danh sách từ cấm là dữ liệu nhạy; để server đổi được không cần đụng code. Nếu không bật biến môi
// trường thì dùng một danh sách mặc định tối thiểu (từ lóng nặng). Bị trúng thì thành tên an toàn thay thế.
const DEFAULT_BANNED = ['dit', 'loz', 'cl', 'cmnd', 'dmm', 'dem', 'cav', 'lol'];
let bannedSet: ReadonlySet<string> | null = null;
function bannedWords(): ReadonlySet<string> {
  if (!bannedSet) {
    const raw = process.env.SOCIAL_BANNED_WORDS;
    bannedSet = new Set((raw ? raw.split(',') : DEFAULT_BANNED).map((w) => w.trim().toLowerCase()).filter(Boolean));
  }
  return bannedSet;
}
/** Là tên có chứa từ bẩn (tách theo biên chữ: tiếng Việt có chữ cái ghép). */
function hasBannedWord(name: string): boolean {
  const n = name.toLowerCase();
  const bad = bannedWords();
  for (const w of bad) {
    const re = new RegExp(`(^|[^a-z0-9])(${w})($|[^a-z0-9])`, 'g');
    if (re.test(n)) return true;
  }
  return false;
}
/**
 * Làm sạch tên tiệm do người dùng tự gõ trước khi trưng lên danh thiếp (tên hiện cho người khác):
 * cắt khoảng trắng dư, giới hạn độ dài, gạch từ bẩn → trả về tên an toàn. Không phải dữ liệu thuần
 * tùy nơi (report) nên chỉ viết hoa chữ đầu mỗi đơn vị.
 */
export function sanitizeShopName(raw: string): string {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, SHOP_NAME_MAX);
  if (!s) return '';
  return hasBannedWord(s) ? 'Tiệm tạp hóa' : s;
}
/** Tên chủ hiển thị: cắt để không quá dài và lọc từ bẩn như tên tiệm, không có họ tên đầy đủ. */
export function sanitizeOwnerName(raw: string): string {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, OWNER_NAME_MAX);
  if (!s) return 'Chủ tiệm';
  return hasBannedWord(s) ? 'Chủ tiệm' : s;
}

// ───────────────── Danh thiếp tiệm (§6.4a) ─────────────────
export interface ShopCardData {
  shopName: string;
  ownerName: string;
  level: number;
  shopTier: number;
  day: number;
  titles: string[];          // tối đa 3 danh hiệu tự chọn khoe
  stance?: string;
  brandName?: string;
  alleyBond?: number;
  topDishes: { id: string; stars: number }[];
  layout: { type: string; x: number; z: number; rot: number }[];
}
export const TITLES_MAX = 3;
export const TITLE_LEN_MAX = 24;
export const TOP_DISHES_MAX = 3;
export const LAYOUT_MAX = 240;                    // đủ cho tiệm lớn, chặn nhét bậy
export const LEVEL_MAX = 200;
const STANCE_MAX = 16;
const BRAND_MAX = 24;
const ALLEY_BOND_MAX = 100;

/**
 * Chuẩn hoá + kẹp trần danh thiếp mà client gửi lên. Mọi trường đều có trần theo cấp; giá trị vô lý
 * bị kẹp về hợp lệ (không từ chối) để ai sửa bừa cũng chỉ đạt được mức vốn nhỏ (§6.3).
 */
export function normalizeCard(raw: unknown): ShopCardData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  // Danh thiếp vô nghĩa nếu không có tên tiệm lẫn chủ (thô).
  const rawShop = stringOr(r.shopName, '');
  const rawOwner = stringOr(r.ownerName, '');
  if (!rawShop.trim() && !rawOwner.trim()) return null;
  const shopName = sanitizeShopName(rawShop);
  const ownerName = sanitizeOwnerName(rawOwner);
  const level = clamp(intOr(r.level, 1), 1, LEVEL_MAX);
  const day = clamp(intOr(r.day, 1), 1, 30_000);
  const shopTier = clamp(intOr(r.shopTier, 1), 1, 20);
  const titles = Array.isArray(r.titles)
    ? r.titles.map((t) => String(t).trim().slice(0, TITLE_LEN_MAX)).filter(Boolean).slice(0, TITLES_MAX)
    : [];
  const stance = typeof r.stance === 'string' ? r.stance.slice(0, STANCE_MAX) : undefined;
  const brandName = typeof r.brandName === 'string' ? r.brandName.slice(0, BRAND_MAX) : undefined;
  const alleyBond = r.alleyBond == null ? undefined : clamp(intOr(r.alleyBond, 0), 0, ALLEY_BOND_MAX);
  const topDishes = Array.isArray(r.topDishes)
    ? r.topDishes.map((d) => {
        const o = d as Record<string, unknown>;
        return { id: String(o?.id ?? '').slice(0, 32), stars: clamp(intOr(o?.stars, 0), 0, 5) };
      }).filter((d) => d.id).slice(0, TOP_DISHES_MAX)
    : [];
  const layout = Array.isArray(r.layout)
    ? r.layout.map((o) => {
        const it = o as Record<string, unknown>;
        return { type: String(it?.type ?? '').slice(0, 24), x: numOr(it?.x, 0), z: numOr(it?.z, 0), rot: numOr(it?.rot, 0) };
      }).slice(0, LAYOUT_MAX)
    : [];
  return { shopName: shopName || 'Tiệm tạp hóa', ownerName: ownerName || 'Chủ tiệm', level, shopTier, day, titles, stance, brandName, alleyBond, topDishes, layout };
}

// ───────────────── Khoá tuần thật / dải cấp (tính theo giờ server, §6.8) ─────────────────
/** Khoá tuần dạng YYYY-MM-DD của thứ Hai (tuần Thứ Hai–Chủ nhật), bằng giờ UTC để server khớp mọi máy. */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // 0 = thứ Hai
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
/** Khoá mùa (quý thật): 13 tuần gộp thành 1 — gắn theo năm + thứ tự quý 13-tuần. */
export function seasonKey(date: Date = new Date()): string {
  const wk = weekKey(date);
  const monday = new Date(wk + 'T00:00:00Z');
  // Quý 13 tuần: đếm từ 01/01 năm đó. Số tuần từ đầu năm → chia 13.
  const yearStart = new Date(Date.UTC(monday.getUTCFullYear(), 0, 1));
  const weeks = Math.floor((monday.getTime() - yearStart.getTime()) / (7 * 86400_000));
  return `${monday.getUTCFullYear()}-Q${Math.floor(weeks / 13)}`;
}
/** Dải cấp cho bảng toàn server (§6.4d). */
export function bandForLevel(level: number): string {
  if (level <= 29) return '1-29';
  if (level <= 59) return '30-59';
  if (level <= 99) return '60-99';
  if (level <= 149) return '100-149';
  return '150-200';
}
export const BANDS = ['1-29', '30-59', '60-99', '100-149', '150-200'] as const;
export const allBands: readonly string[] = BANDS;

// ───────────────── Trần theo §6.3 / §6.4 ─────────────────
/** Lẵng hoa: mỗi ngày thật 1 lẵng cho mỗi bạn, tối đa 3 lẵng/ngày. */
export const GIFT_PER_FRIEND_DAY = 1;
export const GIFT_MAX_DAY = 3;
/** Mỗi lẵng +5 điểm trang trí trong 3 ngày game; người nhận tính tối đa 5 lẵng cùng lúc. */
export const FLOWER_DECOR_BONUS = 5;
export const FLOWER_DECOR_DAYS = 3;
export const FLOWER_MAX_ACTIVE = 5;
/** Người bán tối đa 3 lô/tuần thật, mỗi lô 1 mặt hàng, tối đa 24 đơn vị. */
export const MARKET_MAX_LOTS_WEEK = 3;
export const MARKET_MAX_QTY = 24;
/** Giá lô phải trong [60%, 95%] giá bán gợi ý (server kiểm). */
export const MARKET_MIN_RATIO = 0.6;
export const MARKET_MAX_RATIO = 0.95;
/** Lô không ai mua sau 7 ngày thật thì hàng trả về. */
export const MARKET_TTL_DAYS = 7;
/** Người mua tối đa 2 lô/ngày thật. */
export const MARKET_BUY_MAX_DAY = 2;
/** Hội chợ: chỉ người đã góp ≥ 20 món mới nhận quà mốc. */
export const FAIR_MIN_CONTRIB = 20;

// ───────────────── Điểm tuần (§6.4d) — chỉ số có trần tự nhiên ─────────────────
// Cùng 5 thành phần, tổng tối đa 100.
export const WEEK_CAPS = { challenge: 30, clean: 30, satisfaction: 20, life: 10, fair: 10 } as const;
export const WEEK_TOTAL_MAX = 100;
export interface WeekParts {
  challenge: number;   // 3 tuần game hoàn thành × 10
  clean: number;       // 2 điểm/ngày sạch
  satisfaction: number;// tỉ lệ khách hài lòng × 20
  life: number;        // việc nhà lo xong
  fair: number;        // góp hội chợ
}
/** Kẹp mỗi phần về trần rồi cộng — ai gửi vô lý cũng chỉ đạt được tổng tối đa 100 (không hơn). */
export function scorePoints(parts: Partial<WeekParts>): { parts: WeekParts; total: number } {
  const p: WeekParts = {
    challenge: clamp(intOr(parts.challenge, 0), 0, WEEK_CAPS.challenge),
    clean: clamp(intOr(parts.clean, 0), 0, WEEK_CAPS.clean),
    satisfaction: clamp(intOr(parts.satisfaction, 0), 0, WEEK_CAPS.satisfaction),
    life: clamp(intOr(parts.life, 0), 0, WEEK_CAPS.life),
    fair: clamp(intOr(parts.fair, 0), 0, WEEK_CAPS.fair),
  };
  return { parts: p, total: p.challenge + p.clean + p.satisfaction + p.life + p.fair };
}

// ───────────────── Kiểm tốc độ tiến (§6.3.5) — chống gian lận mức nhẹ ─────────────────
/** Cấp tăng tối đa hợp lý trong 1 ngày thật (ước bảo thủ từ nhịp chơi). */
export const MAX_LEVEL_GAIN_PER_DAY = 3;
/**
 * Xét tốc độ tiến của một danh thiếp từ lịch sử { day(s) game, level } mới nhất:
 * dấu hiệu gian lận = day game đi lùi, hoặc cấp tăng nhanh hơn trần theo số ngày thật giữa hai lần
 * gửi chưa đủ để đạt mức đó. Trả true = nghi (server giữ bản thật nhưng ẩn với người khác, §6.3.6).
 */
export function progressionSuspicious(
  prev: { day: number; level: number; at: number } | null,
  next: { day: number; level: number; at: number },
): { suspicious: boolean; key: 'none' | 'day-back' | 'too-fast' } {
  if (!prev) return { suspicious: false, key: 'none' };
  if (next.day < prev.day) return { suspicious: true, key: 'day-back' };
  const daysReal = Math.max(0, (next.at - prev.at) / 86400_000);
  const maxGain = Math.max(MAX_LEVEL_GAIN_PER_DAY, Math.ceil(daysReal * MAX_LEVEL_GAIN_PER_DAY * 2));
  if (next.level - prev.level > maxGain) return { suspicious: true, key: 'too-fast' };
  return { suspicious: false, key: 'none' };
}

// ───────────────── utils ─────────────────
function stringOr(v: unknown, d: string): string { return typeof v === 'string' ? v : d; }
function intOr(v: unknown, d: number): number { return typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : d; }
function numOr(v: unknown, d: number): number { return typeof v === 'number' && Number.isFinite(v) ? v : d; }
function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }
