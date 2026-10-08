/**
 * Test registry loại tòa (OpenSpec `open-world-building-types`, task 1.1 — PHẦN THUẦN).
 * Phạm vi: game-data. Chạy được độc lập (tsx file này) hoặc qua `runBuildingTypesTests`
 * do test-runner gọi sau khi Lead nối.
 */
import assert from 'node:assert/strict';
import {
  BUILDING_TYPES, BUILDING_TYPE_DEFS, buildingTypeOf, buildingTypeOfInstance, safeBuildingType,
} from './building-types';

export function runBuildingTypesTests(): void {
  console.log('\n--- Registry loại tòa (BuildingTypeDef, task 1.1) ---');

  // --- Registry có đủ ≥ 8 loại (4 cũ + 4 mới) ---
  assert.ok(BUILDING_TYPES.length >= 8, `registry có ≥ 8 loại (thực tế ${BUILDING_TYPES.length})`);
  const typeIds = new Set<string>(BUILDING_TYPES.map((def) => def.typeId));
  assert.equal(typeIds.size, BUILDING_TYPES.length, 'mọi typeId duy nhất');
  assert.deepEqual(new Set(['grocery_main', 'xoi_shop', 'drink_shop', 'snack_shop']),
    new Set(['grocery_main', 'xoi_shop', 'drink_shop', 'snack_shop'].filter((t) => typeIds.has(t))),
    '4 loại cũ có mặt (grocery_main, xoi_shop, drink_shop, snack_shop)');
  for (const expected of ['grocery_branch', 'cafe', 'parking_lot', 'com_restaurant']) {
    assert.ok(typeIds.has(expected), `loại mới ${expected} có mặt`);
  }

  // --- Mỗi loại: id/typeId/unlockLevel/openCost/maxInstances hợp lệ (số dương, id không rỗng) ---
  for (const def of BUILDING_TYPES) {
    assert.ok(def.id.length > 0, `loại ${def.typeId} có id không rỗng`);
    assert.ok(def.typeId.length > 0, `loại ${def.id} có typeId không rỗng`);
    assert.ok(Number.isFinite(def.unlockLevel) && def.unlockLevel > 0, `loại ${def.typeId} unlockLevel dương (${def.unlockLevel})`);
    assert.ok(Number.isFinite(def.openCost) && def.openCost >= 0, `loại ${def.typeId} openCost hợp lệ (${def.openCost})`);
    assert.ok(Number.isInteger(def.maxInstances) && def.maxInstances > 0, `loại ${def.typeId} maxInstances dương (${def.maxInstances})`);
    assert.ok(Number.isFinite(def.trafficShare) && def.trafficShare >= 0, `loại ${def.typeId} trafficShare không âm (${def.trafficShare})`);
    assert.ok(def.template, `loại ${def.typeId} có template`);
    assert.ok(Array.isArray(def.defaultFixtures), `loại ${def.typeId} có defaultFixtures`);
    assert.ok(Array.isArray(def.allowedStationIds), `loại ${def.typeId} có allowedStationIds`);
    assert.equal(typeof def.productFilter, 'function', `loại ${def.typeId} có productFilter`);
  }

  // --- maxInstances: loại cũ = 1, loại mới theo D4 ---
  const oldInstances: Record<string, number> = { grocery_main: 1, xoi_shop: 1, drink_shop: 1, snack_shop: 1 };
  for (const [typeId, max] of Object.entries(oldInstances)) {
    assert.equal(buildingTypeOf(typeId)?.maxInstances, max, `loại cũ ${typeId} maxInstances = ${max}`);
  }
  assert.equal(buildingTypeOf('grocery_branch')?.maxInstances, 3, 'grocery_branch maxInstances = 3 (D4)');
  assert.equal(buildingTypeOf('cafe')?.maxInstances, 2, 'cafe maxInstances = 2 (D4)');
  assert.equal(buildingTypeOf('parking_lot')?.maxInstances, 2, 'parking_lot maxInstances = 2 (D4)');
  assert.equal(buildingTypeOf('com_restaurant')?.maxInstances, 2, 'com_restaurant maxInstances = 2 (D4)');

  // --- unlockLevel / openCost loại mới theo D4 ---
  assert.equal(buildingTypeOf('grocery_branch')?.unlockLevel, 32, 'grocery_branch cấp 32');
  assert.equal(buildingTypeOf('grocery_branch')?.openCost, 1_500_000, 'grocery_branch giá 1.500.000');
  assert.equal(buildingTypeOf('cafe')?.unlockLevel, 34, 'cafe cấp 34');
  assert.equal(buildingTypeOf('cafe')?.openCost, 1_200_000, 'cafe giá 1.200.000');
  assert.equal(buildingTypeOf('parking_lot')?.unlockLevel, 24, 'parking_lot cấp 24');
  assert.equal(buildingTypeOf('parking_lot')?.openCost, 600_000, 'parking_lot giá 600.000');
  assert.equal(buildingTypeOf('com_restaurant')?.unlockLevel, 40, 'com_restaurant cấp 40');
  assert.equal(buildingTypeOf('com_restaurant')?.openCost, 2_000_000, 'com_restaurant giá 2.000.000');

  // --- hasCheckout ---
  assert.equal(buildingTypeOf('parking_lot')?.hasCheckout, false, 'parking_lot hasCheckout = false (không quầy hàng)');
  assert.equal(buildingTypeOf('cafe')?.hasCheckout, true, 'cafe hasCheckout = true');
  assert.equal(buildingTypeOf('com_restaurant')?.hasCheckout, true, 'com_restaurant hasCheckout = true');
  assert.equal(buildingTypeOf('grocery_main')?.hasCheckout, true, 'grocery_main hasCheckout = true');
  // Bãi giữ xe không bày/bán hàng: productFilter phải chặn mọi sản phẩm.
  assert.equal(buildingTypeOf('parking_lot')?.productFilter('mi_hao_hao'), false, 'parking_lot không bán hàng (productFilter=false)');

  // --- Tra cứu theo typeId / id instance ---
  assert.equal(buildingTypeOf('cafe')?.id, 'cafe', 'buildingTypeOf theo typeId');
  assert.equal(buildingTypeOf('xoi_shop')?.id, 'xoi', 'xoi_shop.id = xoi (instance cũ)');
  assert.equal(buildingTypeOfInstance('main')?.typeId, 'grocery_main', 'instance main → loại grocery_main');
  assert.equal(safeBuildingType('drink_shop')?.id, 'drink', 'safeBuildingType theo typeId');
  assert.equal(safeBuildingType('toString'), undefined, 'safeBuildingType chặn key nguyên mẫu');
  assert.equal(safeBuildingType('no_such'), undefined, 'safeBuildingType typeId không tồn tại → undefined');

  // --- buildingTypeOf('không tồn tại') → undefined/an toàn ---
  assert.equal(buildingTypeOf('không tồn tại'), undefined, 'buildingTypeOf key lạ → undefined');
  assert.equal(buildingTypeOf('foo'), undefined, 'buildingTypeOf typeId lạ → undefined');
  assert.equal(buildingTypeOf('grocery_branch_xyz'), undefined, 'buildingTypeOf typeId không chuẩn → undefined');
  assert.equal(buildingTypeOfInstance('main')?.openCost, 0, 'tra theo instance main có openCost 0 (luôn mở)');

  // --- HIỆU ỨNG PROVISIONAL (D4) ---
  const parking = buildingTypeOf('parking_lot');
  assert.equal(parking?.effects?.carRadiusTiles, 12, 'parking_lot bán kính 12 ô (provisional)');
  assert.equal(parking?.effects?.carCustomerBonus, 0.15, 'parking_lot +15% khách đi xe (provisional)');
  const cafePeaks = buildingTypeOf('cafe')?.effects?.peakHours;
  assert.ok(cafePeaks?.some((p) => p.fromHour === 6 && p.toHour === 10), 'cafe khung khách đông 6–10 h (provisional)');
  const comPeaks = buildingTypeOf('com_restaurant')?.effects?.peakHours;
  assert.ok(comPeaks?.some((p) => p.fromHour === 11 && p.toHour === 13), 'com_restaurant khung 11–13 h');
  assert.ok(comPeaks?.some((p) => p.fromHour === 17 && p.toHour === 20), 'com_restaurant khung 17–20 h');

  console.log('  ✓ ≥8 loại, số liệu D4, hasCheckout, tra cứu an toàn, hiệu ứng provisional');
}

declare const process: any;
// Chạy độc lập: `tsx src/world/building-types.test.ts`
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('building-types.test')) {
  runBuildingTypesTests();
  console.log('\n🎉 REGISTRY LOẠI TÒA ĐẠT!\n');
}
