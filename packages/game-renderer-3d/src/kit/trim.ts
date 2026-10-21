import { SCALE_TARGETS } from '../scale-spec';
import { KIT_COLORS } from '../style-spec';
import { kitBox, makePiece, type KitPiece } from './piece';

const K = SCALE_TARGETS.kit;

/**
 * Phào chân tường: tấm ván sát tường và một gờ mỏng nhô hơn ở mép trên. Dài `length` theo x (căn giữa);
 * mặt phẳng tường ở z = 0, phào nhô ra +z. Cao = `baseboardHeight` + gờ, nhô sâu 0,03 (gờ 0,045).
 */
export function baseboard(length: number): KitPiece {
  const h = K.baseboardHeight;
  const depth = 0.03;
  const lip = 0.02;
  return makePiece('baseboard', [
    kitBox(KIT_COLORS.trim, 0, h / 2, depth / 2, length, h, depth),
    kitBox(KIT_COLORS.trim, 0, h + lip / 2, (depth + 0.015) / 2, length, lip, depth + 0.015),
  ]);
}

/**
 * Phào trần: hai bậc chồng nhau, bậc dưới nhỏ, bậc trên nhô hơn. Dài `length` theo x; mặt phẳng tường ở z = 0.
 * Cao = `corniceHeight`, nhô ra +z tối đa 0,08.
 */
export function cornice(length: number): KitPiece {
  const h = K.corniceHeight;
  const depth = 0.08;
  return makePiece('cornice', [
    kitBox(KIT_COLORS.trim, 0, h / 4, depth / 4, length, h / 2, depth / 2),
    kitBox(KIT_COLORS.trim, 0, (h * 3) / 4, depth / 2, length, h / 2, depth),
  ]);
}

export interface CornerPostOptions {
  /** Chiều cao tổng của trụ (thường bằng chiều cao tường). */
  height?: number;
}

/**
 * Trụ góc: chân trụ, thân và đầu trụ (chân và đầu rộng hơn thân 0,04). Vuông, cạnh thân = `postSize`, căn giữa x = z = 0.
 */
export function cornerPost({ height = 1.6 }: CornerPostOptions = {}): KitPiece {
  const s = K.postSize;
  const wide = s + 0.04;
  const baseH = 0.08;
  const capH = 0.06;
  const shaftH = height - baseH - capH;
  return makePiece('corner-post', [
    kitBox(KIT_COLORS.trim, 0, baseH / 2, 0, wide, baseH, wide),
    kitBox(KIT_COLORS.post, 0, baseH + shaftH / 2, 0, s, shaftH, s),
    kitBox(KIT_COLORS.trim, 0, height - capH / 2, 0, wide, capH, wide),
  ]);
}
