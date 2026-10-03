import { getFixtureDimensions, type StoreFixture } from '@game/shared';
import { nullProto } from './safe-map';

/** Biên một tòa nhà (ô, tính cả tường). */
export interface BuildingBounds { left: number; right: number; top: number; bottom: number }

export type BuildingId = 'main' | 'xoi' | 'drink';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  /** Biên lớn nhất kể cả phần đã/chưa mua (tiệm chính tính tới cánh đông x=21). */
  bounds: BuildingBounds;
  /** Ô cửa nằm trên hàng tường dưới (bottom). */
  doorTiles: ReadonlyArray<{ x: number; y: number }>;
  /** Ô vỉa hè ngay trước cửa, nơi khách bước vào/ra. */
  entranceTile: { x: number; y: number };
  /** Id mảnh đất (LAND_PLOTS) cần mua để mở tòa; không có = luôn mở. */
  plotId?: string;
  /**
   * Mảnh mở rộng về phía bắc, mua lần lượt (mảnh sau cần mảnh trước): mỗi mảnh lùi tường sau lên `NORTH_EXPANSION_ROWS` hàng.
   * `bounds` là biên gốc (chưa mở rộng); `maxBounds` là biên khi mua đủ.
   */
  expansionPlotIds?: readonly string[];
  maxBounds: BuildingBounds;
}

/** Tiệm tạp hóa chính (cũ). Biên phần gốc, chưa gồm cánh đông. */
export const MAIN_STORE_BOUNDS: BuildingBounds = { left: 6, right: 13, top: 3, bottom: 10 };
/** Giới hạn đông của tiệm chính khi mua đủ hai cánh (khớp `east` trong generateStarterTileMap). */
export const MAIN_STORE_MAX_RIGHT = 21;

/**
 * Tiệm xôi: tòa thứ hai trên cùng bản đồ, ở dải đất phía tây, dùng chung tường x=6 với tiệm chính.
 * Sàn trong x=1..5 (5 ô), y=4..9 (6 ô); cửa 2 ô ở hàng y=10, x=1..2 (tránh cây ở (3,11)).
 */
export const XOI_BOUNDS: BuildingBounds = { left: 0, right: 6, top: 3, bottom: 10 };
export const XOI_PLOT_ID = 'building-xoi';
/** Nhịp sinh khách của tiệm xôi so với trần sinh khách (provisional; 0,02 ≈ 10 khách/ngày, hoàn vốn ≈ 8 ngày theo xoi-balance-sim, 03/10/2026). */
export const XOI_TRAFFIC_SHARE = 0.02;

/**
 * Quán nước: tòa thứ ba, đứng riêng ở dải đất phía đông (bản đồ mở rộng tới 36 cột). Quán nhỏ 10×8 ô tính cả tường:
 * sàn trong x=27..34 (8 ô), y=4..9 (6 ô); cửa 2 ô ở hàng y=10, x=30..31. Khác tiệm xôi, có đủ bốn bức tường riêng.
 */
export const DRINK_BOUNDS: BuildingBounds = { left: 26, right: 35, top: 3, bottom: 10 };
export const DRINK_PLOT_ID = 'building-drink';
/** Nhịp sinh khách của quán nước so với trần sinh khách (provisional; 0,05 ≈ 26 khách/ngày, hoàn vốn ≈ 9 ngày theo drink-balance-sim, 03/10/2026). */
export const DRINK_TRAFFIC_SHARE = 0.05;

/**
 * Nhịp sinh khách tương đối của từng tòa phụ so với tiệm chính (1 = bằng tiệm chính): mỗi tòa có dòng khách riêng, chỉ sinh khi
 * tòa đó có kệ còn hàng, nên mở thêm tòa là thêm khách chứ không chia lại khách tiệm chính. Thứ tự = thứ tự xét; provisional, chưa cân bằng.
 */
export const BUILDING_TRAFFIC_SHARE: ReadonlyArray<readonly [BuildingId, number]> = [['xoi', XOI_TRAFFIC_SHARE], ['drink', DRINK_TRAFFIC_SHARE]];

