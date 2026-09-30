import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import type { GameAvatar } from '@game/shared';
import { WorldAvatarController } from './avatars';

export function runAvatarTests() {
  const start = { ...DEFAULT_INITIAL_SAVE.player.position };
  const avatars: GameAvatar[] = [
    { accountId: 'a', position: start, direction: 'down', updatedAt: '2026-09-30T00:00:00.000Z' },
    { accountId: 'b', position: { x: start.x + 50, y: start.y }, direction: 'down', updatedAt: '2026-09-30T00:00:00.000Z' },
  ];
  const controller = new WorldAvatarController(avatars, generateStarterTileMap(), DEFAULT_INITIAL_SAVE.storeLayout.fixtures);
  const first = controller.applyInput({ accountId: 'a', sequence: 1, direction: { x: 1, y: 0 } }, 1000)!;
  assert.ok(first.position.x > start.x);
  assert.equal(first.direction, 'right');
  const secondPosition = controller.getAvatar('b')!.position;
  const second = controller.applyInput({ accountId: 'a', sequence: 2, direction: { x: 1, y: 0 } }, 1050)!;
  assert.ok(second.position.x - first.position.x <= 6.501);
  assert.deepEqual(controller.getAvatar('b')!.position, secondPosition);
  assert.equal(controller.applyInput({ accountId: 'a', sequence: 2, direction: { x: 0, y: 1 } }, 1060), null);
  assert.equal(controller.applyInput({ accountId: 'unknown', sequence: 1, direction: { x: 1, y: 0 } }, 1060), null);
  assert.equal(controller.applyInput({ accountId: 'b', sequence: 1, direction: { x: 2, y: 0 } }, 1000), null);
  assert.equal(controller.applyInput({ accountId: 'b', sequence: 1, direction: { x: Number.NaN, y: 0 } }, 1000), null);
  assert.equal(controller.applyInput({ accountId: 'a', sequence: 3, direction: { x: 0, y: 1 } }, 1400), null);
  assert.equal(controller.isWithinInteractionRange('unknown', DEFAULT_INITIAL_SAVE.storeLayout.fixtures[0]), false);
  assert.equal(controller.isWithinInteractionRange('a', DEFAULT_INITIAL_SAVE.storeLayout.fixtures[0]), false);
  assert.equal(controller.getAvatar('unknown'), null);
  console.log('✓ Avatar movement is sequenced, bounded, collision-aware, and isolated by account.');
}
