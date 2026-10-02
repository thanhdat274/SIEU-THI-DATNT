import type { ModifierChannel, ModifierRule } from '@game/shared';
import { ALL_PRODUCTS, PRODUCT_CATEGORY_LABELS, PRODUCT_MAP } from './products';
import { ALL_KNOWN_TAGS } from './product-tags';
import { SEASON_EVENTS, SEASON_YEAR_DAYS } from './seasons';
import { CLIMATE_SEASONS, WEATHER_MAP, WEATHER_TYPES } from './weather';
import { MARKET_EVENTS, MARKET_EVENT_RULES } from './market-events';
import { validateSupplierData } from './supplier-market';

/** Dải kẹp của tích các hệ số mỗi kênh. */
export const MODIFIER_RANGES: Record<ModifierChannel, { min: number; max: number }> = {
  demand: { min: 0.2, max: 3 },
  traffic: { min: 0.25, max: 2.5 },
  wholesalePrice: { min: 0.5, max: 2 },
  supplierStock: { min: 0, max: 2 },
  spoilage: { min: 0.25, max: 4 },
  priceSensitivity: { min: 0.25, max: 3 },
};

/** Giới hạn của một hệ số đơn lẻ trong dữ liệu (để tích không cực đoan). */
export const SINGLE_FACTOR_LIMITS = { min: 0.1, max: 4 };

export interface TimeBand { id: string; label: string; fromHour: number; toHour: number } // [from, to)

export const TIME_BANDS: readonly TimeBand[] = [
  { id: 'morning', label: 'Buổi sáng', fromHour: 0, toHour: 11 },
  { id: 'noon', label: 'Buổi trưa', fromHour: 11, toHour: 14 },
  { id: 'afternoon', label: 'Buổi chiều', fromHour: 14, toHour: 18 },
  { id: 'evening', label: 'Buổi tối', fromHour: 18, toHour: 24 },
];

export const WEEKDAY_LABELS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'] as const;

// --- Bộ chỉnh dùng chung cho mọi hệ (nhu cầu, lưu lượng, về sau giá sỉ/tồn/hỏng) ---

