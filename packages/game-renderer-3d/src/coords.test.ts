import assert from 'node:assert/strict';
import { TILE_SIZE } from '@game/shared';
import { directionFromDelta, facingForCamera, facingFromMovement, npcFrameKey, walkerLookFor, isoAlpha, pixelToWorld, snapTo, stepZoom, tileCenter, worldToTile, ZOOM_LEVELS } from './coords';

assert.deepEqual(tileCenter(3, 4), { x: 3.5, z: 4.5 });
assert.deepEqual(pixelToWorld(TILE_SIZE * 2, TILE_SIZE * 5), { x: 2, z: 5 });
assert.deepEqual(worldToTile(2.99, -0.01), { x: 2, y: -1 });

// Zoom theo bậc, kẹp ở hai đầu.
assert.equal(stepZoom(2, 1), 3);
assert.equal(stepZoom(2, -1), 1.5);
assert.equal(stepZoom(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], 1), ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
assert.equal(stepZoom(ZOOM_LEVELS[0], -1), ZOOM_LEVELS[0]);

// Xoay 4 hướng: quay vòng, mỗi bước 90°.
assert.equal(isoAlpha(4), isoAlpha(0));
assert.equal(isoAlpha(-1), isoAlpha(3));
assert.ok(Math.abs(isoAlpha(0) - isoAlpha(1) - Math.PI / 2) < 1e-9);
// Quarter 0 là góc chéo 45° (cam đông-nam), mỗi quarter lệch 90°.
assert.ok(Math.abs(isoAlpha(0) - Math.PI / 4) < 1e-9);
assert.ok(Math.abs(isoAlpha(1) + Math.PI / 4) < 1e-9);

assert.equal(snapTo(1.26, 0.25), 1.25);
assert.equal(snapTo(1.26, 0), 1.26);

// Hướng quay của sprite theo góc nhìn camera chéo 45° (facingForCamera): chọn hướng màn hình gần nhất,
// tie ưu tiên trái/phải. Bảng 4 quarter × 4 hướng.
// Quarter 0 (cam đông-nam): east→phải, west→trái, south→trái, north→phải.
assert.equal(facingForCamera('up', 0), 'right');
assert.equal(facingForCamera('down', 0), 'left');
assert.equal(facingForCamera('left', 0), 'left');
assert.equal(facingForCamera('right', 0), 'right');

// Quarter 1 (cam đông-bắc).
assert.equal(facingForCamera('up', 1), 'right');
assert.equal(facingForCamera('down', 1), 'left');
assert.equal(facingForCamera('left', 1), 'right');
assert.equal(facingForCamera('right', 1), 'left');

// Quarter 2 (cam tây-bắc).
assert.equal(facingForCamera('up', 2), 'left');
assert.equal(facingForCamera('down', 2), 'right');
assert.equal(facingForCamera('left', 2), 'right');
assert.equal(facingForCamera('right', 2), 'left');

// Quarter 3 (cam tây-nam).
assert.equal(facingForCamera('up', 3), 'left');
assert.equal(facingForCamera('down', 3), 'right');
assert.equal(facingForCamera('left', 3), 'left');
assert.equal(facingForCamera('right', 3), 'right');

// Vòng lặp quarter âm và vượt 3
assert.equal(facingForCamera('up', 4), facingForCamera('up', 0));
assert.equal(facingForCamera('up', -1), facingForCamera('up', 3));

// facingFromMovement: vector di chuyển diagonal trên bản đồ (từ WASD khi camera chéo 45°) → hướng màn hình đúng
// (quarter 0): W lên, S xuống, A trái, D phải.
assert.equal(facingFromMovement(-1, -1, 0), 'up');
assert.equal(facingFromMovement(1, 1, 0), 'down');
assert.equal(facingFromMovement(-1, 1, 0), 'left');
assert.equal(facingFromMovement(1, -1, 0), 'right');

// Hướng đi của đám đông theo độ dời; đứng yên giữ hướng cũ
assert.equal(directionFromDelta(3, 1, 'up'), 'right');
assert.equal(directionFromDelta(-3, 1, 'up'), 'left');
assert.equal(directionFromDelta(1, 3, 'up'), 'down');
assert.equal(directionFromDelta(1, -3, 'down'), 'up');
assert.equal(directionFromDelta(0, 0.005, 'left'), 'left');

// Kiểu đi bộ: đủ atlas → 9 kiểu bỏ npc_1; thiếu → 3 kiểu vẽ code (giống walkerLook của Pixi)
const full = (k: string) => /^npc_[0-9]_down_idle_0$/.test(k);
assert.deepEqual([0, 1, 2, 8, 9].map(i => walkerLookFor(full, i)), [0, 2, 3, 9, 0]);
assert.equal(walkerLookFor((k) => k === 'npc_8_down_idle_0', 8), 0);
assert.equal(walkerLookFor(() => false, 4), 1);
assert.equal(npcFrameKey(6, 'left', true, 2), 'npc_6_left_walk_2');
assert.equal(npcFrameKey(0, 'down', false, 1), 'npc_0_down_idle_1');

console.log('PASS coords: quy đổi ô/pixel/thế giới, bậc zoom, góc iso, khóa pixel, hướng sprite theo camera');

import './overlay-3d.test';
import './tile-target.test';

import './roof-fade.test';
import './fixture-shapes.test';
