import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { applyStoreLayoutActions, buyLandPlot, moveStoreFixture, rotateStoreFixture, storeFixture, retrieveStoreFixture, validateStoreLayout } from './store-layout';

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
}
