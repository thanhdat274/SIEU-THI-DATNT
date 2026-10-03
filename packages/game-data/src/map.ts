import { GameTileMap, StoreFixture, SaveGameData, Vector2D } from '@game/shared';
import { LAND_PLOTS, STARTER_OWNED_PLOT_IDS } from './land';
import { STALLS } from './stalls';
import { BUILDINGS, BUILDING_MAP, DRINK_BOUNDS, DRINK_PLOT_ID, MAIN_STORE_BOUNDS, XOI_BOUNDS, XOI_PLOT_ID, buildingTop } from './buildings';
import { xpToNextLevel } from './progression';

/** Chủ tiệm đứng sau quầy thu ngân (phía bắc), nhìn ra chỗ khách xếp hàng ở ô (9,8). */
export const SHOPKEEPER_TILE = { x: 8, y: 7 };
export const SHOPKEEPER_POSITION = { x: (SHOPKEEPER_TILE.x + 0.5) * 32, y: (SHOPKEEPER_TILE.y + 1) * 32 - 2 };

export const MAP_WIDTH = 36;
export const MAP_HEIGHT = 22;
export const MAP_ORIGIN_Y = -6;
export const STORE_BOUNDS = MAIN_STORE_BOUNDS;
/** Điểm xuất hiện của người chơi trong hẻm chung: vỉa hè ngay ngoài cửa tiệm (cửa ở x=9..10, y=10). Chỉnh ở đây để đổi chỗ xuất hiện; chủ hẻm lấy mục 0, thành viên mục 1. */
export const ONLINE_SPAWN_POINTS: readonly { x: number; y: number }[] = [
  { x: 8.5 * 32, y: 12.5 * 32 },
  { x: 11.5 * 32, y: 12.5 * 32 },
];
/** Hàng rào thấp ở hàng y=10 giữa cỏ và vỉa hè (trừ mặt tiền tiệm); dùng chung cho va chạm và renderer. */
export const isFenceTile = (x: number, worldY: number, mapWidth: number): boolean =>
  worldY === 10 && x > XOI_BOUNDS.right && x < mapWidth - 1 && x >= STORE_BOUNDS.right + 2 && (x < DRINK_BOUNDS.left || x > DRINK_BOUNDS.right);
/** Đèn đường trên vỉa hè sát lòng đường; cột đèn chỉ chặn phần chân cột (`STREET_LAMP_COLLIDER`). Không đặt cột đèn chéo sát một cây (cột ở hàng 12, cây ở hàng 11, lệch một cột) vì hai vật cản chạm góc sẽ bịt kín cả vỉa hè; `sidewalk-passable.test.ts` kiểm tra. */
export const STREET_LAMP_TILES: ReadonlyArray<{ x: number; y: number }> = [{ x: 9, y: 12 }, { x: 15, y: 12 }, { x: 21, y: 12 }];
// Cột đèn đầu hẻm trước ở x=3 sát cột đèn tín hiệu phía bắc vạch qua đường (x≈106 px), nên dời sang x=9: cách đều cột tín hiệu và cột x=15 (~195 px).
/**
 * Va chạm của cột đèn: chỉ phần chân cột (khớp sprite `deco_lamp_pole` 32x64: thân rộng ~10 px quanh x=10..20, chân cột
 * cao ~10 px sát đáy ô), không chặn cả ô 32x32 như tường. Tọa độ pixel tương đối góc trên-trái của ô cột đèn.
 */
export const STREET_LAMP_COLLIDER = { offsetX: 10, offsetY: 22, width: 12, height: 10 } as const;
/** Hộp va chạm (pixel thế giới) của mọi cột đèn đường. */
export const streetLampBoxes = (): Array<{ x: number; y: number; width: number; height: number }> =>
  STREET_LAMP_TILES.map(l => ({ x: l.x * 32 + STREET_LAMP_COLLIDER.offsetX, y: l.y * 32 + STREET_LAMP_COLLIDER.offsetY, width: STREET_LAMP_COLLIDER.width, height: STREET_LAMP_COLLIDER.height }));

/**
 * Cây trên vỉa hè. `tileX/tileY` là ô gốc cây (có va chạm, tường loại 7); sprite và bóng bám theo ô này.
 * `height` (ô) quyết định độ dài bóng, `crownRadius` (ô) là bán kính tán. Thêm cây = thêm một dòng; cần tự kiểm
 * không chặn cửa tiệm, ô đỗ xe, cột đèn hay lối đi.
 */
