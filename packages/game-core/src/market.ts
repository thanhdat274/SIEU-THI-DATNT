import type { ActiveMarketEvent, ModifierChannel, ModifierRule, MarketState, Product } from '@game/shared';
import {
  MODIFIER_RULES, MODIFIER_RANGES, TIME_BANDS, MARKET_EVENTS, MARKET_EVENT_MAP, getProductTags, getSeasonForDay, validateMarketData,
  type MarketEventDef, type SeasonEvent,
} from '@game/data';
import { advanceWeather, climateSeasonForDay, createWeatherState, hashSeed } from './weather';
import { Mulberry32Rng, daySeed } from './staff';

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
    weatherId: effectiveWeatherId(state, day),
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

// --- Sự kiện thị trường: lịch xác định theo hạt giống, báo trước, ép thời tiết ---

/** Số ngày lên lịch trước; đủ để dự báo thời tiết 2 ngày phản ánh sự kiện ép thời tiết. */
export const EVENT_HORIZON_DAYS = 2;

function eventStartsOn(def: MarketEventDef, seed: string, day: number, lastStart: number | undefined): boolean {
  const t = def.trigger;
  if (lastStart !== undefined && day - lastStart < t.minGapDays) return false;
  if (t.weekdays && !t.weekdays.includes(weekdayOf(day))) return false;
  const climateOk = !t.climates || t.climates.includes(climateSeasonForDay(day).id);
  const season = getSeasonForDay(day);
  const seasonOk = !t.seasons || (!!season && t.seasons.includes(season.id));
  if (t.climates && t.seasons ? !(climateOk || seasonOk) : !(climateOk && seasonOk)) return false;
  return new Mulberry32Rng(daySeed(day, hashSeed(`${seed}:${def.id}`))).next() < t.chancePerDay;
}

interface EventSchedule { events: ActiveMarketEvent[]; decidedThrough: number; lastEventStart: Record<string, number> }

/** Quyết định lịch sự kiện tới hết `throughDay`, tiếp tục từ lịch đã có hoặc tính từ ngày 1 (kết quả giống nhau). */
export function scheduleEvents(seed: string, previous: Pick<MarketState, 'events' | 'decidedThrough' | 'lastEventStart'> | undefined, throughDay: number): EventSchedule {
  const events = previous?.decidedThrough !== undefined ? (previous.events ?? []).map(event => ({ ...event })) : [];
  const lastEventStart = { ...(previous?.decidedThrough !== undefined ? previous.lastEventStart ?? {} : {}) };
  let decidedThrough = previous?.decidedThrough ?? 0;
  for (let day = decidedThrough + 1; day <= throughDay; day++) {
    for (const def of MARKET_EVENTS) {
      if (!eventStartsOn(def, seed, day, lastEventStart[def.id])) continue;
      events.push({ id: def.id, startDay: day, endDay: day + def.durationDays - 1 });
      lastEventStart[def.id] = day;
    }
    decidedThrough = day;
  }
  return { events, decidedThrough, lastEventStart };
}

const prune = (events: ActiveMarketEvent[], day: number) => events.filter(event => event.endDay >= day);

export function createMarketState(seed: string, day: number): MarketState {
  const schedule = scheduleEvents(seed, undefined, day + EVENT_HORIZON_DAYS);
  return { seed, weather: createWeatherState(seed, day), events: prune(schedule.events, day), decidedThrough: schedule.decidedThrough, lastEventStart: schedule.lastEventStart };
}

export function advanceMarketState(state: MarketState, toDay: number): MarketState {
  const schedule = scheduleEvents(state.seed, state, toDay + EVENT_HORIZON_DAYS);
  return { ...state, weather: advanceWeather(state.seed, state.weather, toDay), events: prune(schedule.events, toDay), decidedThrough: schedule.decidedThrough, lastEventStart: schedule.lastEventStart };
}

