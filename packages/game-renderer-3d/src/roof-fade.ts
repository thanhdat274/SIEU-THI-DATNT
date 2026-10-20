/** Thời gian mờ hẳn/hiện lại mái (giây). */
export const ROOF_FADE_SECONDS = 0.2;
/** Alpha tường tòa đang che người chơi. */
export const OCCLUDER_ALPHA = 0.35;
/** Alpha tường mặt tiền + biển hiệu khi người chơi đang ở trong tòa (mái thì mờ hẳn). */
export const FACADE_ALPHA = 0.25;
/** Dưới ngưỡng này coi như trong suốt hẳn → isVisible = false. */
export const ALPHA_HIDDEN = 0.01;

/** Đưa alpha `current` về `target` với tốc độ 1/ROOF_FADE_SECONDS mỗi giây. */
export function stepAlpha(current: number, target: number, dt: number): number {
  const step = dt / ROOF_FADE_SECONDS;
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}

export interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }
export interface Vec { x: number; y: number; z: number }

/** Tia (origin + t·dir, t ≥ 0) có cắt hộp trục song song không (slab test). */
export function rayHitsBox(origin: Vec, dir: Vec, b: Box): boolean {
  let tMin = 0;
  let tMax = Infinity;
  const axes: [number, number, number, number][] = [
    [origin.x, dir.x, b.x0, b.x1],
    [origin.y, dir.y, b.y0, b.y1],
    [origin.z, dir.z, b.z0, b.z1],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return false;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** Thông tin tối thiểu của một khối mái để quyết định bóc mái. */
export interface RoofRef { id: string; warehouse: boolean }

const isMainRoof = (r: RoofRef): boolean => !r.warehouse && (r.id === 'main' || /^grocery_main/.test(r.id));

/**
 * Mái `r` có được bóc khi người chơi đang đứng trong các khối `inside` không: chỉ tòa đang đứng, cộng với kho thông với nó
 * (khối kho ↔ tiệm chính, hai chiều). Tòa chỉ kề sát (chung tường) thì GIỮ mái.
 */
export function shouldOpenRoof(r: RoofRef, inside: readonly RoofRef[]): boolean {
  return inside.some(i => i === r || (i.warehouse && isMainRoof(r)) || (r.warehouse && isMainRoof(i)));
}

/** Alpha mặt tiền/biển theo alpha mái: mái đặc → 1, mái đã bóc (0) → FACADE_ALPHA. Dùng chung nhịp mờ của mái. */
export function facadeAlpha(roofAlpha: number): number {
  return FACADE_ALPHA + (1 - FACADE_ALPHA) * roofAlpha;
}
