// ───── GĐ1289 — "Khách quen nào đáng giữ nhất về TIỀN?" (giá trị giỏ + boa mỗi lần ghé) ─────
// Sau GĐ1285 (AI đang bị phụ) còn thiếu nửa kia của quyết định giữ chân: NGƯỜI quen này mỗi lần ghé
// mang về bao nhiêu? — để biết nhập hàng / giữ chân AI trước. Helper THUẦN ĐỌC: tái dựng ĐÚNG giỏ món ưa
// + boa theo các công thức sim có sẵn — `regularWants` (customers.ts:275: count = 1 + floor(rng*2) + extra_item,
// món đầu LUÔN ưa, 75% món sau vẫn là món ưa, món ưa nhân bản theo bulk_buy) và `regularCheckout`
// (regulars.ts:167-176: boa = round(hóa đơn × bonus_tip% /100)×100). Chỉ nói con số ƯỚC TÍNH (~) từ món ưa
// ĐÃ MỞ KHÓA, không bịa khách/giỏ (Luật 5 an toàn). KHÔNG import store (co-op an toàn).
import { unlockedFavorites, perkValue, nextPerk, type RegularDef, type RegularProgress, type RegularPerk } from './regulars';
import { formatMoney } from './products';

export interface RegularSpend {
  /** Khách quen đang xét. */
  regular: RegularDef;
  /** Số món ưa đang mở khóa (nền để ghé). */
  favCount: number;
  /** Số món ưa ƯỚC TÍNH mỗi lần ghé (kỳ vọng từ công thức count + 75% món ưa). */
  items: number;
  /** Giỏ ước tính món ưa (đ), theo giá bán hiện tại; không tính món khác lẻ. */
  spend: number;
  /** Boa ước tính (đ) — có khi chưa mở perk bonus_tip thì 0. */
  tip: number;
  /** Giỏ + boa (đ). */
  total: number;
}

/** Số món ưa ước tính mỗi lần ghé: món đầu luôn ưa + 75% số món còn lại (đúng regularWants GĐ sim). */
export function expectedFavoriteItems(def: RegularDef, progress: RegularProgress | undefined): number {
  const extra = perkValue(def, progress, 'extra_item'); // món thêm/lần
  const expectedCount = 1.5 + extra; // count = 1 + floor(rng*2) + extra → kỳ vọng 1.5 + extra
  return Math.round((1 + 0.75 * (expectedCount - 1)) * 10) / 10;
}

/** Giá trị trung bình mỗi lần ghé (giỏ món ưa + boa) cho một khách quen, theo giá bán hiện tại.
 *  THUẦN — `priceOf` do UI truyền (đọc store ở chỗ gọi, không import state). null khi chưa mở món ưa nào. */
export function regularSpendEstimate(opts: {
  def: RegularDef;
  level: number;
  priceOf: (id: string) => number;
  progress?: RegularProgress;
}): RegularSpend | null {
  const { def, level, priceOf, progress } = opts;
  const favs = unlockedFavorites(def, level);
  if (!favs.length) return null;
  const avgPrice = favs.reduce((n, id) => n + priceOf(id), 0) / favs.length;
  const bulk = perkValue(def, progress, 'bulk_buy'); // món ưa nhân bản theo lô (1 + bulk)
  const items = expectedFavoriteItems(def, progress);
  const spend = Math.round(avgPrice * items * (1 + bulk));
  const tipRate = perkValue(def, progress, 'bonus_tip'); // tỉ lệ % hóa đơn
  const tip = tipRate > 0 ? Math.round((spend * tipRate) / 100) * 100 : 0;
  return { regular: def, favCount: favs.length, items, spend, tip, total: spend + tip };
}

/** Dòng ngắn: "giỏ ~X + boa ~Y ≈ ~Z/lần ghé" (dùng trong thẻ khách quen khi có tín hiệu giữ chân). */
export function regularValueLine(s: RegularSpend): string {
  return `${s.regular.name}: ~${formatMoney(s.spend)}/lần${s.tip > 0 ? ` + boa ~${formatMoney(s.tip)}` : ''} ≈ ~${formatMoney(s.total)} mỗi lượt ghé`;
}

// ───── GĐ1293 — "Nâng thân thiết tới mốc perk kế tiếp đáng không?" (+bao nhiêu mỗi lần ghé) ─────
// GĐ1289 đã biết khách quen này đáng bao nhiêu/lần — còn thiếu TAY QUAY của việc chăm thân thiết: mốc perk
// KẾ TIẾP (extra_item/bulk_buy/bonus_tip) tăng giỏ/boa bao nhiêu so với hiện tại? Để chủ quyết định xem có
// nên tiếp tục đối xử tốt tới mốc. THUẦN — tái dựng bằng CHÍNH regularSpendEstimate (GĐ1289) trước/sau khi
// mở perk; CHỈ quy ra tiền cho 3 hiệu ứng đổi giỏ/boa, các perk ghé/nhóm (frequent/refer/festival) không bịa
// con số (delta null). Không import store (co-op an toàn), không đổi kinh tế/save/seed.

export interface NextPerkValue {
  /** Perk kế tiếp chưa mở (MỐC thân thiết). */
  perk: RegularPerk;
  /** Còn bao nhiêu thân thiết nữa tới mốc (≥0). */
  toGo: number;
  /** Tổng giỏ+boa mỗi lần ghé nếu mở perk này; null khi perk không đổi giỏ/boa (không quy được tiền). */
  nextTotal: number | null;
  /** Mức tăng mỗi lần ghé (đ) so với hiện tại; null khi không quy được tiền. */
  delta: number | null;
}

/** Chỉ các perk làm TĂNG giỏ/boa mỗi lần ghé (quy được tiền); ghé-chung/nhóm không đổi giỏ nên bỏ. */
const MONEY_PERK_EFFECTS = new Set<string>(['extra_item', 'bulk_buy', 'bonus_tip']);

/** Mốc perk kế tiếp + giá trị tiền nó tăng thêm mỗi lần ghé (so với hiện tại). THUẦN — null khi hết perk chưa mở. */
export function nextPerkValue(opts: {
  def: RegularDef;
  level: number;
  priceOf: (id: string) => number;
  progress?: RegularProgress;
}): NextPerkValue | null {
  const { def, progress } = opts;
  const next = nextPerk(def, progress);
  if (!next) return null;
  const toGo = Math.max(0, next.threshold - (progress?.friendship ?? 0));
  if (!MONEY_PERK_EFFECTS.has(next.effect)) {
    return { perk: next, toGo, nextTotal: null, delta: null };
  }
  const base = regularSpendEstimate(opts);
  const withPerk: RegularProgress = {
    friendship: Math.max(progress?.friendship ?? 0, next.threshold),
    visits: progress?.visits ?? 0,
    lastVisitDay: progress?.lastVisitDay,
    lastFriendshipDay: progress?.lastFriendshipDay,
    perks: [...(progress?.perks ?? []), next.title],
    discovered: [...(progress?.discovered ?? [])],
  };
  const sim = regularSpendEstimate({ ...opts, progress: withPerk });
  if (!base || !sim) return { perk: next, toGo, nextTotal: null, delta: null };
  return { perk: next, toGo, nextTotal: sim.total, delta: sim.total - base.total };
}
