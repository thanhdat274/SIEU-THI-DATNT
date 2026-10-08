import { GameTileMap, StoreFixture, SaveGameData, Vector2D, tileIndex, tileInMap, defaultWorldOpenState, ownedParcelIdsDefault, CURRENT_SAVE_SCHEMA_VERSION, type BuildingPlacementRecord } from '@game/shared';
import { STARTER_OWNED_PLOT_IDS } from './land';
import { STALLS } from './stalls';
import { MAIN_STORE_BOUNDS } from './buildings';
import { DEFAULT_GEOMETRY, DEFAULT_PLACEMENTS, layoutBuildings, resolvePlacements, placementFloor, placementGeometry, placementTop, warehouseGeometry } from './world/placements';
import { tileBox, tileKey, wallRing } from './world/footprint';
import { xpToNextLevel } from './progression';
import { PLAY_REGION, rectHeight, rectWidth, rectHas, playRegionForWaves, type WorldRect } from './world/world-grid';
import { TREE_PROPS } from './world/infrastructure';
import { RECLAMATION_WAVES } from './world/waves';
import { LAND_PARCELS } from './world/parcels';

/** Chủ tiệm đứng sau quầy thu ngân (phía bắc), nhìn ra chỗ khách xếp hàng; ô tương đối (2,4) của tiệm chính, mặc định (8,7). */
const MAIN_GEOMETRY = DEFAULT_GEOMETRY.main;
export const SHOPKEEPER_TILE = { x: MAIN_GEOMETRY.bounds.left + 2, y: MAIN_GEOMETRY.bounds.top + 4 };
export const SHOPKEEPER_POSITION = { x: (SHOPKEEPER_TILE.x + 0.5) * 32, y: (SHOPKEEPER_TILE.y + 1) * 32 - 2 };

/** Kích thước bản đồ chơi suy từ vùng chơi đợt 0 (`world/world-grid.ts`): 36×22, gốc y = −6. */
export const MAP_WIDTH: number = rectWidth(PLAY_REGION);
export const MAP_HEIGHT: number = rectHeight(PLAY_REGION);
export const MAP_ORIGIN_Y: number = PLAY_REGION.y0;
export const STORE_BOUNDS = MAIN_STORE_BOUNDS;
/** Điểm xuất hiện của người chơi trong hẻm chung: vỉa hè ngay ngoài cửa tiệm (cửa ở x=9..10, y=10). Chỉnh ở đây để đổi chỗ xuất hiện; chủ hẻm lấy mục 0, thành viên mục 1. */
export const ONLINE_SPAWN_POINTS: readonly { x: number; y: number }[] = [
  { x: (MAIN_GEOMETRY.entranceTile.x - 0.5) * 32, y: (MAIN_GEOMETRY.entranceTile.y + 1.5) * 32 },
  { x: (MAIN_GEOMETRY.entranceTile.x + 2.5) * 32, y: (MAIN_GEOMETRY.entranceTile.y + 1.5) * 32 },
];
/** Hàng rào nằm ở hàng tường mặt tiền của tiệm chính (y=10), giữa cỏ và vỉa hè. */
const FENCE_ROW = MAIN_GEOMETRY.bounds.bottom;
/**
 * Hàng rào thấp ở hàng y=10 giữa cỏ và vỉa hè (trừ mặt tiền các tòa phụ đang có); dùng chung cho va chạm và renderer. Cách tường lõi tiệm
 * chính hai cột về cả hai phía (cánh đông chưa mua vẫn có rào), trong khoảng bản đồ trừ cột viền. `buildings` = các tòa đang có
 * (`GameTileMap.buildings`); thiếu = cả ba tòa phụ ở vị trí mặc định. Lô trống (tòa chưa mua) có rào như đoạn đất không có tiệm.
 */