/** Số hàng sàn thêm cho mỗi mảnh mở rộng phía bắc của tiệm xôi và quán nước. */
export const NORTH_EXPANSION_ROWS = 3;
export const XOI_EXPANSION_PLOT_IDS = ['xoi-north-a', 'xoi-north-b'] as const;
export const DRINK_EXPANSION_PLOT_IDS = ['drink-north-a', 'drink-north-b'] as const;
const withExpansion = (bounds: BuildingBounds, plots: readonly string[]): BuildingBounds => ({ ...bounds, top: bounds.top - NORTH_EXPANSION_ROWS * plots.length });

export const BUILDINGS: readonly BuildingDef[] = [
  {
    id: 'main', name: 'Tiệm tạp hóa',
    bounds: { ...MAIN_STORE_BOUNDS, right: MAIN_STORE_MAX_RIGHT },
    doorTiles: [{ x: 9, y: 10 }, { x: 10, y: 10 }],
    entranceTile: { x: 9, y: 11 },
    maxBounds: { ...MAIN_STORE_BOUNDS, right: MAIN_STORE_MAX_RIGHT },
  },
  {
    id: 'xoi', name: 'Tiệm xôi',
    bounds: XOI_BOUNDS,
    doorTiles: [{ x: 1, y: 10 }, { x: 2, y: 10 }],
    entranceTile: { x: 1, y: 11 },
    plotId: XOI_PLOT_ID,
    expansionPlotIds: XOI_EXPANSION_PLOT_IDS,
    maxBounds: withExpansion(XOI_BOUNDS, XOI_EXPANSION_PLOT_IDS),
  },
  {
    id: 'drink', name: 'Quán nước',
    bounds: DRINK_BOUNDS,
    doorTiles: [{ x: 30, y: 10 }, { x: 31, y: 10 }],
    entranceTile: { x: 30, y: 11 },
    plotId: DRINK_PLOT_ID,
    expansionPlotIds: DRINK_EXPANSION_PLOT_IDS,
    maxBounds: withExpansion(DRINK_BOUNDS, DRINK_EXPANSION_PLOT_IDS),
  },
];

export const BUILDING_MAP: Record<BuildingId, BuildingDef> = nullProto(Object.fromEntries(BUILDINGS.map(building => [building.id, building])) as Record<BuildingId, BuildingDef>);

/**
 * Hàng tường sau (y) hiện tại của tòa theo các mảnh đã mua: tiệm chính cố định; tiệm xôi/quán nước lùi lên
 * `NORTH_EXPANSION_ROWS` hàng cho mỗi mảnh mở rộng đã mua liên tiếp từ mảnh đầu (mảnh sau chỉ tính khi có mảnh trước).
 */
export function buildingTop(id: BuildingId, ownedPlotIds: ReadonlySet<string> | readonly string[]): number {
  const owned = ownedPlotIds instanceof Set ? ownedPlotIds : new Set(ownedPlotIds);
  const def = BUILDING_MAP[id];
  if (!def || (def.plotId && !owned.has(def.plotId))) return def?.bounds.top ?? 0;
  let rows = 0;
  for (const plotId of def.expansionPlotIds ?? []) {
    if (!owned.has(plotId)) break;
    rows++;
  }
  return def.bounds.top - NORTH_EXPANSION_ROWS * rows;
}

/** Ô nằm trong biên tòa (tính cả tường). */
export const inBounds = (bounds: BuildingBounds, x: number, y: number): boolean =>
  x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;

/**
 * Tòa chứa ô (x, y), hoặc undefined (đường, vỉa hè, kho). Tường chung x=6 thuộc tiệm chính.
 * Tiệm xôi được tìm sau tiệm chính nên ô tường chung luôn ra `main`.
 */
export function buildingAt(x: number, y: number): BuildingId | undefined {
  for (const building of BUILDINGS) if (inBounds(building.maxBounds, x, y)) return building.id;
  return undefined;
}

/** Ô thuộc phần sàn trong (không phải tường) của tòa. */
export const inInterior = (bounds: BuildingBounds, x: number, y: number): boolean =>
  x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom;

