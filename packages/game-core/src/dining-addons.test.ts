import assert from 'node:assert/strict';
import { CustomerState, InventoryItem, StoreFixture } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, DINING, DINING_ADD_ON_RULES, PRODUCT_MAP, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { rollDiningAddOns, takeInventoryUnits } from './dining';

const map = generateStarterTileMap();
const COUNTER = 'cashier_counter_wood';
const DAY = 1;

const lot = (quantity: number, expiresOnDay: number, unitCost: number) => ({ quantity, expiresOnDay, unitCost, provenance: 'known' as const });
const table: StoreFixture = { id: 'table-1', type: 'dining_table', tileX: 6, tileY: 6, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'table-1', shopId: 'food_table_2', slotCount: 1 };

const diner = (id: string, productId: string): CustomerState => ({
  id, position: { x: 8 * 32, y: 9 * 32 }, stage: 'checkout', targetFixtureId: COUNTER, checkoutId: `checkout-${id}`, patience: 600, checkoutWait: 600,
  basket: [{ productId, quantity: 1, unitPrice: 25_000, lots: [lot(1, 90, 9_000)] }],
});

const newSim = (customer: CustomerState, inventory: InventoryItem[]) => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 30;
  save.player.money = 1_000_000;
  save.worldTime.isStoreOpen = true;
  save.worldTime.hour = 10;
  save.customer = undefined;
  save.customers = [customer];
  save.inventory = inventory;
  save.storeLayout.fixtures.push(table);
  return new GameSimulation(save, map, new InputManager(), {});
};

const liveCustomer = (sim: GameSimulation, id: string): CustomerState | undefined =>
  (sim as never as { customerManager: { customers: CustomerState[] } }).customerManager.customers.find(c => c.id === id);

/** Chạy tới khi khách ngồi xuống (stage 'eating') hoặc hết thời gian chờ. */
const untilSeated = (sim: GameSimulation, id: string): void => {
  for (let i = 0; i < 90 && liveCustomer(sim, id)?.stage !== 'eating'; i++) sim.update(1);
};

/** Tìm khóa khách cho ra đúng tập món mong muốn (kết quả xác định theo khóa). */
const findKey = (basket: string[], want: (picked: string[]) => boolean): string => {
  for (let i = 0; i < 5000; i++) if (want(rollDiningAddOns(DINING_ADD_ON_RULES, basket, `k${i}`, DAY))) return `k${i}`;
  throw new Error('không tìm được khóa phù hợp');
};

