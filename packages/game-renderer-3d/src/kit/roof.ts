import { KIT_COLORS } from '../style-spec';
import { kitBox, makePiece, type KitPiece } from './piece';

export interface ParapetOptions {
  /** Có dựng gờ mép trước (+z) không; tắt khi mép trước có biển hiệu đứng. */
  front?: boolean;
}

/**
 * Lan can mái: gờ thấp (cao 0,12, dày 0,06) chạy dọc mép mái. `width` × `depth` là kích thước mép ngoài, căn giữa x = z = 0,
 * đáy ở y = 0 (đặt lên mặt mái).
 */
export function parapet(width: number, depth: number, { front = true }: ParapetOptions = {}): KitPiece {
  const h = 0.12;
  const t = 0.06;
  const c = KIT_COLORS.trim;
  const boxes = [
    kitBox(c, 0, h / 2, -(depth / 2 - t / 2), width, h, t),
    kitBox(c, -(width / 2 - t / 2), h / 2, 0, t, h, depth - 2 * t),
    kitBox(c, width / 2 - t / 2, h / 2, 0, t, h, depth - 2 * t),
  ];
  if (front) boxes.push(kitBox(c, 0, h / 2, depth / 2 - t / 2, width, h, t));
  return makePiece('parapet', boxes);
}

/** Máy điều hòa ngoài trời: thân, lưới gió ở mặt trước (+z), nắp quạt và hai chân. Rộng 0,5, cao 0,34, sâu 0,3. */
export function acUnit(): KitPiece {
  return makePiece('ac-unit', [
    kitBox(KIT_COLORS.metal, 0, 0.04 + 0.15, 0, 0.5, 0.3, 0.3),
    kitBox(KIT_COLORS.metalDark, 0, 0.04 + 0.15, 0.151, 0.4, 0.2, 0.02),
    kitBox(KIT_COLORS.metalDark, 0, 0.34, 0, 0.24, 0.02, 0.24),
    kitBox(KIT_COLORS.sill, -0.18, 0.02, 0, 0.06, 0.04, 0.26),
    kitBox(KIT_COLORS.sill, 0.18, 0.02, 0, 0.06, 0.04, 0.26),
  ]);
}

/** Bồn nước trên mái: thân bồn, nắp và bốn chân gỗ. Vuông 0,46, cao 0,85. */
export function waterTank(): KitPiece {
  const legH = 0.3;
  const boxes = [
    kitBox(KIT_COLORS.metal, 0, legH + 0.25, 0, 0.46, 0.5, 0.46),
    kitBox(KIT_COLORS.metalDark, 0, legH + 0.5 + 0.025, 0, 0.5, 0.05, 0.5),
  ];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxes.push(kitBox(KIT_COLORS.frame, sx * 0.19, legH / 2, sz * 0.19, 0.06, legH, 0.06));
  return makePiece('water-tank', boxes);
}