export const isFenceTileFor = (buildings: ReadonlyArray<{ id: string; bounds?: { left: number; right: number } }> | undefined, x: number, worldY: number, mapWidth: number): boolean => {
  if (worldY !== FENCE_ROW || x <= PLAY_REGION.x0 || x >= PLAY_REGION.x0 + mapWidth - 1) return false;
  if (!(x >= STORE_BOUNDS.right + 2 || x <= STORE_BOUNDS.left - 2)) return false;
  const secondary = buildings ?? DEFAULT_PLACEMENTS.map(placement => ({ id: placement.buildingId, bounds: DEFAULT_GEOMETRY[placement.buildingId].bounds }));
  return !secondary.some(building => building.id !== 'main' && building.bounds && x >= building.bounds.left && x <= building.bounds.right);
};
/** Hàng rào khi cả ba tòa phụ ở vị trí mặc định (golden Bước 1 và mã cũ chưa biết bản đồ). */
export const isFenceTile = (x: number, worldY: number, mapWidth: number): boolean => isFenceTileFor(undefined, x, worldY, mapWidth);
// Hạ tầng đợt 0 nằm ở world/infrastructure.ts; giữ export cũ từ đây.
export { STREET_LAMP_TILES, STREET_LAMP_COLLIDER, streetLampBoxes, TREE_PROPS, TREE_SPRITE_OFFSET, STREET_PARKING_SPOTS, ROAD_PROFILE, STORM_DRAINS, CAR_PARKING_SPOTS, type TreeProp } from './world/infrastructure';

/** Nhà kho sau tiệm chính, suy từ vị trí đặt mặc định (`warehouseGeometry`): x 6..13, y −3..3, cửa 2 ô ở giữa tường sau tiệm. */
const DEFAULT_WAREHOUSE = warehouseGeometry(DEFAULT_GEOMETRY.main);
export const WAREHOUSE_BOUNDS = DEFAULT_WAREHOUSE.bounds;
export const WAREHOUSE_CENTER = DEFAULT_WAREHOUSE.center;
export const WAREHOUSE_DOOR_LEFT = DEFAULT_WAREHOUSE.doorLeft;
export const isInWarehouse=(p:Vector2D)=>p.x>=WAREHOUSE_BOUNDS.left*32&&p.x<(WAREHOUSE_BOUNDS.right+1)*32&&p.y>=WAREHOUSE_BOUNDS.top*32&&p.y<WAREHOUSE_BOUNDS.bottom*32;

/**
 * Tile IDs:
 * 0: Empty / Void
 * 1: Street Asphalt (Lòng đường hẻm bê tông)
 * 2: Sidewalk Pavement (Vỉa hè lát đá)
 * 3: Vintage Flower Encaustic Tile (Nền gạch bông cổ điển)
 * 4: Yellow Plaster Wall (Tường vôi vàng hoài niệm)
 * 5: Store Glass Window (Cửa sổ kính chấn song)
 * 6: Alley Wall / Neighbor Fence (Hàng rào ngõ xóm)
 * 7: Tree Canopy (Tán cây bàng râm mát)
 * 8: Store Signboard (Bảng hiệu "TIỆM TẠP HÓA ĐẦU HẺM")
 */

export const INITIAL_FIXTURES: StoreFixture[] = [
  {
    id: 'shelf_wooden_noodles',
    type: 'shelf_wooden',
    tileX: 8,
    tileY: 5,
    widthTiles: 2,
    heightTiles: 1,
    rotation: 0,
    assignedProductId: 'mi_hao_hao',
    currentStock: 12,
    maxCapacity: 20,
    label: 'Kệ Gỗ 01 - Mì Gói & Lương Khô',
  },
  {
    id: 'shelf_wooden_drinks',
    type: 'shelf_wooden',
    tileX: 11,
    tileY: 5,
    widthTiles: 2,
    heightTiles: 1,
    rotation: 0,
    assignedProductId: 'xa_xi_chuong_duong',
    currentStock: 8,
    maxCapacity: 20,
    label: 'Kệ Gỗ 02 - Nước Ngọt & Bánh Kẹo',
  },
  {
    id: 'cashier_counter_wood',
    type: 'cashier_counter',
    tileX: 7,
    tileY: 8,
    widthTiles: 2,
    heightTiles: 1,
    rotation: 0,
    currentStock: 0,
    maxCapacity: 0,
    label: 'Bàn Thu Ngân & Hòm Tiền Lẻ',
  },
  {
    id: 'refrigerator_small',
    type: 'refrigerator',
    tileX: 11,
    tileY: 7,
    widthTiles: 1,
    heightTiles: 1,
    rotation: 0,
    currentStock: 0,
    maxCapacity: 12,
    label: 'Tủ mát nhỏ',
  },
];

