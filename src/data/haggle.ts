/**
 * Hệ 5-L4 — Mặc cả tại nguồn (SPEC-CHIEU-RONG §5.6 Nhịp 3).
 *
 * Người bán có một GIÁ SÀN ẨN = mức rẻ của tuyến + thêm 0–12%, tuỳ:
 *   - bậc mối quen tại nguồn (`route:${id}` trong biz.supplierRel — mỗi bậc bớt 1%, sàn thấp hơn = mặc cả sâu hơn; L7);
 *   - số thùng mua (mua nhiều dễ ép, tối đa +2%);
 *   - kỹ năng `negotiator` (0 cho tới khi có nhân viên/tiêu chí — L8);
 *   - một phần TẤT ĐỊNH theo `hash(weatherSeed, day, routeId, 3)` (R4 — cùng seed ra cùng sàn).
 *
 * Trả giá theo PHẦN TRĂM giảm thêm so với giá NIÊM YẾT của tuyến (đã rẻ hơn mối lái):
 *   trả ≥ sàn (giảm ≤ floor) → người bán gật, chốt đúng mức đó;
 *   trả < sàn      (giảm > floor) → người bán lắc, mất một lượt, kiên nhẫn giảm.
 * Hết 3 lượt chưa chốt → mua giá niêm yết (giảm 0).
 * Ép quá tay (giảm dưới sàn hơn 8%) 3 lần liền → người bán PHẬT Ý: sàn cao hơn 3% trong 2 tuần (routeGrudge).
 *
 * Tất cả hàm THUẦN, tất định → test được "cùng seed + cùng chuỗi trả giá → cùng kết quả".
 */
import type { RouteDef } from './routes';

/** Trạng thái mặc cả trong một chuyến (TripState.haggle). */
export interface HaggleState {
  /** Số lượt trả giá đã dùng (1..3). */
  round: number;
  /** Phần trăm giảm thêm ĐÃ CHỐT (0..1). Chưa chốt = 0 (mua niêm yết). */
  best: number;
  /** Số lần phật ý liên tiếp (ép quá tay >8% dưới sàn). Đủ 3 → routeGrudge, rồi về 0. */
  anger: number;
}

export const HAGGLE_MAX_ROUNDS = 3;
/** Giới hạn giảm thêm người chơi có thể đề nghị (8% ~ tương đương mức sàn tối đa). */
export const HAGGLE_MAX_OFFER = 0.12;
/** Ép quá tay = đề nghị giảm nhiều hơn sàn này (đơn vị 0..1). */
export const HAGGLE_ANGRY_DELTA = 0.08;
/** Số tuần phật ý (sàn cao hơn 3%). */
export const HAGGLE_GRUDGE_WEEKS = 2;
/** Mức phạt sàn khi phật ý. */
export const HAGGLE_GRUDGE_PENALTY = 0.03;

/** Hàm băm tất định 0..1 (cùng khuôn với weather.nextWeather — R4). */
function hash01(seed: number, day: number, salt: number): number {
  let h = (seed ^ Math.imul(day, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Băm chuỗi id thành số 32 bit (FNV-1a). */
function strHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h ^ s.charCodeAt(i), 0x01000193)) >>> 0;
  return h;
}

/**
 * Phần trăm giảm thêm TỐI ĐA người bán chấp nhận (giá sàn, 0..1) so với giá niêm yết của tuyến.
 * `seed` = weatherSeed (thời tiết/tất định ngày); `tier` = bậc mối quen tại nguồn (0 = không);
 * `cases` = số thùng mua; `negotiator` = kỹ năng (0 cho tới khi có); `grudge` = đang bị phật ý.
 */
export function haggleFloor(
  route: Pick<RouteDef, 'id'>, seed: number, day: number,
  tier: number, cases: number, negotiator = 0, grudge = false,
): number {
  // Mức rẻ nền 2–12% tuỳ ngày/tuyến (TẤT ĐỊNH theo seed) — phần thưởng mặc cả tất định.
  const base = 0.02 + hash01(seed, day, strHash(route.id)) * 0.10;
  let floor = base
    + tier * 0.01                       // mối quen 1%/bậc (sàn thấp hơn = mặc cả sâu hơn)
    + Math.min(0.02, cases * 0.004)     // mua nhiều dễ ép, tối đa +2%
    + negotiator * 0.01;                // kỹ năng negotiator (chưa có → 0)
  if (grudge) floor += HAGGLE_GRUDGE_PENALTY;
  return Math.max(0, Math.min(0.16, floor));
}

/** Giảm thêm đang có hiệu lực cho xe hàng (0 khi chưa chốt / mua niêm yết). */
export const haggleDiscount = (h: HaggleState | undefined): number =>
  Math.max(0, Math.min(1, h?.best ?? 0));

/**
 * Đánh giá một lượt trả giá `offer` (phần trăm giảm thêm 0..1) so với sàn `floor`.
 * Trả về: có chấp không, round mới, anger mới, và có nổi phật ý lần này không.
 */
export function haggleOffer(
  h: HaggleState | undefined, offer: number, floor: number,
): { accepted: boolean; round: number; anger: number; grudge: boolean } {
  const round = Math.min(HAGGLE_MAX_ROUNDS, (h?.round ?? 0) + 1);
  let anger = h?.anger ?? 0;
  offer = Math.max(0, Math.min(1, offer));
  if (offer <= floor) {
    // Trả trên sàn → gật, chốt.
    return { accepted: true, round, anger: 0, grudge: false };
  }
  // Trả dưới sàn → lắc, mất lượt. Ép quá tay (>8% dưới sàn) → nổi phật ý tích luỹ.
  if (offer > floor + HAGGLE_ANGRY_DELTA) anger += 1; else anger = 0;
  let grudge = false;
  if (anger >= 3) { grudge = true; anger = 0; }
  return { accepted: false, round, anger, grudge };
}

/** Khởi tạo haggle cho một lượt trả giá đầu tiên (đã dùng 1 lượt). */
export const beginHaggle = (accepted: boolean, best: number, anger: number): HaggleState =>
  ({ round: 1, best: accepted ? best : 0, anger });