/** Tòa chứa trọn mọi ô của footprint (không chạm tường chung/ngoài); undefined nếu vắt qua nhiều tòa hoặc ra ngoài. */
export function buildingOfTiles(tiles: ReadonlyArray<{ x: number; y: number }>): BuildingId | undefined {
  let found: BuildingId | undefined;
  for (const tile of tiles) {
    const id = BUILDINGS.find(building => inBounds(building.maxBounds, tile.x, tile.y) && (building.id === 'main' || inInterior(building.maxBounds, tile.x, tile.y)))?.id;
    if (!id || (found && id !== found)) return undefined;
    found = id;
  }
  return found;
}

/** Tòa chứa trọn footprint của nội thất (đã tính xoay); undefined nếu vắt qua tường hoặc ra ngoài. */
export function fixtureBuilding(fixture: Pick<StoreFixture, 'tileX' | 'tileY' | 'widthTiles' | 'heightTiles' | 'rotation'>): BuildingId | undefined {
  const { widthTiles, heightTiles } = getFixtureDimensions(fixture);
  const tiles: Array<{ x: number; y: number }> = [];
  for (let dx = 0; dx < widthTiles; dx++) for (let dy = 0; dy < heightTiles; dy++) tiles.push({ x: fixture.tileX + dx, y: fixture.tileY + dy });
  return buildingOfTiles(tiles);
}

/** Bố cục mặc định khi mua tiệm xôi (quy đổi từ `branches.json` của game gốc; id cố định để mua lặp không nhân đôi). */
export const XOI_DEFAULT_FIXTURES: readonly StoreFixture[] = [
  { id: 'xoi_thung_ngam', type: 'kitchen_station', tileX: 1, tileY: 4, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Thùng ngâm nếp', shopId: 'thung_ngam', slotCount: 1 },
  { id: 'xoi_xung_hap', type: 'kitchen_station', tileX: 2, tileY: 4, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Xửng hấp xôi', shopId: 'xung_hap', slotCount: 1 },
  { id: 'xoi_quay_xoi', type: 'kitchen_station', tileX: 3, tileY: 4, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy xôi', shopId: 'quay_xoi', slotCount: 1 },
  { id: 'xoi_shelf', type: 'shelf_wooden', tileX: 4, tileY: 4, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 20, label: 'Kệ xôi', shopId: 'shelf', slotCount: 12 },
  { id: 'xoi_table', type: 'dining_table', tileX: 5, tileY: 6, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bàn 2 chỗ', shopId: 'food_table_2', slotCount: 1 },
  { id: 'xoi_cashier_counter', type: 'cashier_counter', tileX: 2, tileY: 8, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy thu ngân tiệm xôi' },
];

/** Bố cục mặc định khi mua quán nước (id cố định để mua lặp không nhân đôi). Quầy, máy xay, máy ép mía chạy qua hệ sản xuất có sẵn. */
export const DRINK_DEFAULT_FIXTURES: readonly StoreFixture[] = [
  { id: 'drink_counter_1', type: 'kitchen_station', tileX: 27, tileY: 4, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy nước', shopId: 'drink_counter', slotCount: 1 },
  { id: 'drink_blender_1', type: 'kitchen_station', tileX: 29, tileY: 4, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Máy xay', shopId: 'blender', slotCount: 1 },
  { id: 'drink_press_1', type: 'kitchen_station', tileX: 30, tileY: 4, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Máy ép mía', shopId: 'sugarcane_press', slotCount: 1 },
  { id: 'drink_shelf', type: 'shelf_wooden', tileX: 33, tileY: 4, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 20, label: 'Kệ nước', shopId: 'shelf', slotCount: 12 },
  { id: 'drink_table_a', type: 'dining_table', tileX: 33, tileY: 7, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bàn nước 2 chỗ', shopId: 'drink_table_2', slotCount: 1 },
  { id: 'drink_table_b', type: 'dining_table', tileX: 33, tileY: 8, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bàn nước 2 chỗ', shopId: 'drink_table_2', slotCount: 1 },
  { id: 'drink_cashier_counter', type: 'cashier_counter', tileX: 28, tileY: 8, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Quầy thu ngân quán nước' },
];
