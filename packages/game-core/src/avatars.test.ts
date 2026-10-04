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

  // Co-op: avatar do server điều khiển dùng cùng va chạm người chơi nên cũng đi ra khỏi bản đồ ô, và bị nhà chặn như người chơi.
  {
    const sidewalk = { x: 1.5 * 32, y: 12.5 * 32 };
    const ctl = new WorldAvatarController([
      { accountId: 'host', position: { ...sidewalk }, direction: 'left', updatedAt: '2026-10-04T00:00:00.000Z' },
      { accountId: 'guest', position: { x: 11.5 * 32, y: 12.5 * 32 }, direction: 'left', updatedAt: '2026-10-04T00:00:00.000Z' },
    ], generateStarterTileMap(), DEFAULT_INITIAL_SAVE.storeLayout.fixtures);
    let t = 1000;
    for (let seq = 1; seq <= 120; seq++) { t += 50; ctl.applyInput({ accountId: 'host', sequence: seq, direction: { x: -1, y: 0 } }, t); }
    assert.ok(ctl.getAvatar('host')!.position.x < -200, 'Avatar co-op đi ra khỏi bản đồ ô qua vỉa hè');
    assert.ok(ctl.getAvatar('guest')!.position.x > 11 * 32, 'Avatar kia không bị ảnh hưởng');
    const south = new WorldAvatarController([{ accountId: 'g', position: { x: 60, y: 12.5 * 32 }, direction: 'down', updatedAt: '2026-10-04T00:00:00.000Z' }], generateStarterTileMap(), DEFAULT_INITIAL_SAVE.storeLayout.fixtures);
    t = 1000;
    for (let seq = 1; seq <= 300; seq++) { t += 50; south.applyInput({ accountId: 'g', sequence: seq, direction: { x: 0, y: 1 } }, t); }
    const y = south.getAvatar('g')!.position.y;
    assert.ok(y > 16 * 32 && y < 21 * 32, `Avatar co-op đi qua đường rồi bị tường nhà phía nam chặn (y=${Math.round(y)})`);
  }
  console.log('✓ Avatar movement is sequenced, bounded, collision-aware, and isolated by account.');
}
