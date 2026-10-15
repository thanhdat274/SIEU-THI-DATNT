import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, FIXTURE_SHOP, BUILDING_TYPE_DEFS, resolveParcel } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { EXTRA_PEAK_MULTIPLIER, PARKING_FEE, extraBuildingPeakMultiplier, openParkingLots, parkingBonusFor, parkingLotFor } from './customers';

/** open-world-building-types 2.2: nội thất mặc định + hành vi cà phê / quán cơm / bãi xe. */
export function runBuildingBehaviorTests(): void {
  console.log('\n--- Nội thất mặc định và hành vi 4 loại tòa mới (building-types 2.2) ---');

  // Dữ liệu: mọi trạm mặc định và trạm cho phép phải là món có thật trong FIXTURE_SHOP
  const shopIds = new Set(FIXTURE_SHOP.map(item => item.id));
  for (const def of Object.values(BUILDING_TYPE_DEFS)) {
    for (const stationId of def.allowedStationIds) assert.ok(shopIds.has(stationId), `${def.typeId}: trạm ${stationId} có trong FIXTURE_SHOP`);
    for (const fixture of def.template.defaultFixtures) {
      if (fixture.shopId) assert.ok(shopIds.has(fixture.shopId), `${def.typeId}: ${fixture.id} dùng shopId ${fixture.shopId} có thật`);
      const inside = fixture.tileX >= 1 && fixture.tileX + fixture.widthTiles - 1 <= def.template.width - 2 && fixture.tileY >= 1 && fixture.tileY <= def.template.height - 2;
      assert.ok(inside, `${def.typeId}: ${fixture.id} nằm trong sàn tòa`);
    }
  }
  assert.equal(BUILDING_TYPE_DEFS.parking_lot.template.defaultFixtures.length, 0, 'Bãi xe không có nội thất');
  for (const typeId of ['grocery_branch', 'cafe', 'com_restaurant'] as const) {
    const fixtures = BUILDING_TYPE_DEFS[typeId].template.defaultFixtures;
    assert.ok(fixtures.some(f => f.type === 'cashier_counter'), `${typeId} có quầy thu ngân`);
  }

  // Giờ cao điểm
  assert.equal(extraBuildingPeakMultiplier([{ fromHour: 6, toHour: 10 }], 8), EXTRA_PEAK_MULTIPLIER);
  assert.equal(extraBuildingPeakMultiplier([{ fromHour: 6, toHour: 10 }], 10), 1, 'toHour là cận trên loại trừ');
  assert.equal(extraBuildingPeakMultiplier(undefined, 8), 1);
  assert.equal(extraBuildingPeakMultiplier([{ fromHour: 6, toHour: 10 }], undefined), 1);

  // Mở tòa thật: quán cà phê và bãi xe cạnh nhau
  const s = structuredClone(DEFAULT_INITIAL_SAVE);
  s.player.level = 80; s.player.money = 80_000_000; s.worldTime.isStoreOpen = false;
  const sim = new GameSimulation(s, generateStarterTileMap(), new InputManager(), {});
  sim.reclaimWave('w1');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(3);
  assert.ok(sim.buyParcel('w1-corner').success && sim.buyParcel('w1-east').success, 'Mua hai lô W1');

  const cafe = sim.openBuilding('cafe', 'w1-corner', 42, 3);
  assert.ok(cafe.success, `Mở quán cà phê (${cafe.reason ?? ''})`);
  const cafeFixtures = sim.getFixtures().filter(f => f.id.startsWith('cafe-1_') && !f.parentId);
  assert.equal(cafeFixtures.length, BUILDING_TYPE_DEFS.cafe.template.defaultFixtures.length, 'Quán cà phê có đủ nội thất mặc định, id theo instance');
  const pressed = cafeFixtures.find(f => f.id === 'cafe-1_counter');
  assert.ok(pressed && pressed.tileX === 43 && pressed.tileY === 4, 'Nội thất đặt theo gốc tòa');

  const lotParcel = resolveParcel('w1-east')!;
  const lot = sim.openBuilding('parking_lot', 'w1-east', lotParcel.rect.x0, lotParcel.rect.y1 - 5);
  assert.ok(lot.success, `Mở bãi giữ xe (${lot.reason ?? ''})`);
  assert.equal(sim.getFixtures().filter(f => f.id.startsWith('parking_lot-1_')).length, 0, 'Bãi xe không sinh nội thất');

  const buildings = sim.getTileMap().buildings;
  const lots = openParkingLots(buildings);
  assert.equal(lots.length, 1, 'Có một bãi xe đang mở');
  assert.equal(parkingLotFor('cafe-1', buildings, lots)?.id, 'parking_lot-1', 'Bãi xe phục vụ quán cà phê trong bán kính');
  assert.equal(parkingBonusFor('cafe-1', buildings, lots), BUILDING_TYPE_DEFS.parking_lot.effects?.carCustomerBonus, 'Quán cà phê nhận thưởng khách đi xe');
  assert.equal(parkingBonusFor('parking_lot-1', buildings, lots), 0, 'Bãi xe không tự tăng khách cho chính nó');
  assert.equal(parkingBonusFor('main', buildings, lots), 0, 'Tiệm chính ngoài bán kính không được thưởng');

  // Thu phí gửi xe: tiền, doanh thu bãi, sổ cái
  const priv = sim as unknown as { collectParkingFee(c: { buildingId?: string; arrivalMode?: string }): void };
  const before = sim.getPlayerData().money;
  priv.collectParkingFee({ buildingId: 'cafe-1', arrivalMode: 'car' });
  priv.collectParkingFee({ buildingId: 'cafe-1', arrivalMode: 'motorbike' });
  priv.collectParkingFee({ buildingId: 'main', arrivalMode: 'car' });
  assert.equal(sim.getPlayerData().money, before + PARKING_FEE.car + PARKING_FEE.motorbike, 'Chỉ khách tòa trong bán kính trả phí');
  const report = sim.getCurrentDayRecord().buildingReports?.['parking_lot-1'];
  assert.equal(report?.revenue, PARKING_FEE.car + PARKING_FEE.motorbike, 'Doanh thu ghi cho bãi xe theo tòa');

  // Khách thật sự sinh ở quán cà phê (nhịp theo loại tòa) và bãi xe không sinh khách quầy
  const cafeShelf = sim.getFixtures().find(f => f.id === 'cafe-1_shelf')!;
  cafeShelf.currentStock = 10;
  cafeShelf.assignedProductId = 'nuoc_suoi';
  const manager = (sim as unknown as { customerManager: { maybeSpawnCustomer(...args: unknown[]): { buildingId?: string } | null; getCustomers(): Array<{ buildingId?: string }> } }).customerManager;
  const spawnedIn = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const spawned = manager.maybeSpawnCustomer(10, true, sim.getFixtures(), sim.getTileMap(), 5, 0, undefined, null, 0, false, { hour: 8, weekday: 1 }, () => 1);
    if (spawned) spawnedIn.add(spawned.buildingId ?? 'main');
  }
  assert.ok(spawnedIn.has('cafe-1'), `Quán cà phê sinh khách (các tòa sinh khách: ${[...spawnedIn].join(', ')})`);
  assert.ok(!spawnedIn.has('parking_lot-1'), 'Bãi xe không sinh khách quầy');

  // Nợ thuê đóng bãi xe thì mất thưởng và phí
  const placement = (sim as unknown as { buildingPlacements?: Array<{ buildingId: string; closedForRent?: boolean }> }).buildingPlacements?.find(p => p.buildingId === 'parking_lot-1');
  assert.ok(placement, 'Có placement bãi xe');
  placement!.closedForRent = true;
  (sim as unknown as { tileMap: unknown }).tileMap = (sim as unknown as { buildTileMap(): unknown }).buildTileMap();
  assert.equal(openParkingLots(sim.getTileMap().buildings).length, 0, 'Bãi xe đóng cửa thì không còn hiệu lực');

  console.log('  ✓ Passed: nội thất mặc định, giờ cao điểm, bãi xe (thưởng khách + phí)');
}
