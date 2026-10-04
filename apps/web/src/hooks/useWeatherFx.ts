import { useSyncExternalStore } from 'react';
import { getWeatherFxSettings, onWeatherFxSettings, setWeatherFxSettings, type WeatherFxSettings } from '@game/renderer';

let snapshot = getWeatherFxSettings();
onWeatherFxSettings((next) => { snapshot = next; });

/** Cài đặt hiệu ứng thời tiết của người chơi (bật/tắt, chất lượng). Tắt chỉ ẩn hiệu ứng hình ảnh, không đổi logic thời tiết. */
export function useWeatherFx(): [WeatherFxSettings, (patch: Partial<WeatherFxSettings>) => void] {
  const settings = useSyncExternalStore(
    (cb) => onWeatherFxSettings(cb),
    () => snapshot,
  );
  return [settings, (patch) => { setWeatherFxSettings(patch); }];
}

export const WEATHER_QUALITY_ORDER = [null, 'low', 'medium', 'high'] as const;
export const WEATHER_QUALITY_LABEL: Record<string, string> = { auto: 'Tự động', low: 'Thấp', medium: 'Vừa', high: 'Cao' };
