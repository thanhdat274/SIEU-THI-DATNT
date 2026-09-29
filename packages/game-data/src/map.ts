import { GameTileMap, StoreFixture, SaveGameData } from '@game/shared';

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 16;

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
    maxCapacity: 24,
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
    maxCapacity: 16,
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

export const INITIAL_REFRIGERATOR = INITIAL_FIXTURES.find((fixture) => fixture.type === 'refrigerator')!;

/**
 * Generate starter map matrix (20 columns x 16 rows)
 */
export function generateStarterTileMap(): GameTileMap {
  const groundData: number[] = new Array(MAP_WIDTH * MAP_HEIGHT).fill(1); // Street default
  const wallData: number[] = new Array(MAP_WIDTH * MAP_HEIGHT).fill(0);
  const collisionLayer: boolean[] = new Array(MAP_WIDTH * MAP_HEIGHT).fill(false);

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const idx = y * MAP_WIDTH + x;

      // Outer boundary collision
      if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
        collisionLayer[idx] = true;
      }

      // Vỉa hè & lòng đường
      if (y >= 11 && y <= 12) {
        groundData[idx] = 2; // Sidewalk
      } else if (y >= 13) {
        groundData[idx] = 1; // Street
      } else if (y >= 3 && y <= 10 && x >= 6 && x <= 13) {
        groundData[idx] = 3; // Vintage flower tile inside store
      } else {
        groundData[idx] = 2; // Sidewalk / Alley ground
      }

      // Store Walls (yellow plaster walls)
      // Store spans x: 6..13, y: 3..10
      if (y === 3 && x >= 6 && x <= 13) {
        wallData[idx] = 4;
        collisionLayer[idx] = true;
      } else if (x === 6 && y >= 3 && y <= 10) {
        wallData[idx] = 4;
        collisionLayer[idx] = true;
      } else if (x === 13 && y >= 3 && y <= 10) {
        wallData[idx] = 4;
        collisionLayer[idx] = true;
      } else if (y === 10 && x >= 6 && x <= 13) {
        // Doorway at x = 9 and x = 10
        if (x !== 9 && x !== 10) {
          wallData[idx] = 4;
          collisionLayer[idx] = true;
        }
      }

      // Signboard above store door
      if (y === 2 && x >= 8 && x <= 11) {
        wallData[idx] = 8;
      }

      // Ambient tree outside on sidewalk
      if (x === 3 && y === 11) {
        wallData[idx] = 7;
        collisionLayer[idx] = true;
      }
    }
  }

  return {
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
  };
}

export const DEFAULT_INITIAL_SAVE: SaveGameData = {
  id: 'local_save_default',
  schemaVersion: 2,
  revision: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  player: {
    name: 'Cô Năm Tạp Hóa',
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
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
  },
  inventory: [
    { productId: 'mi_hao_hao', quantity: 15 },
    { productId: 'xa_xi_chuong_duong', quantity: 10 },
    { productId: 'keo_big_babol', quantity: 20 },
    { productId: 'sua_ong_tho', quantity: 5 },
    { productId: 'banh_mi_que', quantity: 8 },
  ],
  statistics: {
    totalRevenue: 0,
    totalCustomersServed: 0,
    totalDaysPassed: 0,
  },
};