/** Aligned rear room: world origin grows north; legacy sales coordinates stay intact. */
export const WAREHOUSE_ENTRANCE = {x: WAREHOUSE_CENTER.x, y:(STORE_BOUNDS.top+.5)*32};
export const WAREHOUSE_FIXTURES: StoreFixture[] = [
  {id:'warehouse_dry_rack',type:'warehouse_dry',tileX:WAREHOUSE_BOUNDS.left+1,tileY:WAREHOUSE_BOUNDS.top+2,widthTiles:2,heightTiles:1,rotation:0,currentStock:0,maxCapacity:0,label:'Nhà kho · Giá hàng khô'},
  {id:'warehouse_cold_storage',type:'warehouse_cold',tileX:WAREHOUSE_BOUNDS.right-2,tileY:WAREHOUSE_BOUNDS.top+2,widthTiles:2,heightTiles:1,rotation:0,currentStock:0,maxCapacity:0,label:'Nhà kho · Góc bảo quản lạnh'},
  {id:'warehouse_receiving_desk',type:'warehouse_receiving',tileX:WAREHOUSE_BOUNDS.right-2,tileY:WAREHOUSE_BOUNDS.bottom-2,widthTiles:2,heightTiles:1,rotation:0,currentStock:0,maxCapacity:0,label:'Nhà kho · Bàn nhận hàng'},
];

export const INITIAL_REFRIGERATOR = INITIAL_FIXTURES.find((fixture) => fixture.type === 'refrigerator')!;

/**
 * Map arrays use local rows; world coordinates retain the old sales-floor origin.
 */
