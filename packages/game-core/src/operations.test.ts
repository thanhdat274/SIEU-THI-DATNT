import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { AutoBuyRule, CustomerState } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';

const rules: AutoBuyRule[] = [
  { id: 'first', productId: 'mi_hao_hao', threshold: 0, quantity: 2, supplierId: 'dai_ly_dau_hem', priority: 1, maxBudget: 6000 },
  { id: 'second', productId: 'xa_xi_chuong_duong', threshold: 0, quantity: 1, supplierId: 'dai_ly_dau_hem', priority: 2, maxBudget: 5000 },
];

function createSim(save = structuredClone(DEFAULT_INITIAL_SAVE)) {
  return new GameSimulation(save, generateStarterTileMap(), new InputManager());
}

function waitingCustomer(checkoutId: string): CustomerState {
  return {
    id: checkoutId,
    position: { x: 9 * 32, y: 8 * 32 },
    stage: 'checkout',
    targetFixtureId: 'shelf_wooden_noodles',
    checkoutId,
    patience: 60,
    checkoutWait: 60,
    basket: [{ productId: 'mi_hao_hao', quantity: 1, unitPrice: 4500, lots: [{ quantity: 1, expiresOnDay: 10, unitCost: 3000, provenance: 'known' }] }],
  };
}

export function runOperationsTests(): void {
  console.log('\n--- Test 9.3 + 10: Cashier worker handoff and auto-buy rules ---');

  const cashierSave = structuredClone(DEFAULT_INITIAL_SAVE);
  cashierSave.staff = [{
    id: 'cashier-worker', name: 'Chị Hằng', role: 'cashier', speed: 5, accuracy: 5, stamina: 5,
    dailyWage: 30000, hiredOnDay: 1, shift: 'morning',
  }];
  cashierSave.staffSchedule = { 'cashier-worker': 'morning' };
  cashierSave.customers = [waitingCustomer('cashier-handoff')];
  const cashier = createSim(cashierSave);
  const startMoney = cashier.getPlayerData().money;
  assert.equal(cashier.assignNextCashierCustomer('cashier-worker'), true, 'Thu ngân nhận khách đang chờ trong ca');
  assert.equal(cashier.getStaff()[0].currentCheckoutId, 'cashier-handoff', 'Khách hiện tại được lưu trên nhân viên');
  const beforeEnd = cashier.getTime();
  beforeEnd.hour = 14;
  cashier.getClock().setTime(beforeEnd);
  cashier.update(0.1);
  assert.equal(cashier.getStaff()[0].currentCheckoutId, undefined, 'Hết ca hoàn tất lượt hiện tại rồi nhả nhân viên');
  assert.equal(cashier.getPlayerData().money, startMoney + 4500, 'Checkout chung chỉ cộng tiền khách một lần');
  assert.equal(cashier.assignNextCashierCustomer('cashier-worker'), false, 'Nhân viên hết ca không nhận khách mới');
  cashier.completeCustomerCheckout('cashier-handoff');
  assert.equal(cashier.getPlayerData().money, startMoney + 4500, 'Player retry cùng checkout không cộng tiền lần hai');

  const autoSave = structuredClone(DEFAULT_INITIAL_SAVE);
  autoSave.player.money = 7000;
  autoSave.inventory = autoSave.inventory.map((item) => ({ ...item, quantity: 0, lots: [] }));
  const auto = createSim(autoSave);
  assert.equal(auto.getAutoBuyConfig().enabled, false, 'Tự nhập mặc định tắt');
  assert.equal(auto.setAutoBuyConfig(true, rules).success, true, 'Chấp nhận quy tắc hợp lệ');
  auto.getClock().advanceToNextDay();
  const report = auto.getAutoBuyConfig().reports[2];
  assert.equal(report.placed.length, 1, 'Quy tắc ưu tiên cao đặt trước');
  assert.equal(report.placed[0].ruleId, 'first', 'Tiền được giữ cho quy tắc ưu tiên trước');
  assert.equal(report.placed[0].quantity, 2, 'Mua đúng số lượng đặt trong quy tắc');
  assert.equal(report.skipped[0].ruleId, 'second', 'Báo cáo quy tắc sau bị thiếu ngân sách');
  const persisted = auto.exportSaveData();
  assert(persisted.processedAutoBuyDayIds?.includes(2), 'Dấu ngày auto-buy được lưu bền');
  assert.equal(persisted.autoBuyReports?.[2].placed.length, 1, 'Báo cáo được giữ sau save');
  const resumed = createSim(persisted);
  assert.equal(resumed.getAutoBuyConfig().reports[2].placed.length, 1, 'Báo cáo auto-buy còn sau reload');
  assert.equal(resumed.setAutoBuyConfig(true, [{ ...rules[0], supplierId: 'missing' }]).success, false, 'Từ chối nhà cung cấp không hợp lệ');
  console.log('  ✓ Cashier checkout chung, bàn giao hết ca, auto-buy default-off, ưu tiên/ngân sách và persistence');
}