export function runDiningAddonTests(): void {
  console.log('\n--- Ăn tại chỗ: khách ngồi gọi thêm đồ uống kèm ---');

  const xoi = ['xoi_man_tp'];
  assert.ok(PRODUCT_MAP.tra_da && PRODUCT_MAP.sua_dau_nanh, 'đồ uống kèm có trong catalog');
  for (const rule of DINING_ADD_ON_RULES) for (const id of rule.whenProductIds) assert.ok(PRODUCT_MAP[id], `${id} có trong catalog`);

  // Quyết định: xác định theo khóa, chỉ áp dụng cho món có luật, tối đa DINING.maxExtraOrders, không trùng món.
  assert.deepEqual(rollDiningAddOns(DINING_ADD_ON_RULES, xoi, 'abc', 7), rollDiningAddOns(DINING_ADD_ON_RULES, xoi, 'abc', 7));
  assert.deepEqual(rollDiningAddOns(DINING_ADD_ON_RULES, ['banh_mi_que'], 'abc', 7), [], 'món không có luật thì không gọi thêm');
  assert.deepEqual(rollDiningAddOns([], xoi, 'abc', 7), []);
  let teaCount = 0;
  let milkCount = 0;
  const trials = 4000;
  for (let i = 0; i < trials; i++) {
    const picked = rollDiningAddOns(DINING_ADD_ON_RULES, xoi, `t${i}`, 3);
    assert.ok(picked.length <= DINING.maxExtraOrders && new Set(picked).size === picked.length);
    if (picked.includes('tra_da')) teaCount++;
    if (picked.includes('sua_dau_nanh')) milkCount++;
  }
  assert.ok(Math.abs(teaCount / trials - 0.45) < 0.04, `trà đá ~45% (thực tế ${(teaCount / trials).toFixed(3)})`);
  assert.ok(Math.abs(milkCount / trials - 0.2) < 0.04, `sữa đậu nành ~20% (thực tế ${(milkCount / trials).toFixed(3)})`);

  // Lấy kho: FEFO, bỏ lô hết hạn, không đủ thì không sửa kho.
  {
    const inv: InventoryItem[] = [{ productId: 'tra_da', quantity: 4, lots: [lot(1, 5, 900), lot(2, 9, 1_100), lot(1, 2, 700)] }];
    assert.equal(takeInventoryUnits(inv, 'tra_da', 5, 5), undefined, 'lô hết hạn không dùng được');
    assert.equal(inv[0].quantity, 4);
    const taken = takeInventoryUnits(inv, 'tra_da', 1, 3);
    assert.deepEqual(taken, { cost: 900 }, 'lô sớm hạn còn dùng được đi trước (hạn 5, lô hạn 2 đã quá)');
    assert.equal(inv[0].quantity, 3);
    assert.equal(takeInventoryUnits(inv, 'sua_dau_nanh', 1, 3), undefined, 'không có hàng');
  }

  // Qua mô phỏng: ngồi xuống → gọi cả hai món → trừ kho, cộng doanh thu/giá vốn, kéo dài bữa ăn.
  {
    const key = findKey(xoi, picked => picked.length === 2);
    const stock: InventoryItem[] = [
      { productId: 'tra_da', quantity: 3, lots: [lot(3, 90, 1_000)] },
      { productId: 'sua_dau_nanh', quantity: 3, lots: [lot(3, 90, 6_000)] },
    ];
    const sim = newSim(diner(key, 'xoi_man_tp'), stock);
    const before = { money: sim.getPlayerData().money, revenue: sim.getStatistics().totalRevenue };
    assert.equal(sim.completeCustomerCheckout(`checkout-${key}`, COUNTER, false, true), true, 'thanh toán và đi ngồi bàn');
    const basketRevenue = sim.getStatistics().totalRevenue - before.revenue;
    assert.equal(basketRevenue, 25_000);
    assert.equal(liveCustomer(sim, key)?.diningProductIds?.[0], 'xoi_man_tp', 'ghi nhớ món đã mua dù giỏ đã xóa');
    untilSeated(sim, key);
    assert.equal(liveCustomer(sim, key)?.stage, 'eating', 'khách đã ngồi xuống');

    const addOnEntries = sim.getLedger().filter(entry => entry.description.startsWith('Khách ngồi bàn gọi thêm'));
    assert.ok(addOnEntries.length === 2, 'có 2 dòng sổ cái cho từng món gọi thêm');
    const names = new Set(addOnEntries.map(e => e.description));
    assert.ok(names.has('Khách ngồi bàn gọi thêm Trà Đá Đóng Chai Ướp Lạnh'), 'có dòng trà đá');
    assert.ok(names.has('Khách ngồi bàn gọi thêm Sữa đậu nành chai'), 'có dòng sữa đậu nành chai');
    const tea = addOnEntries.find(e => e.description.includes('Trà Đá'));
    const milk = addOnEntries.find(e => e.description.includes('Sữa đậu nành chai'));
    assert.ok(tea, 'trà da co entry');
    assert.ok(milk, 'sua dau nanh co entry');
    assert.equal(tea.quantity, 1, 'trà đá quantity 1');
    assert.equal(milk.quantity, 1, 'sữa đậu nành quantity 1');
    assert.equal(sim.getStatistics().totalRevenue - before.revenue, basketRevenue + tea.amount + milk.amount, 'doanh thu cộng cả món gọi thêm');
    assert.ok(sim.getPlayerData().money - before.money >= basketRevenue + tea.amount + milk.amount - 1, 'tiền cộng đủ');
    assert.equal(sim.getInventory().find(item => item.productId === 'tra_da')?.quantity, 2);
    assert.equal(sim.getInventory().find(item => item.productId === 'sua_dau_nanh')?.quantity, 2);
    assert.ok((liveCustomer(sim, key)?.diningTimeLeft ?? 0) > 60 + DINING.extraOrderSeconds, 'bữa ăn kéo dài thêm sau mỗi món');

    // Lưu/nạp lại khi đang ăn không gọi thêm lần nữa. (per-item ledger: 2 món = 2 dòng)
    const reloaded = new GameSimulation(sim.exportSaveData('s', 1), map, new InputManager(), {});
    reloaded.update(1);
    assert.equal(reloaded.getLedger().filter(entry => entry.description.startsWith('Khách ngồi bàn gọi thêm')).length, 2, 'save/load không tạo thêm gọi thêm');
  }

  // Hết đồ uống thì khách không gọi; món thường (không có luật) cũng không.
  {
    const key = findKey(xoi, picked => picked.length > 0);
    const empty = newSim(diner(key, 'xoi_man_tp'), []);
    empty.completeCustomerCheckout(`checkout-${key}`, COUNTER, false, true);
    untilSeated(empty, key);
    assert.equal(liveCustomer(empty, key)?.stage, 'eating');
    assert.equal(empty.getLedger().some(entry => entry.description.startsWith('Khách ngồi bàn gọi thêm')), false, 'hết hàng thì không bán');

    const plain = newSim(diner('plain', 'banh_mi_que'), [{ productId: 'tra_da', quantity: 3, lots: [lot(3, 90, 1_000)] }]);
    plain.completeCustomerCheckout('checkout-plain', COUNTER, false, true);
    untilSeated(plain, 'plain');
    assert.equal(plain.getInventory().find(item => item.productId === 'tra_da')?.quantity, 3, 'món không có luật thì không đụng kho');
  }
  console.log('Ăn tại chỗ gọi thêm: PASS');
}