export function generateStarterTileMap(
  unlockedPlotIds: readonly string[] = STARTER_OWNED_PLOT_IDS,
  ownedStallIds: readonly string[] = [],
  placements: readonly BuildingPlacementRecord[] | undefined = DEFAULT_PLACEMENTS,
  openedWaves: readonly string[] = ['w0'],
): GameTileMap {
  // Vùng chơi = hộp hợp các đợt đã mở (D2). ['w0'] → đúng 36×22 như cũ (golden không đổi); origin luôn 0/−6.
  const region = playRegionForWaves(openedWaves);
  const MAP_W = rectWidth(region);
  const MAP_H = rectHeight(region);
  const extended = MAP_W !== MAP_WIDTH || MAP_H !== MAP_HEIGHT;
  const openedRegions = openedWaves.map(id => RECLAMATION_WAVES.find(w => w.id === id)).filter((w): w is NonNullable<typeof w> => !!w);
  const inOpenedWave = (x: number, y: number): boolean => openedRegions.some(w => rectHas(w.region, x, y));
  const parcelRects = openedRegions.flatMap(w => w.parcels.map(p => p.rect));
  const groundData: number[] = new Array(MAP_W * MAP_H).fill(1); // Street default
  const wallData: number[] = new Array(MAP_W * MAP_H).fill(0);
  const collisionLayer: boolean[] = new Array(MAP_W * MAP_H).fill(false);
  const purchased = new Set(unlockedPlotIds);
  const frame = { width: MAP_W, height: MAP_H, originTileX: PLAY_REGION.x0, originTileY: MAP_ORIGIN_Y };
  const at = (x: number, y: number) => tileIndex(frame, x, y);
  const resolved = resolvePlacements(placements, purchased);
  const geometries = resolved.map(placement => placementGeometry(placement));
  const infos = layoutBuildings(resolved, purchased);
  // Tòa có kho (tiệm chính) dựng cùng lượt nền vì sàn của nó quyết định hàng rào; các tòa khác dựng sau kho.
  const primary = geometries.find(geo => geo.template.hasWarehouse) ?? geometries[0];
  const core = primary.coreBounds;
  // Footprint tiệm chính theo ô: sàn gốc ∪ cánh đông cũ ∪ ô sàn mở rộng; tường = ô kề 8 hướng của sàn.
  const floor = placementFloor(resolved[geometries.indexOf(primary)], purchased);
  const ring = wallRing(floor);
  const isPrimaryDoor = (x: number, y: number) => primary.doorTiles.some(tile => tile.x === x && tile.y === y);

  for (let localY = 0; localY < MAP_H; localY++) {
    const y = localY + MAP_ORIGIN_Y;
    for (let localX = 0; localX < MAP_W; localX++) {
      const x = localX + PLAY_REGION.x0;
      const idx = at(x, y);

      // Outer boundary collision
      if (localX === 0 || localX === MAP_W - 1 || localY === 0 || localY === MAP_H - 1) {
        collisionLayer[idx] = true;
      }

      if (extended && !rectHas(PLAY_REGION, x, y)) {
        // Ngoài bản đồ gốc: chỉ ô thuộc đợt đã mở mới đi được; ô trong hộp mà chưa khai hoang là đất trống chặn (D2).
        if (!inOpenedWave(x, y)) { groundData[idx] = 0; collisionLayer[idx] = true; continue; }
        groundData[idx] = parcelRects.some(r => rectHas(r, x, y)) ? 3 : y >= 13 && y <= 15 ? 1 : 2;
        continue;
      }

      // Vỉa hè & lòng đường
      if (y >= 11 && y <= 12) {
        groundData[idx] = 2; // Sidewalk
      } else if (y >= 13) {
        groundData[idx] = 1; // Street
      } else if (floor.has(tileKey(x, y)) || ring.has(tileKey(x, y))) {
        groundData[idx] = 3; // Vintage flower tile inside store
      } else {
        groundData[idx] = 2; // Sidewalk / Alley ground
      }

      if (groundData[idx] === 2 && isFenceTileFor(infos, x, y, MAP_WIDTH)) { // cột đèn dùng hộp va chạm hẹp riêng (streetLampBoxes), không nằm trong collisionLayer
        collisionLayer[idx] = true;
      }

      // Tường tiệm chính (vôi vàng): viền quanh footprint; cửa theo mẫu tòa.
      if (ring.has(tileKey(x, y)) && !isPrimaryDoor(x, y)) {
        wallData[idx] = 4;
        collisionLayer[idx] = true;
      }

      // Ambient tree outside on sidewalk
      if (TREE_PROPS.some(t => t.tileX === x && t.tileY === y)) {
        wallData[idx] = 7;
        collisionLayer[idx] = true;
      }
    }
  }

  // Rear room shares the complete back wall with the shop, with a central door.
  if (primary.template.hasWarehouse) {
    const warehouse = warehouseGeometry(primary);
    const wb = warehouse.bounds;
    for (let y = wb.top; y <= wb.bottom; y++) for (let x = wb.left; x <= wb.right; x++) {
      const idx = at(x, y);
      groundData[idx] = 9;
      const boundary = y === wb.top || y === wb.bottom || x === wb.left || x === wb.right;
      const door = y === core.top && (x === warehouse.doorLeft || x === warehouse.doorLeft + 1);
      wallData[idx] = boundary && !door ? 10 : 0;
      collisionLayer[idx] = boundary && !door;
    }
  }

  // Các tòa phụ đã mua (tiệm xôi, quán nước, quán ăn vặt…) theo thứ tự ưu tiên của vị trí đặt: đủ bốn tường riêng, đi vào được. Tòa chưa mua
  // không có vỏ nhà (lô trống). Ô đã có tường của tòa đứng trước (tường chung, tường kho) được giữ nguyên.
  for (const [index, geo] of geometries.entries()) {
    if (geo === primary) continue;
    // Tòa phụ có ô sàn mở rộng: sàn = sàn gốc ∪ floorTiles, tường = vòng ô kề (như tiệm chính); ô cửa theo mẫu tòa; ô đã có tường của tòa trước giữ nguyên.
    if (resolved[index].floorTiles?.length) {
      const own = placementFloor(resolved[index], purchased);
      const ownRing = wallRing(own);
      for (const key of own) {
        const [x, y] = key.split(',').map(Number);
        if (!tileInMap(frame, x, y)) continue;
        const idx = at(x, y);
        groundData[idx] = 3;
        wallData[idx] = 0;
        collisionLayer[idx] = false;
      }
      for (const key of ownRing) {
        const [x, y] = key.split(',').map(Number);
        if (!tileInMap(frame, x, y)) continue;
        const idx = at(x, y);
        if (wallData[idx] !== 0) continue;
        const door = geo.doorTiles.some(tile => tile.x === x && tile.y === y);
        groundData[idx] = 3;
        wallData[idx] = door ? 0 : 4;
        collisionLayer[idx] = !door || !!resolved[index].constructionUntilDay;
      }
      continue;
    }
    const top = placementTop(geo, purchased);
    const { left, right, bottom } = geo.bounds;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (!tileInMap(frame, x, y)) continue;
        const idx = at(x, y);
        if (wallData[idx] !== 0) continue;
        const door = geo.doorTiles.some(tile => tile.x === x && tile.y === y);
        const wall = !door && (y === top || y === bottom || x === left || x === right);
        groundData[idx] = 3;
        wallData[idx] = wall ? 4 : 0;
        collisionLayer[idx] = wall || (door && !!resolved[index].constructionUntilDay);
      }
    }
  }

  // Quầy ăn uống đã mở chặn đường đi như một vật cản trên vỉa hè.
  const stalls = STALLS.filter(stall => ownedStallIds.includes(stall.id));
  for (const stall of stalls) {
    for (let x = stall.tileX; x < stall.tileX + stall.widthTiles; x++) collisionLayer[at(x, stall.tileY)] = true;
  }

  return {
    originTileX: PLAY_REGION.x0,
    originTileY:MAP_ORIGIN_Y,
    width: MAP_W,
    height: MAP_H,
    tileWidth: 32,
    tileHeight: 32,
    layers: [
      {
        name: 'ground',
        data: groundData,
        width: MAP_W,
        height: MAP_H,
        visible: true,
        opacity: 1.0,
      },
      {
        name: 'walls',
        data: wallData,
        width: MAP_W,
        height: MAP_H,
        visible: true,
        opacity: 1.0,
      },
    ],
    collisionLayer,
    storeBounds: tileBox([...floor, ...ring]) ?? { left: core.left, right: core.right, top: core.top, bottom: core.bottom },
    buildings: infos,
    stalls: stalls.map(stall => ({ id: stall.id, tileX: stall.tileX, tileY: stall.tileY, widthTiles: stall.widthTiles })),
  };
}

