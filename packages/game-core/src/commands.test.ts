import assert from 'node:assert/strict';
import { GameCommandCoordinator } from './commands';
import type { GameCommand } from '@game/shared';

export async function runCommandTests() {
  const coordinator = new GameCommandCoordinator('world-a', new Set(['business-a']), ['owner', 'member']);
  let count = 0;
  const command: GameCommand = {
    protocolVersion: 1, worldId: 'world-a', businessId: 'business-a', commandId: 'same-id', expectedRevision: 0,
    payload: { type: 'restock', fixtureId: 'shelf-a', productId: 'item-a', quantity: 2 },
  };
  const first = await coordinator.submit('owner', command, async () => { count++; return true; });
  const retry = await coordinator.submit('owner', command, async () => { count++; return true; });
  assert.equal(first.status, 'accepted');
  assert.equal(retry.status, 'accepted');
  assert.equal(count, 1);
  assert.equal(coordinator.getRevision(), 1);

  const conflict = await coordinator.submit('owner', { ...command, payload: { ...command.payload, quantity: 3 } }, () => true);
  assert.equal(conflict.status, 'duplicate_conflict');
  const stale = await coordinator.submit('member', { ...command, commandId: 'stale', expectedRevision: 0 }, () => true);
  assert.equal(stale.status, 'stale');
  const foreignWorld = await coordinator.submit('member', { ...command, commandId: 'foreign', expectedRevision: 1, worldId: 'world-b' }, () => true);
  assert.equal(foreignWorld.status, 'forbidden');
  const foreignBusiness = await coordinator.submit('member', { ...command, commandId: 'foreign-business', expectedRevision: 1, businessId: 'business-b' }, () => true);
  assert.equal(foreignBusiness.status, 'forbidden');
  const outsider = await coordinator.submit('stranger', { ...command, commandId: 'outsider', expectedRevision: 1 }, () => true);
  assert.equal(outsider.status, 'forbidden');
  const malformed = await coordinator.submit('owner', { ...command, commandId: 'bad', expectedRevision: 1, payload: { type: 'restock', fixtureId: '', productId: 'x', quantity: -1 } }, () => true);
  assert.equal(malformed.status, 'invalid');

  const concurrentCoordinator = new GameCommandCoordinator('world-c', new Set(['business-c']), ['a', 'b']);
  let concurrentCommits = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const attempt = (actorId: string, commandId: string) => concurrentCoordinator.submit(actorId, {
    ...command, worldId: 'world-c', businessId: 'business-c', commandId, expectedRevision: 0,
  }, async () => { concurrentCommits++; await barrier; return true; });
  const pendingA = attempt('a', 'cmd-a');
  const pendingB = attempt('b', 'cmd-b');
  release();
  const [resultA, resultB] = await Promise.all([pendingA, pendingB]);
  assert.equal(concurrentCommits, 1);
  assert.deepEqual(new Set([resultA.status, resultB.status]), new Set(['accepted', 'stale']));

  // Test: Concurrent two actors transferring the last item in stock
  const transferCoordinator = new GameCommandCoordinator('world-d', new Set(['business-d']), ['actor-1', 'actor-2']);
  let sharedInventoryStock = 1;
  let shelfStock = 0;

  const restockAttempt = async (actorId: string, commandId: string, revision: number) => {
    return transferCoordinator.submit(actorId, {
      protocolVersion: 1,
      worldId: 'world-d',
      businessId: 'business-d',
      commandId,
      expectedRevision: revision,
      payload: { type: 'restock', fixtureId: 'shelf-1', productId: 'item-1', quantity: 1 },
    }, () => {
      if (sharedInventoryStock < 1) {
        return { accepted: false, actualQuantity: 0, reason: 'no_inventory' };
      }
      sharedInventoryStock -= 1;
      shelfStock += 1;
      return { accepted: true, actualQuantity: 1, reason: 'success' };
    });
  };

  const res1 = await restockAttempt('actor-1', 'cmd-restock-1', 0);
  assert.equal(res1.status, 'accepted');
  assert.equal(res1.actualQuantity, 1);
  assert.equal(sharedInventoryStock, 0);
  assert.equal(shelfStock, 1);

  // Actor 2 tries with updated revision 1, but stock is now 0
  const res2 = await restockAttempt('actor-2', 'cmd-restock-2', 1);
  assert.equal(res2.status, 'rejected');
  assert.equal(res2.actualQuantity, 0);
  assert.equal(res2.reason, 'no_inventory');
  assert.equal(sharedInventoryStock, 0, 'Inventory stock never drops below 0');
  assert.equal(shelfStock, 1, 'Shelf never receives duplicated items');

  console.log('✓ Game commands serialize, scope-check, revision-check, and replay receipts idempotently.');
  console.log('✓ Concurrent two-actor transfer for last item prevents negative inventory and duplicate stock.');
}