export function normalizeMarketState(state: MarketState | undefined, fallbackSeed: string, day: number): MarketState {
  if (!state || typeof state.seed !== 'string' || !state.weather || !state.weather.today || !Array.isArray(state.weather.forecast)) return createMarketState(state?.seed || fallbackSeed, day);
  const base: MarketState = { ...state, weather: { ...state.weather, forecast: state.weather.forecast.slice(0, 2) } };
  if (base.weather.forecast.length !== 2) return createMarketState(state.seed, day);
  const known = { ...base, events: (base.events ?? []).filter(event => !!MARKET_EVENT_MAP[event.id]).map(event => ({ ...event })) };
  // Lịch cũ chưa có `decidedThrough` được dựng lại từ đầu; kết quả giống mọi lần tính khác.
  return known.decidedThrough === undefined ? createMarketState(known.seed, day) : advanceMarketState(known, day);
}

/** Thời tiết hiệu dụng của `day` (hôm nay hoặc một trong hai ngày dự báo): sự kiện ép thời tiết ghi đè thời tiết gốc. */
export function effectiveWeatherId(state: MarketState, day: number): string {
  const offset = day - state.weather.day;
  const raw = offset <= 0 ? state.weather.today : state.weather.forecast[offset - 1] ?? state.weather.forecast[state.weather.forecast.length - 1];
  for (const event of state.events) {
    const override = MARKET_EVENT_MAP[event.id]?.weatherOverride;
    if (override && event.startDay <= day && day <= event.endDay) return override;
  }
  return raw;
}

export interface MarketEventView { id: string; label: string; notice: string; kind: string; status: 'active' | 'upcoming'; startDay: number; endDay: number; daysLeft: number; startsIn: number }

/** Sự kiện người chơi nhìn thấy: đang chạy, hoặc đã tới cửa sổ báo trước. Sự kiện `warnDaysBefore = 0` chỉ hiện khi bắt đầu. */
export function visibleMarketEvents(state: MarketState, day: number): MarketEventView[] {
  const views: MarketEventView[] = [];
  for (const event of state.events) {
    const def = MARKET_EVENT_MAP[event.id];
    if (!def) continue;
    const active = event.startDay <= day && day <= event.endDay;
    const announced = event.startDay > day && event.startDay - day <= def.warnDaysBefore;
    if (!active && !announced) continue;
    views.push({ id: def.id, label: def.label, notice: def.notice, kind: def.kind, status: active ? 'active' : 'upcoming', startDay: event.startDay, endDay: event.endDay, daysLeft: active ? event.endDay - day + 1 : 0, startsIn: active ? 0 : event.startDay - day });
  }
  return views.sort((a, b) => a.startDay - b.startDay);
}

export interface MarketNotice { kind: 'warning' | 'start'; severity: 'normal' | 'severe'; text: string; eventIds: string[] }

/** Thông báo cho ngày `day`: sự kiện vừa bắt đầu và sự kiện vừa tới cửa sổ báo trước; gộp theo loại. */
export function marketNoticesForDay(state: MarketState, day: number): MarketNotice[] {
  const groups: Record<string, { texts: string[]; ids: string[]; severe: boolean }> = {};
  for (const event of state.events) {
    const def = MARKET_EVENT_MAP[event.id];
    if (!def) continue;
    let kind: 'warning' | 'start' | undefined;
    let text = '';
    if (event.startDay === day) { kind = 'start'; text = def.notice; }
    else if (def.warnDaysBefore > 0 && event.startDay - day === def.warnDaysBefore) { kind = 'warning'; text = `Sắp có: ${def.label} sau ${def.warnDaysBefore} ngày.`; }
    if (!kind) continue;
    const group = (groups[kind] ??= { texts: [], ids: [], severe: false });
    group.texts.push(text);
    group.ids.push(def.id);
    group.severe ||= !!def.powerOutage;
  }
  return (['start', 'warning'] as const).filter(kind => groups[kind]).map(kind => ({
    kind, severity: groups[kind].severe ? 'severe' : 'normal', text: groups[kind].texts.join(' '), eventIds: groups[kind].ids,
  }));
}

/** Giới hạn tần suất: tối đa một thông báo mỗi loại trong một giờ game. */
export class NoticeThrottle {
  private last = new Map<string, number>();
  allow(kind: string, day: number, hour: number): boolean {
    const slot = day * 24 + hour;
    if (this.last.get(kind) === slot) return false;
    this.last.set(kind, slot);
    return true;
  }
}
