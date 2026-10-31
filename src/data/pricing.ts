import { productById, type Category } from './products';
import { COOKED_PRODUCT_IDS } from './recipes';

/** Luật giá: mọi con số cân bằng nằm ở đây (lấy từ bản 2D, chỉnh cho bộ hàng 3D). */
export const PRICE_RULES = {
  /** Xác suất tối thiểu khách vẫn lấy hàng dù giá cao. */
  minKeepChance: 0.1,
  /** Giá thấp hơn gợi ý làm khách ghé nhiều hơn nhưng không vượt trần này. */
  lowPriceDemandCap: 1.15,
  lowPriceDemandSlope: 0.5,
  defaultSensitivity: 1.5,
} as const;

/** Hệ số giá tham chiếu của từng món (do thị trường khan hiếm nhích mỗi ngày; store đặt khi khởi tạo). */
let marketIndex: (productId: string) => number = () => 1;
export const setMarketIndex = (fn: typeof marketIndex) => { marketIndex = fn; };

/** Giá gợi ý hiện hành của món: giá gốc nhân hệ số thị trường (khan hàng thì trượt lên, tồn nhiều thì xuống). */
export const referenceSell = (productId: string) =>
  Math.round((productById(productId).sell * marketIndex(productId)) / 100) * 100;

/** Độ nhạy giá theo ngành hàng (cao = khách bỏ hàng nhanh khi giá tăng). */
const SENSITIVITY_BY_CATEGORY: Record<Category, number> = {
  drink: 2.2,
  dry: 1.6,
  cold: 1.4,
  frozen: 1.5,
  household: 1.0,
  fresh: 1.2,
  meat: 1.3,
};

/** Riêng vài món lệch khỏi ngành hàng. */
const SENSITIVITY_BY_PRODUCT: Record<string, number> = {
  nuoc: 2.6, // nước suối chỗ nào cũng bán
  banh: 2.0,
  snack: 2.0,
  kem: 1.8,
  gao: 1.1, // cần là mua
  trung: 1.2,
  diem: 0.8,
  mypham: 0.9,
};

export function productSensitivity(productId: string): number {
  return SENSITIVITY_BY_PRODUCT[productId] ?? SENSITIVITY_BY_CATEGORY[productById(productId).category] ?? PRICE_RULES.defaultSensitivity;
}

export type SensitivityLevel = 'hot' | 'mid' | 'soft';

/** Độ nhạy → mức: cao là khách bỏ hàng nhanh khi tăng giá (nên cẩn), thấp là "bền" (tăng được). */
export function sensitivityLevel(sensitivity: number): SensitivityLevel {
  return sensitivity >= 1.8 ? 'hot' : sensitivity <= 1.2 ? 'soft' : 'mid';
}

/** Tỉ số giá: bán / gợi ý hiện hành. > 1 là đắt hơn thị trường. */
export const priceRatio = (price: number, productId: string) => price / referenceSell(productId);

/**
 * Xác suất khách lấy món khi tới kệ. Bằng hoặc rẻ hơn giá gợi ý: luôn lấy; đắt hơn: giảm theo độ nhạy
 * của món và của khách (khách quen ít/nhiều nhạy giá hơn khách vãng lai).
 */
export function keepChance(productId: string, price: number, customerSensitivity = 1): number {
  const ratio = priceRatio(price, productId);
  if (ratio <= 1) return 1;
  return Math.max(PRICE_RULES.minKeepChance, 1 - productSensitivity(productId) * customerSensitivity * (ratio - 1));
}

/** Giá rẻ hơn gợi ý kéo thêm khách, không vượt trần; giá cao không đổi lượng khách (khách từ chối ở `keepChance`). */
export function demandPriceFactor(productId: string, price: number): number {
  const ratio = priceRatio(price, productId);
  if (ratio >= 1) return 1;
  return Math.min(PRICE_RULES.lowPriceDemandCap, 1 + PRICE_RULES.lowPriceDemandSlope * (1 - ratio));
}

export type PriceAction = 'raise' | 'hold' | 'cut';

