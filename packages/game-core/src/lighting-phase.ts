import { SEASON_YEAR_DAYS, getDayOfYear } from '@game/data';

/** Trạng thái ánh sáng theo giờ game. Hàm thuần: renderer chỉ đọc, không tự suy ra giờ. */
export interface LightingState {
  /** Màu nhân (multiply) cho ngoài trời, 0xRRGGBB; trắng = không đổi. */
  outdoor: number;
  /** Màu nhân cho trong nhà (đã được đèn nhân tạo bù thêm). */
  indoor: number;
  /** Cường độ nắng 0..1. */
  sun: number;
  /** Cường độ đèn nhân tạo 0..1 (trần, quầy, kệ, tủ mát, biển hiệu, đèn đường, ánh cửa sổ). */
  artificial: number;
  /** Màu nền phía sau bản đồ (bầu trời/đường chân trời). */
  sky: number;
  /** Bóng đổ: độ nghiêng ngang (ô/ô), âm = bóng ngả trái (sáng), dương = ngả phải (chiều). */
  shadowLean: number;
  /** Bóng đổ: hệ số độ dài (dài lúc bình minh/hoàng hôn, ngắn lúc trưa). */
  shadowLength: number;
  /** Phương vị mặt trời (rad), tính theo chiều kim đồng hồ từ hướng bắc: 0 = bắc, π/2 = đông, π = nam. */
  sunAzimuth: number;
  /** Độ cao mặt trời (rad); 0 lúc mọc/lặn, âm ban đêm. */
  sunElevation: number;
  /** Hướng bóng trên bản đồ (vector đơn vị, +x = đông, +y = nam), ngược hướng mặt trời; (0,0) khi mặt trời ở thiên đỉnh. */
  shadowDir: { x: number; y: number };
  phase: 'night' | 'dawn' | 'morning' | 'day' | 'late_afternoon' | 'sunset' | 'dusk';
}

interface Keyframe { hour: number; outdoor: number; indoor: number; sun: number; artificial: number; sky: number; lean: number; length: number; phase: LightingState['phase'] }

/**
 * Giữa tháng 1..12: [giờ mọc, giờ lặn] dạng "hh:mm" (xấp xỉ thiết kế cho TP.HCM, không phải dữ liệu thiên văn).
 * Mọc và lặn lệch pha nhau nên dùng bảng thay cho một đường sin.
 */
const SUN_TABLE_MINUTES: ReadonlyArray<readonly [number, number]> = [
  [6 * 60 + 17, 17 * 60 + 45], [6 * 60 + 14, 18 * 60], [6 * 60 + 2, 18 * 60 + 5], [5 * 60 + 47, 18 * 60 + 5],
  [5 * 60 + 34, 18 * 60 + 5], [5 * 60 + 32, 18 * 60 + 14], [5 * 60 + 40, 18 * 60 + 16], [5 * 60 + 46, 18 * 60 + 8],
  [5 * 60 + 48, 17 * 60 + 55], [5 * 60 + 50, 17 * 60 + 36], [5 * 60 + 59, 17 * 60 + 28], [6 * 60 + 12, 17 * 60 + 33],
];

/** Giờ mọc/lặn (giờ thập phân) theo ngày game: năm 120 ngày ánh xạ sang năm 365 ngày, nội suy tuyến tuần hoàn. */
export function getSeasonalSunTimes(day: number): { sunrise: number; sunset: number } {
  const n = SUN_TABLE_MINUTES.length;
  const pos = (getDayOfYear(day) / SEASON_YEAR_DAYS) * n - 0.5; // mốc i nằm giữa tháng i
  const base = Math.floor(pos);
  const t = pos - base;
  const lo = SUN_TABLE_MINUTES[((base % n) + n) % n];
  const hi = SUN_TABLE_MINUTES[(((base + 1) % n) + n) % n];
  return { sunrise: (lo[0] + (hi[0] - lo[0]) * t) / 60, sunset: (lo[1] + (hi[1] - lo[1]) * t) / 60 };
}

/** Vĩ độ TP.HCM (độ), dùng cho vị trí mặt trời. */
const LATITUDE_RAD = (10.8 * Math.PI) / 180;

/**
 * Vị trí mặt trời, nhất quán với mốc mọc/lặn của ngày: độ cao = 0 lúc mọc/lặn, đỉnh lúc 12:00.
 * Độ lệch mặt trời hiệu dụng suy từ độ dài ngày (tanδ = −cosH0 / tanφ), nên không cần lịch thiên văn riêng;
 * góc giờ H chạy tuyến tính −H0 → 0 (12:00) → +H0 theo cùng phép warp như getLightingState.
 */
