import { meetsRep, type Reputation, type RepNeed } from './reputation';
import { productById } from './products';
import { COOKED_TIP_RANGE, STATION_BY_OUTPUT } from './recipes';
import type { CharacterArchetype, HairStyle, PropKind } from '../render/characterModel';
import { simRng } from '../core/rand';
import { dateOfDoy, dayOfYear, YEAR_DAYS } from './calendar';
import { REGULARS } from './regularsList';
export { REGULARS } from './regularsList';

export type PerkEffect = 'bonus_tip' | 'extra_item' | 'frequent_visit' | 'refer_friend' | 'bulk_buy' | 'festival';

export interface RegularPerk {
  /** Mốc điểm thân thiết. */
  threshold: number;
  title: string;
  description: string;
  effect: PerkEffect;
  value: number;
}

/** Ngoại hình riêng để mỗi khách quen nhìn là nhận ra. */
export interface RegularLook {
  archetype: CharacterArchetype;
  hairStyle: HairStyle;
  hair: number;
  /** Đạo cụ nghề / dấu hiệu nhận biết. */
  props: PropKind[];
  glasses: boolean;
  /** Đội mũ màu hatColor (chỉ khi archetype không có mũ nghề riêng). */
  hat?: boolean;
}

export interface RegularDef {
  id: string;
  name: string;
  role: string;
  bio: string;
  /** Màu áo, để người chơi nhận ra từ xa. */
  color: number;
  hatColor: number;
  look: RegularLook;
  favorites: string[];
  /** 0.8 = ít nhạy giá, 1.3 = rất nhạy giá (nhân với độ nhạy của món). */
  priceSensitivity: number;
  /** Chờ ở quầy tối đa bao nhiêu phút game. */
  patienceMinutes: number;
  /** Giờ hay ghé (phút trong ngày). */
  visitFrom: number;
  visitUntil: number;
  /** Cấp tiệm để khách này bắt đầu ghé. */
  unlock: number;
  /** Danh tiếng cần để khách bắt đầu ghé; không ghi thì theo cấp mở (xem regularRep). */
  rep?: RepNeed;
  lines: { greeting: string; satisfied: string; walkout: string };
  perks: RegularPerk[];
}

/** Tiến độ thân thiết với một khách quen (được lưu). */
export interface RegularProgress {
  friendship: number;
  visits: number;
  lastVisitDay?: number;
  lastFriendshipDay?: number;
  /** GĐ1557 — ngày gần nhất người chơi tặng quà (mỗi khách 1 lần/ngày). */
  lastGiftDay?: number;
  perks: string[];
  /** Món ưa thích người chơi đã phát hiện (khách mua được). */
  discovered: string[];
}

/** Khách quen influencer: bình thường mở ở cấp cao, nhưng bài khen lan truyền mời chị ấy ghé sớm. */
export const INFLUENCER_ID = 'vy_live';

export const regularById = (id: string) => REGULARS.find((r) => r.id === id);

export const emptyProgress = (): RegularProgress => ({ friendship: 0, visits: 0, perks: [], discovered: [] });

const hasPerk = (def: RegularDef, prog: RegularProgress | undefined, effect: PerkEffect) =>
  def.perks.some((p) => p.effect === effect && prog?.perks.includes(p.title));

/** Tổng giá trị các perk cùng loại đã mở. */
export const perkValue = (def: RegularDef, prog: RegularProgress | undefined, effect: PerkEffect) =>
  def.perks.filter((p) => p.effect === effect && prog?.perks.includes(p.title)).reduce((n, p) => n + p.value, 0);

/** Số bạn đi cùng (perk giới thiệu bạn bè): khách quen rủ thêm khách vãng lai vào tiệm. */
export const referFriends = (def: RegularDef, prog: RegularProgress | undefined) =>
  perkValue(def, prog, 'refer_friend');

/** Số món mua dôi ra theo lô (perk mua số lượng lớn): mỗi món khoái được mua thêm từng này chiếc. */
export const bulkExtra = (def: RegularDef, prog: RegularProgress | undefined) =>
  perkValue(def, prog, 'bulk_buy');

/** Xác suất/thời điểm sự kiện hội của khách quen: bật đúng ngày hội thì cả khu đông khách hơn. */
export const festivalVisit = (def: RegularDef, prog: RegularProgress | undefined) =>
  hasPerk(def, prog, 'festival');

