/**
 * Shared constants and domain types for "Tiệm Tạp Hóa Đầu Hẻm"
 */

export const TILE_SIZE = 32;
export const REFERENCE_WIDTH = 960;
export const REFERENCE_HEIGHT = 540;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Vector2D {
  x: number;
  y: number;
}

export type StorageType = 'ambient' | 'cold';

export type ProductCategory =
  | 'instant_noodles'
  | 'snacks'
  | 'candy'
  | 'bottled_water'
  | 'soft_drinks'
  | 'milk'
  | 'bread'
  | 'eggs'
  | 'cooking_ingredients'
  | 'household';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  spriteId: string;
  purchasePrice: number; // Integer VND
  baseSellingPrice: number; // Integer VND
  shelfCapacity: number;
  storageType: StorageType;
  expirationRules?: {
    daysToSpoil: number;
  };
  unlockLevel: number;
  demandProfile: {
    basePopularity: number; // 0 to 1
  };
  description: string;
}

export interface InventoryItem {
  productId: string;
  quantity: number;
}

export type FixtureType = 'shelf_wooden' | 'shelf_glass' | 'cashier_counter' | 'refrigerator';

export interface StoreFixture {
  id: string;
  type: FixtureType;
  tileX: number;
  tileY: number;
  widthTiles: number;
  heightTiles: number;
  rotation: 0 | 90 | 180 | 270;
  assignedProductId?: string;
  currentStock: number;
  maxCapacity: number;
  label: string;
}

export interface PlayerData {
  name: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  money: number; // VND
  reputation: number;
  position: Vector2D;
  direction: Direction;
}

export interface WorldTime {
  day: number;
  hour: number; // 6 to 22
  minute: number; // 0 to 59
  isStoreOpen: boolean;
  timeScale: number; // 1 real sec = N game seconds
}

export interface StoreLayout {
  widthTiles: number;
  heightTiles: number;
  fixtures: StoreFixture[];
}

export interface SaveGameData {
  id: string;
  schemaVersion: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
  player: PlayerData;
  worldTime: WorldTime;
  storeLayout: StoreLayout;
  inventory: InventoryItem[];
  statistics: {
    totalRevenue: number;
    totalCustomersServed: number;
    totalDaysPassed: number;
  };
}

export interface TileMapLayer {
  name: string;
  data: number[];
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
}

export interface GameTileMap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: TileMapLayer[];
  collisionLayer: boolean[]; // true if solid
}