/**
 * (OpenSpec `open-world-land-reclamation`, task 2.1) Tạo `GameTileMap` CHO VÙNG CHƠI MỞ RỘNG theo các đợt đã mở.
 *
 * ⚠️ BƯỚC NÀY CHỈ LÀ PHẦN DỮ LIỆU MAP (thuần, không nối renderer/simulation):
 *  - width/height = hộp chữ nhật nhỏ nhất hợp `region` các đợt đã mở (`playRegionForWaves`).
 *  - originTileX/Y giữ `PLAY_REGION.x0` (0) / `MAP_ORIGIN_Y` (−6) — cùng chuẩn như `generateStarterTileMap`.
 *  - Dựng nền street/sidewalk cho toàn vùng, boundary collision ở mép ngoài hộp, đánh dấu nền các LÔ ĐÃ MỞ
 *    (W0 `LAND_PARCELS` + lô provisional từ `RECLAMATION_WAVES.parcels`).
 *  - Ô trong hộp nhưng ngoài mọi đợt đã mở (D2): CHƯA khai hoang → đánh va chạm (ground = void 0).
 *
 * Với ['w0'] cho kết quả cùng width/height/origin như `generateStarterTileMap` (36×22, 0/−6) để nơi dùng có thể
 * thay dần mà không đổi golden. Với ['w0','w1'] → width tăng lên 61 (x0=0, x1=60), origin vẫn 0/−6.
 *
 * ⚠️ NỐI VÀO HỆ SAU (ngoài scope vòng này, chờ máy thật có test/browser): dùng map động khi `openedWaves` thay đổi
 * trong simulation/renderer, pathfinding, collision và vẽ hạ tầng/lô chi tiết (hạ tầng W1–W4 thuộc task 1.1/teammate
 * `wave-infrastructure`, chưa chốt ảnh task 0.2).
 */
