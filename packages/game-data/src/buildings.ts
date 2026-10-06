import { getFixtureDimensions, type MapBuilding, type StoreFixture } from '@game/shared';
import { nullProto } from './safe-map';
import {
  DRINK_EXPANSION_PLOT_IDS, DRINK_PLOT_ID, NORTH_EXPANSION_ROWS, SNACK_EXPANSION_PLOT_IDS, SNACK_PLOT_ID, XOI_EXPANSION_PLOT_IDS, XOI_PLOT_ID, type BuildingId,
} from './world/building-templates';
import { PARCEL_MAP } from './world/parcels';
import { DEFAULT_GEOMETRY, DEFAULT_PLACEMENTS, warehouseGeometry, type BuildingBounds } from './world/placements';

// Hình học tòa nay suy ra từ mô hình thế giới mở (`world/`): mẫu tòa (tọa độ tương đối) + vị trí đặt mặc định.
// Các export dưới đây giữ tên cũ để code cũ không phải đổi; giá trị trùng hằng số trước refactor (golden `world-golden`).
export type { BuildingBounds, BuildingId };
export { DRINK_EXPANSION_PLOT_IDS, DRINK_PLOT_ID, NORTH_EXPANSION_ROWS, SNACK_EXPANSION_PLOT_IDS, SNACK_PLOT_ID, XOI_EXPANSION_PLOT_IDS, XOI_PLOT_ID };

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

/** Tiệm tạp hóa chính (cũ). Biên phần gốc, chưa gồm cánh đông: x 6..13, y 3..10 ở vị trí mặc định. */
export const MAIN_STORE_BOUNDS: BuildingBounds = DEFAULT_GEOMETRY.main.coreBounds;
/** Giới hạn đông của tiệm chính khi mua đủ hai cánh (khớp `east` trong generateStarterTileMap): x=21 ở vị trí mặc định. */
export const MAIN_STORE_MAX_RIGHT = DEFAULT_GEOMETRY.main.bounds.right;

/**
 * Tiệm xôi: tòa thứ hai trên cùng bản đồ, ở dải đất phía tây, dùng chung tường x=6 với tiệm chính.
 * Sàn trong x=1..5 (5 ô), y=4..9 (6 ô); cửa 2 ô ở hàng y=10, x=1..2 (tránh cây ở (3,11)).
 */
export const XOI_BOUNDS: BuildingBounds = DEFAULT_GEOMETRY.xoi.bounds;
/** Nhịp sinh khách của tiệm xôi so với trần sinh khách (provisional; 0,02 ≈ 10 khách/ngày, hoàn vốn ≈ 8 ngày theo xoi-balance-sim, 03/10/2026). */
export const XOI_TRAFFIC_SHARE = 0.02;

/**
 * Quán nước: tòa thứ ba, đứng riêng ở dải đất phía đông (bản đồ mở rộng tới 36 cột). Quán nhỏ 10×8 ô tính cả tường:
 * sàn trong x=27..34 (8 ô), y=4..9 (6 ô); cửa 2 ô ở hàng y=10, x=30..31. Khác tiệm xôi, có đủ bốn bức tường riêng.
 */
export const DRINK_BOUNDS: BuildingBounds = DEFAULT_GEOMETRY.drink.bounds;
/** Nhịp sinh khách của quán nước so với trần sinh khách (provisional; 0,05 ≈ 26 khách/ngày, hoàn vốn ≈ 9 ngày theo drink-balance-sim, 03/10/2026). */
export const DRINK_TRAFFIC_SHARE = 0.05;

/**
 * Quán ăn vặt: tòa thứ tư, nhỏ nhất, chen vào khoảng trống x=21..26 giữa cánh đông tiệm chính (tường x=21 dùng chung khi mua đủ
 * hai cánh) và quán nước (tường x=26 dùng chung). Sàn trong x=22..25 (4 ô), y=4..9 (6 ô); cửa 2 ô ở hàng y=10, x=22..23
 * (cách cây ở (25,11) một ô, cây ở (19,11) xa cửa). "Bé trước, nâng cấp sau": hai mảnh mở rộng bắc thêm 3 hàng mỗi mảnh.
 */
export const SNACK_BOUNDS: BuildingBounds = DEFAULT_GEOMETRY.snack.bounds;
/** Nhịp sinh khách của quán ăn vặt so với trần sinh khách (provisional, chưa mô phỏng cân bằng: 0,03 ≈ 15 khách/ngày). */
export const SNACK_TRAFFIC_SHARE = 0.03;

/**
 * Nhịp sinh khách tương đối của từng tòa phụ so với tiệm chính (1 = bằng tiệm chính): mỗi tòa có dòng khách riêng, chỉ sinh khi
 * tòa đó có kệ còn hàng, nên mở thêm tòa là thêm khách chứ không chia lại khách tiệm chính. Thứ tự = thứ tự xét; provisional, chưa cân bằng.
 */
