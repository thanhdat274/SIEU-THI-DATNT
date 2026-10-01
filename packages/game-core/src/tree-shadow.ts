import type { LightingState } from './lighting-phase';

/** Chiều dài tối đa của bóng (ô): tránh bóng kéo vô hạn khi mặt trời sát chân trời. */
export const TREE_SHADOW_MAX_LENGTH = 3.5;
/** Ngưỡng đổi góc mặt trời (rad, 1°) và cường độ mưa/nắng để vẽ lại bóng. */
const REDRAW_ANGLE = Math.PI / 180;
const REDRAW_INTENSITY = 0.05;

export interface TreeShadowShape {
  visible: boolean;
  /** Tâm elip so với gốc cây, đơn vị ô (+x đông, +y nam). */
  offsetX: number;
  offsetY: number;
  /** Bán trục dọc theo hướng bóng và vuông góc (ô). */
  radiusAlong: number;
  radiusAcross: number;
  /** Góc xoay elip (rad) từ trục +x, theo hệ bản đồ. */
  angle: number;
  alpha: number;
}

/** Hình bóng của một cây theo hướng/độ cao mặt trời. Hàm thuần; ban đêm hoặc mặt trời dưới chân trời thì ẩn. */
export function computeTreeShadow(
  tree: { height: number; crownRadius: number },
  light: Pick<LightingState, 'sun' | 'sunElevation' | 'shadowDir'>,
  rain = 0,
): TreeShadowShape {
  const alpha = Math.max(0, 0.24 * light.sun * (1 - rain * 0.88));
  const { x: dx, y: dy } = light.shadowDir;
  if (light.sunElevation <= 0.02 || alpha <= 0.004) {
    return { visible: false, offsetX: 0, offsetY: 0, radiusAlong: 0, radiusAcross: 0, angle: 0, alpha: 0 };
  }
  const length = Math.min(TREE_SHADOW_MAX_LENGTH, tree.height / Math.tan(light.sunElevation));
  return {
    visible: true,
    offsetX: dx * length * 0.5,
    offsetY: dy * length * 0.5,
    radiusAlong: length * 0.5 + tree.crownRadius,
    radiusAcross: tree.crownRadius * 0.7,
    angle: Math.atan2(dy, dx),
    alpha,
  };
}

export interface TreeShadowSnapshot { azimuth: number; elevation: number; sun: number; rain: number }

/** Có cần vẽ lại bóng không: lần đầu, góc mặt trời đổi ≥ 1° hoặc nắng/mưa đổi đáng kể. */
export function treeShadowNeedsRedraw(prev: TreeShadowSnapshot | null, next: TreeShadowSnapshot): boolean {
  if (!prev) return true;
  const twoPi = Math.PI * 2;
  const rawAz = Math.abs(next.azimuth - prev.azimuth) % twoPi;
  const dAz = Math.min(rawAz, twoPi - rawAz);
  return (
    dAz >= REDRAW_ANGLE ||
    Math.abs(next.elevation - prev.elevation) >= REDRAW_ANGLE ||
    Math.abs(next.sun - prev.sun) >= REDRAW_INTENSITY ||
    Math.abs(next.rain - prev.rain) >= REDRAW_INTENSITY
  );
}
