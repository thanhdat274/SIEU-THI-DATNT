import type { WeatherState } from '@game/shared';
import { CLIMATE_SEASONS, WEATHER_TYPES, WEATHER_MAP, getDayOfYear, rainBandOf, type RainBandId } from '@game/data';
import { Mulberry32Rng, daySeed } from './staff';

export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function climateSeasonForDay(day: number) {
  const doy = getDayOfYear(day);
  return CLIMATE_SEASONS.find(item => doy >= item.startDayOfYear && doy <= item.endDayOfYear) ?? CLIMATE_SEASONS[0];
}

/** Hồ sơ mưa trong ngày: đỉnh, tâm và nửa độ dài của cơn mưa. Cùng hạt giống + ngày + loại thời tiết cho cùng kết quả. */
export interface RainDayProfile {
  /** Cường độ đỉnh 0..1. */
  peak: number;
  /** Phút trong ngày của đỉnh mưa. */
  centerMinute: number;
  /** Nửa độ dài (phút) của đường cong mưa. */
  halfDuration: number;
}

/** Cơn mưa được coi là "đang diễn ra" (cho dự báo) khi còn trong tỷ lệ này của nửa độ dài quanh đỉnh. */
export const RAIN_WINDOW_FRACTION = 0.75;

export function rainDayProfile(seed: string, day: number, weatherId: string): RainDayProfile | null {
  if (weatherId !== 'rainy' && weatherId !== 'heavy_rain' && weatherId !== 'storm') return null;
  const rng = new Mulberry32Rng(hashSeed(`${seed}:rain:${day}`));
  const daylightCenter = 13 * 60 + Math.floor(rng.next() * 5 * 60);
  const halfDuration = (weatherId === 'rainy' ? 55 : weatherId === 'heavy_rain' ? 80 : 65) + Math.floor(rng.next() * 75);
  const centerMinute = 6 * 60 + (daylightCenter - 6 * 60) * 0.7;
  const peak = weatherId === 'rainy' ? 0.2 + rng.next() * 0.32 : weatherId === 'heavy_rain' ? 0.55 + rng.next() * 0.35 : 0.78 + rng.next() * 0.22;
  return { peak, centerMinute, halfDuration };
}

/** Deterministic intraday shower envelope: rain fades in/out rather than staying at one daily intensity. */
export function rainIntensityAt(seed: string, day: number, hour: number, minute: number, weatherId: string): number {
  const profile = rainDayProfile(seed, day, weatherId);
  if (!profile) return 0;
  const currentMinute = hour * 60 + minute;
  const progress = Math.max(0, 1 - Math.abs(currentMinute - profile.centerMinute) / profile.halfDuration);
  const smooth = progress * progress * (3 - 2 * progress);
  return Math.max(0, Math.min(1, profile.peak * smooth));
}

export interface RainForecast {
  band: RainBandId;
  bandLabel: string;
  /** Cường độ đỉnh 0..1. */
  peak: number;
  /** Cửa sổ mưa dự kiến, phút trong ngày (làm tròn 15 phút). */
  startMinute: number;
  endMinute: number;
}

const round15 = (minute: number) => Math.round(minute / 15) * 15;

/** Dự báo mưa của một ngày: dải theo đỉnh mưa và khung giờ; null nếu không mưa. Khớp thực tế vì dùng cùng hồ sơ mưa. */
export function rainForecastForDay(seed: string, day: number, weatherId: string): RainForecast | null {
  const profile = rainDayProfile(seed, day, weatherId);
  if (!profile) return null;
  const half = profile.halfDuration * RAIN_WINDOW_FRACTION;
  const band = rainBandOf(profile.peak);
  return {
    band: band.id,
    bandLabel: band.label,
    peak: Number(profile.peak.toFixed(2)),
    startMinute: Math.max(0, round15(profile.centerMinute - half)),
    endMinute: Math.min(24 * 60, round15(profile.centerMinute + half)),
  };
}

/** Mặt đường khô dần với hằng số thời gian này (phút) sau khi mưa tạnh. */
export const ROAD_DRY_TAU_MINUTES = 120;

/**
 * Độ ướt mặt đường 0..1 lúc `minuteOfDay`: lên theo cường độ mưa, khô dần theo hàm mũ sau mưa. Hàm thuần theo hạt giống,
 * ngày và loại thời tiết; ngày không mưa trả 0 (mặt đường khô qua đêm, không mang sang ngày sau).
 */
