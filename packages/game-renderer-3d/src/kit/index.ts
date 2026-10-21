export * from './piece';
export * from './openings';
export * from './trim';

import { cornerPost, baseboard, cornice } from './trim';
import { doorFrame, glassDoor, shopWindow } from './openings';
import type { KitPiece } from './piece';

/** Ngân sách khối của một mảnh kit (mảnh phức tạp hơn thì tách thành hai mảnh). */
export const KIT_BOX_BUDGET = 12;

/** Danh mục mảnh kit với kích thước mặc định, dùng cho studio chụp và test. */
export const KIT_PIECES: Record<string, () => KitPiece> = {
  'door-frame': () => doorFrame(),
  'glass-door': () => glassDoor(),
  'shop-window': () => shopWindow(),
  baseboard: () => baseboard(1),
  cornice: () => cornice(1),
  'corner-post': () => cornerPost(),
};