export interface TreeProp { id: string; tileX: number; tileY: number; height: number; crownRadius: number }
export const TREE_PROPS: ReadonlyArray<TreeProp> = [
  // Cây hiện có phía tây
  { id: 'alley_shade_tree', tileX: 5, tileY: 11, height: 2.4, crownRadius: 1.1 },
  // Cây mới phía đông (gần quán nước)
  { id: 'east_tree_small', tileX: 19, tileY: 11, height: 1.8, crownRadius: 0.8 },  // Giữa tiệm xôi và quán nước
  { id: 'east_tree_tall', tileX: 25, tileY: 11, height: 2.6, crownRadius: 1.2 },   // Trước quán nước bên trái
  { id: 'east_tree_bush', tileX: 28, tileY: 11, height: 1.5, crownRadius: 1.0 },   // Trước quán nước, sát phía tây cửa (x=30..31) nhưng cách cửa 1 ô; tách khỏi cây ở mép đông (trước đây ở x=33 dính cây x=34)
  { id: 'east_tree_cluster', tileX: 34, tileY: 11, height: 2.0, crownRadius: 0.9 }, // Mép đông bản đồ
];
/** Vị trí góc trên-trái của sprite cây so với ô gốc (đơn vị ô) và độ dịch bằng pixel. `pixelsX` = 8 đặt thân cây (sprite 80 px, thân tâm ở x=40) đúng giữa ô gốc để bồn cây vừa khít ô có va chạm (`TREE_PLANTER`). */
export const TREE_SPRITE_OFFSET = { tilesX: -1, tilesY: -2, pixelsX: 8, pixelsY: -4 } as const;

/** Điểm đỗ xe máy lề đường trước tiệm (trên vỉa hè sát lòng đường, không chặn cửa tiệm hay cột đèn). */
export const STREET_PARKING_SPOTS: ReadonlyArray<Vector2D> = [
  // Xe máy dài ~62 px nên hai chỗ cạnh nhau cách ~64 px (trước đây 32 px khi xe dài 44 px).
  { x: 196, y: 12 * 32 + 10 },
  { x: 260, y: 12 * 32 + 10 },
  { x: 392, y: 12 * 32 + 10 },
  { x: 456, y: 12 * 32 + 10 },
  // Trước quán nước (cửa ở x=30..31): xe máy đỗ gần cửa, khách không phải đi bộ từ đầu hẻm.
  { x: 880, y: 12 * 32 + 10 },
  { x: 944, y: 12 * 32 + 10 },
  { x: 1006, y: 12 * 32 + 10 },
];
/**
 * Mặt cắt lòng đường (chỉ hình ảnh, không đổi va chạm hay đường đi): vỉa hè (y 11-12) → bó vỉa + rãnh thoát nước →
 * làn bắc (y 13, đi sang trái) → vạch giữa (biên y 14) → làn nam (y 14, đi sang phải) → mặt đường còn lại.
 * Hai làn trùng với STREET_LANE_LEFT_Y/STREET_LANE_RIGHT_Y trong game-core/street-traffic.ts.
 */
export const ROAD_PROFILE = { kerbTileY: 13, centerLineTileY: 14, laneRows: 2 } as const;
/** Cửa thu nước mưa trong rãnh sát bó vỉa (ô x, ở hàng kerbTileY); tránh vạch qua đường trước cửa tiệm. */
export const STORM_DRAINS: ReadonlyArray<{ tileX: number }> = [{ tileX: 4 }, { tileX: 12 }, { tileX: 17 }, { tileX: 22 }];
/** Vạch qua đường ngay trước cửa tiệm (cửa ở ô x = 9..10), phủ hai làn. */
export const CROSSWALK = { tileX: 1, widthTiles: 2, firstRow: 13, rows: 2 } as const;

/**
 * Chỗ đỗ ô tô của khách trên vỉa hè phía đông (rộng hơn chỗ xe máy, chân xe tại y px), giữa các cột đèn x = 15, 21 và
 * mép bản đồ; ô tô neo giữa-đáy tại điểm này (sprite 100x50). Không chặn cửa tiệm, ô đỗ xe máy hay vạch qua đường.
 */
export const CAR_PARKING_SPOTS: ReadonlyArray<Vector2D> = [
  { x: 560, y: 12 * 32 + 14 },
  { x: 750, y: 12 * 32 + 14 },
  { x: 34 * 32, y: 12 * 32 + 14 },
];

