import assert from 'node:assert/strict';
import { CustomerState, StoreFixture } from '@game/shared';
import { COUNTERFEIT_RULES, DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { assessCounterfeit } from './counterfeit';

const map = generateStarterTileMap();
const COUNTER = 'cashier_counter_wood';

const customer = (id: string, over: Partial<CustomerState> = {}, productId = 'banh_mi_que', unitPrice = 20_000): CustomerState => ({
  id, position: { x: 8 * 32, y: 9 * 32 }, stage: 'checkout', targetFixtureId: COUNTER, checkoutId: `checkout-${id}`,
  patience: 600, checkoutWait: 600,
  basket: [{ productId, quantity: 1, unitPrice, lots: [{ quantity: 1, expiresOnDay: 90, unitCost: 6000, provenance: 'known' }] }],
  ...over,
});

const table = (id: string, shopId: 'food_table_2' | 'food_table_4' = 'food_table_2', x = 6): StoreFixture => ({
  id, type: 'dining_table', tileX: x, tileY: 6, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: id, shopId, slotCount: 1,
});

const newSim = (customers: CustomerState[], opts: { tables?: StoreFixture[]; friendship?: number; staff?: boolean } = {}) => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 30;
  save.player.money = 1_000_000;
  save.worldTime.isStoreOpen = true;
  save.worldTime.hour = 10;
  save.customer = undefined;
  save.customers = customers;
  save.storeLayout.fixtures.push(...(opts.tables ?? []));
  if (opts.friendship !== undefined) save.regulars = { ba_nam: { id: 'ba_nam', friendship: opts.friendship, unlockedPerks: [], discoveredProductIds: [], totalVisits: 0 } };
  if (opts.staff) save.staff = [{ id: 'refill-1', name: 'Chị Hai', role: 'refill', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' }];
  return new GameSimulation(save, map, new InputManager(), {});
};

const real = (sim: GameSimulation, id: string): CustomerState => (sim as never as { customerManager: { customers: CustomerState[] } }).customerManager.customers.find(c => c.id === id)!;
const ledgerTypes = (sim: GameSimulation) => sim.getLedger().map(e => e.type);

export function runWaveATests(): void {
  console.log('\n--- Wave A: tín dụng khách quen, tiền giả, ăn tại bàn ---');

  // ===== Tín dụng =====
  {
    const sim = newSim([customer('c1', { regularId: 'ba_nam' })], { friendship: 60 });
    const terms = sim.getCustomerCreditTerms('ba_nam');
    assert.equal(terms.limit, 40_000, 'friendship 60 → hạn mức 20.000 + 20×1.000');
    assert.equal(sim.getCustomerCreditTerms('chi_lan').eligible, false, 'Khách chưa thân thiết không được mua chịu');

    // Không phải khách quen, hoặc vượt hạn mức → từ chối, không đổi trạng thái.
    const stranger = newSim([customer('s1')], { friendship: 60 });
    assert.equal(stranger.completeCustomerCheckout('checkout-s1', COUNTER, true), false);
    const big = newSim([customer('b1', { regularId: 'ba_nam' }, 'banh_mi_que', 50_000)], { friendship: 60 });
    assert.equal(big.completeCustomerCheckout('checkout-b1', COUNTER, true), false, 'Giỏ vượt hạn mức bị từ chối');
    assert.equal(big.getCustomerCredits().length, 0);

    const money = sim.getPlayerData().money;
    const revenue = sim.getStatistics().totalRevenue;
    assert.equal(sim.completeCustomerCheckout('checkout-c1', COUNTER, true), true);
    const afterMoney = sim.getPlayerData().money;
    const owed = sim.getCustomerCredits()[0].amount;
    assert.ok(afterMoney - money <= owed * 0.2, 'Bán chịu không thu tiền hàng (chỉ có thể có tiền boa nhỏ)');
    assert.ok(owed >= 20_000, 'Khoản nợ bằng số tiền hóa đơn');
    assert.equal(sim.getStatistics().totalRevenue - revenue, owed, 'Doanh thu ghi nhận lúc bán chịu');
    assert.ok(ledgerTypes(sim).includes('credit_sale'));
    assert.equal(sim.getCustomerCredits().length, 1);
    const after = sim.getCustomerCreditTerms('ba_nam');
    assert.equal(after.used, owed);
    assert.equal(after.available, after.limit - owed, 'Hạn mức khả dụng giảm đúng dư nợ (mua hàng có thể tăng thân thiết nên hạn mức tăng nhẹ)');

    // Retry cùng checkoutId không tạo khoản nợ hay sổ cái thứ hai.
    const ledgerLen = sim.getLedger().length;
    assert.equal(sim.completeCustomerCheckout('checkout-c1', COUNTER, true), true);
    assert.equal(sim.getCustomerCredits().length, 1);
    assert.equal(sim.getLedger().length, ledgerLen);
    assert.equal(sim.getPlayerData().money, afterMoney);

    // Save/reload giữ khoản nợ và bộ đếm; thu nợ không phải doanh thu mới và không thu hai lần.
    const reloaded = new GameSimulation(sim.exportSaveData('s', 1), map, new InputManager(), {});
    assert.equal(reloaded.getCustomerCredits()[0].id, 'credit-1');
    const m0 = reloaded.getPlayerData().money;
    const r0 = reloaded.getStatistics().totalRevenue;
    assert.equal(reloaded.repayCustomerCredit('credit-1'), true);
    assert.equal(reloaded.getPlayerData().money - m0, owed);
    assert.equal(reloaded.getStatistics().totalRevenue, r0, 'Thu nợ không cộng doanh thu');
    assert.equal(reloaded.repayCustomerCredit('credit-1'), false, 'Không thu nợ hai lần');
    assert.ok(ledgerTypes(reloaded).includes('credit_repayment'));
  }

  // Quá hạn → nợ xấu, ghi chi phí và khóa vay tiếp.
  {
    const sim = newSim([customer('d1', { regularId: 'ba_nam' })], { friendship: 60 });
    sim.completeCustomerCheckout('checkout-d1', COUNTER, true);
    const account = sim.getCustomerCredits()[0];
    const update = (sim as never as { updateCustomerCreditStatuses(day: number): void }).updateCustomerCreditStatuses.bind(sim);
    update(account.dueDay);
    assert.equal(sim.getCustomerCredits()[0].status, 'open', 'Đúng ngày đến hạn chưa quá hạn');
    update(account.dueDay + 1);
    assert.equal(sim.getCustomerCredits()[0].status, 'overdue');
    update(account.dueDay + 7);
    assert.equal(sim.getCustomerCredits()[0].status, 'overdue', 'Chưa vượt 7 ngày thì chưa xóa nợ');
    update(account.dueDay + 8);
    const defaulted = sim.getCustomerCredits()[0];
    assert.equal(defaulted.status, 'defaulted');
    assert.equal(defaulted.balance, 0);
    assert.ok(ledgerTypes(sim).includes('bad_debt'));
    assert.equal(sim.getCustomerCreditTerms('ba_nam').eligible, false);
    assert.equal(sim.repayCustomerCredit(defaulted.id), false);
  }

  // ===== Tiền giả =====
  {
    const day = 5;
    // Giao dịch nhỏ hơn mệnh giá nhỏ nhất không bao giờ có tiền giả.
    for (let i = 0; i < 500; i++) assert.equal(assessCounterfeit(day, `x${i}`, COUNTERFEIT_RULES.denominations[0] - 1, { kind: 'player' }).counterfeit, false);
    // Xác định: cùng đầu vào, cùng kết quả.
    for (let i = 0; i < 200; i++) assert.deepEqual(assessCounterfeit(day, `x${i}`, 100_000, { kind: 'player' }), assessCounterfeit(day, `x${i}`, 100_000, { kind: 'player' }));
    // Tỷ lệ gần cấu hình, mệnh giá không vượt giá trị hóa đơn, thu ngân giỏi phát hiện nhiều hơn.
    const trials = 40_000;
    let fake = 0, playerDetected = 0, weakDetected = 0, strongDetected = 0;
    for (let i = 0; i < trials; i++) {
      const outcome = assessCounterfeit(day, `t${i}`, 30_000, { kind: 'player' });
      if (!outcome.counterfeit) continue;
      fake++;
      assert.ok(outcome.faceValue <= 30_000 && COUNTERFEIT_RULES.denominations.includes(outcome.faceValue as never));
      if (outcome.detected) playerDetected++;
      if (assessCounterfeit(day, `t${i}`, 30_000, { kind: 'staff', accuracy: 0 }).detected) weakDetected++;
      if (assessCounterfeit(day, `t${i}`, 30_000, { kind: 'staff', accuracy: 10 }).detected) strongDetected++;
    }
    const rate = fake / trials;
    assert.ok(rate > COUNTERFEIT_RULES.transactionChance * 0.6 && rate < COUNTERFEIT_RULES.transactionChance * 1.5, `Tỷ lệ tiền giả ${rate} gần ${COUNTERFEIT_RULES.transactionChance}`);
    assert.ok(strongDetected > weakDetected, 'Chỉ số thu ngân cao phát hiện nhiều hơn');
    assert.ok(playerDetected / fake > 0.5 && playerDetected / fake < 0.9, 'Tỷ lệ phát hiện của người chơi gần cấu hình');

    // Trong simulation: ca phát hiện nhận đủ tiền; ca không phát hiện mất mệnh giá tờ giả, sổ cái và báo cáo ngày khớp; retry không nhân đôi.
    const simDay = newSim([customer('probe')]).getTime().day;
    const find = (detected: boolean) => {
      for (let i = 1; i < 20_000; i++) {
        const id = `checkout-f${i}`;
        const outcome = assessCounterfeit(simDay, id, 20_000, { kind: 'player' });
        if (outcome.counterfeit && outcome.detected === detected) return { id, outcome };
      }
      throw new Error('Không tìm thấy ca thử');
    };
    for (const detected of [true, false]) {
      const { id, outcome } = find(detected);
      const sim = newSim([customer('f', { checkoutId: id })]);
      const money = sim.getPlayerData().money;
      assert.equal(sim.completeCustomerCheckout(id, COUNTER), true);
      const delta = sim.getPlayerData().money - money;
      const record = sim.exportSaveData('s', 1).currentDayRecord!;
      if (detected) {
        assert.equal(delta, 20_000);
        assert.equal(record.counterfeitLoss ?? 0, 0);
        assert.ok(!ledgerTypes(sim).includes('counterfeit'));
      } else {
        assert.equal(delta, 20_000 - outcome.faceValue);
        assert.equal(record.counterfeitLoss, outcome.faceValue);
        assert.equal(sim.getLedger().filter(e => e.type === 'counterfeit').reduce((sum, e) => sum + e.amount, 0), outcome.faceValue);
      }
      const ledgerLen = sim.getLedger().length;
      const after = sim.getPlayerData().money;
      assert.equal(sim.completeCustomerCheckout(id, COUNTER), true);
      assert.equal(sim.getLedger().length, ledgerLen, 'Retry không ghi sổ lần hai');
      assert.equal(sim.getPlayerData().money, after, 'Retry không đổi tiền');
    }
  }

  // ===== Ăn tại bàn =====
  {
    // Không có bàn, hoặc giỏ không phải món ăn được → không ăn tại chỗ.
    const noTable = newSim([customer('n1')]);
    assert.equal(noTable.canDineIn(real(noTable, 'n1')), false);
    assert.equal(noTable.completeCustomerCheckout('checkout-n1', COUNTER, false, true), false, 'Không có bàn thì từ chối dine-in và không mất khách');
    assert.equal(real(noTable, 'n1').stage, 'checkout');
    const notFood = newSim([customer('n2', {}, 'pin', 20_000)], { tables: [table('t1')] });
    assert.equal(notFood.canDineIn(real(notFood, 'n2')), false, 'Hàng không phải món ăn không ngồi bàn');

    const sim = newSim([customer('e1')], { tables: [table('t1')], staff: true });
    assert.equal(sim.canDineIn(real(sim, 'e1')), true);
    assert.equal(sim.completeCustomerCheckout('checkout-e1', COUNTER, false, true), true);
    assert.equal(sim.completeCustomerCheckout('checkout-e1', COUNTER, false, true), true, 'Retry an toàn');
    assert.equal(real(sim, 'e1').diningTableId, 't1');
    assert.equal(real(sim, 'e1').stage, 'to_table');

    // Đi tới bàn, ngồi, rời đi → bàn bẩn.
    const seen = new Set<string>();
    let dirtyAt = -1;
    for (let t = 0; t < 400; t++) {
      sim.update(1);
      const c = sim.getCustomers().find(x => x.id === 'e1');
      if (c) seen.add(c.stage);
      if (dirtyAt < 0 && sim.getDiningTableState('t1').dirty) dirtyAt = t;
    }
    assert.ok(seen.has('to_table') && seen.has('eating'), 'Khách đi tới bàn rồi ngồi ăn');
    assert.equal(sim.getDiningTableState('t1').dirty, true, 'Bàn bẩn sau khi khách rời đi');
    assert.equal(sim.getDiningTableState('t1').occupied, 0);

    // Bàn bẩn chặn khách mới; save/reload giữ bàn bẩn.
    const next = newSim([customer('e2')], { tables: [table('t1')] });
    (next as never as { diningDirtyTableIds: Set<string> }).diningDirtyTableIds.add('t1');
    assert.equal(next.canDineIn(real(next, 'e2')), false, 'Bàn bẩn khóa chỗ');
    const reloaded = new GameSimulation(sim.exportSaveData('s', 2), map, new InputManager(), {});
    assert.equal(reloaded.getDiningTableState('t1').dirty, true, 'Trạng thái bẩn được lưu');

    // Người chơi dọn; dọn khi sạch/không tồn tại thất bại.
    assert.equal(sim.cleanDiningTable('t1'), true);
    assert.equal(sim.cleanDiningTable('t1'), false);
    assert.equal(sim.cleanDiningTable('nope'), false);

    // Nhân viên dọn qua job: đi tới bàn và hoàn tất; chỉ nhận khi bàn bẩn.
    const staffSim = newSim([], { tables: [table('t1')], staff: true });
    assert.equal(staffSim.assignDiningCleanup('refill-1', 't1'), false, 'Bàn sạch không cần dọn');
    (staffSim as never as { diningDirtyTableIds: Set<string> }).diningDirtyTableIds.add('t1');
    assert.equal(staffSim.assignDiningCleanup('refill-1', 't1'), true);
    assert.equal(staffSim.assignDiningCleanup('refill-1', 't1'), false, 'Nhân viên đang bận');
    for (let t = 0; t < 120 && staffSim.getDiningTableState('t1').dirty; t++) staffSim.update(1);
    assert.equal(staffSim.getDiningTableState('t1').dirty, false, 'Nhân viên dọn xong bàn');

    // Sức chứa: bàn 2 chỗ không nhận quá 2 khách cùng lúc.
    const crowd = newSim([customer('k1'), customer('k2', { checkoutId: 'checkout-k2' }), customer('k3', { checkoutId: 'checkout-k3' })], { tables: [table('t1')] });
    assert.equal(crowd.completeCustomerCheckout('checkout-k1', COUNTER, false, true), true);
    assert.equal(crowd.completeCustomerCheckout('checkout-k2', COUNTER, false, true), true);
    assert.equal(crowd.getDiningTableState('t1').occupied, 2);
    assert.equal(crowd.canDineIn(real(crowd, 'k3')), false, 'Bàn đủ chỗ thì khách thứ ba không ngồi được');
  }
}