export const BUILDING_TRAFFIC_SHARE: ReadonlyArray<readonly [BuildingId, number]> = [['xoi', XOI_TRAFFIC_SHARE], ['drink', DRINK_TRAFFIC_SHARE], ['snack', SNACK_TRAFFIC_SHARE]];

/**
 * Cụm ẩm thực: càng nhiều tòa phụ đang mở (tiệm xôi, quán nước, quán ăn vặt) thì khách đổ về các tòa phụ càng đông
 * (nhân nhịp sinh khách của các tòa phụ). Chỉ số = số tòa phụ đang mở. Provisional, chưa cân bằng/playtest.
 */
export const FOOD_CLUSTER_TRAFFIC_MULTIPLIER: readonly number[] = [1, 1, 1.1, 1.2];
export const foodClusterMultiplier = (openSecondaryCount: number): number =>
  FOOD_CLUSTER_TRAFFIC_MULTIPLIER[Math.max(0, Math.min(FOOD_CLUSTER_TRAFFIC_MULTIPLIER.length - 1, Math.floor(openSecondaryCount)))];
/** Bốn tòa theo thứ tự ưu tiên của `DEFAULT_PLACEMENTS` (main → xoi → drink → snack): tường chung thuộc tòa đứng trước. */
export const BUILDINGS: readonly BuildingDef[] = DEFAULT_PLACEMENTS.map(placement => {
  const geo = DEFAULT_GEOMETRY[placement.buildingId];
  return {
    id: placement.buildingId,
    name: geo.template.name,
    bounds: geo.bounds,
    doorTiles: geo.doorTiles,
    entranceTile: geo.entranceTile,
    ...(geo.template.plotId ? { plotId: geo.template.plotId } : {}),
    ...(geo.template.expansionPlotIds ? { expansionPlotIds: geo.template.expansionPlotIds } : {}),
    maxBounds: geo.maxBounds,
  };
});

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
export function buildingAt(x: number, y: number, buildings?: readonly MapBuilding[]): BuildingId | undefined {
  for (const building of placedBuildings(buildings)) if (inBounds(building.maxBounds, x, y) || building.floorKeys?.has(`${x},${y}`)) return building.id;
  return undefined;
}

/** Tòa theo vị trí đặt hiện tại (`GameTileMap.buildings`); thiếu = bốn tòa ở vị trí mặc định (`BUILDINGS`). Thứ tự = thứ tự ưu tiên. */
function placedBuildings(buildings: readonly MapBuilding[] | undefined): ReadonlyArray<{ id: BuildingId; maxBounds: BuildingBounds; floorKeys?: ReadonlySet<string> }> {
  if (!buildings) return BUILDINGS;
  return buildings.filter(building => !!building.maxBounds).map(building => ({
    id: building.id as BuildingId, maxBounds: building.maxBounds as BuildingBounds,
    ...(building.floorTiles?.length ? { floorKeys: new Set(building.floorTiles.map(tile => `${tile.x},${tile.y}`)) } : {}),
  }));
}

/** Ô vào cửa của tòa theo vị trí hiện tại; thiếu thông tin thì dùng vị trí mặc định. */
export const entranceOf = (id: BuildingId, buildings?: readonly MapBuilding[]): { x: number; y: number } =>
  buildings?.find(building => building.id === id)?.entranceTile ?? BUILDING_MAP[id].entranceTile;

/** Ô thuộc phần sàn trong (không phải tường) của tòa. */
export const inInterior = (bounds: BuildingBounds, x: number, y: number): boolean =>
  x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom;

/**
 * Vùng sàn tiệm chính có thể mở rộng ra ngoài hộp `maxBounds` (OpenSpec `open-world-main-expansion`): trong lô của tiệm chính, thu vào một ô
 * cho hàng tường, trừ nhà kho sau tiệm. Ô ở đây chỉ là sàn tiệm chính khi người chơi đã mở rộng tới đó (bản đồ quyết định, ground = 3).
 */
const MAIN_PARCEL_RECT = PARCEL_MAP[DEFAULT_PLACEMENTS[0].parcelId].rect;
const MAIN_WAREHOUSE = warehouseGeometry(DEFAULT_GEOMETRY.main).bounds;
export const inMainExpansionZone = (x: number, y: number): boolean =>
  x > MAIN_PARCEL_RECT.x0 && x < MAIN_PARCEL_RECT.x1 && y > MAIN_PARCEL_RECT.y0 && y < MAIN_PARCEL_RECT.y1
  && !inBounds(MAIN_WAREHOUSE, x, y);

/** Tòa chứa trọn mọi ô của footprint (không chạm tường chung/ngoài); undefined nếu vắt qua nhiều tòa hoặc ra ngoài. */
export function buildingOfTiles(tiles: ReadonlyArray<{ x: number; y: number }>, buildings?: readonly MapBuilding[]): BuildingId | undefined {
  let found: BuildingId | undefined;
  const placed = placedBuildings(buildings);
  for (const tile of tiles) {
    const id = placed.find(building => (inBounds(building.maxBounds, tile.x, tile.y) && (building.id === 'main' || inInterior(building.maxBounds, tile.x, tile.y)))
      || !!building.floorKeys?.has(`${tile.x},${tile.y}`)
      || (building.id === 'main' && inMainExpansionZone(tile.x, tile.y)))?.id;
    if (!id || (found && id !== found)) return undefined;
    found = id;
  }
  return found;
}

