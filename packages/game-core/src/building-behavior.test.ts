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

  // Công thức riêng: cà phê chạy ở quầy pha của quán cà phê, món cơm ở bếp nướng/nồi canh của quán cơm
  const stock = (productId: string, quantity: number) => ({ productId, quantity, lots: [{ quantity, expiresOnDay: 30, unitCost: 5_000, provenance: 'known' as const }] });
  (sim as unknown as { inventory: unknown[] }).inventory.push(
    stock('ca_phe_bot', 3), stock('duong_cat', 3), stock('sua_hop', 6), stock('trung_ga', 6),
  );
  const coffee = sim.startProduction('recipe_ca_phe_den_da', 'cafe-1_counter');
  assert.ok(coffee.success, `Pha cà phê đen đá ở quầy pha quán cà phê (${coffee.reason ?? ''})`);
  assert.equal(sim.startProduction('recipe_com_suon_nuong', 'cafe-1_counter').success, false, 'Món cơm không nấu được ở quầy pha');
  assert.ok(sim.getStationRecipes('cafe-1_counter').some(r => r.id === 'recipe_bac_xiu'), 'Quầy pha liệt kê công thức bạc xỉu');

  // Kệ quán cà phê tự nhận món pha, không tự nhận hàng thường
  (sim as unknown as { inventory: unknown[] }).inventory.push(stock('ca_phe_den_da_tp', 6), stock('nuoc_suoi', 6));
  cafeShelf.currentStock = 0;
  cafeShelf.assignedProductId = undefined;
  delete (sim as unknown as { planogram: Record<string, string> }).planogram['cafe-1_shelf'];
  const fill = sim.autoFillShelf('cafe-1_shelf');
  assert.equal(fill.productId, 'ca_phe_den_da_tp', 'Kệ quán cà phê tự nhận cà phê, bỏ qua nước suối');

  // Mở quán cơm: kiểm tra sản xuất món cơm ở bếp nướng và nồi canh
  (manager as unknown as { customers: unknown[] }).customers = [];
  sim.setStoreOpen(false);
  sim.reclaimWave('w2');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(5);
  assert.ok(sim.buyParcel('w2-1').success, 'Mua lô w2-1 để mở quán cơm');
  const comRes = sim.openBuilding('com_restaurant', 'w2-1', 0, 16);
  assert.ok(comRes.success, `Mở quán cơm (${comRes.reason ?? ''})`);
  const comFixtures = sim.getFixtures().filter(f => f.id.startsWith('com_restaurant-1_') && !f.parentId);
  assert.equal(comFixtures.length, BUILDING_TYPE_DEFS.com_restaurant.template.defaultFixtures.length, 'Quán cơm có đủ nội thất mặc định');

  (sim as unknown as { inventory: unknown[] }).inventory.push(
    stock('gao', 10), stock('suon_heo', 10), stock('rau_cai', 10), stock('nuoc_tuong', 10),
    stock('trung_ga', 10), stock('hanh_la', 10), stock('rau_muong', 10), stock('thit_xay', 10),
  );
  // Bếp nướng quán cơm: nấu cơm sườn nướng
  const comSuon = sim.startProduction('recipe_com_suon_nuong', 'com_restaurant-1_grill');
  assert.ok(comSuon.success, `Nấu cơm sườn nướng ở bếp nướng quán cơm (${comSuon.reason ?? ''})`);
  // Bếp nướng từ chối nấu cà phê hay canh
  assert.equal(sim.startProduction('recipe_ca_phe_den_da', 'com_restaurant-1_grill').success, false, 'Bếp nướng từ chối pha cà phê');
  assert.equal(sim.startProduction('recipe_canh_rau_thit', 'com_restaurant-1_grill').success, false, 'Bếp nướng từ chối nấu canh');

  // Nồi canh quán cơm: nấu canh rau thịt bằm
  const canhRau = sim.startProduction('recipe_canh_rau_thit', 'com_restaurant-1_kettle');
  assert.ok(canhRau.success, `Nấu canh rau thịt bằm ở nồi canh quán cơm (${canhRau.reason ?? ''})`);

  // Tủ trưng bày quán cơm: tự châm món cơm, bỏ qua nước suối
  (sim as unknown as { inventory: unknown[] }).inventory.push(stock('com_suon_nuong_tp', 4), stock('nuoc_suoi', 10));
  const comDisplay = comFixtures.find(f => f.id === 'com_restaurant-1_display')!;
  comDisplay.currentStock = 0;
  comDisplay.assignedProductId = undefined;
  delete (sim as unknown as { planogram: Record<string, string> }).planogram['com_restaurant-1_display'];
  const fillCom = sim.autoFillShelf('com_restaurant-1_display');
  assert.equal(fillCom.productId, 'com_suon_nuong_tp', 'Tủ quán cơm tự nhận món cơm, bỏ qua nước suối');

  // Nợ thuê đóng bãi xe thì mất thưởng và phí
  const placement = (sim as unknown as { buildingPlacements?: Array<{ buildingId: string; closedForRent?: boolean }> }).buildingPlacements?.find(p => p.buildingId === 'parking_lot-1');
  assert.ok(placement, 'Có placement bãi xe');
  placement!.closedForRent = true;
  (sim as unknown as { tileMap: unknown }).tileMap = (sim as unknown as { buildTileMap(): unknown }).buildTileMap();
  assert.equal(openParkingLots(sim.getTileMap().buildings).length, 0, 'Bãi xe đóng cửa thì không còn hiệu lực');

  console.log('  ✓ Passed: nội thất mặc định, giờ cao điểm, bãi xe (thưởng khách + phí)');
}