/** Món ưa thích đã mở khóa ở cấp hiện tại. */
/** Khách quen mở muộn kén tiệm hơn: cấp 12+ cần 3.5★, cấp 18+ cần 4★. */
export const regularRep = (def: RegularDef): RepNeed | undefined =>
  def.rep ?? (def.unlock >= 18 ? { min: 4 } : def.unlock >= 12 ? { min: 3.5 } : undefined);

export const unlockedFavorites = (def: RegularDef, level: number) => def.favorites.filter((id) => productById(id).unlock <= level);

function hash(seed: number, day: number, id: string) {
  // Hạt giống thời tiết là số nguyên 32 bit
  let h = (Math.imul(seed >>> 0, 31) + day * 101) & 0x7fffffff;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) & 0x7fffffff;
  return h;
}

/** GĐ759 — sinh nhật khách quen (kiểu Stardew Valley, tiếng Việt đời thường): mỗi người một ngày cố định
 *  trong năm, suy ra từ id (không cần lưu, hai máy hẻm luôn khớp). Khách ĐÃ QUEN ghé chắc chắn hôm đó. */
export const BIRTHDAY_BONUS = 3;
export function birthdayDoy(def: RegularDef): number {
  let h = 7;
  for (let i = 0; i < def.id.length; i++) h = (h * 31 + def.id.charCodeAt(i)) & 0x7fffffff;
  return h % YEAR_DAYS;
}
export const isBirthday = (def: RegularDef, day: number) => dayOfYear(day) === birthdayDoy(def);
/** Ngày sinh nhật dạng "ngày/tháng" (cùng lịch với Sổ đầu ngày) để thẻ khách quen hiện cho người chơi lên kế hoạch. */
export function birthdayLabel(def: RegularDef): string {
  const d = dateOfDoy(birthdayDoy(def));
  return `${d.day}/${d.month}`;
}

/**
 * Hôm nay khách quen có ghé không: tính từ hạt giống ván + ngày nên hai máy chơi chung luôn khớp.
 * Chưa có perk "ghé thường hơn" thì không ghé hai ngày liền.
 */
export function visitsToday(def: RegularDef, day: number, seed: number, level: number, prog?: RegularProgress, rep?: Reputation): boolean {
  if (level < def.unlock || !unlockedFavorites(def, level).length) return false;
  // GĐ759: sinh nhật — khách đã quen (từng mua) nhất định ghé, một lần/ngày
  if (isBirthday(def, day) && (prog?.visits ?? 0) > 0) return prog?.lastVisitDay !== day;
  // Đã quen rồi thì vẫn ghé; khách mới chỉ tìm tới tiệm đủ uy tín
  if (rep && !prog?.visits && !meetsRep(rep, regularRep(def))) return false;
  const frequent = hasPerk(def, prog, 'frequent_visit');
  if (!frequent && prog?.lastVisitDay !== undefined && day - prog.lastVisitDay < 2) return false;
  if (prog?.lastVisitDay === day) return false;
  return (hash(seed, day, def.id) % 100) / 100 < 0.35 + (frequent ? 0.2 : 0);
}

/** Khách quen hợp lệ để ghé ngay lúc này (đúng giờ, chưa có mặt trong tiệm). */
export function pickRegular(day: number, minutes: number, seed: number, level: number, progress: Record<string, RegularProgress>, inStore: string[], rep?: Reputation, exclude: string[] = []) {
  return REGULARS.find((def) =>
    !inStore.includes(def.id) && !exclude.includes(def.id) && minutes >= def.visitFrom && minutes < def.visitUntil
    && visitsToday(def, day, seed, level, progress[def.id], rep),
  );
}

export interface RegularCheckout {
  progress: RegularProgress;
  points: number;
  newPerks: RegularPerk[];
  tip: number;
}

