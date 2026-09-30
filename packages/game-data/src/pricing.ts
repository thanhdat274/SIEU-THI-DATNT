import type { ProductCategory } from '@game/shared';

/** Luật giá cấu hình bằng dữ liệu: mọi con số cân bằng nằm ở đây. */
export const PRICE_RULES = {
  /** Biên độ đổi tối đa của chỉ số giá tham chiếu mỗi ngày (3% = 0.03). */
  maxStepPerDay: 0.03,
  /** Chỉ số giá tham chiếu luôn nằm trong dải này so với giá gợi ý. */
  indexBounds: { min: 0.8, max: 1.4 },
  /** Dưới ngưỡng này (tổng tồn nhóm trong tiệm + kho) là khan hiếm; trên ngưỡng "dư" là ứ đọng. */
  scarcity: { lowUnits: 10, emptyUnits: 0, glutUnits: 60, lowBump: 0.04, emptyBump: 0.08, glutDrop: 0.04 },
  /** Áp lực nhu cầu chỉ tác động một phần lên giá (lũy thừa < 1 làm mềm). */
  demandPressureExponent: 0.5,
  /** Giá thấp hơn tham chiếu làm nhu cầu tăng nhưng không vượt trần này. */
  lowPriceDemandCap: 1.15,
  lowPriceDemandSlope: 0.5,
  /** Xác suất tối thiểu khách vẫn lấy hàng dù giá cao. */
  minKeepChance: 0.15,
  /** Độ nhạy giá mặc định khi sản phẩm không khớp thẻ/nhóm nào. */
  defaultSensitivity: 1.5,
} as const;

/** Độ nhạy giá theo thẻ sản phẩm (cao = khách bỏ hàng nhanh khi giá tăng). Lấy trung bình các thẻ khớp. */
export const PRICE_SENSITIVITY_BY_TAG: Record<string, number> = {
  water: 2.6,
  cold_drink: 2.2,
  snack: 2.0,
  sweet: 2.0,
  ice_cream: 1.8,
  instant_food: 1.6,
  breakfast: 1.4,
  dairy: 1.4,
  fresh: 1.2,
  meat: 1.1,
  rain_gear: 0.7, // cần gấp nên ít nhạy giá
  household: 1.0,
  cooking: 1.2,
  hot_drink: 1.5,
  comfort_food: 1.5,
};

export const PRICED_CATEGORIES: readonly ProductCategory[] = [
  'instant_noodles', 'snacks', 'candy', 'bottled_water', 'soft_drinks', 'milk', 'bread', 'eggs', 'cooking_ingredients', 'household',
];