export interface PriceSuggestion {
  action: PriceAction;
  price: number;
  reason: string;
}

/** Ngưỡng món/ngày: dưới là bán chậm, từ ngưỡng trên là bán chạy. */
const SLOW_UNITS = 1;
const FAST_UNITS = 4;
const MAX_RAISE = 0.15;
const MAX_CUT = 0.2;
/** Lời tối thiểu (phần giá bán) mới dám gợi ý đổi giá. */
const MIN_MARGIN = 0.15;
const STEP = 500;

const roundStep = (n: number) => Math.max(STEP, Math.round(n / STEP) * STEP);

/**
 * Gợi ý giá từ số món bán được và số lượt khách hỏi mua mỗi ngày (trung bình trượt đã lưu).
 * Không dùng ngẫu nhiên nên hai máy chơi chung luôn thấy cùng gợi ý.
 * `tolerance` (GĐ251): hệ số "khách chịu giá" của dịp lễ (dayEffects.tolerance — Tết 0.5, ngày
 * thường 1). Bỏ qua → hành vi như cũ (mặc định 1). Đang lễ: trần gợi ý TĂNG nới rộng thêm
 * (1 − tol)×0.3 — khách lễ ít chê đắt hơn — và ngưỡng "đắt quá phải hạ" cũng khắt khe hơn
 * (sold < wanted×0.5×tol): không bảo hạ giá chỉ vì khách lễ hỏi nhiều mà chưa mua kịp.
 */
export function suggestPrice(productId: string, price: number, soldPerDay: number | undefined, wantedPerDay: number | undefined, tolerance = 1): PriceSuggestion {
  const p = productById(productId);
  const ref = referenceSell(productId);
  const floor = roundStep(Math.ceil(p.buy * 1.05));
  const margin = price > 0 ? (price - p.buy) / price : 0;
  const tol = tolerance >= 1 ? 1 : Math.max(0, tolerance);
  if (soldPerDay === undefined && wantedPerDay === undefined) {
    return { action: 'hold', price, reason: 'Chưa đủ dữ liệu bán, giữ giá.' };
  }
  const sold = soldPerDay ?? 0;
  const wanted = wantedPerDay ?? 0;
  // Khách hỏi nhiều mà bán được ít hẳn: đang đắt quá (hoặc hết hàng) — chỉ hạ khi giá đang trên gợi ý
  const turnedAway = wanted >= 2 && sold < wanted * 0.5 * tol && price > ref;
  if (turnedAway) {
    return { action: 'cut', price: Math.max(floor, roundStep(Math.max(ref, price * (1 - MAX_CUT)))), reason: 'Khách hỏi nhiều mà chê đắt, nên hạ giá.' };
  }
  if (sold >= FAST_UNITS && margin > MIN_MARGIN && price < ref * (1.3 + (1 - tol) * 0.3)) {
    return { action: 'raise', price: roundStep(price * (1 + MAX_RAISE)), reason: tol < 1 ? 'Bán chạy, đang lễ khách chịu giá cao — tăng được mạnh hơn bình thường.' : 'Bán chạy, khách chịu giá — có thể tăng nhẹ.' };
  }
  if (sold < SLOW_UNITS && wanted < SLOW_UNITS && margin > MIN_MARGIN) {
    return { action: 'cut', price: Math.max(floor, roundStep(price * (1 - MAX_CUT))), reason: 'Bán chậm, hạ giá nhẹ để kích cầu.' };
  }
  return { action: 'hold', price, reason: 'Bán ổn, giữ giá.' };
}

// ──────────────────────────────────────────────
// Dự phóng giá bán: thuần đọc dữ liệu, không đổi công thức kinh tế
// ──────────────────────────────────────────────

/** Dữ liệu trung bình trượt đã lưu trong store (đối số truyền vào — hàm thuần, không import store). */
export interface PriceForecastInput {
  /** Món bán được trung bình mỗi ngày (sales — trung bình trượt). */
  soldPerDay?: number;
  /** Lượt khách hỏi mua trung bình mỗi ngày (demand — trung bình trượt). */
  wantedPerDay?: number;
}