/** Thanh toán: có món ưa thích +2 điểm, không có +1; mỗi ngày tính điểm một lần; mở perk và tính tiền boa. */
export function regularCheckout(def: RegularDef, prev: RegularProgress | undefined, basket: { id: string; price: number }[], day: number, rng: () => number = simRng()): RegularCheckout {
  const prog: RegularProgress = prev ? { ...prev, perks: [...prev.perks], discovered: [...prev.discovered] } : emptyProgress();
  prog.visits++;
  prog.lastVisitDay = day;
  for (const it of basket) if (def.favorites.includes(it.id) && !prog.discovered.includes(it.id)) prog.discovered.push(it.id);
  const base = prog.lastFriendshipDay === day ? 0 : basket.some((it) => def.favorites.includes(it.id)) ? 2 : 1;
  const points = base + (base > 0 && isBirthday(def, day) ? BIRTHDAY_BONUS : 0); // GĐ759: quà sinh nhật = +3 thân thiết
  prog.friendship += points;
  if (points) prog.lastFriendshipDay = day;
  const newPerks = def.perks.filter((p) => prog.friendship >= p.threshold && !prog.perks.includes(p.title));
  prog.perks.push(...newPerks.map((p) => p.title));
  const total = basket.reduce((n, it) => n + it.price, 0);
  // Món nhà làm ngon miệng: khách quen mua món tự chế boa thêm tí tiền theo trạm nấu ra món
  const homeTip = basket.reduce((n, it) => {
    const station = STATION_BY_OUTPUT[it.id];
    if (!station) return n;
    const [lo, hi] = COOKED_TIP_RANGE[station] ?? [0, 0];
    return n + lo + Math.floor(rng() * (hi - lo + 1));
  }, 0);
  const tip = Math.round((total * perkValue(def, prog, 'bonus_tip') + homeTip) / 100) * 100;
  return { progress: prog, points, newPerks, tip };
}

/** Cộng/trừ thân thiết ngoài lần ghé (vd. giao đơn riêng); không bao giờ âm. */
export function regularFriendship(def: RegularDef, prev: RegularProgress | undefined, delta: number) {
  const prog: RegularProgress = prev ? { ...prev, perks: [...prev.perks], discovered: [...prev.discovered] } : emptyProgress();
  prog.friendship = Math.max(0, prog.friendship + delta);
  const newPerks = def.perks.filter((p) => prog.friendship >= p.threshold && !prog.perks.includes(p.title));
  prog.perks.push(...newPerks.map((p) => p.title));
  return { progress: prog, newPerks };
}

/**
 * Bỏ về tay không hoặc chờ quá lâu: vẫn tính là đã ghé, mất một điểm thân thiết.
 * GĐ407: khách đã nói thẳng món ưa thích bị hụt ("Hết Sữa rồi…") thì sổ khách quen ghi món đó là đã biết.
 */
export function regularWalkout(prev: RegularProgress | undefined, day: number, def?: RegularDef, missedId?: string): RegularProgress {
  const prog: RegularProgress = prev ? { ...prev, perks: [...prev.perks], discovered: [...prev.discovered] } : emptyProgress();
  if (def && missedId && def.favorites.includes(missedId) && !prog.discovered.includes(missedId)) prog.discovered.push(missedId);
  prog.visits++;
  prog.lastVisitDay = day;
  prog.friendship = Math.max(0, prog.friendship - 1);
  return prog;
}

/** Mốc perk kế tiếp (để hiện thanh tiến độ). */
export const nextPerk = (def: RegularDef, prog?: RegularProgress) => def.perks.find((p) => !prog?.perks.includes(p.title));

// ──────────────────────────────────────────────
// Giữ món theo lời hẹn (reservation): khách quen nhờ giữ một món ưa thích, mai ghé lấy
// ──────────────────────────────────────────────

/** Một lời hẹn đang giữ: món, số lượng và ngày khách sẽ ghé lấy. */
export interface Reservation {
  productId: string;
  qty: number;
  /** Ngày khách hẹn ghé lấy. */
  day: number;
}

/** Thân thiết từ mốc này khách quen mới nhờ giữ món. */
export const RESERVE_FRIENDSHIP = 15;
/** Xác suất khách quen đủ thân xin giữ món sau một lần mua hài lòng. */
export const RESERVE_CHANCE = 0.35;
/** Giữ đúng hẹn: cộng thân thiết. */
export const RESERVE_BONUS = 2;
/** Hẹn mà không được (đã ghé, không mua được món đó): mất thân thiết. */
export const RESERVE_MISS_LOSS = 2;

/** Khách đủ thân và chưa có lời hẹn nào: có thể nhờ giữ món không (kèm món với số lượng).
 *  `cookedPool`: các món nhà làm tiệm đang nấu được — khách quen có bếp sẵn hay "đặt trước suất ngon". */
