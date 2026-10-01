import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { decorAttraction, decorTrafficMultiplier } from './decor';
import { applyStoreLayoutActions, buyLandPlot, buyShopFixture, buyDecorItem, moveStoreFixture, rotateStoreFixture, storeFixture, retrieveStoreFixture, validateStoreLayout } from './store-layout';

export function runStoreLayoutTests() {
  console.log('\n--- Store layout geometry, batch atomicity and plot economy ---');
  const base = structuredClone(DEFAULT_INITIAL_SAVE);
  base.worldTime.isStoreOpen = false;
  const mapFor = (ids: readonly string[]) => generateStarterTileMap([...ids]);
  const map = mapFor([]);
  assert.equal(validateStoreLayout(base, map).error, undefined, 'Starter layout respects floor, door, cashier and path constraints');

  const shelf = base.storeLayout.fixtures.find(item => item.id === 'shelf_wooden_noodles')!;
  assert.equal(rotateStoreFixture(shelf), 90, 'Rotation advances by ninety degrees');
  const edge = moveStoreFixture(base, shelf.id, 12, 6, 90, map);
  assert.equal(edge.error, undefined, 'Rotated fixture may occupy valid floor tiles');
  assert.equal(moveStoreFixture(base, shelf.id, 8, 6, 90, map).error, 'outside_floor', 'Không đặt nội thất lên ô chủ tiệm đang đứng');
  const outside = moveStoreFixture(base, shelf.id, 25, 20, 90, map);
  assert.equal(outside.error, 'outside_floor', 'Fixture footprint beyond map bounds is rejected');
  const overlap = moveStoreFixture(base, shelf.id, 7, 8, 0, map);
  assert.equal(overlap.error, 'overlap', 'Fixture overlap is rejected');

  const stowed = storeFixture(base, shelf.id);
  assert.ok(stowed.save, 'Fixture can be stowed');
  assert.equal(stowed.save.storeLayout.fixtures.some(item => item.id === shelf.id), false, 'Stowed fixture leaves the shop floor');
  assert.equal(stowed.save.storeLayout.storedFixtures.find(item => item.id === shelf.id)?.currentStock, shelf.currentStock, 'Stow preserves stock and fixture identity');
  const retrieved = retrieveStoreFixture(stowed.save, shelf.id, shelf.tileX, shelf.tileY, map);
  assert.ok(retrieved.save, 'Fixture can be retrieved into a valid position');
  assert.equal(retrieved.save.storeLayout.fixtures.find(item => item.id === shelf.id)?.id, shelf.id, 'Retrieve preserves fixture identity');
  assert.deepEqual(retrieved.save.storeLayout.fixtures.find(item => item.id === shelf.id)?.stockLots, shelf.stockLots, 'Retrieve preserves stock lots');
  assert.equal(storeFixture(base, base.storeLayout.fixtures.find(item => item.type === 'cashier_counter')!.id).error, 'prerequisite', 'Cashier cannot be stowed');

  const brokenBatch = applyStoreLayoutActions(base, [
    { type: 'buy_plot', plotId: 'east-wing-a' },
    { type: 'move', fixtureId: shelf.id, tileX: 25, tileY: 20, rotation: 0 },
  ], mapFor);
  assert.equal(brokenBatch.error, 'level', 'Plot level requirement rejects the batch before commit');
  assert.equal(brokenBatch.save, undefined, 'Rejected batch exposes no partial save or plot purchase');
  const eligibleBatchSave = structuredClone(base);
  eligibleBatchSave.player.level = 5;
  eligibleBatchSave.player.money = 1_000_000;
  const invalidFinalBatch = applyStoreLayoutActions(eligibleBatchSave, [
    { type: 'buy_plot', plotId: 'east-wing-a' },
    { type: 'move', fixtureId: shelf.id, tileX: 25, tileY: 20, rotation: 0 },
  ], mapFor);
  assert.equal(invalidFinalBatch.error, 'outside_floor', 'Invalid final action rejects whole eligible batch');
  assert.equal(invalidFinalBatch.save, undefined, 'Invalid batch exposes no partially purchased plot');

  const tooLowLevel = structuredClone(base);
  tooLowLevel.player.level = 4;
  tooLowLevel.player.money = 1_000_000;
  assert.equal(buyLandPlot(tooLowLevel, 'east-wing-a').error, 'level', 'Plot purchase enforces level gate');
  const insufficientFunds = structuredClone(base);
  insufficientFunds.player.level = 5;
  insufficientFunds.player.money = 249_999;
  assert.equal(buyLandPlot(insufficientFunds, 'east-wing-a').error, 'money', 'Plot purchase enforces funds');
  assert.equal(insufficientFunds.player.money, 249_999, 'Rejected purchase does not partially deduct money');
  const secondFirst = structuredClone(base);
  secondFirst.player.level = 10;
  secondFirst.player.money = 1_000_000;
  assert.equal(buyLandPlot(secondFirst, 'east-wing-b').error, 'prerequisite', 'Second plot requires first plot');
  const purchased = buyLandPlot(secondFirst, 'east-wing-a');
  assert.ok(purchased.save, 'Eligible owner can purchase adjacent first plot');
  const balanceAfterPurchase = purchased.save.player.money;
  const duplicate = buyLandPlot(purchased.save, 'east-wing-a');
  assert.ok(duplicate.save, 'Retrying already owned plot purchase is idempotent');
  assert.equal(duplicate.save.player.money, balanceAfterPurchase, 'Duplicate purchase does not charge again');
  const expanded = applyStoreLayoutActions(purchased.save, [
    { type: 'move', fixtureId: shelf.id, tileX: 14, tileY: 4, rotation: 0 },
  ], mapFor);
  assert.ok(expanded.save, `Fixture placement in unlocked adjacent plot is accepted (${expanded.error ?? expanded.blockedFixtureIds?.join(',') ?? 'no save'})`);
  const locked = moveStoreFixture(base, shelf.id, 14, 3, 0, mapFor([]));
  assert.equal(locked.error, 'outside_floor', 'Unopened plot tiles are not floor');

  const rich = structuredClone(base); rich.player.money = 500_000; rich.player.level = 30;
  const bought = applyStoreLayoutActions(rich, [{ type: 'buy_fixture', shopId: 'shelf', tileX: 7, tileY: 6, rotation: 0 }], mapFor);
  assert.ok(bought.save, `Mua kệ gỗ đặt vào ô trống hợp lệ (${bought.error ?? ''})`);
  assert.equal(bought.save.player.money, 420_000, 'Mua kệ gỗ trừ 80.000đ');
  assert.equal(bought.save.storeLayout.fixtures.length, base.storeLayout.fixtures.length + 11, 'Kệ mới + ô phụ của mọi kệ (3+3+1 cũ, 3 mới)');
  assert.equal(applyStoreLayoutActions(rich, [{ type: 'buy_fixture', shopId: 'shelf', tileX: 8, tileY: 5, rotation: 0 }], mapFor).error, 'overlap', 'Không đặt chồng lên kệ cũ');
  const poor = structuredClone(base); poor.player.money = 10; poor.player.level = 30;
  assert.equal(buyShopFixture(poor, 'fridge', 7, 5, 0).error, 'money', 'Thiếu tiền không mua được');
  assert.equal(buyShopFixture(rich, 'khong_co', 7, 5, 0).error, 'unknown_item', 'Món lạ bị từ chối');
  const lowLevel = structuredClone(rich); lowLevel.player.level = 1;
  assert.equal(buyShopFixture(lowLevel, 'shelf', 7, 6, 0).error, 'level', 'Chưa đủ cấp không mua được');
  assert.equal(buyShopFixture(rich, 'food_grill', 7, 6, 0).error, 'unavailable', 'Món chưa có chức năng không cho mua');
  const big = buyShopFixture(rich, 'shelf_double', 7, 6, 0);
  assert.equal(big.save?.storeLayout.fixtures.filter(item => item.parentId === 'shelf_wooden_buy_1').length, 7, 'Kệ đôi có 8 ô (1 chính + 7 phụ)');

  // Ô phụ đi theo kệ cha khi di chuyển / cất / lấy lại.
  const withSlots = bought.save;
  const newShelf = withSlots.storeLayout.fixtures.find(item => item.id === 'shelf_wooden_buy_1')!;
  const children = withSlots.storeLayout.fixtures.filter(item => item.parentId === newShelf.id);
  assert.equal(children.length, 3, 'Kệ gỗ có 3 ô phụ');
  const moved = moveStoreFixture(withSlots, newShelf.id, 9, 4, 0, map);
  assert.ok(moved.save, `Di chuyển kệ nhiều ô hợp lệ (${moved.error ?? ''})`);
  assert.ok(moved.save.storeLayout.fixtures.filter(item => item.parentId === newShelf.id).every(item => item.tileX === 9 && item.tileY === 4), 'Ô phụ theo kệ cha');
  assert.equal(moveStoreFixture(withSlots, children[0].id, 9, 4, 0, map).error, 'prerequisite', 'Không di chuyển riêng ô phụ');
  const stowedSlots = storeFixture(withSlots, newShelf.id);
  assert.equal(stowedSlots.save?.storeLayout.fixtures.some(item => item.parentId === newShelf.id), false, 'Cất kệ cũng cất ô phụ');
  assert.equal(stowedSlots.save?.storeLayout.storedFixtures.filter(item => item.parentId === newShelf.id).length, 3, 'Ô phụ nằm trong kho cùng kệ');
  const back = retrieveStoreFixture(stowedSlots.save!, newShelf.id, 7, 6, map);
  assert.equal(back.save?.storeLayout.fixtures.filter(item => item.parentId === newShelf.id).length, 3, 'Lấy lại kệ mang theo ô phụ');

  // Đồ trang trí: mua một lần, biển thay biển, có điểm thu hút làm tăng khách.
  const decorBuy = buyDecorItem(rich, 'day_den');
  assert.ok(decorBuy.save, 'Mua dây đèn nháy khi đủ cấp và tiền');
  assert.equal(decorBuy.save.player.money, 500_000 - 60_000, 'Dây đèn nháy trừ 60.000đ');
  assert.equal(buyDecorItem(decorBuy.save, 'day_den').error, 'owned', 'Không mua trùng đồ tường');
  assert.equal(buyDecorItem(rich, 'tien_tai').error, 'unknown_item', 'Đồ độc quyền không mua bằng tiền');
  assert.equal(buyDecorItem(rich, 'chau_cay').error, 'unknown_item', 'Đồ sàn mua qua buy_fixture');
  assert.equal(buyDecorItem(lowLevel, 'bien_led').error, 'level', 'Thiếu cấp không mua biển');
  const sign = buyDecorItem(rich, 'bien_led');
  assert.deepEqual(sign.save?.storeLayout.decorOwned, ['bien_led'], 'Biển hiệu đầu tiên');
  const plant = applyStoreLayoutActions(sign.save!, [{ type: 'buy_decor', decorId: 'than_tai' }], mapFor);
  assert.ok(plant.save?.storeLayout.decorOwned?.includes('than_tai'), 'buy_decor đi qua batch layout');
  assert.equal(decorAttraction(['bien_led', 'than_tai'], []), 45, 'Thu hút = 20 + 25');
  assert.equal(decorAttraction(['bien_led', 'than_tai', 'day_den', 'lich_treo', 'may_quat'], Array.from({ length: 10 }, () => ({ type: 'decor', shopId: 'than_tai' }) as never)), 100, 'Thu hút tối đa 100');
  assert.equal(decorTrafficMultiplier(100), 1.25, 'Tối đa +25% khách');
}
