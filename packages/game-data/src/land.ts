export interface LandPlotDefinition {
  id: string;
  name: string;
  level: number;
  cost: number;
  tiles: { x: number; y: number }[];
  prerequisitePlotId?: string;
}

// Plot geometry is reviewed against map.ts: the final column in each plot is the new shop wall.
export const LAND_PLOTS: LandPlotDefinition[] = [
  { id: 'east-wing-a', name: 'Gian hàng bên hông', level: 5, cost: 250_000,
    tiles: Array.from({ length: 32 }, (_, i) => ({ x: 14 + i % 4, y: 3 + Math.floor(i / 4) })) },
  { id: 'east-wing-b', name: 'Gian hàng mở rộng', level: 10, cost: 600_000, prerequisitePlotId: 'east-wing-a',
    tiles: Array.from({ length: 32 }, (_, i) => ({ x: 18 + i % 4, y: 3 + Math.floor(i / 4) })) },
];

export const STARTER_OWNED_PLOT_IDS: string[] = [];

export interface FixtureShopItem {
  id: string;
  name: string;
  type: 'shelf_wooden' | 'shelf_glass' | 'refrigerator';
  widthTiles: number;
  heightTiles: number;
  maxCapacity: number;
  cost: number;
}

/** Nội thất mua thêm trong màn Sắp xếp cửa hàng (giá tham chiếu từ game tap-hoa-dau-hem). */
export const FIXTURE_SHOP: FixtureShopItem[] = [
  { id: 'shelf_wooden', name: 'Kệ gỗ', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 24, cost: 80_000 },
  { id: 'shelf_glass', name: 'Kệ kính', type: 'shelf_glass', widthTiles: 2, heightTiles: 1, maxCapacity: 24, cost: 140_000 },
  { id: 'fridge_single', name: 'Tủ mát 1 cánh', type: 'refrigerator', widthTiles: 1, heightTiles: 1, maxCapacity: 12, cost: 90_000 },
  { id: 'fridge_double', name: 'Tủ mát 2 cánh', type: 'refrigerator', widthTiles: 2, heightTiles: 1, maxCapacity: 24, cost: 220_000 },
];
