/**
 * Test cho mô phỏng cân bằng PROVISIONAL 4 loại tòa (OpenSpec `open-world-building-types` task 2.3, D4/D9).
 * Gọi `runBuildingTypesBalanceSimTests()` để chạy; nối vào test-runner là LEAD làm sau (ngoài phạm vi file này).
 */
import assert from 'node:assert/strict';
import {
  D9_TIER_BOUNDARIES,
  D9_TIER_MULTIPLIERS,
  estimateBuildingBalance,
  parkingRevenueFromVehicles,
  tierMultiplier,
  type BuildingTypeId,
} from './building-types-balance-sim';

const SALES_TYPES: BuildingTypeId[] = ['grocery_branch', 'cafe', 'com_restaurant'];
const ALL_TYPES: BuildingTypeId[] = [...SALES_TYPES, 'parking_lot'];

/** Đúng khung giờ cao điểm theo D4 cho từng loại tòa. */
const EXPECTED_PEAK: Record<BuildingTypeId, Array<[number, number]>> = {
  grocery_branch: [[7, 9], [17, 19]],
  cafe: [[6, 10]],
  com_restaurant: [[11, 13], [17, 20]],
  parking_lot: [[7, 9], [11, 13], [17, 19]],
};

export function runBuildingTypesBalanceSimTests(): void {
  console.log('\n--- Mô phỏng cân bằng PROVISIONAL 4 loại tòa (D4/D9) ---');

  // 1) Mỗi loại có quầy trả cấu hình hợp lệ: peak đúng, chi tiêu > 0, khách quầy > 0.
  for (const typeId of SALES_TYPES) {
    const est = estimateBuildingBalance({ typeId, floorTiles: 64 }); // hạng tiện lợi
    assert.deepEqual(est.peakHours, EXPECTED_PEAK[typeId], `${typeId}: peak giờ đúng D4`);
    assert.ok(est.spendPerCustomerPercent > 0, `${typeId}: spendPerCustomerPercent > 0`);
    assert.ok(est.expectedCustomersPerDayRange[1] > 0, `${typeId}: khách quầy > 0`);
    assert.ok(est.expectedCustomersPerDayRange[0] <= est.expectedCustomersPerDayRange[1], `${typeId}: khoảng khách hợp lệ`);
    assert.ok(typeof est.note === 'string' && est.note.length > 0, `${typeId}: có ghi chú provisional`);
  }

  // 2) Hạng D9 lớn hơn → hệ số nhịp khách cao hơn hoặc bằng (đơn điệu, ranh giới 60/100/160/240).
  {
    const floors = [0, 59, 60, 99, 100, 159, 160, 239, 240, 400];
    const mults = floors.map(tierMultiplier);
    const exact = [1.0, 1.0, 1.15, 1.15, 1.3, 1.3, 1.5, 1.5, 1.7, 1.7];
    assert.deepEqual(mults, exact, 'tierMultiplier đúng từng ranh giới 60/100/160/240');
    for (let i = 1; i < mults.length; i++) {
      assert.ok(mults[i] >= mults[i - 1], `hệ số đơn điệu không giảm tại ô ${floors[i]}`);
    }
    // Nhịp khách của một loại có quầy không giảm khi tòa to hơn qua mọi ranh giới.
    const customers = floors.map((f) => estimateBuildingBalance({ typeId: 'grocery_branch', floorTiles: f }).expectedCustomersPerDayRange[1]);
    for (let i = 1; i < customers.length; i++) {
      assert.ok(customers[i] >= customers[i - 1], `khách quầy không giảm khi hạng to hơn tại ô ${floors[i]}`);
    }
    // Mật độ khách/ô sàn cũng đơn điệu theo hạng.
    const density = floors.map((f) => estimateBuildingBalance({ typeId: 'cafe', floorTiles: f, customersPerSquareEcologic: 1.2 }).expectedCustomersPerDayRange[1]);
    for (let i = 1; i < density.length; i++) {
      assert.ok(density[i] >= density[i - 1], `khách theo mật độ không giảm khi hạng to hơn tại ô ${floors[i]}`);
    }
    // D9_TIER_BOUNDARIES/MULTIPLIERS khớp nhau về số lượng.
    assert.equal(D9_TIER_MULTIPLIERS.length, D9_TIER_BOUNDARIES.length + 1, 'số hạng = số ranh giới + 1');
  }

  // 3) Bãi xe: KHÔNG có khách quầy, nhưng parkingRevenueFromVehicles dương.
  {
    const est = estimateBuildingBalance({ typeId: 'parking_lot', floorTiles: 32, vehiclesPerDay: 60, feePerVehicle: 15_000 });
    assert.deepEqual(est.expectedCustomersPerDayRange, [0, 0], 'bãi xe không có khách quầy');
    assert.equal(est.spendPerCustomerPercent, 0, 'bãi xe không có chi tiêu khách quầy');
    assert.deepEqual(est.peakHours, EXPECTED_PEAK.parking_lot, 'bãi xe có khung giờ xe ra vào');
    assert.ok(est.parkingRevenuePerDay! > 0, 'doanh thu bãi xe > 0');
    assert.equal(est.parkingRevenuePerDay, 60 * 15_000, 'doanh thu = số xe × phí');
    // Hàm thuần độc lập.
    assert.equal(parkingRevenueFromVehicles(40, 10_000), 400_000, 'parkingRevenueFromVehicles 40×10000');
    assert.equal(parkingRevenueFromVehicles(-5, 10_000), 0, 'không tính xe âm');
    assert.equal(parkingRevenueFromVehicles(40, 0), 0, 'phí 0 → doanh thu 0');
  }

  // 4) Loại có quầy không bao giờ bị hạng D9 làm mất khách (ngay cả sàn cực nhỏ/0).
  for (const typeId of SALES_TYPES) {
    for (const floorTiles of [0, 1, 400]) {
      const est = estimateBuildingBalance({ typeId, floorTiles });
      assert.ok(est.expectedCustomersPerDayRange[1] > 0, `${typeId} @ ${floorTiles} ô: có khách quầy`);
    }
  }

  console.log('  ✓ Passed: Mô phỏng cân bằng PROVISIONAL 4 loại tòa (peak giờ, chi tiêu, khách, hạng D9 đơn điệu, bãi xe không quầy nhưng doanh thu dương)');
}
