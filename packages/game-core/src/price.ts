import type { Product, ProductCategory } from '@game/shared';
import { PRICE_RULES, PRICED_CATEGORIES, PRICE_SENSITIVITY_BY_TAG, getProductTags } from '@game/data';
import { collectFactors, multiplyFactors, type MarketContext } from './market';
import type { DemandTable } from './demand';

export interface PriceTarget {
  target: number; // chỉ số giá mục tiêu hôm nay
  demand: number; // áp lực nhu cầu (đã làm mềm)
  scarcity: number; // hệ số khan hiếm/ứ đọng theo tồn
  cost: number; // hệ số chi phí nhập (đợt nhà cung cấp; mặc định 1)
}

export type PriceRules = typeof PRICE_RULES;

/** Tỉ số giá: bán / tham chiếu. > 1 là đắt hơn thị trường. */
export const priceRatio = (selling: number, reference: number) => reference > 0 ? selling / reference : 1;

/**
 * Xác suất khách lấy hàng khi tới kệ. Giá bằng hoặc thấp hơn tham chiếu: luôn lấy; cao hơn: giảm theo độ nhạy,
 * không dưới `minKeepChance`.
 */
export function keepChance(ratio: number, sensitivity: number, rules: PriceRules = PRICE_RULES): number {
  if (ratio <= 1) return 1;
  return Math.max(rules.minKeepChance, 1 - sensitivity * (ratio - 1));
}

/** Giá thấp hơn tham chiếu kéo nhu cầu lên, không vượt trần; giá cao không đổi nhu cầu (khách từ chối ở `keepChance`). */
export function demandPriceFactor(ratio: number, rules: PriceRules = PRICE_RULES): number {
  if (ratio >= 1) return 1;
  return Math.min(rules.lowPriceDemandCap, 1 + rules.lowPriceDemandSlope * (1 - ratio));
}

/** Độ nhạy giá của món: trung bình độ nhạy theo thẻ rồi nhân các bộ chỉnh `priceSensitivity` đang áp dụng. */
export function productSensitivity(product: Pick<Product, 'id' | 'category'>, ctx?: MarketContext): number {
  const values = getProductTags(product).map(tag => PRICE_SENSITIVITY_BY_TAG[tag]).filter((value): value is number => value !== undefined);
  const base = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : PRICE_RULES.defaultSensitivity;
  if (!ctx) return base;
  return base * multiplyFactors(collectFactors(ctx, 'priceSensitivity', product), 'priceSensitivity').value;
}

/** Một bước của chỉ số giá: tiến về mục tiêu nhưng không quá `maxStep`, luôn trong dải cho phép. */
export function stepPriceIndex(previous: number, target: number, rules: PriceRules = PRICE_RULES): number {
  const delta = Math.max(-rules.maxStepPerDay, Math.min(rules.maxStepPerDay, target - previous));
  return Math.min(rules.indexBounds.max, Math.max(rules.indexBounds.min, previous + delta));
}

export function scarcityFactor(stockUnits: number, rules: PriceRules = PRICE_RULES): number {
  const s = rules.scarcity;
  if (stockUnits <= s.emptyUnits) return 1 + s.emptyBump;
  if (stockUnits <= s.lowUnits) return 1 + s.lowBump;
  if (stockUnits >= s.glutUnits) return 1 - s.glutDrop;
  return 1;
}

/** Mục tiêu giá từng nhóm: áp lực nhu cầu (kể cả sự kiện) × khan hiếm × chi phí nhập. */
export function computePriceTargets(input: {
  products: readonly Product[];
  table: DemandTable;
  stockUnits: Record<string, number>; // theo nhóm
  costFactor?: (category: ProductCategory) => number;
  /** Nhóm hàng người chơi đang bán/giữ. Có truyền vào thì nhóm ngoài danh sách không bị tính khan hiếm/ứ đọng. */
  activeCategories?: ReadonlySet<string>;
  rules?: PriceRules;
}): Record<string, PriceTarget> {
  const rules = input.rules ?? PRICE_RULES;
  const result: Record<string, PriceTarget> = {};
  for (const category of PRICED_CATEGORIES) {
    const items = input.products.filter(product => product.category === category);
    if (!items.length) continue;
    const meanMultiplier = items.reduce((sum, product) => sum + (input.table.perProduct[product.id]?.multiplier ?? 1), 0) / items.length;
    const demand = Math.pow(meanMultiplier, rules.demandPressureExponent);
    const scarcity = input.activeCategories && !input.activeCategories.has(category) ? 1 : scarcityFactor(input.stockUnits[category] ?? 0, rules);
    const cost = input.costFactor?.(category) ?? 1;
    const target = Math.min(rules.indexBounds.max, Math.max(rules.indexBounds.min, demand * scarcity * cost));
    result[category] = { target, demand, scarcity, cost };
  }
  return result;
}

/** Đẩy chỉ số giá tham chiếu một ngày về phía mục tiêu (chỉ số chưa có = 1). */
export function advancePriceIndex(previous: Record<string, number> | undefined, targets: Record<string, PriceTarget>, rules: PriceRules = PRICE_RULES): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [category, info] of Object.entries(targets)) next[category] = stepPriceIndex(previous?.[category] ?? 1, info.target, rules);
  return next;
}
