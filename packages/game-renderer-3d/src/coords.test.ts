import assert from 'node:assert/strict';
import { TILE_SIZE } from '@game/shared';
import { CAMERA_BETA, CAMERA_FOV, billboardCenter, cameraUp, groundViewRadius, snapGround, zoomHalfHeight, zoomRadius, directionFromDelta, facingForCamera, facingFromMovement, npcFrameKey, walkerLookFor, isoAlpha, pixelToWorld, snapTo, stepZoom, tileCenter, worldToTile, ZOOM_LEVELS } from './coords';

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
// Quarter 0: camera ở +Z nhìn về -Z (nhìn thẳng từ phía nam); mỗi quarter lệch 90°.
assert.ok(Math.abs(isoAlpha(0) - Math.PI / 2) < 1e-9);
assert.ok(Math.abs(isoAlpha(1)) < 1e-9);

// Bán kính zoom: khung nhìn tại tâm cao đúng bằng ortho cũ (2 * r * tan(fov/2) = ZOOM_BASE_TILES / zoom).
for (const z of ZOOM_LEVELS) {
  assert.ok(Math.abs(2 * zoomRadius(z) * Math.tan(CAMERA_FOV / 2) - 32 / z) < 1e-9, `zoom ${z}`);
  assert.ok(Math.abs(zoomHalfHeight(z) - 16 / z) < 1e-9);
}
assert.ok(zoomRadius(1) > zoomRadius(2), 'zoom lớn → camera gần hơn');

// Vector lên của camera: đơn vị, ở quarter 0 chỉ về phía -Z (bắc) và lên trời; sprite đặt đúng chân.
{
  const u = cameraUp(isoAlpha(0), CAMERA_BETA);
  assert.ok(Math.abs(Math.hypot(u.x, u.y, u.z) - 1) < 1e-9);
  assert.ok(Math.abs(u.x) < 1e-9 && u.z < 0 && u.y > 0);
  const c = billboardCenter(5, 7, 2, isoAlpha(0), CAMERA_BETA);
  // Mép dưới của quad (tâm - (H/2)·up) trùng chân (5, 0, 7).
  assert.ok(Math.abs(c.x - u.x - 5) < 1e-9 && Math.abs(c.y - u.y) < 1e-9 && Math.abs(c.z - u.z - 7) < 1e-9);
}

// Bán kính vùng nhìn mặt đất lớn hơn nửa chiều cao khung và tăng khi zoom ra.
assert.ok(groundViewRadius(2, 16 / 9, CAMERA_BETA) > zoomHalfHeight(2));
assert.ok(groundViewRadius(1, 16 / 9, CAMERA_BETA) > groundViewRadius(4, 16 / 9, CAMERA_BETA));

// Khóa lưới: kết quả nằm trên lưới (phải = step, xuống = step / sinβ) ở mọi quarter.
for (let q = 0; q < 4; q++) {
  const a = isoAlpha(q);
  const r = snapGround(10.123, 20.456, a, CAMERA_BETA, 0.05);
  const sr = r.x * Math.sin(a) - r.z * Math.cos(a);
  const sd = r.x * Math.cos(a) + r.z * Math.sin(a);
  assert.ok(Math.abs(sr / 0.05 - Math.round(sr / 0.05)) < 1e-6, `phải q${q}`);
  assert.ok(Math.abs(sd * Math.sin(CAMERA_BETA) / 0.05 - Math.round(sd * Math.sin(CAMERA_BETA) / 0.05)) < 1e-6, `xuống q${q}`);
  assert.ok(Math.hypot(r.x - 10.123, r.z - 20.456) < 0.1);
}

assert.equal(snapTo(1.26, 0.25), 1.25);
assert.equal(snapTo(1.26, 0), 1.26);

// Hướng quay của sprite theo góc nhìn camera (facingForCamera): chọn hướng màn hình gần nhất. Bảng 4 quarter × 4 hướng.
// Quarter 0 (camera ở nam): hướng màn hình = hướng bản đồ.
assert.equal(facingForCamera('up', 0), 'up');
assert.equal(facingForCamera('down', 0), 'down');
assert.equal(facingForCamera('left', 0), 'left');
assert.equal(facingForCamera('right', 0), 'right');

// Quarter 1 (camera ở đông): phải màn hình = bắc.
assert.equal(facingForCamera('up', 1), 'right');
assert.equal(facingForCamera('down', 1), 'left');
assert.equal(facingForCamera('left', 1), 'up');
assert.equal(facingForCamera('right', 1), 'down');

// Quarter 2 (camera ở bắc): đảo hoàn toàn.
assert.equal(facingForCamera('up', 2), 'down');
assert.equal(facingForCamera('down', 2), 'up');
assert.equal(facingForCamera('left', 2), 'right');
assert.equal(facingForCamera('right', 2), 'left');

// Quarter 3 (camera ở tây): phải màn hình = nam.
assert.equal(facingForCamera('up', 3), 'left');
assert.equal(facingForCamera('down', 3), 'right');
assert.equal(facingForCamera('left', 3), 'down');
assert.equal(facingForCamera('right', 3), 'up');

// Vòng lặp quarter âm và vượt 3
assert.equal(facingForCamera('up', 4), facingForCamera('up', 0));
assert.equal(facingForCamera('up', -1), facingForCamera('up', 3));

// facingFromMovement: vector đi trên bản đồ → hướng màn hình. Quarter 0: trùng hướng bản đồ; đường chéo ưu tiên trái/phải.
assert.equal(facingFromMovement(0, -1, 0), 'up');
assert.equal(facingFromMovement(0, 1, 0), 'down');
assert.equal(facingFromMovement(-1, 0, 0), 'left');
assert.equal(facingFromMovement(1, 0, 0), 'right');
assert.equal(facingFromMovement(1, -1, 0), 'right');
assert.equal(facingFromMovement(-1, 1, 0), 'left');

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
import './shelf-stock.test';
import './sign-plane.test';
