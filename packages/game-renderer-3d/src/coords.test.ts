import assert from 'node:assert/strict';
import { TILE_SIZE } from '@game/shared';
import { isoAlpha, pixelToWorld, snapTo, stepZoom, tileCenter, worldToTile, ZOOM_LEVELS } from './coords';

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

assert.equal(snapTo(1.26, 0.25), 1.25);
assert.equal(snapTo(1.26, 0), 1.26);

console.log('PASS coords: quy đổi ô/pixel/thế giới, bậc zoom, góc iso, khóa pixel');
