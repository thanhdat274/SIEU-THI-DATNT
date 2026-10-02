import assert from 'node:assert/strict';
import { StoreFixture, isSalesFixture } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, MAINTENANCE_RULES, PRODUCT_MAP, fixtureRepairCost, fixtureReplacementCost, generateStarterTileMap } from '@game/data';
import { CustomerManager } from './customers';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { coldBreakExtraDecay, listMaintenance, maintainFixture, maintenanceStatus, needsService, wearOvernight, type MaintenanceNotice } from './maintenance';

const shelf = (id: string, over: Partial<StoreFixture> = {}): StoreFixture => ({ id, type: 'shelf_wooden', tileX: 2, tileY: 2, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 24, label: id, ...over });

export function runMaintenanceTests(): void {
  console.log('\n--- Hao mòn và sửa chữa kệ/tủ mát ---');

  // Giá: tra theo loại và sức chứa gần nhất, sửa = 25% giá mua mới (tối thiểu 20.000).
  assert.equal(fixtureReplacementCost({ type: 'shelf_wooden', maxCapacity: 24 }), 80_000);
  assert.equal(fixtureReplacementCost({ type: 'shelf_glass', maxCapacity: 24 }), 140_000);
  assert.equal(fixtureReplacementCost({ type: 'refrigerator', maxCapacity: 24 }), 220_000);
  assert.equal(fixtureReplacementCost({ type: 'refrigerator', maxCapacity: 13 }), 90_000, 'Chọn mẫu cùng loại gần sức chứa nhất');
  assert.equal(fixtureRepairCost({ type: 'shelf_wooden', maxCapacity: 24 }), 20_000);
  assert.equal(fixtureRepairCost({ type: 'shelf_glass', maxCapacity: 24 }), 35_000);

  // Hao mòn qua đêm: xác định, chỉ từ cấp mở khóa, mỗi đêm tăng 1..4, không hỏng khi còn dưới ngưỡng.
  const a = [shelf('s1'), shelf('s2'), shelf('s3', { type: 'refrigerator', maxCapacity: 16 })];
  const b = structuredClone(a);
  assert.deepEqual(wearOvernight(a, 5, MAINTENANCE_RULES.unlockLevel - 1), [], 'Dưới cấp mở khóa không hao mòn');
  assert.ok(a.every(f => f.wear === undefined), 'Dưới cấp mở khóa không đổi dữ liệu');
  wearOvernight(a, 5, MAINTENANCE_RULES.unlockLevel);
  wearOvernight(b, 5, MAINTENANCE_RULES.unlockLevel);
  assert.deepEqual(a, b, 'Cùng ngày và mã nội thất cho cùng kết quả');
  for (const f of a) assert.ok(f.wear! >= MAINTENANCE_RULES.wearMin && f.wear! <= MAINTENANCE_RULES.wearMax && !f.broken, 'Đêm đầu mòn 1..4 và chưa hỏng');
  const cashier = shelf('c1', { type: 'cashier_counter' });
  wearOvernight([cashier], 5, 10);
  assert.equal(cashier.wear, undefined, 'Quầy thu ngân không hao mòn');

  // Mô phỏng nhiều đêm: không hỏng dưới ngưỡng; có hỏng nhẹ lẫn nặng; đồ hỏng không mòn thêm.
  const fleet = Array.from({ length: 30 }, (_, i) => shelf(`f${i}`));
  const notices: MaintenanceNotice[] = [];
  for (let day = 1; day <= 120; day++) {
    for (const f of fleet) if (!f.broken) assert.ok((f.wear ?? 0) <= 100);
    const before = fleet.map(f => [f.wear ?? 0, !!f.broken] as const);
    const ns = wearOvernight(fleet, day, 10);
    notices.push(...ns);
    fleet.forEach((f, i) => {
      if (before[i][1]) assert.equal(f.wear ?? 0, before[i][0], 'Đồ đã hỏng không mòn thêm');
      if (!before[i][1] && f.broken) assert.ok((f.wear ?? 0) >= MAINTENANCE_RULES.breakFrom, 'Chỉ hỏng khi mòn từ ngưỡng trở lên');
    });
  }
  assert.ok(notices.length > 0 && notices.some(n => n.broken === 'minor') && notices.some(n => n.broken === 'major'), 'Qua 120 đêm có cả hỏng nhẹ và hỏng nặng');
  assert.ok(fleet.every(f => f.broken === 'major' ? (f.wear ?? 0) >= 0 : true));

  // Trạng thái và hành động.
  const fine = shelf('g1', { wear: 10 }), worn = shelf('g2', { wear: 40 }), minor = shelf('g3', { wear: 60, broken: 'minor' }), major = shelf('g4', { wear: 90, broken: 'major' });
  assert.deepEqual([fine, worn, minor, major].map(maintenanceStatus), ['good', 'worn', 'broken_minor', 'broken_major']);
  assert.equal(needsService(shelf('x', { wear: 38 })), false);
  assert.equal(needsService(shelf('x', { wear: 39 })), true, 'Từ 70% ngưỡng hỏng thì nên bảo trì');
  const entries = listMaintenance([fine, worn, minor, major, shelf('cc', { type: 'cashier_counter' })]);
  assert.equal(entries.length, 4, 'Chỉ liệt kê kệ/tủ mát');
  assert.deepEqual(entries.map(e => [e.serviceCost, e.repairCost]), [[undefined, undefined], [20_000, undefined], [undefined, 20_000], [undefined, undefined]]);

  const L = MAINTENANCE_RULES.unlockLevel;
  assert.deepEqual(maintainFixture(worn, 'service', 1e6, L - 1), { success: false, reason: 'locked' });
  assert.deepEqual(maintainFixture(undefined, 'service', 1e6, L), { success: false, reason: 'not_found' });
  assert.deepEqual(maintainFixture(fine, 'service', 1e6, L), { success: false, reason: 'not_needed' });
  assert.deepEqual(maintainFixture(fine, 'repair', 1e6, L), { success: false, reason: 'not_broken' });
  assert.deepEqual(maintainFixture(major, 'repair', 1e6, L), { success: false, reason: 'cannot_repair_major' });
  assert.deepEqual(maintainFixture(minor, 'repair', 1000, L), { success: false, reason: 'not_enough_money' });
  assert.equal(minor.broken, 'minor', 'Thiếu tiền không đổi nội thất');
  assert.deepEqual(maintainFixture(worn, 'service', 1e6, L), { success: true, cost: 20_000 });
  assert.equal(worn.wear, MAINTENANCE_RULES.repairWear);
  assert.deepEqual(maintainFixture(minor, 'repair', 1e6, L), { success: true, cost: 20_000 });
  assert.ok(!minor.broken && minor.wear === MAINTENANCE_RULES.repairWear, 'Sửa xong hết hỏng, mòn về mức sửa');
  assert.deepEqual(maintainFixture(major, 'replace', 1e6, L), { success: true, cost: 80_000 });
  assert.ok(!major.broken && major.wear === 0, 'Mua mới thì mòn về 0');

  // Tích hợp với mô phỏng.
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 5;
  save.player.money = 500_000;
  const map = generateStarterTileMap();
  const noticesSeen: MaintenanceNotice[][] = [];
  const sim = new GameSimulation(save, map, new InputManager(), { onMaintenanceNotice: ns => noticesSeen.push(ns) });
  const sales = sim.getFixtures().filter(isSalesFixture);
  const water = PRODUCT_MAP['nuoc_suoi'] ?? Object.values(PRODUCT_MAP)[0];
  assert.ok(sales.length >= 2, 'Có ít nhất hai kệ để thử');
  const target = sales.find(f => f.type !== 'refrigerator')!;
  const other = sales.find(f => f.id !== target.id && f.type !== 'refrigerator')!;

  // Kệ hỏng: khách không chọn, không châm hàng, không được bố trí hàng.
  const live = sim.getFixtures().filter(isSalesFixture);
  for (const f of live) { f.currentStock = 0; f.stockLots = []; f.assignedProductId = undefined; }
  const brokenShelf = live.find(f => f.id === target.id)!, goodShelf = live.find(f => f.id === other.id)!;
  brokenShelf.assignedProductId = water.id; brokenShelf.currentStock = 5; brokenShelf.broken = 'minor'; brokenShelf.wear = 70;
  goodShelf.assignedProductId = water.id; goodShelf.currentStock = 5;
  for (let i = 0; i < 150; i++) {
    const customer = new CustomerManager([], i, 0).maybeSpawnCustomer(1, true, live, map, 3, i, { traffic: 1, weightOf: () => 1 });
    if (customer) assert.notEqual(customer.targetFixtureId, brokenShelf.id, 'Khách không chọn kệ đang hỏng');
  }
  assert.equal(sim.getMaintenanceList().find(e => e.fixtureId === brokenShelf.id)?.status, 'broken_minor');
  const sim2 = new GameSimulation(structuredClone(save), map, new InputManager());
  const f2 = sim2.getFixtures().find(f => f.id === brokenShelf.id)!;
  f2.broken = 'minor'; f2.assignedProductId = water.id;
  assert.equal(sim2.transferToShelf(f2.id, water.id, 1).reason, 'fixture_broken', 'Không châm hàng vào kệ hỏng');
  assert.equal(sim2.maintainFixture(f2.id, 'service').success, false, 'Kệ hỏng thì không bảo trì (phải sửa)');

  // Sửa/mua mới: trừ tiền, ghi sổ cái và chi phí ngày; mua mới giữ hàng đang bày.
  const sim3 = new GameSimulation(structuredClone(save), map, new InputManager());
  const fx = sim3.getFixtures().find(f => f.id === brokenShelf.id)!;
  fx.broken = 'minor'; fx.wear = 70; fx.assignedProductId = water.id; fx.currentStock = 6;
  const money0 = sim3.getPlayerData().money, net0 = sim3.getCurrentDayRecord().netProfit;
  const repaired = sim3.maintainFixture(fx.id, 'repair');
  assert.equal(repaired.success, true);
  assert.equal(repaired.cost, 20_000);
  assert.equal(sim3.getPlayerData().money, money0 - 20_000, 'Trừ đúng phí sửa');
  assert.equal(sim3.getFixtures().find(f => f.id === fx.id)!.broken, undefined);
  const entry = sim3.getLedger().filter(e => e.type === 'maintenance');
  assert.equal(entry.length, 1);
  assert.equal(entry[0].amount, 20_000);
  assert.equal(sim3.getCurrentDayRecord().maintenanceCost, 20_000);
  assert.equal(sim3.getCurrentDayRecord().netProfit, net0 - 20_000, 'Lãi ròng trừ chi phí bảo trì');
  const f3 = sim3.getFixtures().find(f => f.id === fx.id)!;
  f3.broken = 'major';
  assert.equal(sim3.maintainFixture(fx.id, 'repair').success, false, 'Hỏng nặng không sửa được');
  assert.equal(sim3.maintainFixture(fx.id, 'replace').success, true);
  const replaced = sim3.getFixtures().find(f => f.id === fx.id)!;
  assert.deepEqual([replaced.wear, replaced.broken, replaced.currentStock, replaced.assignedProductId], [0, undefined, 6, water.id], 'Mua mới giữ hàng đang bày và loại hàng');
  assert.equal(sim3.getCurrentDayRecord().maintenanceCost, 20_000 + 80_000);

  // Lưu/tải giữ hao mòn và hỏng.
  const f4 = sim3.getFixtures().find(f => f.id === fx.id)!;
  f4.wear = 77; f4.broken = 'minor';
  const reloaded = new GameSimulation(sim3.exportSaveData(), map, new InputManager());
  const r = reloaded.getFixtures().find(f => f.id === fx.id)!;
  assert.deepEqual([r.wear, r.broken], [77, 'minor'], 'Lưu rồi tải giữ nguyên hao mòn và hỏng');

  // Qua đêm thật: kệ mòn nặng cuối cùng hỏng và có thông báo; cấp thấp thì không hao mòn.
  const nightSave = structuredClone(save);
  const nightSim = new GameSimulation(nightSave, map, new InputManager(), { onMaintenanceNotice: ns => noticesSeen.push(ns) });
  const worn90 = nightSim.getFixtures().filter(isSalesFixture);
  for (const f of worn90) f.wear = 90;
  noticesSeen.length = 0;
  for (let i = 0; i < 25 && !noticesSeen.length; i++) nightSim.getClock().advanceToNextDay();
  assert.ok(noticesSeen.length > 0 && noticesSeen[0].length > 0, 'Kệ mòn nặng hỏng qua đêm và có thông báo');
  assert.ok(nightSim.getFixtures().filter(isSalesFixture).some(f => f.broken), 'Có kệ hỏng sau khi thông báo');
  const lowSave = structuredClone(save);
  lowSave.player.level = 1;
  const lowSim = new GameSimulation(lowSave, map, new InputManager());
  for (let i = 0; i < 5; i++) lowSim.getClock().advanceToNextDay();
  assert.ok(lowSim.getFixtures().every(f => f.wear === undefined && !f.broken), 'Cấp 1 không hao mòn');
  // Tủ mát hỏng không giữ lạnh: hàng trong tủ mất thêm hạn dùng mỗi đêm; kệ thường và tủ còn chạy thì không.
  assert.equal(coldBreakExtraDecay({ type: 'refrigerator', broken: 'minor' }), MAINTENANCE_RULES.brokenColdExtraDecay);
  assert.equal(coldBreakExtraDecay({ type: 'refrigerator', broken: 'major' }), MAINTENANCE_RULES.brokenColdExtraDecay);
  assert.equal(coldBreakExtraDecay({ type: 'refrigerator' }), 0, 'Tủ mát còn chạy không mất thêm');
  assert.equal(coldBreakExtraDecay({ type: 'shelf_wooden', broken: 'minor' }), 0, 'Kệ khô hỏng không làm hàng hỏng nhanh');
  const coldExpiry = (broken: boolean): number => {
    const sv = structuredClone(save);
    const sm = new GameSimulation(sv, map, new InputManager());
    const day = sm.getClock().getTime().day;
    const fr = sm.getFixtures().find(f => f.type === 'refrigerator')!;
    fr.assignedProductId = water.id; fr.currentStock = 5; fr.stockLots = [{ quantity: 5, expiresOnDay: day + 30 }];
    fr.wear = 0; fr.broken = broken ? 'minor' : undefined;
    sm.getClock().advanceToNextDay();
    return sm.getFixtures().find(f => f.id === fr.id)!.stockLots![0].expiresOnDay;
  };
  assert.ok(coldExpiry(true) <= coldExpiry(false) - MAINTENANCE_RULES.brokenColdExtraDecay, 'Qua đêm, hàng trong tủ hỏng còn ít ngày hạn hơn tủ còn chạy');
  console.log('  ✓ Passed: Hao mòn qua đêm, hỏng nhẹ/nặng, sửa/bảo trì/mua mới, ghi sổ cái và lưu/tải');
}
