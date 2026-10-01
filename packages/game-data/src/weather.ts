import { SEASON_YEAR_DAYS } from './seasons';

export interface WeatherType {
  id: string;
  label: string;
  icon: string; // ký hiệu ngắn hiển thị cạnh nhãn
  stickiness: number; // mức "dai" — tăng xác suất lặp lại so với hôm trước
}

/** Loại thời tiết. Thêm loại mới chỉ cần thêm dòng ở đây và trọng số trong CLIMATE_SEASONS. */
export const WEATHER_TYPES: readonly WeatherType[] = [
  { id: 'sunny', label: 'Nắng', icon: '☀', stickiness: 0.6 },
  { id: 'cloudy', label: 'Nhiều mây', icon: '☁', stickiness: 0.4 },
  { id: 'rainy', label: 'Mưa', icon: '🌧', stickiness: 0.9 },
  { id: 'heavy_rain', label: 'Mưa to', icon: '⛈', stickiness: 0.5 },
  { id: 'hot', label: 'Nóng bức', icon: '🔥', stickiness: 1.0 },
  { id: 'cold', label: 'Se lạnh', icon: '❄', stickiness: 0.8 },
  { id: 'storm', label: 'Giông bão', icon: '🌪', stickiness: 0.2 },
  { id: 'special', label: 'Sương mù dày', icon: '🌫', stickiness: 0.2 }, // hiện tượng đặc biệt hiếm
];

export const WEATHER_MAP: Record<string, WeatherType> = Object.fromEntries(WEATHER_TYPES.map(type => [type.id, type]));

export interface ClimateSeason {
  id: string;
  name: string;
  startDayOfYear: number; // 0-based, bao gồm
  endDayOfYear: number; // bao gồm
  weights: Record<string, number>; // trọng số thời tiết cơ bản trong mùa khí hậu này
}

/** Bốn mùa khí hậu phủ kín năm 120 ngày (không khoảng trống), nền cho chuỗi thời tiết. */
export const CLIMATE_SEASONS: readonly ClimateSeason[] = [
  { id: 'clim_cool', name: 'Đầu năm se lạnh', startDayOfYear: 0, endDayOfYear: 29, weights: { sunny: 3, cloudy: 3, cold: 3, rainy: 1, special: 0.6, hot: 0.2, heavy_rain: 0.1, storm: 0.05 } },
  { id: 'clim_rainy', name: 'Mùa mưa', startDayOfYear: 30, endDayOfYear: 59, weights: { rainy: 4, heavy_rain: 2, cloudy: 3, storm: 1, sunny: 1, hot: 0.2, cold: 0.1 } },
  { id: 'clim_hot', name: 'Mùa nóng', startDayOfYear: 60, endDayOfYear: 89, weights: { hot: 4, sunny: 4, cloudy: 1.5, rainy: 0.6, storm: 0.3, heavy_rain: 0.2 } },
  { id: 'clim_mild', name: 'Cuối năm dịu mát', startDayOfYear: 90, endDayOfYear: SEASON_YEAR_DAYS - 1, weights: { cloudy: 3, sunny: 3, rainy: 2, cold: 1.5, heavy_rain: 0.6, storm: 0.4, special: 0.5, hot: 0.3 } },
];

export const CLIMATE_SEASON_MAP: Record<string, ClimateSeason> = Object.fromEntries(CLIMATE_SEASONS.map(item => [item.id, item]));

export type RainBandId = 'none' | 'drizzle' | 'moderate' | 'heavy' | 'thunderstorm';

export interface RainBand {
  id: RainBandId;
  label: string;
  /** Cường độ 0..1 từ mức này trở lên thuộc dải. */
  min: number;
}

/** Các dải mưa theo cường độ. Dải mưa của cả ngày dựa trên đỉnh mưa; dải tức thời dựa trên cường độ lúc đó. */
export const RAIN_BANDS: readonly RainBand[] = [
  { id: 'none', label: 'Không mưa', min: 0 },
  { id: 'drizzle', label: 'Mưa phùn', min: 0.03 },
  { id: 'moderate', label: 'Mưa vừa', min: 0.3 },
  { id: 'heavy', label: 'Mưa to', min: 0.55 },
  { id: 'thunderstorm', label: 'Mưa giông', min: 0.8 },
];

export function rainBandOf(intensity: number): RainBand {
  let band = RAIN_BANDS[0];
  for (const candidate of RAIN_BANDS) if (intensity >= candidate.min) band = candidate;
  return band;
}
