import { KIT_COLORS } from '../style-spec';
import { kitBox, makePiece, type KitPiece } from './piece';

/** Thùng hàng trưng trước tiệm: thùng gỗ đầy rau củ (ba khối màu). Rộng 0,4, cao 0,3, sâu 0,28; đáy ở y = 0. */
export function produceCrate(): KitPiece {
  return makePiece('produce-crate', [
    kitBox(KIT_COLORS.crate, 0, 0.09, 0, 0.4, 0.18, 0.28),
    kitBox(KIT_COLORS.produceRed, -0.12, 0.24, 0, 0.13, 0.12, 0.13),
    kitBox(KIT_COLORS.produceGreen, 0.02, 0.24, 0.04, 0.13, 0.12, 0.13),
    kitBox(KIT_COLORS.produceYellow, 0.13, 0.24, -0.03, 0.11, 0.12, 0.11),
  ]);
}

/** Biển quảng cáo đứng trước tiệm: bảng kem viền đỏ trên hai chân. Rộng 0,42, cao 0,7, dày 0,06; mặt trước +z. */
export function sandwichBoard(): KitPiece {
  return makePiece('sandwich-board', [
    kitBox(KIT_COLORS.frame, -0.15, 0.15, 0, 0.04, 0.3, 0.04),
    kitBox(KIT_COLORS.frame, 0.15, 0.15, 0, 0.04, 0.3, 0.04),
    kitBox(KIT_COLORS.board, 0, 0.5, 0, 0.42, 0.4, 0.05),
    kitBox(KIT_COLORS.boardTrim, 0, 0.67, 0.005, 0.42, 0.06, 0.06),
  ]);
}

/** Chậu cây: chậu đất nung, lớp đất và hai tầng tán lá. Rộng 0,26, cao 0,6. */
export function plantPot(): KitPiece {
  return makePiece('plant-pot', [
    kitBox(KIT_COLORS.pot, 0, 0.11, 0, 0.2, 0.22, 0.2),
    kitBox(KIT_COLORS.soil, 0, 0.225, 0, 0.17, 0.02, 0.17),
    kitBox(KIT_COLORS.foliage, 0, 0.36, 0, 0.26, 0.26, 0.26),
    kitBox(KIT_COLORS.foliageDark, 0, 0.55, 0, 0.16, 0.14, 0.16),
  ]);
}