const WEATHER_RULES: ModifierRule[] = [
  { id: 'weather_sunny_traffic', label: 'Trời nắng ráo, người ra đường nhiều', source: 'weather', when: { weather: ['sunny'] }, effects: { traffic: 1.05 } },
  { id: 'weather_hot_traffic', label: 'Trời nóng, khách ghé mua nhanh thường xuyên hơn', source: 'weather', when: { weather: ['hot'] }, effects: { traffic: 1.15 } },
  { id: 'weather_hot_cold_drink', label: 'Trời nóng: đồ uống mát bán chạy', source: 'weather', when: { weather: ['hot'] }, target: { tags: ['cold_drink'] }, effects: { demand: 1.6 } },
  { id: 'weather_hot_ice_cream', label: 'Trời nóng: kem đắt hàng', source: 'weather', when: { weather: ['hot'] }, target: { tags: ['ice_cream'] }, effects: { demand: 2.2 } },
  { id: 'weather_hot_hot_items', label: 'Trời nóng: đồ nóng ít người mua', source: 'weather', when: { weather: ['hot'] }, target: { tags: ['hot_drink', 'hot_food', 'comfort_food'] }, effects: { demand: 0.6 } },
  { id: 'weather_hot_instant', label: 'Trời nóng: ít ai ăn mì gói', source: 'weather', when: { weather: ['hot'] }, target: { tags: ['instant_food'] }, effects: { demand: 0.8 } },

  { id: 'weather_rainy_traffic', label: 'Trời mưa, khách ghé ít hơn', source: 'weather', when: { weather: ['rainy'] }, effects: { traffic: 0.8 } },
  { id: 'weather_rainy_gear', label: 'Trời mưa: ô, áo mưa cần dùng', source: 'weather', when: { weather: ['rainy'] }, target: { tags: ['rain_gear'] }, effects: { demand: 2 } },
  { id: 'weather_rainy_comfort', label: 'Trời mưa: mì gói, đồ nóng hợp trời', source: 'weather', when: { weather: ['rainy'] }, target: { tags: ['instant_food', 'hot_drink', 'comfort_food'] }, effects: { demand: 1.45 } },
  { id: 'weather_rainy_snack', label: 'Trời mưa: bánh kẹo ăn vặt', source: 'weather', when: { weather: ['rainy'] }, target: { tags: ['snack'] }, effects: { demand: 1.2 } },
  { id: 'weather_rainy_cold_drink', label: 'Trời mưa: ít ai uống nước mát', source: 'weather', when: { weather: ['rainy'] }, target: { tags: ['cold_drink', 'ice_cream'] }, effects: { demand: 0.8 } },

  { id: 'weather_heavy_rain_traffic', label: 'Mưa to, ít người ra đường', source: 'weather', when: { weather: ['heavy_rain'] }, effects: { traffic: 0.6 } },
  { id: 'weather_heavy_rain_gear', label: 'Mưa to: ô, áo mưa cháy hàng', source: 'weather', when: { weather: ['heavy_rain'] }, target: { tags: ['rain_gear'] }, effects: { demand: 2.6 } },
  { id: 'weather_heavy_rain_comfort', label: 'Mưa to: tích trữ mì gói, đồ nóng', source: 'weather', when: { weather: ['heavy_rain'] }, target: { tags: ['instant_food', 'hot_drink', 'comfort_food'] }, effects: { demand: 1.7 } },
  { id: 'weather_heavy_rain_cold_drink', label: 'Mưa to: đồ mát ế', source: 'weather', when: { weather: ['heavy_rain'] }, target: { tags: ['cold_drink', 'ice_cream'] }, effects: { demand: 0.65 } },

  { id: 'weather_cold_traffic', label: 'Trời lạnh, khách ghé hơi ít', source: 'weather', when: { weather: ['cold'] }, effects: { traffic: 0.92 } },
  { id: 'weather_cold_hot_items', label: 'Trời lạnh: đồ nóng bán chạy', source: 'weather', when: { weather: ['cold'] }, target: { tags: ['hot_drink', 'instant_food', 'comfort_food'] }, effects: { demand: 1.7 } },
  { id: 'weather_cold_cold_items', label: 'Trời lạnh: đồ mát, kem ế', source: 'weather', when: { weather: ['cold'] }, target: { tags: ['cold_drink', 'ice_cream'] }, effects: { demand: 0.5 } },

  { id: 'weather_storm_traffic', label: 'Giông bão, hầu như không ai ra đường', source: 'weather', when: { weather: ['storm'] }, effects: { traffic: 0.4 } },
  { id: 'weather_storm_stock_up', label: 'Giông bão: tích trữ đồ ăn liền và đồ che mưa', source: 'weather', when: { weather: ['storm'] }, target: { tags: ['instant_food', 'rain_gear'] }, effects: { demand: 2 } },

  { id: 'weather_special_traffic', label: 'Sương mù dày, khách đi lại chậm', source: 'weather', when: { weather: ['special'] }, effects: { traffic: 0.9 } },
  { id: 'weather_special_hot_drink', label: 'Sương mù: thèm đồ uống nóng', source: 'weather', when: { weather: ['special'] }, target: { tags: ['hot_drink'] }, effects: { demand: 1.3 } },
];