export const WAREHOUSE_BOUNDS = {left:STORE_BOUNDS.left,right:STORE_BOUNDS.right,top:STORE_BOUNDS.top-6,bottom:STORE_BOUNDS.top};
export const WAREHOUSE_CENTER = {x:(WAREHOUSE_BOUNDS.left+WAREHOUSE_BOUNDS.right+1)*16,y:(WAREHOUSE_BOUNDS.top+WAREHOUSE_BOUNDS.bottom+1)*16};
export const WAREHOUSE_DOOR_LEFT = Math.floor(WAREHOUSE_CENTER.x/32)-1;
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
export function generateStarterTileMap(unlockedPlotIds: readonly string[] = STARTER_OWNED_PLOT_IDS, ownedStallIds: readonly string[] = []): GameTileMap {
  const groundData: number[] = new Array(MAP_WIDTH * MAP_HEIGHT).fill(1); // Street default
  const wallData: number[] = new Array(MAP_WIDTH * MAP_HEIGHT).fill(0);
  const collisionLayer: boolean[] = new Array(MAP_WIDTH * MAP_HEIGHT).fill(false);
  const purchased = new Set(unlockedPlotIds);
  const east = purchased.has('east-wing-a') ? (purchased.has('east-wing-b') ? 21 : 17) : STORE_BOUNDS.right;

  for (let localY = 0; localY < MAP_HEIGHT; localY++) {
    const y=localY+MAP_ORIGIN_Y;
    for (let x = 0; x < MAP_WIDTH; x++) {
      const idx = localY * MAP_WIDTH + x;

      // Outer boundary collision
      if (x === 0 || x === MAP_WIDTH - 1 || localY === 0 || localY === MAP_HEIGHT - 1) {
        collisionLayer[idx] = true;
      }

      // Vỉa hè & lòng đường
      if (y >= 11 && y <= 12) {
        groundData[idx] = 2; // Sidewalk
      } else if (y >= 13) {
        groundData[idx] = 1; // Street
      } else if (y >= STORE_BOUNDS.top && y <= STORE_BOUNDS.bottom && x >= STORE_BOUNDS.left && x <= east) {
        groundData[idx] = 3; // Vintage flower tile inside store
      } else {
        groundData[idx] = 2; // Sidewalk / Alley ground
      }

      if (groundData[idx] === 2 && isFenceTile(x, y, MAP_WIDTH)) { // cột đèn dùng hộp va chạm hẹp riêng (streetLampBoxes), không nằm trong collisionLayer
        collisionLayer[idx] = true;
      }

      // Store Walls (yellow plaster walls)
      // Store spans x: 6..13, y: 3..10
      if (y === STORE_BOUNDS.top && x >= STORE_BOUNDS.left && x <= east) {
        wallData[idx] = 4;
        collisionLayer[idx] = true;
      } else if (x === STORE_BOUNDS.left && y >= STORE_BOUNDS.top && y <= STORE_BOUNDS.bottom) {
        wallData[idx] = 4;
        collisionLayer[idx] = true;
      } else if (x === east && y >= STORE_BOUNDS.top && y <= STORE_BOUNDS.bottom) {
        wallData[idx] = 4;
        collisionLayer[idx] = true;
      } else if (y === STORE_BOUNDS.bottom && x >= STORE_BOUNDS.left && x <= east) {
        // Doorway at x = 9 and x = 10
        if (x !== 9 && x !== 10) {
          wallData[idx] = 4;
          collisionLayer[idx] = true;
        }
      }

      // Ambient tree outside on sidewalk
      if (TREE_PROPS.some(t => t.tileX === x && t.tileY === y)) {
        wallData[idx] = 7;
        collisionLayer[idx] = true;
      }
    }
  }

  // Rear room shares the complete back wall with the shop, with a central door.
  for(let y=WAREHOUSE_BOUNDS.top;y<=WAREHOUSE_BOUNDS.bottom;y++) for(let x=WAREHOUSE_BOUNDS.left;x<=WAREHOUSE_BOUNDS.right;x++) {
    const idx=(y-MAP_ORIGIN_Y)*MAP_WIDTH+x;
    groundData[idx]=9;
    const boundary=y===WAREHOUSE_BOUNDS.top||y===WAREHOUSE_BOUNDS.bottom||x===WAREHOUSE_BOUNDS.left||x===WAREHOUSE_BOUNDS.right;
    const door=y===STORE_BOUNDS.top&&(x===WAREHOUSE_DOOR_LEFT||x===WAREHOUSE_DOOR_LEFT+1);
    wallData[idx]=boundary&&!door?10:0;
    collisionLayer[idx]=boundary&&!door;
  }

  // Tiệm xôi: tòa thứ hai ở dải tây, tường đông x=6 dùng chung với tiệm chính (đã dựng ở trên). Luôn có vỏ nhà;
  // chưa mua thì cửa và sàn trong bị chặn (renderer vẽ cửa cuốn), mua rồi mới đi vào/đặt nội thất được.
  const xoiOpen = purchased.has(XOI_PLOT_ID);
  const xoiDoors = BUILDING_MAP.xoi.doorTiles;
  const xoiTop = buildingTop('xoi', purchased);
  for (let y = xoiTop; y <= XOI_BOUNDS.bottom; y++) {
    for (let x = XOI_BOUNDS.left; x < XOI_BOUNDS.right; x++) {
      const idx = (y - MAP_ORIGIN_Y) * MAP_WIDTH + x;
      const door = xoiDoors.some(tile => tile.x === x && tile.y === y);
      const wall = !door && (y === xoiTop || y === XOI_BOUNDS.bottom || x === XOI_BOUNDS.left);
      groundData[idx] = 3;
      wallData[idx] = wall ? 4 : 0;
      collisionLayer[idx] = wall || !xoiOpen;
    }
  }

  // Quán nước: tòa thứ ba đứng riêng ở dải đông, đủ bốn tường; chưa mua thì cửa và sàn trong bị chặn như tiệm xôi.
  const drinkOpen = purchased.has(DRINK_PLOT_ID);
  const drinkDoors = BUILDING_MAP.drink.doorTiles;
  const drinkTop = buildingTop('drink', purchased);
  for (let y = drinkTop; y <= DRINK_BOUNDS.bottom; y++) {
    for (let x = DRINK_BOUNDS.left; x <= DRINK_BOUNDS.right && x < MAP_WIDTH; x++) {
      const idx = (y - MAP_ORIGIN_Y) * MAP_WIDTH + x;
      const door = drinkDoors.some(tile => tile.x === x && tile.y === y);
      const wall = !door && (y === drinkTop || y === DRINK_BOUNDS.bottom || x === DRINK_BOUNDS.left || x === DRINK_BOUNDS.right);
      groundData[idx] = 3;
      wallData[idx] = wall ? 4 : 0;
      collisionLayer[idx] = wall || !drinkOpen;
    }
  }

  for (const plot of LAND_PLOTS) {
    if (!purchased.has(plot.id)) continue;
    for (const { x, y } of plot.tiles) {
      const idx = (y - MAP_ORIGIN_Y) * MAP_WIDTH + x;
      const isCurrentWall = x === east || y === STORE_BOUNDS.top || y === STORE_BOUNDS.bottom;
      if (isCurrentWall) {
        groundData[idx] = 3;
        wallData[idx] = 4;
        collisionLayer[idx] = true;
      } else if (x < east) {
        groundData[idx] = 3;
        wallData[idx] = 0;
        collisionLayer[idx] = false;
      }
    }
  }
  if (purchased.has('east-wing-a')) {
    for (let y = STORE_BOUNDS.top + 1; y < STORE_BOUNDS.bottom; y++) {
      const idx = (y - MAP_ORIGIN_Y) * MAP_WIDTH + STORE_BOUNDS.right;
      wallData[idx] = 0;
      collisionLayer[idx] = false;
      groundData[idx] = 3;
    }
  }

  // Chủ tiệm là vật cản đứng sau quầy thu ngân.
  collisionLayer[(SHOPKEEPER_TILE.y - MAP_ORIGIN_Y) * MAP_WIDTH + SHOPKEEPER_TILE.x] = true;

  // Quầy ăn uống đã mở chặn đường đi như một vật cản trên vỉa hè.
  const stalls = STALLS.filter(stall => ownedStallIds.includes(stall.id));
  for (const stall of stalls) {
    for (let x = stall.tileX; x < stall.tileX + stall.widthTiles; x++) collisionLayer[(stall.tileY - MAP_ORIGIN_Y) * MAP_WIDTH + x] = true;
  }

  return {
    originTileY:MAP_ORIGIN_Y,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tileWidth: 32,
    tileHeight: 32,
    layers: [
      {
        name: 'ground',
        data: groundData,
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        visible: true,
        opacity: 1.0,
      },
      {
        name: 'walls',
        data: wallData,
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        visible: true,
        opacity: 1.0,
      },
    ],
    collisionLayer,
    storeBounds: { left: STORE_BOUNDS.left, right: east, top: STORE_BOUNDS.top, bottom: STORE_BOUNDS.bottom },
    buildings: BUILDINGS.map(building => ({ id: building.id, open: !building.plotId || purchased.has(building.plotId), top: buildingTop(building.id, purchased) })),
    stalls: stalls.map(stall => ({ id: stall.id, tileX: stall.tileX, tileY: stall.tileY, widthTiles: stall.widthTiles })),
  };
}

export const DEFAULT_INITIAL_SAVE: SaveGameData = {
  id: 'local_save_default',
  schemaVersion: 4,
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
    position: { x: 9.5 * 32, y: 8.5 * 32 },
    direction: 'down',
  },
  worldTime: {
    day: 1,
    hour: 7,
    minute: 0,
    isStoreOpen: true,
    timeScale: 60, // 1 real sec = 1 game minute
  },
  storeLayout: {
    widthTiles: 8,
    heightTiles: 8,
    fixtures: INITIAL_FIXTURES,
    storedFixtures: [],
    unlockedPlotIds: STARTER_OWNED_PLOT_IDS,
  },
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
