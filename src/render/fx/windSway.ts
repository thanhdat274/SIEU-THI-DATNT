import { MeshStandardNodeMaterial } from 'three/webgpu';
import { positionLocal, positionWorld, uniform, time, sin, clamp, vec3, float } from 'three/tsl';

/**
 * Gió lắc cây/lúa ngay trong vertex shader — không tốn CPU, không cần cập nhật từng frame.
 * Tham khảo kỹ thuật của nongtrai.jackle.dev: độ lắc nhân với (độ cao chuẩn hóa)² nên
 * ngọn lắc mạnh, gốc đứng yên; hai sóng sin lệch pha cho chuyển động không đều như người máy.
 *
 * Chỉ chạy với vật liệu node (MeshStandardNodeMaterial): vật liệu three thường không có positionNode.
 */

/** Cơn gió giật dùng chung cho mọi cây: 1 = gió nhẹ, cao hơn khi mưa bão (Lighting cập nhật mỗi khung). */
export const windGust = uniform(1);

export type WindKind = 'tree' | 'plant';

/** Cây to lắc chậm, nhẹ; cỏ/lúa lắc nhanh hơn, biên độ nhỏ. */
const WIND_PRESET: Record<WindKind, { strength: number; speed: number }> = {
  tree: { strength: 0.1, speed: 0.9 },
  plant: { strength: 0.06, speed: 1.8 },
};

export interface WindOptions {
  /** Chiều cao cả cây (đơn vị local của nhóm cha) để chuẩn hóa độ cao 0..1. */
  height: number;
  /** Độ cao của gốc mesh này so với gốc cây — tán lá nằm cao hơn thân nên cần bù vào. */
  baseY?: number;
  kind?: WindKind;
}

export interface WindHandle {
  /** Biên độ lắc ở ngọn, đơn vị thế giới. 0 = lặng gió. */
  strength: { value: number };
  speed: { value: number };
}

export function applyWind(material: MeshStandardNodeMaterial, { height, baseY = 0, kind = 'tree' }: WindOptions): WindHandle {
  const uStrength = uniform(WIND_PRESET[kind].strength);
  const uSpeed = uniform(WIND_PRESET[kind].speed);

  // Pha theo vị trí thế giới: các cây cạnh nhau lắc lệch nhau chút, không đồng loạt.
  const phase = time.mul(uSpeed).add(positionWorld.x.mul(0.35)).add(positionWorld.z.mul(0.25));
  const sway = sin(phase).mul(0.65).add(sin(phase.mul(2.3).add(1.7)).mul(0.25)).mul(uStrength).mul(windGust);

  const h = clamp(positionLocal.y.add(float(baseY)).div(float(height)), 0, 1);
  const bend = h.mul(h);

  material.positionNode = positionLocal.add(vec3(sway.mul(bend), 0, sway.mul(bend).mul(0.55)));

  return { strength: uStrength, speed: uSpeed };
}