const TIME_RULES: ModifierRule[] = [
  { id: 'time_morning_traffic', label: 'Buổi sáng khách ghé mua đồ ăn sáng', source: 'time', when: { timeBand: ['morning'] }, effects: { traffic: 1.1 } },
  { id: 'time_morning_breakfast', label: 'Buổi sáng: đồ ăn sáng, cà phê', source: 'time', when: { timeBand: ['morning'] }, target: { tags: ['breakfast', 'quick_food', 'hot_drink'] }, effects: { demand: 1.5 } },
  { id: 'time_noon_instant', label: 'Buổi trưa: đồ ăn nhanh', source: 'time', when: { timeBand: ['noon'] }, target: { tags: ['instant_food', 'quick_food'] }, effects: { demand: 1.15 } },
  { id: 'time_afternoon_snack', label: 'Buổi chiều: ăn vặt, nước uống', source: 'time', when: { timeBand: ['afternoon'] }, target: { tags: ['snack', 'cold_drink'] }, effects: { demand: 1.25 } },
  { id: 'time_afternoon_traffic', label: 'Buổi chiều khách thưa hơn', source: 'time', when: { timeBand: ['afternoon'] }, effects: { traffic: 0.95 } },
  { id: 'time_evening_traffic', label: 'Buổi tối khách tan làm ghé mua', source: 'time', when: { timeBand: ['evening'] }, effects: { traffic: 1.15 } },
  { id: 'time_evening_needs', label: 'Buổi tối: đồ ăn liền, đồ gia dụng, nước uống', source: 'time', when: { timeBand: ['evening'] }, target: { tags: ['instant_food', 'household', 'cold_drink', 'fresh'] }, effects: { demand: 1.25 } },
];

const WEEKDAY_RULES: ModifierRule[] = [
  { id: 'weekday_weekend_traffic', label: 'Cuối tuần khách đông hơn', source: 'weekday', when: { weekdays: [5, 6] }, effects: { traffic: 1.2 } },
  { id: 'weekday_weekend_snack', label: 'Cuối tuần: bánh kẹo, đồ uống', source: 'weekday', when: { weekdays: [5, 6] }, target: { tags: ['snack', 'cold_drink'] }, effects: { demand: 1.15 } },
  { id: 'weekday_monday_traffic', label: 'Đầu tuần khách ít hơn', source: 'weekday', when: { weekdays: [0] }, effects: { traffic: 0.95 } },
];

/** Bộ chỉnh mùa sinh ra từ dữ liệu SEASON_EVENTS để không có hai nguồn sự thật. */
const SEASON_RULES: ModifierRule[] = SEASON_EVENTS.flatMap((season): ModifierRule[] => [
  { id: `season_${season.id}_traffic`, label: `${season.name}: lượng khách`, source: 'season', when: { season: [season.id] }, effects: { traffic: season.demandMultiplier } },
  { id: `season_${season.id}_preferred`, label: `${season.name}: nhóm hàng được ưa chuộng`, source: 'season', when: { season: [season.id] }, target: { categories: season.preferredCategories }, effects: { demand: 1.6 } },
  ...(season.supplier?.priceMultiplier ? [{ id: `season_${season.id}_wholesale`, label: `${season.name}: giá sỉ`, source: 'season', when: { season: [season.id] }, effects: { wholesalePrice: season.supplier.priceMultiplier } } as ModifierRule] : []),
  ...(season.supplier?.stockMultiplier ? [{ id: `season_${season.id}_supplier_stock`, label: `${season.name}: hàng về nhà cung cấp`, source: 'season', when: { season: [season.id] }, effects: { supplierStock: season.supplier.stockMultiplier } } as ModifierRule] : []),
  ...Object.entries(season.demandByTag ?? {}).map(([tag, factor]): ModifierRule => ({
    id: `season_${season.id}_tag_${tag}`, label: `${season.name}: ${tag}`, source: 'season', when: { season: [season.id] }, target: { tags: [tag] }, effects: { demand: factor },
  })),
]);

export const MODIFIER_RULES: readonly ModifierRule[] = [...SEASON_RULES, ...WEATHER_RULES, ...TIME_RULES, ...WEEKDAY_RULES, ...MARKET_EVENT_RULES];

