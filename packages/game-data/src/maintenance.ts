import type { StoreFixture } from '@game/shared';

/**
 * Hao mòn và sửa chữa kệ/tủ mát (ý tưởng từ game tham khảo `maintenance.ts`, số liệu là thiết kế riêng, chưa cân bằng).
 * Qua mỗi đêm đồ mòn thêm; mòn nhiều thì có thể hỏng nhẹ (sửa được) hoặc hỏng nặng (phải mua mới).
 */
export const MAINTENANCE_RULES = {
  /** Từ cấp này trở lên đồ mới hao mòn (tránh phạt người mới). */
  unlockLevel: 3,
  /** Mỗi đêm mòn thêm một số nguyên trong [wearMin, wearMax]. */
  wearMin: 1,
  wearMax: 4,
  /** Từ mức mòn này mới có thể hỏng; xác suất = (mòn − breakFrom) × breakPerWear mỗi đêm. */
  breakFrom: 55,
  breakPerWear: 0.006,
  /** Mòn từ mức này trở lên thì khi hỏng luôn là hỏng nặng; dưới mức đó hỏng nặng với xác suất `majorChance`. */
  majorWear: 88,
  majorChance: 0.25,
  /** Phí sửa/bảo trì = tỷ lệ giá mua mới, tối thiểu `repairMin`, làm tròn 1.000 đồng. */
  repairPct: 0.25,
  repairMin: 20_000,
  /** Sau khi sửa/bảo trì, độ mòn về mức này. */
  repairWear: 20,
  /** Từ độ mòn bằng tỷ lệ này của `breakFrom` trở lên thì bảo trì trước khi hỏng được. */
  serviceFraction: 0.7,
} as const;

/** Giá mua mới tham chiếu từng mẫu kệ/tủ mát (khớp giá các mẫu bán trong màn Sắp xếp cửa hàng). */
export const FIXTURE_REPLACEMENT_PRICES: ReadonlyArray<{ type: StoreFixture['type']; maxCapacity: number; cost: number }> = [
  { type: 'shelf_wooden', maxCapacity: 24, cost: 80_000 },
  { type: 'shelf_glass', maxCapacity: 24, cost: 140_000 },
  { type: 'refrigerator', maxCapacity: 12, cost: 90_000 },
  { type: 'refrigerator', maxCapacity: 24, cost: 220_000 },
];

/** Giá mua mới một kệ/tủ mát: lấy mẫu cùng loại có sức chứa gần nhất. */
export function fixtureReplacementCost(fixture: Pick<StoreFixture, 'type' | 'maxCapacity'>): number {
  const sameType = FIXTURE_REPLACEMENT_PRICES.filter(item => item.type === fixture.type);
  if (!sameType.length) return 0;
  return sameType.reduce((best, item) => (Math.abs(item.maxCapacity - fixture.maxCapacity) < Math.abs(best.maxCapacity - fixture.maxCapacity) ? item : best)).cost;
}

/** Phí sửa nhẹ hoặc bảo trì định kỳ. */
export function fixtureRepairCost(fixture: Pick<StoreFixture, 'type' | 'maxCapacity'>): number {
  const base = fixtureReplacementCost(fixture);
  return Math.max(MAINTENANCE_RULES.repairMin, Math.round((base * MAINTENANCE_RULES.repairPct) / 1000) * 1000);
}
