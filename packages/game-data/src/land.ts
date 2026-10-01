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

export type FixtureShopKind = 'decor' | 'shelf' | 'fridge' | 'freezer' | 'storage' | 'counter' | 'food' | 'drink' | 'seating' | 'generator';

export interface FixtureShopItem {
  id: string;
  name: string;
  kind: FixtureShopKind;
  type: 'shelf_wooden' | 'shelf_glass' | 'refrigerator' | 'decor' | 'cashier_counter' | 'dining_table';
  widthTiles: number;
  heightTiles: number;
  maxCapacity: number;
  /** Tổng số ô hàng (ô chính + ô phụ) khi mua. */
  slotCount: number;
  cost: number;
  unlockLevel: number;
  /** false = chỉ liệt kê trong danh mục; game này chưa có cơ chế tương ứng nên chưa cho mua. */
  functional: boolean;
  /** Số lượng tối đa được sở hữu (kể cả đang cất). */
  limit?: number;
  /** Mảnh đất yêu cầu trong game gốc (chưa áp dụng ở đây). */
  requiresPlot?: string;
}

/**
 * Danh mục nội thất mua thêm, bê từ game tham khảo tap-hoa-dau-hem (`src/data/furniture.json`, bỏ quầy thu ngân gốc).
 * Số ô đã quy đổi sang mô hình ô của dự án này (xem scripts ở lịch sử cập nhật `tổng hợp.md`).
 */
export const FIXTURE_SHOP: FixtureShopItem[] = [
  { id: 'shelf', name: 'Kệ gỗ', kind: 'shelf', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 24, slotCount: 4, cost: 80_000, unlockLevel: 5, functional: true, },
  { id: 'fridge', name: 'Tủ lạnh 2 cánh', kind: 'fridge', type: 'refrigerator', widthTiles: 2, heightTiles: 1, maxCapacity: 24, slotCount: 4, cost: 220_000, unlockLevel: 5, functional: true, },
  { id: 'fridge_single', name: 'Tủ lạnh 1 cánh', kind: 'fridge', type: 'refrigerator', widthTiles: 1, heightTiles: 1, maxCapacity: 12, slotCount: 2, cost: 90_000, unlockLevel: 5, functional: true, },
  { id: 'freezer', name: 'Tủ đông', kind: 'freezer', type: 'refrigerator', widthTiles: 2, heightTiles: 1, maxCapacity: 18, slotCount: 3, cost: 180_000, unlockLevel: 9, functional: true, },
  { id: 'storage_rack', name: 'Kệ kho', kind: 'storage', type: 'shelf_wooden', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 50_000, unlockLevel: 9, functional: false, },
  { id: 'shelf_double', name: 'Kệ đôi', kind: 'shelf', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 24, slotCount: 8, cost: 160_000, unlockLevel: 15, functional: true, requiresPlot: 'D', },
  { id: 'shelf_3', name: 'Kệ 3', kind: 'shelf', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 24, slotCount: 12, cost: 320_000, unlockLevel: 21, functional: true, requiresPlot: 'D', },
  { id: 'shelf_4', name: 'Kệ 4', kind: 'shelf', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 24, slotCount: 16, cost: 500_000, unlockLevel: 29, functional: true, requiresPlot: 'D', },
  { id: 'counter2', name: 'Quầy thu ngân 2', kind: 'counter', type: 'cashier_counter', widthTiles: 2, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 300_000, unlockLevel: 15, functional: true, limit: 1, requiresPlot: 'D', },
  { id: 'food_grill', name: 'Bếp nướng', kind: 'food', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 260_000, unlockLevel: 21, functional: false, requiresPlot: 'E', },
  { id: 'hot_kettle', name: 'Ấm nước nóng', kind: 'food', type: 'shelf_wooden', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 90_000, unlockLevel: 21, functional: false, requiresPlot: 'E', },
  { id: 'bread_case', name: 'Tủ bánh mì', kind: 'food', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 180_000, unlockLevel: 21, functional: false, requiresPlot: 'E', },
  { id: 'food_table_2', name: 'Bàn 2 chỗ', kind: 'seating', type: 'dining_table', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 50_000, unlockLevel: 23, functional: true, },
  { id: 'food_table_4', name: 'Bàn 4 chỗ', kind: 'seating', type: 'dining_table', widthTiles: 2, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 90_000, unlockLevel: 23, functional: true, },
  { id: 'drink_counter', name: 'Quầy nước', kind: 'drink', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 300_000, unlockLevel: 25, functional: false, requiresPlot: 'F', },
  { id: 'blender', name: 'Máy xay', kind: 'drink', type: 'shelf_wooden', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 180_000, unlockLevel: 25, functional: false, requiresPlot: 'F', },
  { id: 'sugarcane_press', name: 'Máy ép mía', kind: 'drink', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 240_000, unlockLevel: 25, functional: false, requiresPlot: 'F', },
  { id: 'drink_table_2', name: 'Bàn nước 2 chỗ', kind: 'seating', type: 'shelf_wooden', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 50_000, unlockLevel: 25, functional: false, requiresPlot: 'F', },
  { id: 'generator', name: 'Máy phát điện', kind: 'generator', type: 'shelf_wooden', widthTiles: 2, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 360_000, unlockLevel: 21, functional: false, },
  { id: 'thung_ngam', name: 'Thùng ngâm nếp', kind: 'food', type: 'shelf_wooden', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 120_000, unlockLevel: 29, functional: false, },
  { id: 'xung_hap', name: 'Xửng hấp xôi', kind: 'food', type: 'shelf_wooden', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 320_000, unlockLevel: 29, functional: false, },
  { id: 'quay_xoi', name: 'Quầy trưng bày xôi', kind: 'food', type: 'shelf_wooden', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 180_000, unlockLevel: 29, functional: false, },
  { id: 'chau_cay', name: 'Chậu cây', kind: 'decor', type: 'decor', widthTiles: 1, heightTiles: 1, maxCapacity: 0, slotCount: 1, cost: 40_000, unlockLevel: 8, functional: true },
];
