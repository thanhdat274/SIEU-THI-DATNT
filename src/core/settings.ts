/**
 * Cài đặt người chơi (riêng máy, localStorage `th3d_settings`) — KHÔNG vào save, KHÔNG đổi mô phỏng.
 * Mỗi mục ở đây đều có nơi áp dụng thật (applySettings.ts, main.tsx, save.ts); thêm mục thì phải nối luôn.
 */
export interface Settings {
  /** 0 = không giới hạn */
  fpsCap: 0 | 30 | 60 | 120;
  /** Tỷ lệ độ phân giải render, 0.5–1 */
  renderScale: number;
  /** Độ sáng cảnh 3D, 0.7–1.3 */
  brightness: number;
  /** Cỡ giao diện, 0.8–1.4 */
  uiScale: number;
  /** Cỡ chữ */
  fontSize: 'small' | 'normal' | 'large';
  reduceMotion: boolean;
  highContrast: boolean;
  /** Khoảng cách còn hoạt ảnh nhân vật: gần = nhẹ máy hơn */
  detailDist: 'near' | 'normal' | 'far';
  autosave: boolean;
  /** Bóng đổ: tắt hẳn dù mức đồ họa có bóng */
  shadows: boolean;
  /** Mật độ mưa 0 (tắt) / 0.5 / 1 */
  rainDensity: 0 | 0.5 | 1;
  clouds: boolean;
  stars: boolean;
  /** Cây, lúa lắc theo gió */
  foliageSway: boolean;
  /** Số đèn thật tối đa quanh camera */
  lightQuality: 'low' | 'normal' | 'high';
  /** Chu kỳ tự lưu (giây); 0 = mặc định (gần như ngay khi có thay đổi) */
  autosaveEvery: 0 | 60 | 180 | 300;
  /** Hiện biểu tượng sốt ruột trên đầu khách */
  showPatience: boolean;
  /** Tự về x1 khi tiệm quá tải */
  autoSlow: boolean;
  /** Hỏi lại trước khi đi ngủ kết thúc ngày */
  confirmEndDay: boolean;
  /** Chế độ mù màu */
  colorblind: 'off' | 'protan' | 'deutan' | 'tritan';
  /** Tắt chớp sáng (sét) */
  noFlash: boolean;
}

export const SETTINGS_DEFAULT: Settings = {
  fpsCap: 0, renderScale: 1, brightness: 1, uiScale: 1, fontSize: 'normal',
  reduceMotion: false, highContrast: false, detailDist: 'normal', autosave: true,
  shadows: true, rainDensity: 1, clouds: true, stars: true, foliageSway: true, lightQuality: 'high',
  autosaveEvery: 0, showPatience: true, autoSlow: false, confirmEndDay: false, colorblind: 'off', noFlash: false,
};

const KEY = 'th3d_settings';
const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const pick = <T extends string | number>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

/** Làm sạch dữ liệu đọc từ localStorage: sai kiểu/ngoài khoảng thì về mặc định. */
export function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = SETTINGS_DEFAULT;
  return {
    fpsCap: pick(r.fpsCap, [0, 30, 60, 120] as const, d.fpsCap),
    renderScale: clamp(r.renderScale, 0.5, 1, d.renderScale),
    brightness: clamp(r.brightness, 0.7, 1.3, d.brightness),
    uiScale: clamp(r.uiScale, 0.8, 1.4, d.uiScale),
    fontSize: pick(r.fontSize, ['small', 'normal', 'large'] as const, d.fontSize),
    reduceMotion: bool(r.reduceMotion, d.reduceMotion),
    highContrast: bool(r.highContrast, d.highContrast),
    detailDist: pick(r.detailDist, ['near', 'normal', 'far'] as const, d.detailDist),
    autosave: bool(r.autosave, d.autosave),
    shadows: bool(r.shadows, d.shadows),
    rainDensity: pick(r.rainDensity, [0, 0.5, 1] as const, d.rainDensity),
    clouds: bool(r.clouds, d.clouds),
    stars: bool(r.stars, d.stars),
    foliageSway: bool(r.foliageSway, d.foliageSway),
    lightQuality: pick(r.lightQuality, ['low', 'normal', 'high'] as const, d.lightQuality),
    autosaveEvery: pick(r.autosaveEvery, [0, 60, 180, 300] as const, d.autosaveEvery),
    showPatience: bool(r.showPatience, d.showPatience),
    autoSlow: bool(r.autoSlow, d.autoSlow),
    confirmEndDay: bool(r.confirmEndDay, d.confirmEndDay),
    colorblind: pick(r.colorblind, ['off', 'protan', 'deutan', 'tritan'] as const, d.colorblind),
    noFlash: bool(r.noFlash, d.noFlash),
  };
}

let current: Settings = SETTINGS_DEFAULT;
try { current = sanitize(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { /* private mode */ }
const listeners = new Set<(s: Settings) => void>();

export const getSettings = (): Readonly<Settings> => current;

export function setSettings(patch: Partial<Settings>) {
  current = sanitize({ ...current, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* private mode */ }
  listeners.forEach((f) => f(current));
}

export function resetSettings() { setSettings({ ...SETTINGS_DEFAULT }); }

export function onSettings(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Số đèn thật tối đa theo chất lượng ánh sáng (bể đèn cố định, chỉ tắt bớt — không đổi shader). */
export const LIGHT_CAP: Record<Settings['lightQuality'], number> = { low: 3, normal: 5, high: 99 };

/** Hệ số khoảng cách hoạt ảnh nhân vật theo mức chi tiết. */
export const DETAIL_MULT: Record<Settings['detailDist'], number> = { near: 0.6, normal: 1, far: 1.5 };
