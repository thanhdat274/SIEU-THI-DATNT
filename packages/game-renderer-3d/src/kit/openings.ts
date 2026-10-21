import { SCALE_TARGETS } from '../scale-spec';
import { KIT_COLORS, KIT_GLASS_ALPHA } from '../style-spec';
import { kitBox, makePiece, type KitPiece } from './piece';

const K = SCALE_TARGETS.kit;

export interface DoorFrameOptions {
  /** Bề rộng lối đi (thông thủy), không tính hai thanh đứng. */
  width?: number;
  /** Chiều cao lối đi (thông thủy), không tính thanh ngang trên. */
  height?: number;
}

/**
 * Khung cửa: hai thanh đứng và một thanh ngang trên, chừa trống lối đi (`opening`).
 * Rộng tổng = width + 2 · bề dày khung; cao tổng = height + bề dày khung; sâu = `frameDepth` căn giữa z = 0.
 */
export function doorFrame({ width = K.doorWidth, height = K.doorHeight }: DoorFrameOptions = {}): KitPiece {
  const t = K.frameThickness;
  const d = K.frameDepth;
  const c = KIT_COLORS.frame;
  return makePiece('door-frame', [
    kitBox(c, -(width / 2 + t / 2), height / 2, 0, t, height, d),
    kitBox(c, width / 2 + t / 2, height / 2, 0, t, height, d),
    kitBox(c, 0, height + t / 2, 0, width + 2 * t, t, d),
  ], { minX: -width / 2, maxX: width / 2, minY: 0, maxY: height });
}

export interface GlassDoorOptions {
  width?: number;
  height?: number;
}

/**
 * Cánh cửa kính: khung gỗ (hai thanh đứng, thanh ngang trên, thanh dưới cao làm tấm chắn chân), kính trong suốt và tay nắm
 * dọc ở mặt trước phía +x. Rộng/cao đúng bằng lối cửa nên lọt vừa `doorFrame` cùng kích thước. Sâu 0,06 căn giữa z = 0.
 */
export function glassDoor({ width = K.doorWidth, height = K.doorHeight }: GlassDoorOptions = {}): KitPiece {
  const bar = 0.05;
  const kick = 0.18;
  const depth = 0.06;
  const c = KIT_COLORS.leaf;
  const glassH = height - bar - kick;
  return makePiece('glass-door', [
    kitBox(c, -(width / 2 - bar / 2), height / 2, 0, bar, height, depth),
    kitBox(c, width / 2 - bar / 2, height / 2, 0, bar, height, depth),
    kitBox(c, 0, height - bar / 2, 0, width - 2 * bar, bar, depth),
    kitBox(c, 0, kick / 2, 0, width - 2 * bar, kick, depth),
    kitBox(KIT_COLORS.glass, 0, kick + glassH / 2, 0, width - 2 * bar, glassH, 0.02, KIT_GLASS_ALPHA),
    kitBox(KIT_COLORS.handle, width / 2 - bar - 0.08, height * 0.5, depth / 2 + 0.02, 0.03, 0.3, 0.04),
  ]);
}

export interface ShopWindowOptions {
  width?: number;
  height?: number;
  /** Số ô kính ngang: 1 (liền) hoặc 2 (có thanh giữa). */
  panes?: 1 | 2;
}

/**
 * Cửa sổ mặt tiền: khung bốn thanh, kính trong suốt, thanh giữa (nếu 2 ô) và bậu nhô ra phía trước (+z).
 * `height` là chiều cao phần khung; cao tổng = height + bề dày bậu (đáy mảnh là đáy bậu, y = 0). Khung sâu 0,12 căn giữa z = 0.
 */
export function shopWindow({ width = K.windowWidth, height = K.windowHeight, panes = 2 }: ShopWindowOptions = {}): KitPiece {
  const t = 0.05;
  const depth = 0.12;
  const sillH = 0.04;
  const c = KIT_COLORS.frame;
  const y0 = sillH;
  const innerW = width - 2 * t;
  const innerH = height - 2 * t;
  const boxes = [
    kitBox(c, 0, y0 + t / 2, 0, width, t, depth),
    kitBox(c, 0, y0 + height - t / 2, 0, width, t, depth),
    kitBox(c, -(width / 2 - t / 2), y0 + height / 2, 0, t, innerH, depth),
    kitBox(c, width / 2 - t / 2, y0 + height / 2, 0, t, innerH, depth),
    kitBox(KIT_COLORS.glass, 0, y0 + height / 2, 0, innerW, innerH, 0.02, KIT_GLASS_ALPHA),
    kitBox(KIT_COLORS.sill, 0, sillH / 2, 0.04, width + 0.1, sillH, 0.2),
  ];
  if (panes === 2) boxes.push(kitBox(c, 0, y0 + height / 2, 0, 0.03, innerH, depth * 0.8));
  return makePiece('shop-window', boxes);
}
