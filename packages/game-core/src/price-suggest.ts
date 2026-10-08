/**
 * Bảng giá gợi ý theo nhu cầu thực tế — phần lõi thuần (tính năng đề xuất #3, PHẦN THUẦN / PROVISIONAL).
 *
 * Ràng buộc then chốt: logic chơi lẻ = logic chơi chung. Module này KHÔNG cần hạt giống — nó chỉ dựa trên
 * LỊCH SỬ BÁN HÀNG ĐÃ LƯU (chung cho cả hai phía qua save/replay), nên kết quả gợi ý tự khớp nhau giữa
 * chơi lẻ và co-op mà không cần server. Đây là lớp logic THUẦN: trả object gợi ý; caller (`UI`/`simulation`)
 * dùng sau này — phần nối đó ghi rõ CHỜ MÁY THẬT. Các ngưỡng/hệ số là PROVISIONAL, cần playtest.
 */
import type { SeriesPoint } from './analytics';

export interface PriceSuggestionInput {
  productId: string;
  /** Chuỗi theo ngày (day tăng dần) — thường từ `buildProductSeries`. */
  series: SeriesPoint[];
  /** Chi phí mỗi đơn vị (giá sỉ cơ bản). */
  unitCost: number;
  /** Giá bán hiện tại. */
  currentPrice: number;
  /** Số ngày gần nhất xét (mặc định 7). */
  recentDays?: number;
  /** Ngưỡng đơn vị/ngày "bán chậm" (provisional). */
  lowUnitTarget?: number;
  /** Ngưỡng đơn vị/ngày "cháy hàng" (provisional). */
  highUnitTarget?: number;
  /** Tỷ lệ nâng giá tối đa (provisional, mặc định 0.15). */
  maxRaisePct?: number;
  /** Tỷ lệ hạ giá tối đa (provisional, mặc định 0.2). */
  maxCutPct?: number;
  /** Biên lợi nhuận tối thiểu để giữ giá (provisional, mặc định 0.15). */
  holdMinMargin?: number;
}

export type PriceAction = 'raise' | 'hold' | 'cut';

export interface PriceSuggestion {
  productId: string;
  currentPrice: number;
  suggestedPrice: number;
  action: PriceAction;
  reason: string;
  /** Đơn vị/ngày trung bình trong cửa sổ quan sát (null nếu chưa đủ dữ liệu). */
  avgUnits: number | null;
  /** Biên lợi nhuận hiện tại = (giá - chi phí)/giá (0..1). */
  marginPct: number;
  /** Giá sàn: không bao giờ gợi ý dưới mức có lãi tối thiểu. */
  floorPrice: number;
}

export const PRICE_SUGGEST_DEFAULT_RECENT_DAYS = 7;
export const PRICE_SUGGEST_DEFAULT_LOW_UNIT = 1;
export const PRICE_SUGGEST_DEFAULT_HIGH_UNIT = 4;
export const PRICE_SUGGEST_DEFAULT_MAX_RAISE_PCT = 0.15;
export const PRICE_SUGGEST_DEFAULT_MAX_CUT_PCT = 0.2;
export const PRICE_SUGGEST_DEFAULT_HOLD_MIN_MARGIN = 0.15;

function roundInt(n: number): number {
  return Math.max(1, Math.round(n));
}

/**
 * Gợi ý giá bán cho một mặt hàng dựa trên lịch sử bán hàng (thuần, deterministic theo dữ liệu đã lưu).
 * Không dùng RNG → kết quả như nhau giữa chơi lẻ và chơi chung.
 */
export function suggestPrice(input: PriceSuggestionInput): PriceSuggestion {
  const recentDays = input.recentDays ?? PRICE_SUGGEST_DEFAULT_RECENT_DAYS;
  const lowUnit = input.lowUnitTarget ?? PRICE_SUGGEST_DEFAULT_LOW_UNIT;
  const highUnit = input.highUnitTarget ?? PRICE_SUGGEST_DEFAULT_HIGH_UNIT;
  const maxRaise = input.maxRaisePct ?? PRICE_SUGGEST_DEFAULT_MAX_RAISE_PCT;
  const maxCut = input.maxCutPct ?? PRICE_SUGGEST_DEFAULT_MAX_CUT_PCT;
  const holdMinMargin = input.holdMinMargin ?? PRICE_SUGGEST_DEFAULT_HOLD_MIN_MARGIN;

  const cp = input.currentPrice > 0 ? input.currentPrice : 1;
  const cost = input.unitCost > 0 ? input.unitCost : 0;
  const marginPct = cp > 0 ? Math.max(0, (cp - cost) / cp) : 0;
  const floorPrice = cost > 0 ? Math.ceil(cost * 1.05) : 1;

  // Chỉ lấy các ngày có dữ liệu bán thật (không thiếu dữ liệu) trong cửa sổ.
  const lastDay = input.series.at(-1)?.day ?? 0;
  const windowStart = Math.max(1, lastDay - recentDays + 1);
  const units = input.series
    .filter((p) => p.day >= windowStart && p.units !== null)
    .map((p) => p.units as number);
  if (units.length === 0) {
    return {
      productId: input.productId, currentPrice: cp, suggestedPrice: cp, action: 'hold',
      reason: 'Chưa đủ dữ liệu bán gần đây, giữ giá hiện tại.', avgUnits: null, marginPct, floorPrice,
    };
  }
  const avgUnits = units.reduce((s, u) => s + u, 0) / units.length;

  // Đang cháy hàng ở giá hiện tại → có thể nâng giá chút.
  if (avgUnits >= highUnit && marginPct > holdMinMargin) {
    const suggested = roundInt(cp * (1 + maxRaise));
    return {
      productId: input.productId, currentPrice: cp, suggestedPrice: Math.max(floorPrice, suggested),
      action: 'raise', reason: 'Hàng bán nhanh ở giá hiện tại, khách chịu giá — cân nhắc tăng giá nhẹ.',
      avgUnits, marginPct, floorPrice,
    };
  }
  // Bán chậm & vẫn còn biên → hạ giá nhẹ kích cầu (không xuống dưới sàn có lãi).
  if (avgUnits < lowUnit && marginPct > holdMinMargin) {
    const suggested = roundInt(cp * (1 - maxCut));
    return {
      productId: input.productId, currentPrice: cp, suggestedPrice: Math.max(floorPrice, suggested),
      action: 'cut', reason: 'Bán hơi chậm nhưng còn lãi — cân nhắc hạ giá nhẹ để kích cầu.',
      avgUnits, marginPct, floorPrice,
    };
  }
  return {
    productId: input.productId, currentPrice: cp, suggestedPrice: cp, action: 'hold',
    reason: 'Mức bán và biên lợi nhuận ổn định — giữ giá.', avgUnits, marginPct, floorPrice,
  };
}
