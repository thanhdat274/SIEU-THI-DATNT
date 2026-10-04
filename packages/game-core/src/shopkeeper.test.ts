import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, SHOPKEEPER_TILE, MAP_WIDTH, MAP_ORIGIN_Y } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { CASHIER_QUEUE_TILES } from './customers';

export function runShopkeeperTests(): void {
  const map = generateStarterTileMap();
  assert.equal(map.collisionLayer[(SHOPKEEPER_TILE.y - MAP_ORIGIN_Y) * MAP_WIDTH + SHOPKEEPER_TILE.x], false, 'Ô sau quầy là sàn tiệm mở, không bị khóa cứng');

  const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), map, new InputManager());
  const idle = sim.getShopkeeper();
  assert.equal(idle.serving, false, 'Chưa có khách thì chủ tiệm rảnh');
  assert.ok(idle.position.x > 0 && idle.position.y > 0);

  const queueHead = CASHIER_QUEUE_TILES[0];
  const moneyBefore = sim.getPlayerData().money;
  let served = false;
  let walkedFromDoor = false;
  let stoppedAtCounter = false;
  let servedWithCheckoutId = false;
  for (let i = 0; i < 3000 && sim.getStatistics().totalCustomersServed < 1; i++) {
    sim.update(1 / 60);
    const customer = sim.getCustomers()[0];
    if (customer?.stage === 'to_checkout' || customer?.stage === 'to_shelf') walkedFromDoor = true;
    const keeper = sim.getShopkeeper();
    if (customer?.stage === 'checkout') {
      const atHead = Math.floor(customer.position.x / 32) === queueHead.x && Math.floor(customer.position.y / 32) === queueHead.y;
      stoppedAtCounter ||= atHead;
      if (keeper.serving) { served = true; servedWithCheckoutId ||= keeper.checkoutId === customer.checkoutId; assert.equal(keeper.direction, 'right'); }
    }
  }
  assert.ok(walkedFromDoor, 'Khách đi từ cửa vào tiệm');
  assert.ok(stoppedAtCounter, 'Khách dừng đúng vị trí đầu hàng ở quầy thu ngân');
  assert.ok(served && servedWithCheckoutId, 'Chủ tiệm phục vụ đúng khách đang ở quầy');
  assert.equal(sim.getStatistics().totalCustomersServed, 1, 'Giao dịch hoàn tất');
  assert.ok(sim.getPlayerData().money > moneyBefore, 'Tiền thanh toán vào hòm');
  assert.equal(sim.getShopkeeper().serving, false, 'Xong giao dịch chủ tiệm lại rảnh');
  console.log('  ✓ Passed: Chủ tiệm sau quầy; khách đi tới quầy, dừng, được phục vụ và thanh toán');
}
