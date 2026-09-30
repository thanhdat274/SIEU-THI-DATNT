import type { ModifierChannel, ModifierRule, MarketState, Product } from '@game/shared';
import {
  MODIFIER_RULES, MODIFIER_RANGES, TIME_BANDS, getProductTags, getSeasonForDay, validateMarketData, type SeasonEvent,
} from '@game/data';
import { climateSeasonForDay } from './weather';

export interface MarketContext {
  day: number;
  hour: number;
  season: SeasonEvent | null;
  climateId: string;
  weatherId: string;
  timeBand: string;
  weekday: number; // 0 = Thứ Hai
  eventIds: string[];
}

export interface AppliedFactor { ruleId: string; label: string; factor: number }

export function timeBandFor(hour: number): string {
  return (TIME_BANDS.find(band => hour >= band.fromHour && hour < band.toHour) ?? TIME_BANDS[TIME_BANDS.length - 1]).id;
}

/** Ngày 1 là Thứ Hai. */
export function weekdayOf(day: number): number {
  return ((Math.max(1, Math.floor(day)) - 1) % 7 + 7) % 7;
}

export function buildMarketContext(state: MarketState, day: number, hour: number): MarketContext {
  return {
    day,
    hour,
    season: getSeasonForDay(day),
    climateId: climateSeasonForDay(day).id,
    weatherId: state.weather.today,
    timeBand: timeBandFor(hour),
    weekday: weekdayOf(day),
    eventIds: state.events.filter(event => event.startDay <= day && day <= event.endDay).map(event => event.id),
  };
}

function whenMatches(rule: ModifierRule, ctx: MarketContext): boolean {
  const w = rule.when;
  if (w.season && !(ctx.season && w.season.includes(ctx.season.id))) return false;
  if (w.climate && !w.climate.includes(ctx.climateId)) return false;
  if (w.weather && !w.weather.includes(ctx.weatherId)) return false;
  if (w.timeBand && !w.timeBand.includes(ctx.timeBand)) return false;
  if (w.weekdays && !w.weekdays.includes(ctx.weekday)) return false;
  if (w.event && !w.event.some(id => ctx.eventIds.includes(id))) return false;
  return true;
}

function targetMatches(rule: ModifierRule, product: Pick<Product, 'id' | 'category'> | undefined): boolean {
  const t = rule.target;
  if (!t) return true;
  if (!product) return false;
  if (t.productIds?.includes(product.id)) return true;
  if (t.categories?.includes(product.category)) return true;
  if (t.tags?.some(tag => getProductTags(product).includes(tag))) return true;
  return false;
}

/** Các hệ số đang áp dụng cho một kênh (và một sản phẩm nếu có) — nguồn cho cả tính toán lẫn giải thích. */
export function collectFactors(
  ctx: MarketContext,
  channel: ModifierChannel,
  product?: Pick<Product, 'id' | 'category'>,
  rules: readonly ModifierRule[] = MODIFIER_RULES,
): AppliedFactor[] {
  const factors: AppliedFactor[] = [];
  for (const rule of rules) {
    const factor = rule.effects[channel];
    if (factor === undefined || !whenMatches(rule, ctx) || !targetMatches(rule, product)) continue;
    factors.push({ ruleId: rule.id, label: rule.label, factor });
  }
  return factors;
}

export function multiplyFactors(factors: readonly AppliedFactor[], channel: ModifierChannel): { raw: number; value: number } {
  const raw = factors.reduce((product, item) => product * item.factor, 1);
  const range = MODIFIER_RANGES[channel];
  return { raw, value: Math.min(range.max, Math.max(range.min, raw)) };
}

let dataChecked = false;
/** Dữ liệu sai thì không khởi động: ném lỗi nêu rõ mục sai (chỉ kiểm một lần mỗi tiến trình). */
export function assertMarketData(): void {
  if (dataChecked) return;
  const errors = validateMarketData();
  if (errors.length) throw new Error(`Dữ liệu thị trường không hợp lệ: ${errors.join('; ')}`);
  dataChecked = true;
}
