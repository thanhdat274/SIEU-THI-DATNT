// ───── GĐ1289 — "Khách quen nào đáng giữ nhất về TIỀN?" (giá trị giỏ + boa mỗi lần ghé) ─────
// Sau GĐ1285 (AI đang bị phụ) còn thiếu nửa kia của quyết định giữ chân: NGƯỜI quen này mỗi lần ghé
// mang về bao nhiêu? — để biết nhập hàng / giữ chân AI trước. Helper THUẦN ĐỌC: tái dựng ĐÚNG giỏ món ưa
// + boa theo các công thức sim có sẵn — `regularWants` (customers.ts:275: count = 1 + floor(rng*2) + extra_item,
// món đầu LUÔN ưa, 75% món sau vẫn là món ưa, món ưa nhân bản theo bulk_buy) và `regularCheckout`
// (regulars.ts:167-176: boa = round(hóa đơn × bonus_tip% /100)×100). Chỉ nói con số ƯỚC TÍNH (~) từ món ưa
// ĐÃ MỞ KHÓA, không bịa khách/giỏ (Luật 5 an toàn). KHÔNG import store (co-op an toàn).
import { unlockedFavorites, perkValue, type RegularDef, type RegularProgress } from './regulars';
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
