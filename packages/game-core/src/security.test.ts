import assert from 'node:assert/strict';
import { CustomerState, SecurityIncident } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, SECURITY_RULES, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { appendIncident, openPoliceCase, planBurglary, rollShoplifter, sanitizeSecurity, securityUnlocked, shopliftCaught, shopliftDetectChance, type BurglaryPlan } from './security';

const L = SECURITY_RULES.unlockLevel;
const map = generateStarterTileMap();

const thief = (id: string, over: Partial<CustomerState> = {}): CustomerState => ({
  id, position: { x: 9 * 32, y: 8 * 32 }, stage: 'checkout', targetFixtureId: 'shelf_wooden_noodles', checkoutId: id,
  patience: 60, checkoutWait: 60, thief: true,
  basket: [{ productId: 'mi_hao_hao', quantity: 1, unitPrice: 4500, lots: [{ quantity: 1, expiresOnDay: 30, unitCost: 3000, provenance: 'known' }] }],
  ...over,
});

const newSim = (mutate?: (save: typeof DEFAULT_INITIAL_SAVE) => void, callbacks = {}) => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = L + 1;
  save.player.money = 1_000_000;
  mutate?.(save);
  return new GameSimulation(save, map, new InputManager(), callbacks);
};

const guardStaff = { id: 'guard-1', name: 'Bác Tư', role: 'security' as const, speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' as const };

/** Tìm một ngày có kế hoạch trộm đột nhập thuộc loại cho trước (theo trạng thái camera/bảo vệ). */
const findBurglaryDay = (kind: BurglaryPlan['kind'], state: { camera: boolean; hasGuard: boolean }, from = 3): number => {
  for (let day = from; day < from + 5000; day++) if (planBurglary(day, L + 1, state).kind === kind) return day;
  throw new Error(`Không tìm thấy ngày trộm kiểu ${kind}`);
};

export function runSecurityTests(): void {
  console.log('\n--- Trộm cắp và an ninh: trộm lẻ, trộm đột nhập, camera, công an ---');

  // Mở khóa và xác suất kẻ trộm lẻ.
  assert.equal(securityUnlocked(L - 1), false);
  assert.equal(securityUnlocked(L), true);
  assert.equal(rollShoplifter(3, 'c1', L - 1, false), false, 'Dưới cấp mở khóa không có kẻ trộm');
  let thieves = 0;
  for (let i = 0; i < 20000; i++) {
    assert.equal(rollShoplifter(3, `c${i}`, L, true), false, 'Khách quen không bao giờ là kẻ trộm');
    if (rollShoplifter(3, `c${i}`, L, false)) thieves++;
  }
  assert.ok(Math.abs(thieves / 20000 - SECURITY_RULES.thiefChance) < 0.006, `Tỷ lệ kẻ trộm gần ${SECURITY_RULES.thiefChance} (được ${(thieves / 20000).toFixed(4)})`);
  assert.equal(rollShoplifter(3, 'same', L, false), rollShoplifter(3, 'same', L, false), 'Xác định');

  // Khả năng phát hiện kết hợp độc lập.
  const none = { guardOnShift: false, camera: false, refillOnShift: false };
  assert.equal(shopliftDetectChance(none), 0);
  assert.ok(Math.abs(shopliftDetectChance({ ...none, guardOnShift: true }) - 0.9) < 1e-9);
  assert.ok(Math.abs(shopliftDetectChance({ ...none, camera: true }) - 0.8) < 1e-9);
  assert.ok(Math.abs(shopliftDetectChance({ guardOnShift: true, camera: true, refillOnShift: false }) - 0.98) < 1e-9);
  assert.ok(shopliftDetectChance({ guardOnShift: true, camera: true, refillOnShift: true }) > 0.98);
  assert.equal(shopliftCaught(3, 'x', 0), false, 'Xác suất 0 thì không bao giờ bị bắt');
  assert.equal(shopliftCaught(3, 'x', 1), true, 'Xác suất 1 thì luôn bị bắt');

  // Trộm đột nhập: tần suất, camera giảm một nửa, bảo vệ đuổi được, loại mất mát, xác định.
  const freq = (state: { camera: boolean; hasGuard: boolean }) => { let n = 0; for (let d = 1; d <= 6000; d++) if (planBurglary(d, L, state).kind !== 'none') n++; return n / 6000; };
  const base = freq({ camera: false, hasGuard: false }), withCamera = freq({ camera: true, hasGuard: false });
  assert.ok(Math.abs(base - SECURITY_RULES.nightChance) < 0.015, `Tần suất trộm đêm gần ${SECURITY_RULES.nightChance} (được ${base.toFixed(3)})`);
  assert.ok(withCamera < base * 0.7, `Camera giảm tần suất (${withCamera.toFixed(3)} < ${base.toFixed(3)})`);
  assert.equal(planBurglary(5, L - 1, { camera: false, hasGuard: false }).kind, 'none', 'Dưới cấp mở khóa không có trộm đêm');
  const kinds = new Set<string>();
  for (let d = 1; d <= 6000; d++) {
    const guarded = planBurglary(d, L, { camera: false, hasGuard: true });
    const open = planBurglary(d, L, { camera: false, hasGuard: false });
    assert.equal(guarded.kind === 'none', open.kind === 'none', 'Bảo vệ không đổi việc có kẻ lạ tới hay không');
    if (open.kind !== 'none') assert.equal(guarded.kind, 'repelled', 'Có bảo vệ thì đuổi được');
    kinds.add(open.kind);
    if (open.kind === 'cash') assert.ok(open.fraction >= SECURITY_RULES.nightCashMin && open.fraction <= SECURITY_RULES.nightCashMax);
    if (open.kind === 'goods') assert.ok(open.fraction >= SECURITY_RULES.nightStealMin && open.fraction <= SECURITY_RULES.nightStealMax && open.maxItems === SECURITY_RULES.nightMaxItems);
  }
  assert.deepEqual([...kinds].sort(), ['cash', 'goods', 'none', 'repelled'].filter(k => k !== 'repelled'), 'Không bảo vệ: có cả mất tiền và mất hàng');
  assert.deepEqual(planBurglary(77, L, { camera: false, hasGuard: false }), planBurglary(77, L, { camera: false, hasGuard: false }));

  // Hồ sơ công an.
  let caughtPlain = 0, caughtCamera = 0;
  for (let d = 1; d <= 4000; d++) {
    const a = openPoliceCase(d, 50_000, false), b = openPoliceCase(d, 50_000, true);
    assert.ok(a.resolveDay - d >= SECURITY_RULES.policeDaysMin && a.resolveDay - d <= SECURITY_RULES.policeDaysMax, 'Có kết quả sau 2 đến 5 ngày');
    if (a.caught) caughtPlain++;
    if (b.caught) caughtCamera++;
  }
  assert.ok(caughtCamera > caughtPlain * 1.4, `Camera tăng khả năng bắt được (${caughtCamera} > ${caughtPlain})`);
  assert.ok(Math.abs(caughtPlain / 4000 - SECURITY_RULES.policeCatch) < 0.04);

  // Dọn dữ liệu và giới hạn sự cố.
  const dirty = sanitizeSecurity({ camera: 'yes', callPolice: false, incidents: [{ id: 'a', day: 1, kind: 'burglary', text: 'x' }, null, { id: 3 }], policeCases: [{ day: 1, value: 10, resolveDay: 3, caught: true }, { day: 1, value: -5, resolveDay: 3, caught: true }, 'rác'] });
  assert.deepEqual([dirty.camera, dirty.callPolice, dirty.incidents.length, dirty.policeCases.length], [false, false, 1, 1]);
  assert.deepEqual(sanitizeSecurity(undefined), { camera: false, callPolice: true, incidents: [], policeCases: [] });
  let log: SecurityIncident[] = [];
  for (let i = 0; i < SECURITY_RULES.incidentCap + 7; i++) log = appendIncident(log, { id: `i${i}`, day: 1, kind: 'burglary', text: 't' });
  assert.equal(log.length, SECURITY_RULES.incidentCap);
  assert.equal(log[log.length - 1].id, `i${SECURITY_RULES.incidentCap + 6}`);

  // Tích hợp: kẻ trộm lẻ thoát khi không có bảo vệ hay camera.
  {
    const notices: string[] = [];
    const sim = newSim(save => { save.customers = [thief('t-escape')]; }, { onSecurityNotice: (n: { text: string }) => notices.push(n.text) });
    const money0 = sim.getPlayerData().money, served0 = sim.getStatistics().totalCustomersServed, net0 = sim.getCurrentDayRecord().netProfit;
    assert.equal(sim.completeCustomerCheckout('t-escape'), true);
    const after = sim.getCustomers().find(c => c.id === 't-escape');
    assert.equal(sim.getPlayerData().money, money0, 'Kẻ trộm không trả tiền');
    assert.equal(sim.getStatistics().totalCustomersServed, served0, 'Không tính là khách đã phục vụ');
    assert.equal(sim.getReviews().length, 0, 'Kẻ trộm không để lại đánh giá');
    assert.ok(!after || (after.stage === 'leaving' && (after.basket?.length ?? 0) === 0), 'Kẻ trộm đã rời đi, giỏ trống');
    const theft = sim.getLedger().filter(e => e.type === 'theft');
    assert.equal(theft.length, 1);
    assert.equal(theft[0].amount, 3000, 'Mất theo giá vốn');
    assert.equal(sim.getCurrentDayRecord().theftCost, 3000);
    assert.equal(sim.getCurrentDayRecord().netProfit, net0 - 3000, 'Lãi ròng trừ hàng bị trộm');
    assert.equal(sim.getSecurityState().incidents.at(-1)?.kind, 'shoplift_escaped');
    assert.equal(notices.length, 1);
    assert.equal(sim.completeCustomerCheckout('t-escape'), true, 'Gọi lại không xử lý lần hai');
    assert.equal(sim.getLedger().filter(e => e.type === 'theft').length, 1);
  }

  // Sang ngày hoàn hàng trên khách thật và xóa giỏ; không để giỏ cũ gây hoàn hàng lặp.
  {
    const customer = thief('day-change-customer', { thief: false });
    const sim = newSim(save => {
      save.customers = [customer];
      save.worldTime = { ...save.worldTime, day: 3, hour: 22, minute: 59, isStoreOpen: true };
    });
    const stockBefore = sim.getFixtures().reduce((n, f) => n + f.currentStock, 0) + sim.getInventory().reduce((n, i) => n + i.quantity, 0);
    sim.getClock().advanceToNextDay();
    const left = sim.getCustomers().find(c => c.id === customer.id);
    assert.equal(left?.stage, 'leaving', 'Khách thật được chuyển sang trạng thái rời tiệm');
    assert.equal(left?.basket?.length ?? 0, 0, 'Giỏ khách thật được xóa');
    const stockAfter = sim.getFixtures().reduce((n, f) => n + f.currentStock, 0) + sim.getInventory().reduce((n, i) => n + i.quantity, 0);
    assert.equal(stockAfter, stockBefore + 1, 'Hàng được hoàn đúng một lần');
    sim.getClock().advanceToNextDay();
    assert.equal(sim.getCustomers().find(c => c.id === customer.id)?.basket?.length ?? 0, 0, 'Giỏ đã hoàn không còn để phát sinh hoàn hàng lần nữa');
  }

  // Bắt quả tang (có camera): hàng trả về, nộp phạt gấp đôi.
  {
    let caughtId = '';
    for (let i = 0; i < 200 && !caughtId; i++) if (shopliftCaught(3, `t-caught-${i}`, 0.8)) caughtId = `t-caught-${i}`;
    assert.ok(caughtId, 'Có id bị bắt với camera');
    const sim = newSim(save => { save.customers = [thief(caughtId)]; save.security = { camera: true, callPolice: true, incidents: [], policeCases: [] }; save.worldTime = { ...save.worldTime, day: 3 }; });
    assert.equal(sim.getTime().day, 3);
    const money0 = sim.getPlayerData().money;
    const stockBefore = sim.getFixtures().reduce((n, f) => n + f.currentStock, 0) + sim.getInventory().reduce((n, i) => n + i.quantity, 0);
    assert.equal(sim.completeCustomerCheckout(caughtId), true);
    const stockAfter = sim.getFixtures().reduce((n, f) => n + f.currentStock, 0) + sim.getInventory().reduce((n, i) => n + i.quantity, 0);
    assert.equal(sim.getPlayerData().money, money0 + 9000, 'Phạt gấp đôi tiền hàng (4.500 × 2)');
    assert.equal(stockAfter, stockBefore + 1, 'Hàng được trả lại kệ hoặc kho');
    assert.equal(sim.getLedger().filter(e => e.type === 'recovery')[0].amount, 9000);
    assert.equal(sim.getLedger().filter(e => e.type === 'theft').length, 0, 'Bị bắt thì không mất hàng');
    assert.equal(sim.getCurrentDayRecord().theftRecovered, 9000);
    assert.equal(sim.getSecurityState().incidents.at(-1)?.kind, 'shoplift_caught');
  }

  // Bảo vệ đang trực làm tăng khả năng phát hiện.
  {
    const sim = newSim(save => { save.staff = [guardStaff]; save.staffSchedule = { 'guard-1': 'full_day' }; });
    assert.equal(sim.hasSecurityGuardOnShift(), true, 'Bảo vệ ca cả ngày đang trực');
  }

  // Trộm đột nhập: mất tiền két.
  {
    const day = findBurglaryDay('cash', { camera: false, hasGuard: false });
    const sim = newSim(save => { save.worldTime = { ...save.worldTime, day: day - 1 }; });
    (sim as unknown as { currentDayRecord: { revenue: number } }).currentDayRecord.revenue = 100_000;
    const money0 = sim.getPlayerData().money;
    sim.getClock().advanceToNextDay();
    assert.equal(sim.getTime().day, day);
    const stolen = money0 - sim.getPlayerData().money;
    const plan = planBurglary(day, L + 1, { camera: false, hasGuard: false }) as Extract<BurglaryPlan, { kind: 'cash' }>;
    assert.ok(stolen >= 1000 && stolen <= 100_000 * SECURITY_RULES.nightCashMax + 1000 && stolen >= 100_000 * plan.fraction - 1000, `Mất 30–60% doanh thu hôm trước (mất ${stolen})`);
    const entry = sim.getLedger().find(e => e.type === 'theft_cash')!;
    assert.equal(entry.amount, stolen, 'Sổ cái ghi đúng số tiền mất');
    assert.equal(sim.getCurrentDayRecord().theftCost, stolen);
    const security = sim.getSecurityState();
    assert.equal(security.incidents.at(-1)?.kind, 'burglary');
    assert.equal(security.policeCases.length, 1, 'Báo công an mở hồ sơ');
    assert.ok(security.policeCases[0].resolveDay > day);
  }

  // Trộm đột nhập: mất hàng trên kệ (tiền không đổi).
  {
    const day = findBurglaryDay('goods', { camera: false, hasGuard: false });
    const sim = newSim(save => { save.worldTime = { ...save.worldTime, day: day - 1 }; });
    for (const f of sim.getFixtures()) if (f.type.startsWith('shelf') && f.currentStock === 0) { f.assignedProductId = 'mi_hao_hao'; f.currentStock = 6; f.stockLots = [{ quantity: 6, expiresOnDay: 99, unitCost: 3000, provenance: 'known' }]; }
    const shelfBefore = sim.getFixtures().reduce((n, f) => n + f.currentStock, 0), money0 = sim.getPlayerData().money;
    sim.getClock().advanceToNextDay();
    const shelfAfter = sim.getFixtures().reduce((n, f) => n + f.currentStock, 0);
    assert.ok(shelfAfter < shelfBefore && shelfBefore - shelfAfter <= SECURITY_RULES.nightMaxItems, `Mất một ít hàng trên kệ (${shelfBefore} → ${shelfAfter})`);
    const entry = sim.getLedger().find(e => e.type === 'theft')!;
    assert.ok(entry && entry.amount > 0 && entry.quantity === shelfBefore - shelfAfter);
    assert.equal(sim.getPlayerData().money, money0 - sim.getLedger().filter(e => e.type !== 'theft' && e.type !== 'sale' && e.type !== 'spoilage' && e.type !== 'recovery').reduce((n, e) => n + e.amount, 0) + sim.getLedger().filter(e => e.type === 'recovery' || e.type === 'sale').reduce((n, e) => n + e.amount, 0), 'Mất hàng không đổi tiền');
    assert.equal(sim.getSecurityState().incidents.at(-1)?.kind, 'burglary');
  }

  // Có bảo vệ: kẻ lạ bị đuổi, không mất gì.
  {
    const day = findBurglaryDay('repelled', { camera: false, hasGuard: true });
    const sim = newSim(save => { save.staff = [guardStaff]; save.worldTime = { ...save.worldTime, day: day - 1 }; });
    (sim as unknown as { currentDayRecord: { revenue: number } }).currentDayRecord.revenue = 100_000;
    const money0 = sim.getPlayerData().money;
    sim.getClock().advanceToNextDay();
    assert.equal(sim.getSecurityState().incidents.at(-1)?.kind, 'burglary_repelled');
    assert.ok(sim.getLedger().every(e => e.type !== 'theft' && e.type !== 'theft_cash'), 'Không mất gì');
    assert.ok(sim.getPlayerData().money >= money0 - 100_000, 'Tiền không bị lấy');
    assert.equal(sim.getSecurityState().policeCases.length, 0, 'Không có vụ trộm thì không báo công an');
  }

  // Không báo công an thì không mở hồ sơ.
  {
    const day = findBurglaryDay('cash', { camera: false, hasGuard: false });
    const sim = newSim(save => { save.security = { camera: false, callPolice: false, incidents: [], policeCases: [] }; save.worldTime = { ...save.worldTime, day: day - 1 }; });
    (sim as unknown as { currentDayRecord: { revenue: number } }).currentDayRecord.revenue = 100_000;
    sim.getClock().advanceToNextDay();
    assert.equal(sim.getSecurityState().incidents.at(-1)?.kind, 'burglary');
    assert.equal(sim.getSecurityState().policeCases.length, 0);
  }

  // Công an có kết quả: bắt được thì trả lại tiền, không thì đóng hồ sơ.
  for (const caught of [true, false]) {
    const sim = newSim(save => { save.worldTime = { ...save.worldTime, day: 4 }; save.security = { camera: false, callPolice: true, incidents: [], policeCases: [{ day: 2, value: 40_000, resolveDay: 5, caught }] }; });
    const money0 = sim.getPlayerData().money;
    sim.getClock().advanceToNextDay();
    assert.equal(sim.getTime().day, 5);
    const security = sim.getSecurityState();
    assert.equal(security.policeCases.length, 0, 'Hồ sơ tới hạn được giải quyết');
    if (caught) {
      assert.equal(sim.getLedger().filter(e => e.type === 'recovery')[0].amount, 40_000);
      assert.equal(security.incidents.at(-1)?.kind, 'police_recovered');
      assert.ok(sim.getPlayerData().money >= money0 + 40_000 - 100_000);
    } else {
      assert.equal(security.incidents.at(-1)?.kind, 'police_closed');
      assert.ok(sim.getLedger().every(e => e.type !== 'recovery'));
    }
  }

  // Camera và báo công an.
  {
    const low = newSim(save => { save.player.level = L - 1; });
    assert.equal(low.buyCamera().success, false, 'Dưới cấp mở khóa không mua được');
    const poor = newSim(save => { save.player.money = 1000; });
    assert.equal(poor.buyCamera().reason, 'Không đủ tiền.');
    const sim = newSim();
    const money0 = sim.getPlayerData().money, net0 = sim.getCurrentDayRecord().netProfit;
    const bought = sim.buyCamera();
    assert.deepEqual([bought.success, bought.cost], [true, SECURITY_RULES.cameraCost]);
    assert.equal(sim.getPlayerData().money, money0 - SECURITY_RULES.cameraCost);
    assert.equal(sim.getSecurityState().camera, true);
    assert.equal(sim.getLedger().filter(e => e.type === 'maintenance').at(-1)?.amount, SECURITY_RULES.cameraCost);
    assert.equal(sim.getCurrentDayRecord().netProfit, net0 - SECURITY_RULES.cameraCost);
    assert.equal(sim.buyCamera().success, false, 'Chỉ lắp một lần');
    assert.equal(sim.getSecurityState().callPolice, true);
    sim.setCallPolice(false);
    assert.equal(sim.getSecurityState().callPolice, false);

    // Lưu/tải giữ nguyên an ninh và cờ kẻ trộm.
    const reloaded = new GameSimulation(sim.exportSaveData(), map, new InputManager());
    assert.deepEqual(reloaded.getSecurityState(), sim.getSecurityState(), 'Lưu rồi tải giữ nguyên an ninh');
    const withThief = newSim(save => { save.customers = [thief('t-persist')]; });
    const round = new GameSimulation(withThief.exportSaveData(), map, new InputManager());
    assert.equal(round.getCustomers().find(c => c.id === 't-persist')?.thief, true, 'Cờ kẻ trộm được lưu cùng khách');
  }

  // Save cũ không có an ninh vẫn tải được; cấp thấp thì không có sự cố qua nhiều đêm.
  {
    const legacy = structuredClone(DEFAULT_INITIAL_SAVE);
    delete (legacy as { security?: unknown }).security;
    assert.deepEqual(new GameSimulation(legacy, map, new InputManager()).getSecurityState(), { camera: false, callPolice: true, incidents: [], policeCases: [] });
    const lowSave = structuredClone(DEFAULT_INITIAL_SAVE);
    lowSave.player.level = 2;
    const low = new GameSimulation(lowSave, map, new InputManager());
    for (let i = 0; i < 12; i++) low.getClock().advanceToNextDay();
    assert.equal(low.getSecurityState().incidents.length, 0, 'Cấp thấp không có sự cố');
  }
  console.log('  ✓ Passed: Trộm lẻ và trộm đột nhập, bảo vệ/camera, công an, sổ cái và lưu/tải');
}