export function roadWetnessAt(seed: string, day: number, minuteOfDay: number, weatherId: string): number {
  const profile = rainDayProfile(seed, day, weatherId);
  if (!profile) return 0;
  const first = Math.max(0, Math.floor(profile.centerMinute - profile.halfDuration));
  let wet = 0;
  for (let m = first; m <= minuteOfDay; m += 5) {
    const progress = Math.max(0, 1 - Math.abs(m - profile.centerMinute) / profile.halfDuration);
    const intensity = profile.peak * progress * progress * (3 - 2 * progress);
    wet = Math.max(wet, intensity * Math.exp(-(minuteOfDay - m) / ROAD_DRY_TAU_MINUTES));
  }
  const current = rainIntensityAt(seed, day, Math.floor(minuteOfDay / 60), minuteOfDay % 60, weatherId);
  return Math.min(1, Math.max(wet, current) * 1.5);
}

export function formatMinuteOfDay(minute: number): string {
  const hh = Math.floor(minute / 60) % 24;
  return `${String(hh).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** Chuỗi hiển thị, ví dụ "Mưa vừa 14:00–16:15"; chuỗi rỗng nếu không mưa. */
export function describeRainForecast(forecast: RainForecast | null, options?: { omitWhenMatchingWeatherLabel?: boolean }): string {
  if (!forecast) return '';
  const text = `${forecast.bandLabel} ${formatMinuteOfDay(forecast.startMinute)}–${formatMinuteOfDay(forecast.endMinute)}`;
  if (options?.omitWhenMatchingWeatherLabel) {
    // Strip duplicate weather category word: "Mưa to (Mưa to HH:MM–HH:MM)" → "Mưa to HH:MM–HH:MM"
    const match = text.match(/^(Mưa(?: to| vừa| nhỏ)?)\s+\1/);
    if (match) return text.slice(match[0].length);
    const match2 = text.match(/^(Mưa(?: to| vừa| nhỏ)?)\s+(Mưa(?: to| vừa| nhỏ)?)/);
    if (match2 && match2[1] === match2[2]) return text.slice(match2[0].length);
  }
  return text;
}

/** Thời tiết của `day` từ hạt giống, mùa khí hậu và thời tiết hôm trước (chuỗi Markov đơn giản có độ "dai"). */
export function pickWeather(seed: string, day: number, previous?: string): string {
  const climate = climateSeasonForDay(day);
  const rng = new Mulberry32Rng(daySeed(day, hashSeed(seed)));
  const weights = WEATHER_TYPES.map(type => {
    const base = climate.weights[type.id] ?? 0;
    return { id: type.id, weight: base * (previous === type.id ? 1 + (WEATHER_MAP[type.id]?.stickiness ?? 0) : 1) };
  }).filter(item => item.weight > 0);
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng.next() * total;
  for (const item of weights) { roll -= item.weight; if (roll < 0) return item.id; }
  return weights[weights.length - 1].id;
}

/** Thời tiết hôm nay tính thẳng từ ngày 1 (dùng để tạo trạng thái và để kiểm tra). */
export function weatherOnDay(seed: string, day: number): string {
  let current = pickWeather(seed, 1, undefined);
  for (let d = 2; d <= day; d++) current = pickWeather(seed, d, current);
  return current;
}

/** Tạo trạng thái thời tiết cho `day`, kèm dự báo hai ngày tới (luôn khớp thực tế vì cùng hạt giống). */
export function createWeatherState(seed: string, day: number): WeatherState {
  const today = weatherOnDay(seed, day);
  const tomorrow = pickWeather(seed, day + 1, today);
  const afterTomorrow = pickWeather(seed, day + 2, tomorrow);
  return { day, today, forecast: [tomorrow, afterTomorrow] };
}

/** Đẩy thời tiết tới `toDay` từng ngày một; ngày đã có trong dự báo được dùng lại nguyên. */
export function advanceWeather(seed: string, state: WeatherState, toDay: number): WeatherState {
  let current = state;
  if (toDay < current.day) return createWeatherState(seed, toDay);
  while (current.day < toDay) {
    const today = current.forecast[0];
    const tomorrow = current.forecast[1];
    const afterTomorrow = pickWeather(seed, current.day + 3, tomorrow);
    current = { day: current.day + 1, today, forecast: [tomorrow, afterTomorrow] };
  }
  return current;
}
