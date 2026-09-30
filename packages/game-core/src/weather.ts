import type { WeatherState } from '@game/shared';
import { CLIMATE_SEASONS, WEATHER_TYPES, WEATHER_MAP, getDayOfYear } from '@game/data';
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
