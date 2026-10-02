import { receiveDeliveredOrders } from './delivery';
import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

/** Đặc tả đặt → giao: tiền, sổ cái, đơn chờ, lô kho, giao đúng một lần, callback. */
export function runDeliveryTests(): void {
  const save = Object.assign(structuredClone(DEFAULT_INITIAL_SAVE), { inventory: [], pendingOrders: [], holdingArea: [] });
  const delivered: number[] = [];
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), { onOrdersDelivered: n => delivered.push(n) });
  const money0 = sim.getPlayerData().money;
  const day = sim.getTime().day;

  const res = sim.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 10 }, { productId: 'sua_tuoi', quantity: 4 }]);
  assert.equal(res.success, true, (res.reasons ?? []).join('; '));
  assert.equal(res.orderIds?.length, 2);
  assert.equal(sim.getPlayerData().money, money0 - res.paidTotal!, 'Trừ đúng tổng tiền một lần');
  assert.equal(sim.getCurrentDayRecord().purchaseTotal, res.paidTotal, 'Ghi vào chi nhập hôm nay');
  assert.equal(sim.getPendingOrders().length, 2);
  assert.ok(sim.getPendingOrders().every(o => !o.delivered && o.arrivalDay > day), 'Đại lý đầu hẻm giao sáng hôm sau');
  assert.equal(sim.getInventory().length, 0, 'Chưa vào kho trước ngày giao');

  sim.deliverOrders(day); // chưa đến ngày
  assert.equal(sim.getPendingOrders().length, 2);
  assert.deepEqual(delivered, []);

  const arrival = sim.getPendingOrders()[0].arrivalDay;
  sim.deliverOrders(arrival);
  assert.equal(sim.getPendingOrders().length, 0, 'Đơn đã giao bị gỡ khỏi hàng chờ');
  assert.deepEqual(delivered, [14], 'Callback báo đúng tổng số hàng giao');
  const noodles = sim.getInventory().find(i => i.productId === 'mi_hao_hao')!;
  assert.equal(noodles.quantity, 10);
  assert.equal(noodles.lots?.length, 1);
  assert.ok(noodles.lots![0].expiresOnDay > arrival, 'Lô có hạn dùng');
  assert.ok(noodles.lots![0].unitCost! > 0 && noodles.lots![0].provenance === 'known', 'Lô giữ giá vốn');
  assert.equal(sim.getInventory().find(i => i.productId === 'sua_tuoi')!.quantity, 4);
  assert.equal(sim.getHoldingArea().length, 0);

  sim.deliverOrders(arrival + 1); // giao lần hai không làm gì
  assert.deepEqual(delivered, [14], 'Giao đúng một lần');
  assert.equal(sim.getInventory().find(i => i.productId === 'mi_hao_hao')!.quantity, 10);

  // Đặt thêm cùng mặt hàng: gộp vào cùng ô kho, thêm lô riêng theo giá/hạn
  const again = sim.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 5 }]);
  assert.equal(again.success, true);
  sim.deliverOrders(sim.getPendingOrders()[0].arrivalDay);
  const merged = sim.getInventory().filter(i => i.productId === 'mi_hao_hao');
  assert.equal(merged.length, 1, 'Một ô kho cho mỗi món');
  assert.equal(merged[0].quantity, 15);
  assert.equal(merged[0].quantity, merged[0].lots!.reduce((s, l) => s + l.quantity, 0), 'Tổng lô khớp số lượng');

  // Không đủ tiền: không trừ gì, không tạo đơn
  const poorSave = Object.assign(structuredClone(DEFAULT_INITIAL_SAVE), { inventory: [], pendingOrders: [] });
  poorSave.player = { ...poorSave.player, money: 0 };
  const poor = new GameSimulation(poorSave, generateStarterTileMap(), new InputManager());
  const rejected = poor.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 10 }]);
  assert.equal(rejected.success, false);
  assert.equal(poor.getPendingOrders().length, 0);
  assert.equal(poor.getPlayerData().money, 0);
  console.log('  ✓ Passed: Đặt hàng → giao hàng — trừ tiền, sổ nhập, đơn chờ, lô kho, giao một lần, gộp ô, từ chối khi thiếu tiền');
}

/** Hàm thuần: hàng mát vượt chỗ trống chuyển sang khu chờ, chỗ trống tính lại theo từng đơn. */
export function runReceiveDeliveredOrdersTests(): void {
  const mk = (id: string, productId: string, quantity: number): import('@game/shared').SupplierOrder => ({ id, productId, quantity, unitCost: 5000, arrivalDay: 4, supplierId: 'dai_ly_dau_hem', delivered: false });
  const inventory: import('@game/shared').InventoryItem[] = [];
  const holdingArea: import('@game/shared').HoldingItem[] = [];
  let freeCold = 6;
  const orders = [mk('o1', 'sua_tuoi', 4), mk('o2', 'sua_tuoi', 4), mk('o3', 'mi_hao_hao', 7)];
  const count = receiveDeliveredOrders(orders, 5, {
    inventory, holdingArea, freshExtraDays: 1,
    freeColdSlots: () => { const free = freeCold; freeCold -= Math.min(free, 4); return free; },
  });
  assert.equal(count, 4 + 2 + 7, 'Đơn 2 chỉ vừa 2 chỗ mát, phần còn lại tràn sang khu chờ');
  assert.equal(inventory.find(i => i.productId === 'sua_tuoi')!.quantity, 6);
  assert.equal(holdingArea.length, 1);
  assert.equal(holdingArea[0].quantity, 2);
  assert.equal(holdingArea[0].originalArrivalDay, 4);
  assert.ok(orders.every(o => o.delivered && o.deliveryDay === 5));
  const base = receiveDeliveredOrders([mk('o4', 'mi_hao_hao', 1)], 5, { inventory: [], holdingArea: [], freshExtraDays: 0, freeColdSlots: () => 0 });
  assert.equal(base, 1, 'Hàng khô không phụ thuộc chỗ mát');
  const none = receiveDeliveredOrders([mk('o5', 'sua_tuoi', 3)], 5, { inventory: [], holdingArea, freshExtraDays: 0, freeColdSlots: () => -5 });
  assert.equal(none, 0, 'Chỗ mát âm coi như không còn chỗ');
  console.log('  ✓ Passed: Nhận hàng giao — tràn kho mát sang khu chờ, chỗ mát tính lại theo đơn, hạn dùng');
}
