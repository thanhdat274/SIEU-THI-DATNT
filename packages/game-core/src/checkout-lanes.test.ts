import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import type { CustomerState } from '@game/shared';
import { CustomerManager, cashierCounters, queueTilesForCounter } from './customers';
import { buyShopFixture } from './store-layout';

const customer = (id: string): CustomerState => ({
  id, checkoutId: `co-${id}`, position: { x: 9.5 * 32, y: 10.5 * 32 }, stage: 'to_checkout', targetFixtureId: 'shelf_wooden_noodles',
  patience: 60, checkoutWait: 5,
  basket: [{ productId: 'mi_hao_hao', quantity: 1, unitPrice: 5000, lots: [{ quantity: 1, expiresOnDay: 99, unitCost: 3000 }] }],
} as CustomerState);

export function runCheckoutLaneTests() {
  console.log('\n--- Hai quầy thu ngân: hàng đợi riêng từng quầy ---');
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.worldTime.isStoreOpen = false; save.player.level = 60; save.player.money = 1_000_000;
  const map = generateStarterTileMap([]);
  const solo = save.storeLayout.fixtures;
  const first = cashierCounters(solo)[0];
  const tiles = queueTilesForCounter(first, map, solo, new Set());
  assert.deepEqual(tiles, [{ x: 9, y: 8 }, { x: 9, y: 9 }, { x: 9, y: 10 }], 'Quầy gốc giữ đúng ba ô xếp hàng cũ');

  const bought = buyShopFixture(save, 'counter2', 7, 6, 0);
  assert.ok(bought.save, `Mua quầy thu ngân 2 (${bought.error ?? ''})`);
  assert.equal(buyShopFixture(bought.save, 'counter2', 11, 6, 0).error, 'owned', 'Chỉ được có một quầy thu ngân 2');
  const fixtures = bought.save.storeLayout.fixtures;
  const counters = cashierCounters(fixtures);
  assert.equal(counters.length, 2, 'Có hai quầy thu ngân');
  const second = queueTilesForCounter(counters[1], map, fixtures, new Set(tiles.map(t => `${t.x},${t.y}`)));
  assert.ok(second.length > 0 && second.every(t => !tiles.some(o => o.x === t.x && o.y === t.y)), 'Làn quầy 2 không trùng làn quầy 1');

  const manager = new CustomerManager([customer('a'), customer('b'), customer('c')]);
  for (const c of manager.getCustomers()) manager.routeCustomer(manager['customers'].find(x => x.id === c.id)!, 'to_checkout', map, fixtures);
  const lanes = manager.getCustomers().map(c => c.cashierFixtureId);
  assert.notEqual(lanes[0], lanes[1], 'Hai khách đầu chia về hai quầy khác nhau');
  assert.equal(new Set(lanes).size, 2, 'Chỉ dùng hai quầy');
  assert.equal(lanes[2], lanes[0], 'Khách thứ ba vào quầy ít người nhất (hòa thì quầy đứng trước)');

  // Hai khách cùng ở đầu hàng của hai quầy: thanh toán đúng người theo checkoutId.
  const two = new CustomerManager([{ ...customer('x'), stage: 'checkout', cashierFixtureId: counters[0].id }, { ...customer('y'), stage: 'checkout', cashierFixtureId: counters[1].id }]);
  const done = new Set<string>();
  const paid = two.completeCheckout('co-y', done, map, fixtures);
  assert.ok(paid.success && paid.checkoutId === 'co-y' && paid.paidTotal === 5000, 'Thanh toán đúng khách theo checkoutId khi hai quầy cùng có khách');
  assert.equal(two.getCustomers().find(c => c.id === 'x')?.stage, 'checkout', 'Khách ở quầy kia vẫn đang chờ');
}
