import type { HoldingItem, Product, StockLot } from '@game/shared';
import { MARKET_EVENT_MAP, SPOILAGE_CONDITIONS, SPOILAGE_RULES, type SpoilageCondition } from '@game/data';
import { collectFactors, multiplyFactors, type MarketContext } from './market';

const NEVER = Number.MAX_SAFE_INTEGER / 2;

export function isPowerOut(ctx: MarketContext): boolean {
  return ctx.eventIds.some(id => !!MARKET_EVENT_MAP[id]?.powerOutage);
}

export function spoilageCondition(ctx: MarketContext, product: Pick<Product, 'storageType'>): SpoilageCondition {
  const out = isPowerOut(ctx);
  return SPOILAGE_CONDITIONS.find(c =>
    c.storage === product.storageType
    && (c.powerOutage === undefined || c.powerOutage === out)
    && (!c.weather || c.weather.includes(ctx.weatherId)),
  ) ?? SPOILAGE_CONDITIONS[SPOILAGE_CONDITIONS.length - 1];
}

/** Số ngày hạn dùng bị trừ trong một ngày game: điều kiện bảo quản × hệ số sự kiện/thời tiết của nhóm hàng. */
export function spoilageRate(ctx: MarketContext, product: Pick<Product, 'id' | 'category' | 'storageType'>): number {
  const base = spoilageCondition(ctx, product).rate;
  const factor = multiplyFactors(collectFactors(ctx, 'spoilage', product), 'spoilage').value;
  return Math.min(SPOILAGE_RULES.maxDaysLostPerDay, Math.max(1, base * factor));
}

/**
 * Trừ hạn một lô theo tốc độ hao: phần lẻ dồn vào `decayCarry` để nhiều ngày cộng lại.
 * Hàng không có hạn (hạn vô hạn) và tốc độ ≤ 1 không đổi. Trả về số ngày đã trừ.
 */
export function decayLot<T extends { expiresOnDay: number; decayCarry?: number }>(lot: T, rate: number): number {
  if (lot.expiresOnDay >= NEVER || rate <= 1) return 0;
  const total = (lot.decayCarry ?? 0) + (rate - 1);
  const whole = Math.floor(total + 1e-9);
  const carry = total - whole;
  lot.expiresOnDay -= whole;
  if (carry > 1e-9) lot.decayCarry = carry; else delete lot.decayCarry;
  return whole;
}

export type DecayableLot = StockLot | HoldingItem;

/** Tách các lô đã quá hạn (<= ngày hiện tại) khỏi danh sách; trả về phần bị tách. */
export function removeExpiredLots(lots: StockLot[], day: number): StockLot[] {
  const expired = lots.filter(lot => lot.expiresOnDay <= day);
  if (expired.length) {
    const keep = lots.filter(lot => lot.expiresOnDay > day);
    lots.length = 0;
    lots.push(...keep);
  }
  return expired;
}