export function reserveAsk(
  def: RegularDef, prog: RegularProgress | undefined, level: number, hasPending: boolean, rng: () => number,
  cookedPool: string[] = [],
): { productId: string; qty: number } | null {
  if (!prog || prog.friendship < RESERVE_FRIENDSHIP || hasPending) return null;
  if (rng() >= RESERVE_CHANCE) return null;
  const cookable = cookedPool.filter((id) => productById(id).unlock <= level);
  // Có bếp rồi thì nửa số lời hẹn là món nhà làm ("mai ghé lấy vài phần nóng hổi")
  if (cookable.length && rng() < 0.5) {
    return { productId: cookable[Math.floor(rng() * cookable.length)], qty: 1 + (rng() < 0.3 ? 1 : 0) };
  }
  const favs = unlockedFavorites(def, level);
  if (!favs.length) return null;
  return { productId: favs[Math.floor(rng() * favs.length)], qty: 1 + (rng() < 0.4 ? 1 : 0) };
}

/**
 * GĐ793 — đòi lại khách quen bị rival lôi kéo: cần tặng 1 món trong danh sách họ thích ĐANG CÓ trong kho.
 * Trả về id món để tặng (ưu tiên món mở ở cấp hiện tại, đúng thứ tự sở thích); null = thiếu quà.
 */
export function rescueGiftFor(def: RegularDef, level: number, hasStock: (id: string) => boolean): string | null {
  return unlockedFavorites(def, level).find((id) => hasStock(id)) ?? null;
}

/**
 * Danh sách khách quen dự kiến ghé hôm nay (cùng hàm hash với lịch ghé thật nên dự đoán luôn đúng).
 * Dùng cho Sổ đầu ngày: người chơi nhập sẵn hàng đúng món khách quen thích.
 * `poached`: khách đang bị rival lôi kéo thì KHÔNG ghé (customers.ts cũng loại đúng danh sách này) — Sổ không hứa hão.
 */
export function regularsExpectedToday(
  day: number, seed: number, level: number, progress: Record<string, RegularProgress>, rep?: Reputation,
  poached: string[] = [],
): RegularDef[] {
  return REGULARS.filter((def) => !poached.includes(def.id) && visitsToday(def, day, seed, level, progress[def.id], rep));
}

/** GĐ759 — khách quen có sinh nhật HÔM NAY và sẽ ghé (để Sổ đầu ngày nhắc nhập món thích). Thuần. */
export function birthdaysToday(expected: RegularDef[], day: number): RegularDef[] {
  return expected.filter((d) => isBirthday(d, day));
}

/** GĐ773 — dòng Sổ đầu ngày cho sinh nhật: nếu CÓ món họ thích trong hàng thì báo mức +5 (3 sinh nhật + 2 món thích);
 *  nếu hết thì nêu tên món thích đầu tiên cần nhập (việc ưu tiên hơn). Thuần — haveStock do UI truyền. */
export function birthdayHint(def: RegularDef, haveStock: (id: string) => boolean): { text: string; priority: number } {
  if (def.favorites.some(haveStock)) return { text: `Sinh nhật ${def.name} hôm nay — mua món họ thích là +${BIRTHDAY_BONUS + 2} thân thiết`, priority: 3 };
  const want = productById(def.favorites[0]).name;
  return { text: `Sinh nhật ${def.name} hôm nay — hết hàng họ thích, nhập ${want} để +${BIRTHDAY_BONUS + 2}`, priority: 2 };
}

/** GĐ781 — MAI là sinh nhật khách đã quen mà kho/kệ chưa có món họ thích: nhắc nhập sẵn (khách chắc chắn ghé,
 *  +5 thân thiết). Chỉ nhắc khi THIẾU hàng (đủ hàng thì không làm ồn Sổ đầu ngày). Thuần.
 *  `poached` (GĐ793): đang bị rival lôi kéo thì mai KHÔNG ghé — đừng nhắc nhập đồ cho người không tới. */
export function birthdayEve(day: number, level: number, progress: Record<string, RegularProgress>, haveStock: (id: string) => boolean, poached: string[] = []): { def: RegularDef; text: string }[] {
  const out: { def: RegularDef; text: string }[] = [];
  for (const def of REGULARS) {
    if (poached.includes(def.id)) continue;
    if (level < def.unlock || (progress[def.id]?.visits ?? 0) <= 0 || !isBirthday(def, day + 1)) continue;
    if (def.favorites.some(haveStock)) continue;
    out.push({ def, text: `Mai sinh nhật ${def.name} — nhập sẵn ${productById(def.favorites[0]).name} để +${BIRTHDAY_BONUS + 2} thân thiết` });
  }
  return out;
}
