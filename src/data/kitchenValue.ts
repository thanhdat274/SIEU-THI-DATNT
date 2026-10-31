// ============================================================================
// Data: Kitchen value — giá trị nấu món cho TRẠM (GĐ145)
// ----------------------------------------------------------------------------
// Đóng trục "giá trị vs chi phí" cho NGUỒN LỰC SẢN XUẤT còn là hộp đen:
// trạm nấu là tài nguyên HIẾM (người chơi sở hữu ít trạm mỗi loại), nhưng
// CookPanel chỉ hiện "Lãi gộp ~X/mẻ" tĩnh — không trả lời 2 câu người nấu hỏi
// mỗi sáng:
//   1) BĂNG THÔNG: mẻ chậm lãi lớn có thể kiếm ÍT HƠN mẻ nhanh lãi vừa trên
//      cùng một trạm (tài nguyên là PHÚT TRẠM, không phải mẻ). → recipePerMinute.
//   2) GIÁ TRỊ THẬT CỦA NGUYÊN LIỆU: nguyên liệu tự trồng (buy niêm yết cao)
//      nhưng bán rời ra quầy cũng có giá — nếu bán nguyên liệu còn hời hơn nấu
//      chín rồi bán, nấu là chọn sai. → cookOrSellRaw.
// Thuần đọc 100% — chỉ đọc RECIPES + productById (buy/sell có sẵn), KHÔNG đổi
// state/kinh tế/SAVE_VERSION/persist; UI chỉ tính + hiển thị.
// ============================================================================

import { type Recipe, type CookingStation, RECIPES } from './recipes';
import { productById } from './products';

/** Lãi gộp mỗi mẻ — ĐÚNG KHỚP dòng "Lãi gộp ~X/mẻ" ở CookPanel (out.sell×outQty − Σ input.buy×qty). */
export function recipeNetMargin(r: Recipe): number {
  const out = productById(r.outputId);
  const cost = r.inputs.reduce((n, i) => n + productById(i.productId).buy * i.quantity, 0);
  return out.sell * r.outputQty - cost;
}

/** Lãi mỗi PHÚT TRẠM — băng thông khi trạm hiếm: mẻ nhanh lãi vừa có thể hơn mẻ chậm lãi to. */
export function recipePerMinute(r: Recipe): number {
  return recipeNetMargin(r) / r.durationMin;
}

/** Doanh thu bán thành phẩm nấu chín (chưa trừ chi phí). */
export function cookedRevenue(r: Recipe): number {
  return productById(r.outputId).sell * r.outputQty;
}

/** Giá trị bán NGUYÊN LIỆU RỜI ra quầy — chi phí cơ hội của việc "nấu thay vì bán nguyên liệu". */
export function rawSaleValue(r: Recipe): number {
  return r.inputs.reduce((n, i) => n + productById(i.productId).sell * i.quantity, 0);
}

export type CookVerdict = 'cook' | 'sell_raw' | 'even';

/** So sánh nấu-chín-bán vs bán-nguyên-liệu: cái nào hời hơn trên CÙNG đám nguyên liệu. */
export function cookOrSellRaw(r: Recipe): { verdict: CookVerdict; delta: number } {
  const cooked = cookedRevenue(r);
  const raw = rawSaleValue(r);
  if (cooked > raw) return { verdict: 'cook', delta: cooked - raw };
  if (cooked < raw) return { verdict: 'sell_raw', delta: raw - cooked };
  return { verdict: 'even', delta: 0 };
}

export interface RecipeKitchenInfo {
  recipe: Recipe;
  netMargin: number;
  perMinute: number;
  cookedRevenue: number;
  rawSaleValue: number;
  /** 'cook' = nấu hời hơn bán nguyên liệu; 'sell_raw' = bán nguyên liệu rời còn hời ~delta; 'even' = ngang. */
  verdict: CookVerdict;
  delta: number;
}

/** Bó đủ thông tin 1 món cho trạm. */
export function kitchenValue(r: Recipe): RecipeKitchenInfo {
  const cs = cookOrSellRaw(r);
  return {
    recipe: r,
    netMargin: recipeNetMargin(r),
    perMinute: recipePerMinute(r),
    cookedRevenue: cookedRevenue(r),
    rawSaleValue: rawSaleValue(r),
    verdict: cs.verdict,
    delta: cs.delta,
  };
}

export interface StationRankOptions {
  /** Số trạm loại này đang sở hữu (0 = chưa có trạm). */
  owned: number;
  /** Cấp người chơi — lọc món chưa mở khóa. */
  level: number;
}

/** Món thuộc trạm, sắp theo LÃI/PHÚT giảm dần (dùng trạm hiếm hiệu quả nhất trước). */
export function stationRank(station: CookingStation, opts: StationRankOptions): RecipeKitchenInfo[] {
  return RECIPES.filter((r) => r.station === station && opts.level >= r.unlock)
    .map(kitchenValue)
    .sort((a, b) => b.perMinute - a.perMinute);
}

/** Món có lãi/phút CAO NHẤT trong trạm (hoặc null khi không món hợp lệ) — dòng "trạm hiếm, món này xứng nhất". */
export function bestPerMinute(station: CookingStation, opts: StationRankOptions): RecipeKitchenInfo | null {
  const ranked = stationRank(station, opts);
  return ranked.length ? ranked[0] : null;
}

/** Có món nào trong trạm đang "bán nguyên liệu rời hời hơn nấu" không. */
export function hasSellRawAdvice(station: CookingStation, opts: StationRankOptions): boolean {
  return stationRank(station, opts).some((k) => k.verdict === 'sell_raw');
}
