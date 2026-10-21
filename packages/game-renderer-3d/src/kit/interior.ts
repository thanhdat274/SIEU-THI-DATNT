import { KIT_COLORS } from '../style-spec';
import { kitBox, makePiece, type KitPiece } from './piece';

/** Xà ngang trần: thanh gỗ dài `length` theo x, vuông 0,08, đáy ở y = 0 (đặt ngang mép trên tường, nối hai bức tường). */
export function ceilingBeam(length: number): KitPiece {
  return makePiece('ceiling-beam', [kitBox(KIT_COLORS.frame, 0, 0.04, 0, length, 0.08, 0.08)]);
}

/**
 * Đèn thả: dây treo và chụp đèn. Gốc ở đáy chụp (y = 0); dây đi lên tới y = `drop` + chụp, điểm treo ở đỉnh mảnh.
 * Bóng phát sáng là mảnh riêng (`lampBulb`) vì chỉ hiện ban đêm.
 */
export function pendantLamp(drop = 0.3): KitPiece {
  const shadeH = 0.12;
  return makePiece('pendant-lamp', [
    kitBox(KIT_COLORS.metalDark, 0, shadeH + drop / 2, 0, 0.015, drop, 0.015),
    kitBox(KIT_COLORS.lampShade, 0, shadeH / 2, 0, 0.28, shadeH, 0.28),
  ]);
}

/** Bóng đèn của đèn thả, đặt dưới chụp (gốc ở đáy chụp). Dùng với vai trò glow: chỉ hiện ban đêm. */
export function lampBulb(): KitPiece {
  return makePiece('lamp-bulb', [kitBox(KIT_COLORS.glow, 0, 0.03, 0, 0.12, 0.06, 0.12)]);
}

/**
 * Áp phích dán tường: khung gỗ, tranh màu (ba biến thể) và dải trắng. Rộng 0,5, cao 0,7, nhô 0,03; mặt phẳng tường ở z = 0,
 * đáy ở y = 0 (đặt ở độ cao treo tranh).
 */
export function wallPoster(variant: 0 | 1 | 2 = 0): KitPiece {
  const panel = [KIT_COLORS.produceRed, KIT_COLORS.produceYellow, KIT_COLORS.produceGreen][variant];
  return makePiece('wall-poster', [
    kitBox(KIT_COLORS.frame, 0, 0.35, 0.01, 0.5, 0.7, 0.02),
    kitBox(panel, 0, 0.35, 0.025, 0.42, 0.62, 0.01),
    kitBox(KIT_COLORS.board, 0, 0.18, 0.032, 0.34, 0.1, 0.006),
  ]);
}

/**
 * Bảng giá: bảng phấn đen, khung gỗ và bốn dòng phấn kẻ (chưa có chữ). Rộng 0,8, cao 0,5, nhô 0,04; mặt phẳng tường ở z = 0.
 */
export function priceBoard(): KitPiece {
  const w = 0.8;
  const h = 0.5;
  const t = 0.04;
  const boxes = [
    kitBox(KIT_COLORS.chalkboard, 0, h / 2, 0.015, w - 2 * t, h - 2 * t, 0.03),
    kitBox(KIT_COLORS.frame, 0, t / 2, 0.02, w, t, 0.04),
    kitBox(KIT_COLORS.frame, 0, h - t / 2, 0.02, w, t, 0.04),
    kitBox(KIT_COLORS.frame, -(w / 2 - t / 2), h / 2, 0.02, t, h - 2 * t, 0.04),
    kitBox(KIT_COLORS.frame, w / 2 - t / 2, h / 2, 0.02, t, h - 2 * t, 0.04),
  ];
  for (let i = 0; i < 4; i++) boxes.push(kitBox(KIT_COLORS.chalk, -0.06 + (i % 2) * 0.04, 0.38 - i * 0.09, 0.034, 0.5 - (i % 2) * 0.1, 0.02, 0.004));
  return makePiece('price-board', boxes);
}

/** Thảm chùi chân: tấm thảm phủ viền. Rộng `width` theo x, sâu 0,5, dày 0,02; đáy ở y = 0, căn giữa x = z = 0. */
export function doorMat(width: number): KitPiece {
  return makePiece('door-mat', [
    kitBox(KIT_COLORS.mat, 0, 0.01, 0, width, 0.02, 0.5),
    kitBox(KIT_COLORS.boardTrim, 0, 0.022, 0, width - 0.1, 0.004, 0.4),
  ]);
}