export function getSolarPosition(hour: number, minute = 0, day = 1): { azimuth: number; elevation: number; shadowDir: { x: number; y: number } } {
  const rawHour = ((hour + minute / 60) % 24 + 24) % 24;
  const { sunrise, sunset } = getSeasonalSunTimes(day);
  const h0 = (Math.PI * (sunset - sunrise)) / 24;
  const hourAngle = rawHour < 12 ? -h0 * (12 - rawHour) / (12 - sunrise) : h0 * (rawHour - 12) / (sunset - 12);
  const dec = Math.atan(-Math.cos(h0) / Math.tan(LATITUDE_RAD));
  const sinEl = Math.sin(LATITUDE_RAD) * Math.sin(dec) + Math.cos(LATITUDE_RAD) * Math.cos(dec) * Math.cos(hourAngle);
  const east = -Math.cos(dec) * Math.sin(hourAngle);
  const north = Math.sin(dec) * Math.cos(LATITUDE_RAD) - Math.cos(dec) * Math.sin(LATITUDE_RAD) * Math.cos(hourAngle);
  const len = Math.hypot(east, north);
  return {
    azimuth: (Math.atan2(east, north) + Math.PI * 2) % (Math.PI * 2),
    elevation: Math.asin(Math.max(-1, Math.min(1, sinEl))),
    shadowDir: len < 1e-6 ? { x: 0, y: 0 } : { x: -east / len, y: north / len },
  };
}

const KEYFRAMES: Keyframe[] = [
  { hour: 0,    outdoor: 0x2c3868, indoor: 0xb7bad4, sun: 0,   artificial: 1,    sky: 0x111a33, lean: 0,    length: 0,   phase: 'night' },
  { hour: 5,    outdoor: 0x34407a, indoor: 0xbcbfd8, sun: 0,   artificial: 1,    sky: 0x1c2748, lean: -1,   length: 2,   phase: 'night' },
  { hour: 6,    outdoor: 0x8f7fa8, indoor: 0xd9d0dc, sun: 0.2, artificial: 0.85, sky: 0x8a86ad, lean: -1,   length: 2,   phase: 'dawn' },
  { hour: 7,    outdoor: 0xf6cfa8, indoor: 0xf3e6d6, sun: 0.5, artificial: 0.4,  sky: 0xf0c9a0, lean: -0.9, length: 1.7, phase: 'morning' },
  { hour: 9,    outdoor: 0xfff0d8, indoor: 0xfff8ec, sun: 0.85, artificial: 0.05, sky: 0xe6dcc4, lean: -0.6, length: 1.1, phase: 'morning' },
  { hour: 12,   outdoor: 0xffffff, indoor: 0xffffff, sun: 1,   artificial: 0,    sky: 0xd9d4bd, lean: 0,    length: 0.4, phase: 'day' },
  { hour: 15,   outdoor: 0xfffaf0, indoor: 0xfffcf4, sun: 0.95, artificial: 0,   sky: 0xd9d0b4, lean: 0.6,  length: 1,   phase: 'day' },
  { hour: 16.75, outdoor: 0xffdcae, indoor: 0xfff0dc, sun: 0.75, artificial: 0.1, sky: 0xe8c890, lean: 0.9, length: 1.7, phase: 'late_afternoon' },
  { hour: 18,   outdoor: 0xf19f78, indoor: 0xf7dcc4, sun: 0.35, artificial: 0.55, sky: 0xd98a68, lean: 1,   length: 2.2, phase: 'sunset' },
  { hour: 19,   outdoor: 0x7d6a9e, indoor: 0xd6cde0, sun: 0.05, artificial: 0.92, sky: 0x4a3f6e, lean: 1,   length: 2.4, phase: 'dusk' },
  { hour: 20.5, outdoor: 0x39457f, indoor: 0xbfc2da, sun: 0,   artificial: 1,    sky: 0x1e2850, lean: 0,    length: 0,   phase: 'night' },
  { hour: 24,   outdoor: 0x2c3868, indoor: 0xb7bad4, sun: 0,   artificial: 1,    sky: 0x111a33, lean: 0,    length: 0,   phase: 'night' },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpColor = (a: number, b: number, t: number) => {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return (r << 16) | (g << 8) | bl;
};

export function getLightingState(hour: number, minute = 0, day = 1): LightingState {
  const rawHour = ((hour + minute / 60) % 24 + 24) % 24;
  const { sunrise, sunset } = getSeasonalSunTimes(day);
  const h =
    rawHour < sunrise
      ? (rawHour / sunrise) * 6
      : rawHour < 12
      ? 6 + ((rawHour - sunrise) / (12 - sunrise)) * 6
      : rawHour < sunset
      ? 12 + ((rawHour - 12) / (sunset - 12)) * 6
      : 18 + ((rawHour - sunset) / (24 - sunset)) * 6;
  let i = 0;
  while (i < KEYFRAMES.length - 2 && h >= KEYFRAMES[i + 1].hour) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  const raw = (h - a.hour) / (b.hour - a.hour);
  const t = raw * raw * (3 - 2 * raw); // smoothstep: chuyển pha mượt, không bật/tắt đột ngột
  const solar = getSolarPosition(hour, minute, day);
  return {
    outdoor: lerpColor(a.outdoor, b.outdoor, t),
    indoor: lerpColor(a.indoor, b.indoor, t),
    sun: lerp(a.sun, b.sun, t),
    artificial: lerp(a.artificial, b.artificial, t),
    sky: lerpColor(a.sky, b.sky, t),
    shadowLean: lerp(a.lean, b.lean, t),
    shadowLength: lerp(a.length, b.length, t),
    sunAzimuth: solar.azimuth,
    sunElevation: solar.elevation,
    shadowDir: solar.shadowDir,
    phase: t < 0.5 ? a.phase : b.phase,
  };
}