export function generateTileMapForWaves(
  openedWaves: readonly string[] = ['w0'],
): GameTileMap {
  const region = playRegionForWaves(openedWaves);
  const width = rectWidth(region);
  const height = rectHeight(region);
  const originTileX = PLAY_REGION.x0; // 0
  const originTileY = MAP_ORIGIN_Y;   // −6
  const frame = { width, height, originTileX, originTileY };

  // Các vùng đợt đã mở — dùng để phân biệt đất khai hoang với vùng chưa mở trong hộp (D2).
  const openedRegions = openedWaves
    .map(id => RECLAMATION_WAVES.find(w => w.id === id)?.region)
    .filter((r): r is WorldRect => r !== undefined);
  const isOpened = (x: number, y: number): boolean => openedRegions.some(r => rectHas(r, x, y));

  // Tất cả lô đã "sở hữu/mở": W0 (coi như đã sở hữu) + lô provisional của các đợt đã mở — để đánh dấu nền lô.
  const openedParcelRects: WorldRect[] = [];
  for (const p of LAND_PARCELS) openedParcelRects.push(p.rect);
  for (const wave of RECLAMATION_WAVES) {
    if (!openedWaves.includes(wave.id)) continue;
    for (const parcel of wave.parcels) openedParcelRects.push(parcel.rect);
  }
  const inOpenedParcel = (x: number, y: number): boolean => openedParcelRects.some(r => rectHas(r, x, y));

  const groundData: number[] = new Array(width * height).fill(0);
  const wallData: number[] = new Array(width * height).fill(0);
  const collisionLayer: boolean[] = new Array(width * height).fill(false);
  const at = (x: number, y: number) => tileIndex(frame, x, y);

  for (let ly = 0; ly < height; ly++) {
    const y = ly + originTileY;
    for (let lx = 0; lx < width; lx++) {
      const x = lx + originTileX;
      const idx = at(x, y);
      const boundary = lx === 0 || lx === width - 1 || ly === 0 || ly === height - 1;

      // Ô trong hộp nhưng ngoài mọi đợt đã mở: chưa khai hoang → va chạm, ground void (D2).
      if (!isOpened(x, y)) {
        groundData[idx] = 0;
        collisionLayer[idx] = true;
        continue;
      }

      // Boundary collision ở mép ngoài hộp.
      if (boundary) collisionLayer[idx] = true;

      // Nền đất lô đã mở (gạch hoa 3) — dữ liệu tối thiểu cho lô; render chi tiết để bước sau.
      if (inOpenedParcel(x, y)) {
        groundData[idx] = 3;
      } else if (y >= 13) {
        groundData[idx] = 1; // lòng đường
      } else {
        groundData[idx] = 2; // vỉa hè / khu phố
      }
    }
  }

  return {
    originTileX,
    originTileY,
    width,
    height,
    tileWidth: 32,
    tileHeight: 32,
    layers: [
      { name: 'ground', data: groundData, width, height, visible: true, opacity: 1.0 },
      { name: 'walls', data: wallData, width, height, visible: true, opacity: 1.0 },
    ],
    collisionLayer,
    storeBounds: STORE_BOUNDS, // bước dữ liệu: giữ biên tiệm chính; renderer/pathfinding nối sau.
    buildings: [],
    stalls: [],
  };
}

export const DEFAULT_INITIAL_SAVE: SaveGameData = {
  id: 'local_save_default',
  schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
  revision: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  player: {
    name: 'Cô Năm Tạp Hóa',
    level: 1,
    experience: 0,
    experienceToNextLevel: xpToNextLevel(1),
    money: 150000, // 150,000 VND starting capital
    reputation: 10,
    position: { x: (MAIN_GEOMETRY.doorTiles[0].x + 0.5) * 32, y: (MAIN_GEOMETRY.doorTiles[0].y - 1.5) * 32 }, // hai ô trong cửa tiệm chính, mặc định (9,8)
    direction: 'down',
  },
  worldTime: {
    day: 1,
    hour: 7,
    minute: 0,
    isStoreOpen: true,
    timeScale: 90, // 1x: 1 giây thực = 1,5 phút game (ngày 07:00–22:00 = 10 phút thực)
  },
  storeLayout: {
    widthTiles: 8,
    heightTiles: 8,
    fixtures: INITIAL_FIXTURES,
    storedFixtures: [],
    unlockedPlotIds: STARTER_OWNED_PLOT_IDS,
    ownedParcelIds: ownedParcelIdsDefault(),
  },
  world: defaultWorldOpenState(),
  warehouseTier: 2,
  storageRackCount: 5,
  inventory: [
    { productId: 'mi_hao_hao', quantity: 15 },
    { productId: 'xa_xi_chuong_duong', quantity: 10 },
    { productId: 'keo_big_babol', quantity: 20 },
    { productId: 'sua_ong_tho', quantity: 5 },
    { productId: 'banh_mi_que', quantity: 8 },
  ],
  staff: [],
  staffSchedule: {},
  wageDebt: 0,
  processedPayrollDayIds: [],
  regulars: {},
  statistics: {
    totalRevenue: 0,
    totalCustomersServed: 0,
    totalDaysPassed: 0,
  },
};
