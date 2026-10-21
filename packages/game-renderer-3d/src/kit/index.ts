export * from './piece';
export * from './openings';
export * from './trim';
export * from './roof';
export * from './props';
export * from './interior';

import { cornerPost, baseboard, cornice } from './trim';
import { doorFrame, glassDoor, shopWindow } from './openings';
import { parapet, acUnit, waterTank } from './roof';
import { produceCrate, sandwichBoard, plantPot } from './props';
import { ceilingBeam, doorMat, lampBulb, pendantLamp, priceBoard, wallPoster } from './interior';
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
  parapet: () => parapet(2, 2),
  'ac-unit': () => acUnit(),
  'water-tank': () => waterTank(),
  'produce-crate': () => produceCrate(),
  'sandwich-board': () => sandwichBoard(),
  'plant-pot': () => plantPot(),
  'ceiling-beam': () => ceilingBeam(2),
  'pendant-lamp': () => pendantLamp(),
  'lamp-bulb': () => lampBulb(),
  'wall-poster': () => wallPoster(),
  'price-board': () => priceBoard(),
  'door-mat': () => doorMat(1.5),
};
