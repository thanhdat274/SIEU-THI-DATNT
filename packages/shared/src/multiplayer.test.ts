import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE } from '@game/data';
import {
  isBusinessState, isGameAccount, isGameAvatar, isGameCommand, isGameSnapshot, isGameWorld,
  MULTIPLAYER_PROTOCOL_VERSION, type BusinessState, type GameCommand, type GameSnapshot,
  type GameWorld,
} from './index';
import { createInitialOnlineWorld } from '@game/data';

export function runMultiplayerSchemaTests() {
  const business: BusinessState = { id: 'business-a', ownerAccountIds: ['user-a'], save: structuredClone(DEFAULT_INITIAL_SAVE) };
  const world: GameWorld = {
    id: 'world-a', schemaVersion: 1, protocolVersion: MULTIPLAYER_PROTOCOL_VERSION, revision: 0,
    createdAt: '2026-09-30T00:00:00.000Z', updatedAt: '2026-09-30T00:00:00.000Z',
    worldTime: structuredClone(DEFAULT_INITIAL_SAVE.worldTime),
    memberships: [{ accountId: 'user-a', role: 'owner', joinedAt: '2026-09-30T00:00:00.000Z', lastSeenRevision: 0 }],
    businessIds: [business.id],
    avatars: [{ accountId: 'user-a', position: { x: 100, y: 120 }, direction: 'down', updatedAt: '2026-09-30T00:00:00.000Z' }],
  };
  const command: GameCommand = {
    protocolVersion: 1, worldId: world.id, businessId: business.id, commandId: 'cmd-a', expectedRevision: 0,
    payload: { type: 'restock', fixtureId: 'fixture-a', productId: 'product-a', quantity: 2 },
  };
  const snapshot: GameSnapshot = { protocolVersion: 1, world, businesses: [business], serverTime: '2026-09-30T00:00:00.000Z' };

  assert.equal(isGameAccount({ id: 'user-a', displayName: 'Player', photoUrl: null, createdAt: '2026-09-30T00:00:00Z' }), true);
  assert.equal(isGameAccount({ id: '', displayName: 'Player', photoUrl: null, createdAt: 'no-date' }), false);
  assert.equal(isGameAvatar(world.avatars[0]), true);
  assert.equal(isGameWorld(world), true);
  assert.equal(isBusinessState(business), true);
  assert.equal(isGameCommand(command), true);
  assert.equal(isGameSnapshot(JSON.parse(JSON.stringify(snapshot))), true);
  assert.equal(isGameCommand({ ...command, payload: { ...command.payload, quantity: 0 } }), false);
  assert.equal(isGameCommand({ ...command, protocolVersion: 2 }), false);
  assert.equal(isBusinessState({ ...business, save: { ...business.save, player: { ...business.save.player, money: -1 } } }), false);
  assert.equal(isGameWorld({ ...world, businessIds: ['another-business'] }), true); // Membership is checked against the snapshot.
  assert.equal(isGameSnapshot({ ...snapshot, world: { ...world, businessIds: ['another-business'] } }), false);
  assert.equal(isGameWorld({ ...world, memberships: [...world.memberships, world.memberships[0]] }), false);
  assert.equal(isGameWorld({ ...world, avatars: [{ ...world.avatars[0], accountId: 'stranger' }] }), false);

  const existingLocal = structuredClone(DEFAULT_INITIAL_SAVE);
  existingLocal.player.money = 9_999;
  existingLocal.player.experience = 42;
  const online = createInitialOnlineWorld({ id: 'owner-new', displayName: 'Chủ tiệm', photoUrl: null }, 'world-new', '2026-09-30T00:00:00.000Z');
  assert.equal(online.business.save.player.money, DEFAULT_INITIAL_SAVE.player.money);
  assert.equal(online.business.save.player.experience, DEFAULT_INITIAL_SAVE.player.experience);
  assert.equal(existingLocal.player.money, 9_999);
  assert.equal(existingLocal.player.experience, 42);
  assert.equal(isBusinessState(online.business), true);
  assert.equal(isGameWorld(online.world), true);
}
