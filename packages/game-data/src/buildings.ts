import { getFixtureDimensions, type StoreFixture } from '@game/shared';
import { nullProto } from './safe-map';

/** Biên một tòa nhà (ô, tính cả tường). */
export interface BuildingBounds { left: number; right: number; top: number; bottom: number }

export type BuildingId = 'main' | 'xoi';

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
/** Tỷ lệ khách tự sinh chọn tiệm xôi khi cả hai tòa có hàng (provisional, đo bằng xoi-balance-sim). */
export const XOI_TRAFFIC_SHARE = 0.15;

export const BUILDINGS: readonly BuildingDef[] = [
  {
    id: 'main', name: 'Tiệm tạp hóa',
    bounds: { ...MAIN_STORE_BOUNDS, right: MAIN_STORE_MAX_RIGHT },
    doorTiles: [{ x: 9, y: 10 }, { x: 10, y: 10 }],
    entranceTile: { x: 9, y: 11 },
  },
  {
    id: 'xoi', name: 'Tiệm xôi',
    bounds: XOI_BOUNDS,
    doorTiles: [{ x: 1, y: 10 }, { x: 2, y: 10 }],
    entranceTile: { x: 1, y: 11 },
    plotId: XOI_PLOT_ID,
  },
];

export const BUILDING_MAP: Record<BuildingId, BuildingDef> = nullProto(Object.fromEntries(BUILDINGS.map(building => [building.id, building])) as Record<BuildingId, BuildingDef>);

/** Ô nằm trong biên tòa (tính cả tường). */
export const inBounds = (bounds: BuildingBounds, x: number, y: number): boolean =>
  x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;

/**
 * Tòa chứa ô (x, y), hoặc undefined (đường, vỉa hè, kho). Tường chung x=6 thuộc tiệm chính.
 * Tiệm xôi được tìm sau tiệm chính nên ô tường chung luôn ra `main`.
 */
export function buildingAt(x: number, y: number): BuildingId | undefined {
  for (const building of BUILDINGS) if (inBounds(building.bounds, x, y)) return building.id;
  return undefined;
}

/** Ô thuộc phần sàn trong (không phải tường) của tòa. */
export const inInterior = (bounds: BuildingBounds, x: number, y: number): boolean =>
  x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom;

/** Tòa chứa trọn mọi ô của footprint (không chạm tường chung/ngoài); undefined nếu vắt qua nhiều tòa hoặc ra ngoài. */
export function buildingOfTiles(tiles: ReadonlyArray<{ x: number; y: number }>): BuildingId | undefined {
  let found: BuildingId | undefined;
  for (const tile of tiles) {
    const id = BUILDINGS.find(building => inBounds(building.bounds, tile.x, tile.y) && (building.id !== 'xoi' || inInterior(building.bounds, tile.x, tile.y)))?.id;
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