export interface PriceForecast {
  /** Ước tính món bán được mỗi ngày ở giá mới. */
  unitsPerDay: number;
  /** Ước tính lãi mỗi ngày ở giá mới (giá mới − giá nhập). */
  profitPerDay: number;
  /** Baseline ở giá gốc (`product.sell`) để so sánh. */
  baseUnitsPerDay: number;
  baseProfitPerDay: number;
  /** Tỉ số món/ngày so với baseline (1 = không đổi). */
  unitsRatio: number;
  /** Tỉ số lãi/ngày so với baseline. */
  profitRatio: number;
  /** Giá mới được dự phóng. */
  price: number;
}

/** Ngưỡng "không đổi đáng kể": lệch trong ±5% coi như ngang baseline. */
export const FORECAST_FLAT_BAND = 0.05;

/**
 * Tiền gọn cho dòng dự phóng giá (panel dùng chung): +12k / −0,8tr.
 * |v| < 500đ làm tròn về "0k" KHÔNG dấu — tránh hiện "−0k"/"+0k" lạ mắt.
 */
export const formatDeltaK = (v: number) => {
  const a = Math.abs(v);
  if (Math.round(a / 1000) === 0) return '0k';
  const sign = v > 0 ? '+' : '−';
  return `${sign}${a >= 1e6 ? `${(a / 1e6).toFixed(1).replace('.', ',')}tr` : `${Math.round(a / 1000)}k`}`;
};

/**
 * Dự phóng trước khi chốt giá bán: nhân cầu trung bình trượt với độ nhạy giá hiện có
 * (`keepChance` khi giá đắt hơn thị trường, `demandPriceFactor` khi rẻ hơn) — KHÔNG đổi
 * công thức kinh tế, chỉ đọc lại đúng các hệ số mô phỏng đang dùng để ước tính.
 * Baseline là giá gốc của món (`product.sell`); kết quả luôn là "ước tính/chừng",
 * chưa kể giờ vàng, khách quen, độ chịu đựng theo thời tiết hay đối thủ phá giá.
 * Trả `null` khi: món nhà làm/nấu (giá do công thức quyết), chưa có dữ liệu bán,
 * hoặc giá trùng giá gốc (không có gì để dự phóng).
 */
export function priceForecast(productId: string, price: number, input: PriceForecastInput = {}, tolerance = 1): PriceForecast | null {
  if (COOKED_PRODUCT_IDS.has(productId)) return null;
  const p = productById(productId);
  if (!p || !Number.isFinite(price) || price === p.sell) return null;
  const sold = input.soldPerDay ?? 0;
  const wanted = input.wantedPerDay ?? 0;
  if (sold <= 0 && wanted <= 0) return null;

  const basePrice = p.sell;
  // Hệ số chuyển cầu → bán được tại từng mức giá: khách vẫn lấy (keepChance) × khách ghé thêm vì rẻ (demandPriceFactor)
  // GĐ251: tolerance của dịp lễ đi vào keepChance (khách lễ chê đắt ít hơn), mặc định 1 = hành vi cũ
  const factorAt = (at: number) => keepChance(productId, at, tolerance) * demandPriceFactor(productId, at);
  const baseFactor = factorAt(basePrice);
  const newFactor = factorAt(price);

  // Baseline: món bán thật mỗi ngày nếu có; chưa bán lần nào thì ước từ lượt khách hỏi × khả năng khách chịu giá
  const baseUnits = sold > 0 ? sold : wanted * baseFactor;
  const baseProfit = baseUnits * (basePrice - p.buy);
  const units = baseUnits * (newFactor / baseFactor);
  const profit = units * (price - p.buy);
  return {
    unitsPerDay: units,
    profitPerDay: profit,
    baseUnitsPerDay: baseUnits,
    baseProfitPerDay: baseProfit,
    unitsRatio: baseUnits > 0 ? units / baseUnits : 1,
    profitRatio: baseProfit !== 0 ? profit / baseProfit : profit > 0 ? Infinity : 1,
    price,
  };
}
