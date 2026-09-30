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
  phase: 'night' | 'dawn' | 'morning' | 'day' | 'late_afternoon' | 'sunset' | 'dusk';
}

interface Keyframe { hour: number; outdoor: number; indoor: number; sun: number; artificial: number; sky: number; lean: number; length: number; phase: LightingState['phase'] }

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
const lerpColor = (a: number, b: number, t: number) => {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return (r << 16) | (g << 8) | bl;
};

export function getLightingState(hour: number, minute = 0): LightingState {
  const h = ((hour + minute / 60) % 24 + 24) % 24;
  let i = 0;
  while (i < KEYFRAMES.length - 2 && h >= KEYFRAMES[i + 1].hour) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  const raw = (h - a.hour) / (b.hour - a.hour);
  const t = raw * raw * (3 - 2 * raw); // smoothstep: chuyển pha mượt, không bật/tắt đột ngột
  return {
    outdoor: lerpColor(a.outdoor, b.outdoor, t),
    indoor: lerpColor(a.indoor, b.indoor, t),
    sun: lerp(a.sun, b.sun, t),
    artificial: lerp(a.artificial, b.artificial, t),
    sky: lerpColor(a.sky, b.sky, t),
    shadowLean: lerp(a.lean, b.lean, t),
    shadowLength: lerp(a.length, b.length, t),
    phase: t < 0.5 ? a.phase : b.phase,
  };
}
