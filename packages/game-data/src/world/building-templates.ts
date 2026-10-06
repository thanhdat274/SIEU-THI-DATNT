/**
 * Lớp 3a của mô hình thế giới mở: mẫu tòa. Mọi tọa độ ở đây là TƯƠNG ĐỐI so với gốc vị trí đặt (góc trên-trái biên gốc,
 * tính cả tường); tọa độ thế giới = gốc + tương đối (xem `placements.ts`). Không import `buildings.ts`/`map.ts`/`land.ts`.
 */
import type { StoreFixture } from '@game/shared';

export type BuildingId = 'main' | 'xoi' | 'drink' | 'snack';

export interface RelTile { x: number; y: number }

export const XOI_PLOT_ID = 'building-xoi';
export const DRINK_PLOT_ID = 'building-drink';
export const SNACK_PLOT_ID = 'building-snack';
/** Số hàng sàn thêm cho mỗi mảnh mở rộng phía bắc của tòa phụ. */
export const NORTH_EXPANSION_ROWS = 3;
export const XOI_EXPANSION_PLOT_IDS = ['xoi-north-a', 'xoi-north-b'] as const;
export const DRINK_EXPANSION_PLOT_IDS = ['drink-north-a', 'drink-north-b'] as const;
export const SNACK_EXPANSION_PLOT_IDS = ['snack-north-a', 'snack-north-b'] as const;
/** Hai cánh đông của tiệm chính, mua lần lượt; mỗi cánh rộng 4 cột (cột cuối là tường mới). */
export const MAIN_EAST_WING_PLOT_IDS = ['east-wing-a', 'east-wing-b'] as const;
export const MAIN_EAST_WING_COLUMNS = 4;

export interface BuildingTemplate {
  id: BuildingId;
  name: string;
  /** Kích thước biên (ô, tính cả tường) chưa gồm mở rộng phía bắc; tiệm chính tính cả hai cánh đông. */
  width: number;
  height: number;
  /** Chỉ tiệm chính: bề rộng phần lõi chưa mua cánh đông (MAIN_STORE_BOUNDS). */
  coreWidth?: number;
  /** Cột tường đông là tường của tòa bên cạnh (tiệm xôi dùng tường tây tiệm chính): không tự dựng cột này. */
  sharesEastWall?: boolean;
  /** Tòa có nhà kho phía sau (tiệm chính) và hai cánh đông mua thêm. */
  hasWarehouse?: boolean;
  eastWingPlotIds?: readonly string[];
  doorTiles: readonly RelTile[];
  entranceTile: RelTile;
  /** Mái hiên mặt tiền: ô bắt đầu (tương đối, có thể lẻ) và bề ngang (ô). */
  awning: { startTiles: number; widthTiles: number };
  /** Mép dưới mái hiên nơi nước mưa chảy = (hàng tường dưới + 1) × 32 − độ lệch (px). */
  eaveOffsetPx: number;
  plotId?: string;
  /** Mảnh mở rộng phía bắc, mua lần lượt, mỗi mảnh `NORTH_EXPANSION_ROWS` hàng. */
  expansionPlotIds?: readonly string[];
  /** Bố cục mặc định khi mua tòa (id cố định để mua lặp không nhân đôi). */
  defaultFixtures: readonly StoreFixture[];
}

/** Tiệm tạp hóa chính: lõi x 6..13 (8 ô), cộng hai cánh đông tới x=21; cửa x 9..10. */
const MAIN: BuildingTemplate = {
  id: 'main', name: 'Tiệm tạp hóa', width: 16, height: 8, coreWidth: 8, hasWarehouse: true, eastWingPlotIds: MAIN_EAST_WING_PLOT_IDS,
  doorTiles: [{ x: 3, y: 7 }, { x: 4, y: 7 }], entranceTile: { x: 3, y: 8 },
  awning: { startTiles: 1, widthTiles: 4 }, eaveOffsetPx: 24,
  defaultFixtures: [],
};

