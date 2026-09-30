import type { Product } from '@game/shared';
import { collectFactors, multiplyFactors, type AppliedFactor, type MarketContext } from './market';

export interface ProductDemand {
  base: number; // độ phổ biến cơ bản 0..1
  rawMultiplier: number; // tích các hệ số trước khi kẹp
  multiplier: number; // sau khi kẹp theo dải kênh
  demand: number; // base × multiplier
  factors: AppliedFactor[];
}

export interface TrafficInfo { raw: number; value: number; factors: AppliedFactor[] }

export interface DemandTable {
  key: string; // khóa bối cảnh dùng để biết khi nào phải tính lại
  perProduct: Record<string, ProductDemand>;
  traffic: TrafficInfo;
}

export interface DemandInput {
  ctx: MarketContext;
  products: readonly Product[];
  reputation: number; // 0..100
  priceFactor?: (productId: string) => number; // nhân nhu cầu theo giá (đợt 4); mặc định 1
  promotionTrafficFactor?: number;
}

export const TRAFFIC_REPUTATION_RANGE = { min: 0.85, max: 1.15 };

export function reputationTrafficFactor(reputation: number): number {
  const clamped = Math.min(100, Math.max(0, reputation));
  return TRAFFIC_REPUTATION_RANGE.min + (TRAFFIC_REPUTATION_RANGE.max - TRAFFIC_REPUTATION_RANGE.min) * clamped / 100;
}

export function demandContextKey(ctx: MarketContext, reputation: number): string {
  return [ctx.day, ctx.timeBand, ctx.weatherId, ctx.season?.id ?? '-', ctx.eventIds.join(','), Math.round(reputation / 5)].join('|');
}

/** Tính nhu cầu hiệu dụng từng món và lưu lượng. Thuần, không phụ thuộc kho; gọi theo khoảng thời gian, không mỗi khung hình. */
export function buildDemandTable(input: DemandInput): DemandTable {
  const perProduct: Record<string, ProductDemand> = {};
  for (const product of input.products) {
    const factors = collectFactors(input.ctx, 'demand', product);
    const price = input.priceFactor?.(product.id) ?? 1;
    if (price !== 1) factors.push({ ruleId: 'price', label: 'Giá bán so với giá tham chiếu', factor: price });
    const { raw, value } = multiplyFactors(factors, 'demand');
    const base = product.demandProfile.basePopularity;
    perProduct[product.id] = { base, rawMultiplier: raw, multiplier: value, demand: base * value, factors };
  }
  const trafficFactors = collectFactors(input.ctx, 'traffic');
  const reputation = reputationTrafficFactor(input.reputation);
  if (reputation !== 1) trafficFactors.push({ ruleId: 'reputation', label: 'Uy tín của tiệm', factor: reputation });
  if (input.promotionTrafficFactor && input.promotionTrafficFactor !== 1) trafficFactors.push({ ruleId: 'promotion', label: 'Khuyến mãi', factor: input.promotionTrafficFactor });
  const traffic = multiplyFactors(trafficFactors, 'traffic');
  return { key: demandContextKey(input.ctx, input.reputation), perProduct, traffic: { raw: traffic.raw, value: traffic.value, factors: trafficFactors } };
}

/**
 * Mức sẵn hàng: tỉ lệ nhu cầu của các kệ đang có hàng trên tổng nhu cầu của mọi kệ tiệm định bán
 * (kể cả kệ đã hết hàng). Không có kệ nào có hàng → 0 (không sinh khách).
 */
export function availabilityFactor(table: DemandTable, shelves: Array<{ productId: string | undefined; inStock: boolean }>): number {
  let stocked = 0;
  let planned = 0;
  for (const shelf of shelves) {
    if (!shelf.productId) continue;
    const demand = table.perProduct[shelf.productId]?.demand ?? 0;
    planned += demand;
    if (shelf.inStock) stocked += demand;
  }
  if (stocked <= 0 || planned <= 0) return 0;
  return Math.max(0.3, stocked / planned);
}

export function effectiveTraffic(table: DemandTable, availability: number): number {
  if (availability <= 0) return 0;
  return Math.min(2.5, Math.max(0.25, table.traffic.value * availability));
}
