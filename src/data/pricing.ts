import { productById, type Category } from './products';

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
 */
export function suggestPrice(productId: string, price: number, soldPerDay: number | undefined, wantedPerDay: number | undefined): PriceSuggestion {
  const p = productById(productId);
  const ref = referenceSell(productId);
  const floor = roundStep(Math.ceil(p.buy * 1.05));
  const margin = price > 0 ? (price - p.buy) / price : 0;
  if (soldPerDay === undefined && wantedPerDay === undefined) {
    return { action: 'hold', price, reason: 'Chưa đủ dữ liệu bán, giữ giá.' };
  }
  const sold = soldPerDay ?? 0;
  const wanted = wantedPerDay ?? 0;
  // Khách hỏi nhiều mà bán được ít hẳn: đang đắt quá (hoặc hết hàng) — chỉ hạ khi giá đang trên gợi ý
  const turnedAway = wanted >= 2 && sold < wanted * 0.5 && price > ref;
  if (turnedAway) {
    return { action: 'cut', price: Math.max(floor, roundStep(Math.max(ref, price * (1 - MAX_CUT)))), reason: 'Khách hỏi nhiều mà chê đắt, nên hạ giá.' };
  }
  if (sold >= FAST_UNITS && margin > MIN_MARGIN && price < ref * 1.3) {
    return { action: 'raise', price: roundStep(price * (1 + MAX_RAISE)), reason: 'Bán chạy, khách chịu giá — có thể tăng nhẹ.' };
  }
  if (sold < SLOW_UNITS && wanted < SLOW_UNITS && margin > MIN_MARGIN) {
    return { action: 'cut', price: Math.max(floor, roundStep(price * (1 - MAX_CUT))), reason: 'Bán chậm, hạ giá nhẹ để kích cầu.' };
  }
  return { action: 'hold', price, reason: 'Bán ổn, giữ giá.' };
}
