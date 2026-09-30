import type { Product, SupplierConfig, SupplierDayState } from '@game/shared';
import { ALL_PRODUCTS, MARKET_EVENT_MAP, PRICED_CATEGORIES, SUPPLIER_MARKET_RULES } from '@game/data';
import { collectFactors, multiplyFactors, weekdayOf, type AppliedFactor, type MarketContext } from './market';
import { Mulberry32Rng, daySeed } from './staff';
import { hashSeed } from './weather';

const { maxStepPerDay, indexBounds, reasonsShown, minStockWhenOpen } = SUPPLIER_MARKET_RULES;

const clampIndex = (value: number) => Math.min(indexBounds.max, Math.max(indexBounds.min, value));

/** Bước giá sỉ mỗi ngày: tiến về mục tiêu nhưng không quá biên độ, luôn trong dải. */
export function stepWholesaleIndex(previous: number, target: number): number {
  return clampIndex(previous + Math.max(-maxStepPerDay, Math.min(maxStepPerDay, target - previous)));
}

/** Ưu đãi số lượng lớn của một dòng hàng (bậc cao nhất đạt được). */
export function bulkDiscount(supplier: Pick<SupplierConfig, 'bulkTiers'>, quantity: number): number {
  let discount = 0;
  for (const tier of supplier.bulkTiers ?? []) if (quantity >= tier.minQty) discount = tier.discount;
  return discount;
}

/** Ngày giao đầu tiên không sớm hơn `earliestDay` mà rơi vào lịch giao của nhà cung cấp (mọi ngày nếu không có lịch). */
export function nextDeliveryDay(supplier: Pick<SupplierConfig, 'deliveryWeekdays'>, earliestDay: number): number {
  const schedule = supplier.deliveryWeekdays;
  if (!schedule?.length) return earliestDay;
  for (let offset = 0; offset < 7; offset++) if (schedule.includes(weekdayOf(earliestDay + offset))) return earliestDay + offset;
  return earliestDay;
}

export interface WholesaleQuote { unit: number; listPrice: number; indexFactor: number; bulk: number }

/** Đơn giá thực: giá nhập chuẩn × hệ số giá sỉ của nhóm × (1 − ưu đãi số lượng) × (1 − chiết khấu mối). */
export function wholesaleQuote(supplier: SupplierConfig, product: Pick<Product, 'purchasePrice' | 'category'>, state: SupplierDayState | undefined, quantity = 1): WholesaleQuote {
  const indexFactor = state?.priceIndex[product.category] ?? 1;
  const bulk = bulkDiscount(supplier, quantity);
  const listPrice = product.purchasePrice * indexFactor * (1 - bulk);
  return { unit: Math.max(1, Math.round(listPrice * (1 - supplier.discountRate))), listPrice, indexFactor, bulk };
}

function topReasons(factors: AppliedFactor[]): string[] {
  const seen = new Map<string, AppliedFactor>();
  for (const factor of factors) if (Math.abs(Math.log(factor.factor)) > 1e-9 && !seen.has(factor.ruleId)) seen.set(factor.ruleId, factor);
  return [...seen.values()].sort((a, b) => Math.abs(Math.log(b.factor)) - Math.abs(Math.log(a.factor))).slice(0, reasonsShown).map(item => `${item.label} (${item.factor >= 1 ? '+' : ''}${Math.round((item.factor - 1) * 100)}%)`);
}

/**
 * Trạng thái một ngày của nhà cung cấp. `previous` (ngày trước) cho phép giá sỉ trôi từng bước;
 * không có `previous` thì mọi hệ số giá bắt đầu ở mức chuẩn (1.0). Xác định theo hạt giống.
 */
export function computeSupplierDay(seed: string, supplier: SupplierConfig, ctx: MarketContext, previous?: SupplierDayState): SupplierDayState {
  const priceIndex: Record<string, number> = {};
  const prevIndex: Record<string, number> = {};
  const reasons: Record<string, string[]> = {};
  for (const category of PRICED_CATEGORIES) {
    const items = ALL_PRODUCTS.filter(product => product.category === category);
    if (!items.length) continue;
    const factors = items.flatMap(product => collectFactors(ctx, 'wholesalePrice', product));
    const meanFactor = items.reduce((sum, product) => sum + multiplyFactors(collectFactors(ctx, 'wholesalePrice', product), 'wholesalePrice').value, 0) / items.length;
    const wobbleRoll = new Mulberry32Rng(daySeed(ctx.day, hashSeed(`${seed}:${supplier.id}:${category}`))).next();
    const wobble = 1 + (supplier.priceVolatility ?? 0) * (2 * wobbleRoll - 1);
    const target = clampIndex(meanFactor * wobble);
    const before = previous?.priceIndex[category] ?? 1;
    prevIndex[category] = before;
    priceIndex[category] = previous ? stepWholesaleIndex(before, target) : 1;
    reasons[category] = topReasons(factors);
  }

  const stockCap: Record<string, number> = {};
  const stockLeft: Record<string, number> = {};
  const unavailable: string[] = [];
  const base = supplier.stockPerProductPerDay;
  const outageChance = Math.max(0, ...ctx.eventIds.map(id => MARKET_EVENT_MAP[id]?.supplierOutageChance ?? 0)) * (supplier.outageFactor ?? 1);
  if (base !== undefined) {
    for (const product of ALL_PRODUCTS) {
      const factor = multiplyFactors(collectFactors(ctx, 'supplierStock', product), 'supplierStock').value;
      const outRoll = new Mulberry32Rng(daySeed(ctx.day, hashSeed(`${seed}:${supplier.id}:${product.id}:out`))).next();
      const out = outageChance > 0 && outRoll < outageChance;
      const cap = out || factor <= 0 ? 0 : Math.max(minStockWhenOpen, Math.round(base * factor));
      stockCap[product.id] = cap;
      stockLeft[product.id] = cap;
      if (out) unavailable.push(product.id);
    }
  }
  return { day: ctx.day, priceIndex, prevIndex, reasons, stockCap, stockLeft, unavailable };
}
