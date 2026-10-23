/** Các cấp nhà kho: sức chứa thùng, sức giữ lạnh, số kệ và tủ lạnh có trong kho. */
export interface WarehouseTier {
  name: string;
  /** Sức chứa (thùng). */
  cases: number;
  /** Tủ lạnh kho giữ lạnh được chừng này món hàng mát/đông/tươi. */
  cold: number;
  racks: number;
  fridges: number;
  price: number;
  unlock: number;
}

export const WAREHOUSE_TIERS: WarehouseTier[] = [
  { name: 'Nhà kho nhỏ', cases: 20, cold: 40, racks: 1, fridges: 1, price: 0, unlock: 1 },
  { name: 'Nhà kho vừa', cases: 40, cold: 80, racks: 2, fridges: 2, price: 600000, unlock: 8 },
  { name: 'Nhà kho lớn', cases: 60, cold: 120, racks: 3, fridges: 2, price: 1500000, unlock: 18 },
  { name: 'Tổng kho', cases: 80, cold: 200, racks: 4, fridges: 3, price: 3500000, unlock: 30 },
];

/** Mỗi kệ kho xếp được chừng này thùng (4 tầng × 5 thùng). */
export const CASES_PER_RACK = 20;

export const warehouseTier = (tier: number) => WAREHOUSE_TIERS[Math.min(tier, WAREHOUSE_TIERS.length - 1)];
