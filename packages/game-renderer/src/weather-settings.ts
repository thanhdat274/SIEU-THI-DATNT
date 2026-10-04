import { DEFAULT_WEATHER_FX_SETTINGS, type WeatherQuality } from '@game/data';
import type { ThunderEvent, WeatherVisualModel, WeatherVisualState } from '@game/core';

/** Cài đặt hiệu ứng thời tiết của người chơi (chỉ hình ảnh), lưu cục bộ theo trình duyệt. */
export interface WeatherFxSettings {
  enabled: boolean;
  /** 0..1, nhân mật độ và độ đậm hiệu ứng. */
  intensity: number;
  /** null = tự chọn (điện thoại: medium, máy tính: high). */
  quality: WeatherQuality | null;
}

const KEY = 'tiem-tap-hoa:weather-fx';
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1);

function sanitize(raw: unknown): WeatherFxSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<WeatherFxSettings>;
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : DEFAULT_WEATHER_FX_SETTINGS.enabled,
    intensity: v.intensity === undefined ? DEFAULT_WEATHER_FX_SETTINGS.intensity : clamp01(v.intensity),
    quality: v.quality === 'low' || v.quality === 'medium' || v.quality === 'high' ? v.quality : null,
  };
}

function load(): WeatherFxSettings {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return sanitize(null); }
}

let settings: WeatherFxSettings = load();
const listeners = new Set<(s: WeatherFxSettings) => void>();

export function getWeatherFxSettings(): WeatherFxSettings { return { ...settings }; }

export function setWeatherFxSettings(patch: Partial<WeatherFxSettings>): WeatherFxSettings {
  settings = sanitize({ ...settings, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* bỏ qua */ }
  for (const fn of listeners) fn(getWeatherFxSettings());
  return getWeatherFxSettings();
}

export function onWeatherFxSettings(fn: (s: WeatherFxSettings) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Chất lượng hiệu lực: người chơi chọn thì theo đó, nếu không thì điện thoại/màn cảm ứng = medium, máy tính = high. */
export function resolveWeatherQuality(s: WeatherFxSettings = settings): WeatherQuality {
  if (s.quality) return s.quality;
  const touch = typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia?.('(pointer: coarse)').matches);
  return touch ? 'medium' : 'high';
}

// ----- Kênh trạng thái: renderer phát, UI/âm thanh/debug đọc -----
let latest: WeatherVisualState | null = null;
let roofNear = 0;
let model: WeatherVisualModel | null = null;
const thunderListeners = new Set<(e: ThunderEvent) => void>();

export function publishWeatherVisual(state: WeatherVisualState, active: WeatherVisualModel): void { latest = state; model = active; }
export function getWeatherVisualState(): WeatherVisualState | null { return latest; }
/** Mô hình thời tiết đang chạy, để bảng debug gọi transitionWeather/triggerLightning. Null nếu chưa có cảnh. */
export function getWeatherVisualModel(): WeatherVisualModel | null { return model; }
/** Độ gần mái nhà của người chơi (0..1) cho âm thanh mưa trên mái. */
export function setRoofProximity(v: number): void { roofNear = Math.max(0, Math.min(1, v)); }
export function getRoofProximity(): number { return roofNear; }
export function emitThunder(e: ThunderEvent): void { for (const fn of thunderListeners) fn(e); }
export function onThunder(fn: (e: ThunderEvent) => void): () => void {
  thunderListeners.add(fn);
  return () => { thunderListeners.delete(fn); };
}
