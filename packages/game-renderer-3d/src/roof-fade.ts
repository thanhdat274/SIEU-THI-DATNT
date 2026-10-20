/** Thời gian mờ hẳn/hiện lại mái (giây). */
export const ROOF_FADE_SECONDS = 0.2;
/** Alpha tường tòa đang che người chơi. */
export const OCCLUDER_ALPHA = 0.35;
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
