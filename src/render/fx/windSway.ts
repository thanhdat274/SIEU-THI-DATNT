import { MeshStandardNodeMaterial } from 'three/webgpu';
import { positionLocal, positionWorld, uniform, time, sin, clamp, vec3, float } from 'three/tsl';

/**
 * Gió lắc cây/lúa ngay trong vertex shader — không tốn CPU, không cần cập nhật từng frame.
 * Tham khảo kỹ thuật của nongtrai.jackle.dev: độ lắc nhân với (độ cao chuẩn hóa)² nên
 * ngọn lắc mạnh, gốc đứng yên; hai sóng sin lệch pha cho chuyển động không đều như người máy.
 *
 * File mẫu — chưa nối vào scene. Dùng cho vật liệu node (MeshStandardNodeMaterial):
 * `const wind = applyWind(mat, 1.8)` rồi chỉnh `wind.strength.value` (0 = lặng gió).
 */
export interface WindHandle {
  /** Biên độ lắc ở ngọn, đơn vị thế giới. */
  strength: { value: number };
  /** Tốc độ sóng gió. */
  speed: { value: number };
  /** Cơn gió giật: 0..1, tăng giảm theo thời tiết hoặc ngẫu nhiên. */
  gust: { value: number };
}

/**
 * @param height chiều cao model (đơn vị local) để chuẩn hóa độ cao 0..1.
 */
export function applyWind(material: MeshStandardNodeMaterial, height: number, strength = 0.08): WindHandle {
  const uStrength = uniform(strength);
  const uSpeed = uniform(1.2);
  const uGust = uniform(1);

  // Pha theo vị trí thế giới: các cây cạnh nhau lắc lệch nhau chút, không đồng loạt.
  const phase = time.mul(uSpeed).add(positionWorld.x.mul(0.35)).add(positionWorld.z.mul(0.25));
  const sway = sin(phase).mul(0.65).add(sin(phase.mul(2.3).add(1.7)).mul(0.25)).mul(uStrength).mul(uGust);

  const h = clamp(positionLocal.y.div(float(height)), 0, 1);
  const bend = h.mul(h);

  material.positionNode = positionLocal.add(vec3(sway.mul(bend), 0, sway.mul(bend).mul(0.55)));

  return { strength: uStrength, speed: uSpeed, gust: uGust };
}