/** Tiệm xôi: sàn trong 5×6, cửa 2 ô ở hàng dưới (tránh cây), dùng chung tường đông với tiệm chính. */
const XOI: BuildingTemplate = {
  id: 'xoi', name: 'Tiệm xôi', width: 7, height: 8, sharesEastWall: true,
  doorTiles: [{ x: 1, y: 7 }, { x: 2, y: 7 }], entranceTile: { x: 1, y: 8 },
  awning: { startTiles: 0.5, widthTiles: 3.5 }, eaveOffsetPx: 10,
  plotId: XOI_PLOT_ID, expansionPlotIds: XOI_EXPANSION_PLOT_IDS,
  defaultFixtures: [
    { id: 'xoi_thung_ngam', type: 'kitchen_station', tileX: 1, tileY: 1, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Thùng ngâm nếp', shopId: 'thung_ngam', slotCount: 1 },
    { id: 'xoi_xung_hap', type: 'kitchen_station', tileX: 2, tileY: 1, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Xửng hấp xôi', shopId: 'xung_hap', slotCount: 1 },
    { id: 'xoi_quay_xoi', type: 'kitchen_station', tileX: 3, tileY: 1, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy xôi', shopId: 'quay_xoi', slotCount: 1 },
    { id: 'xoi_shelf', type: 'shelf_wooden', tileX: 4, tileY: 1, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 20, label: 'Kệ xôi', shopId: 'shelf', slotCount: 12 },
    { id: 'xoi_table', type: 'dining_table', tileX: 5, tileY: 3, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bàn 2 chỗ', shopId: 'food_table_2', slotCount: 1 },
    { id: 'xoi_cashier_counter', type: 'cashier_counter', tileX: 2, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy thu ngân tiệm xôi' },
  ],
};

/** Quán nước: 10×8 tính cả tường, đủ bốn tường riêng; cửa 2 ô ở giữa hàng dưới. */
const DRINK: BuildingTemplate = {
  id: 'drink', name: 'Quán nước', width: 10, height: 8,
  doorTiles: [{ x: 4, y: 7 }, { x: 5, y: 7 }], entranceTile: { x: 4, y: 8 },
  awning: { startTiles: 3, widthTiles: 4 }, eaveOffsetPx: 10,
  plotId: DRINK_PLOT_ID, expansionPlotIds: DRINK_EXPANSION_PLOT_IDS,
  defaultFixtures: [
    { id: 'drink_counter_1', type: 'kitchen_station', tileX: 1, tileY: 1, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy nước', shopId: 'drink_counter', slotCount: 1 },
    { id: 'drink_blender_1', type: 'kitchen_station', tileX: 3, tileY: 1, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Máy xay', shopId: 'blender', slotCount: 1 },
    { id: 'drink_press_1', type: 'kitchen_station', tileX: 4, tileY: 1, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Máy ép mía', shopId: 'sugarcane_press', slotCount: 1 },
    { id: 'drink_shelf', type: 'shelf_wooden', tileX: 7, tileY: 1, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 20, label: 'Kệ nước', shopId: 'shelf', slotCount: 12 },
    { id: 'drink_table_a', type: 'dining_table', tileX: 7, tileY: 4, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bàn nước 2 chỗ', shopId: 'drink_table_2', slotCount: 1 },
    { id: 'drink_table_b', type: 'dining_table', tileX: 7, tileY: 5, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bàn nước 2 chỗ', shopId: 'drink_table_2', slotCount: 1 },
    { id: 'drink_cashier_counter', type: 'cashier_counter', tileX: 2, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy thu ngân quán nước' },
  ],
};

/** Quán ăn vặt: tòa nhỏ nhất 6×8 tính cả tường; cửa 2 ô sát tường trái. */
const SNACK: BuildingTemplate = {
  id: 'snack', name: 'Quán ăn vặt', width: 6, height: 8,
  doorTiles: [{ x: 1, y: 7 }, { x: 2, y: 7 }], entranceTile: { x: 1, y: 8 },
  awning: { startTiles: 0.5, widthTiles: 4 }, eaveOffsetPx: 10,
  plotId: SNACK_PLOT_ID, expansionPlotIds: SNACK_EXPANSION_PLOT_IDS,
  defaultFixtures: [
    { id: 'snack_chao_xao', type: 'kitchen_station', tileX: 1, tileY: 1, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Chảo xào', shopId: 'chao_xao', slotCount: 1 },
    { id: 'snack_chao_chien', type: 'kitchen_station', tileX: 2, tileY: 1, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Chảo chiên', shopId: 'chao_chien', slotCount: 1 },
    { id: 'snack_shelf', type: 'shelf_wooden', tileX: 3, tileY: 1, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 20, label: 'Kệ ăn vặt', shopId: 'shelf', slotCount: 12 },
    { id: 'snack_table', type: 'dining_table', tileX: 4, tileY: 3, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bàn 2 chỗ', shopId: 'food_table_2', slotCount: 1 },
    { id: 'snack_cashier_counter', type: 'cashier_counter', tileX: 3, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy thu ngân quán ăn vặt' },
  ],
};

export const BUILDING_TEMPLATES: Readonly<Record<BuildingId, BuildingTemplate>> = { main: MAIN, xoi: XOI, drink: DRINK, snack: SNACK };