export function validateMarketData(rules: readonly ModifierRule[] = MODIFIER_RULES): string[] {
  const errors: string[] = [];
  const seenRuleIds = new Set<string>();
  const knownTags = new Set(ALL_KNOWN_TAGS);
  const weatherIds = new Set(WEATHER_TYPES.map(item => item.id));
  const seasonIds = new Set<string>(SEASON_EVENTS.map(item => item.id));
  const climateIds = new Set(CLIMATE_SEASONS.map(item => item.id));
  const bandIds = new Set(TIME_BANDS.map(item => item.id));

  // Mùa sự kiện: trong năm, không chồng lấn, sản phẩm tồn tại
  const sortedSeasons = [...SEASON_EVENTS].sort((a, b) => a.startDayOfYear - b.startDayOfYear);
  sortedSeasons.forEach((season, index) => {
    if (season.startDayOfYear < 0 || season.endDayOfYear >= SEASON_YEAR_DAYS || season.startDayOfYear > season.endDayOfYear) errors.push(`season ${season.id}: khoảng ngày không hợp lệ`);
    const next = sortedSeasons[index + 1];
    if (next && season.endDayOfYear >= next.startDayOfYear) errors.push(`season ${season.id} chồng lấn với ${next.id}`);
    for (const id of season.seasonalProductIds ?? []) if (!PRODUCT_MAP[id]) errors.push(`season ${season.id}: sản phẩm ${id} không tồn tại`);
    for (const [tag, factor] of Object.entries(season.demandByTag ?? {})) {
      if (!knownTags.has(tag)) errors.push(`season ${season.id}: thẻ ${tag} không tồn tại`);
      if (factor < SINGLE_FACTOR_LIMITS.min || factor > SINGLE_FACTOR_LIMITS.max) errors.push(`season ${season.id}: hệ số ${tag} ngoài dải`);
    }
  });

  // Mùa khí hậu: liền mạch, phủ kín năm, trọng số hợp lệ
  const sortedClimate = [...CLIMATE_SEASONS].sort((a, b) => a.startDayOfYear - b.startDayOfYear);
  let expectedStart = 0;
  for (const climate of sortedClimate) {
    if (climate.startDayOfYear !== expectedStart) errors.push(`climate ${climate.id}: khoảng trống/chồng lấn tại ngày ${expectedStart}`);
    expectedStart = climate.endDayOfYear + 1;
    const total = Object.entries(climate.weights).reduce((sum, [weatherId, weight]) => {
      if (!WEATHER_MAP[weatherId]) errors.push(`climate ${climate.id}: thời tiết ${weatherId} không tồn tại`);
      if (!(weight >= 0)) errors.push(`climate ${climate.id}: trọng số ${weatherId} âm`);
      return sum + (weight > 0 ? weight : 0);
    }, 0);
    if (total <= 0) errors.push(`climate ${climate.id}: tổng trọng số bằng 0`);
  }
  if (expectedStart !== SEASON_YEAR_DAYS) errors.push(`climate không phủ kín ${SEASON_YEAR_DAYS} ngày (dừng ở ${expectedStart})`);

  // Khung giờ liền mạch 0–24
  let hour = 0;
  for (const band of TIME_BANDS) { if (band.fromHour !== hour) errors.push(`time band ${band.id}: không liền mạch`); hour = band.toHour; }
  if (hour !== 24) errors.push('time bands không phủ đủ 24 giờ');

  // Sự kiện thị trường
  const eventIds = new Set<string>(MARKET_EVENTS.map(item => item.id));
  for (const event of MARKET_EVENTS) {
    if (event.durationDays < 1) errors.push(`event ${event.id}: thời lượng < 1 ngày`);
    if (event.manual ? event.trigger.chancePerDay !== 0 : !(event.trigger.chancePerDay > 0 && event.trigger.chancePerDay <= 1)) errors.push(`event ${event.id}: xác suất ngoài (0,1] (sự kiện thủ công phải bằng 0)`);
    if (event.trigger.minGapDays < event.durationDays) errors.push(`event ${event.id}: khoảng cách tối thiểu nhỏ hơn thời lượng`);
    if (event.supplierOutageChance !== undefined && !(event.supplierOutageChance >= 0 && event.supplierOutageChance <= 1)) errors.push(`event ${event.id}: xác suất ngừng cung ngoài [0,1]`);
    if (event.warnDaysBefore < 0 || event.warnDaysBefore > 2) errors.push(`event ${event.id}: báo trước phải từ 0 đến 2 ngày`);
    if (event.weatherOverride && !weatherIds.has(event.weatherOverride)) errors.push(`event ${event.id}: thời tiết ép ${event.weatherOverride} không tồn tại`);
    if (event.weatherOverride && event.warnDaysBefore < 2) errors.push(`event ${event.id}: sự kiện ép thời tiết phải báo trước 2 ngày để dự báo khớp`);
    for (const id of event.trigger.climates ?? []) if (!climateIds.has(id)) errors.push(`event ${event.id}: mùa khí hậu ${id} không tồn tại`);
    for (const id of event.trigger.seasons ?? []) if (!seasonIds.has(id)) errors.push(`event ${event.id}: mùa ${id} không tồn tại`);
    for (const day of event.trigger.weekdays ?? []) if (!Number.isInteger(day) || day < 0 || day > 6) errors.push(`event ${event.id}: thứ ${day} không hợp lệ`);
  }

  for (const rule of rules) {
    for (const id of rule.when.event ?? []) if (!eventIds.has(id)) errors.push(`rule ${rule.id}: sự kiện ${id} không tồn tại`);
    if (seenRuleIds.has(rule.id)) errors.push(`rule ${rule.id}: trùng id`);
    seenRuleIds.add(rule.id);
    for (const [channel, factor] of Object.entries(rule.effects)) {
      if (!(channel in MODIFIER_RANGES)) errors.push(`rule ${rule.id}: kênh ${channel} không tồn tại`);
      if (typeof factor !== 'number' || !Number.isFinite(factor) || factor < SINGLE_FACTOR_LIMITS.min || factor > SINGLE_FACTOR_LIMITS.max) errors.push(`rule ${rule.id}: hệ số ${channel}=${factor} ngoài dải cho phép`);
    }
    for (const id of rule.when.weather ?? []) if (!weatherIds.has(id)) errors.push(`rule ${rule.id}: thời tiết ${id} không tồn tại`);
    for (const id of rule.when.season ?? []) if (!seasonIds.has(id)) errors.push(`rule ${rule.id}: mùa ${id} không tồn tại`);
    for (const id of rule.when.climate ?? []) if (!climateIds.has(id)) errors.push(`rule ${rule.id}: mùa khí hậu ${id} không tồn tại`);
    for (const id of rule.when.timeBand ?? []) if (!bandIds.has(id)) errors.push(`rule ${rule.id}: khung giờ ${id} không tồn tại`);
    for (const day of rule.when.weekdays ?? []) if (!Number.isInteger(day) || day < 0 || day > 6) errors.push(`rule ${rule.id}: thứ ${day} không hợp lệ`);
    for (const tag of rule.target?.tags ?? []) if (!knownTags.has(tag)) errors.push(`rule ${rule.id}: thẻ ${tag} không tồn tại`);
    for (const id of rule.target?.productIds ?? []) if (!PRODUCT_MAP[id]) errors.push(`rule ${rule.id}: sản phẩm ${id} không tồn tại`);
    for (const category of rule.target?.categories ?? []) if (!PRODUCT_CATEGORY_LABELS[category]) errors.push(`rule ${rule.id}: nhóm ${category} không tồn tại`);
  }
  errors.push(...validateSupplierData());
  if (ALL_PRODUCTS.length === 0) errors.push('không có sản phẩm');
  return errors;
}