/** Tòa chứa trọn footprint của nội thất (đã tính xoay); undefined nếu vắt qua tường hoặc ra ngoài. */
export function fixtureBuilding(fixture: Pick<StoreFixture, 'tileX' | 'tileY' | 'widthTiles' | 'heightTiles' | 'rotation'>, buildings?: readonly MapBuilding[]): BuildingId | undefined {
  const { widthTiles, heightTiles } = getFixtureDimensions(fixture);
  const tiles: Array<{ x: number; y: number }> = [];
  for (let dx = 0; dx < widthTiles; dx++) for (let dy = 0; dy < heightTiles; dy++) tiles.push({ x: fixture.tileX + dx, y: fixture.tileY + dy });
  return buildingOfTiles(tiles, buildings);
}

/** Bố cục mặc định khi mua tiệm xôi (quy đổi từ `branches.json` của game gốc; id cố định để mua lặp không nhân đôi). Suy từ mẫu tòa + vị trí mặc định. */
export const XOI_DEFAULT_FIXTURES: readonly StoreFixture[] = DEFAULT_GEOMETRY.xoi.defaultFixtures;
/** Bố cục mặc định khi mua quán nước (id cố định để mua lặp không nhân đôi). Quầy, máy xay, máy ép mía chạy qua hệ sản xuất có sẵn. */
export const DRINK_DEFAULT_FIXTURES: readonly StoreFixture[] = DEFAULT_GEOMETRY.drink.defaultFixtures;
/** Bố cục mặc định khi mua quán ăn vặt (id cố định để mua lặp không nhân đôi): chảo xào, chảo chiên, kệ, bàn, thu ngân. */
export const SNACK_DEFAULT_FIXTURES: readonly StoreFixture[] = DEFAULT_GEOMETRY.snack.defaultFixtures;

/**
 * Bề ngang mái hiên mặt tiền (px) — một nguồn duy nhất cho hình vẽ mặt tiền (viewport), khu trú mưa (shelter.ts) và nước chảy
 * (ROOF_EAVES). Suy từ `awning` của mẫu tòa + vị trí đặt (tiệm chính: sprite `tile_awning` 128 px bắt đầu ở ô 7).
 */
export const AWNING_SPANS = {
  main: DEFAULT_GEOMETRY.main.awning,
  xoi: DEFAULT_GEOMETRY.xoi.awning,
  drink: DEFAULT_GEOMETRY.drink.awning,
  snack: DEFAULT_GEOMETRY.snack.awning,
} as const;
export type AwningId = keyof typeof AWNING_SPANS;

/**
 * Mép mái/mái hiên nơi nước mưa chảy xuống (px); `y` là mép dưới mái hiên (suy từ `eaveOffsetPx` của mẫu tòa), nước rơi
 * khoảng `roofWater.dropHeight` px xuống vỉa hè.
 */
export const ROOF_EAVES: Array<{ id: string; awning: AwningId; x0: number; x1: number; y: number }> = [
  { id: 'main-awning', awning: 'main', x0: AWNING_SPANS.main.x0 + 8, x1: AWNING_SPANS.main.x1 - 8, y: DEFAULT_GEOMETRY.main.eaveY },
  { id: 'xoi-front', awning: 'xoi', x0: AWNING_SPANS.xoi.x0 + 8, x1: AWNING_SPANS.xoi.x1 - 8, y: DEFAULT_GEOMETRY.xoi.eaveY },
  { id: 'drink-front', awning: 'drink', x0: AWNING_SPANS.drink.x0 + 8, x1: AWNING_SPANS.drink.x1 - 8, y: DEFAULT_GEOMETRY.drink.eaveY },
  { id: 'snack-front', awning: 'snack', x0: AWNING_SPANS.snack.x0 + 8, x1: AWNING_SPANS.snack.x1 - 8, y: DEFAULT_GEOMETRY.snack.eaveY },
];

/** Nhà kho sau tiệm chính (cùng nguồn `warehouseGeometry` với WAREHOUSE_BOUNDS ở map.ts), để `shelter.ts` không import vòng. */
export const WAREHOUSE_BOUNDS_FOR_SHELTER = warehouseGeometry(DEFAULT_GEOMETRY.main).bounds;

/** Dải vỉa hè ngay dưới mái hiên của tòa (px theo trục y): từ mép dưới hàng tường mặt tiền xuống 44 px (chứa làn đi bộ y ≈ 371–390). */
export const awningShelterBand = (id: AwningId): { y0: number; y1: number } => {
  const y0 = (DEFAULT_GEOMETRY[id].bounds.bottom + 1) * 32;
  return { y0, y1: y0 + 44 };
};
