import assert from 'node:assert/strict';
import { STORE_FRONT_CROSSWALK } from '@game/data';
import { TILE_SIZE } from '@game/shared';
import {
  SIGNAL_OFF,
  SIGNAL_RED,
  SIGNAL_YELLOW,
  SIGNAL_GREEN,
  vehicleLampColors,
  pedestrianLampColors,
  intersectionPolePixelPositions,
  crosswalkBarRects,
  storeFrontPolePixel,
  hexToColor3,
} from './signals-data';

// 1. Kiểm tra quy đổi màu đèn xe
{
  const red = vehicleLampColors('red');
  assert.equal(red.red, SIGNAL_RED);
  assert.equal(red.yellow, SIGNAL_OFF);
  assert.equal(red.green, SIGNAL_OFF);

  const yellow = vehicleLampColors('yellow');
  assert.equal(yellow.red, SIGNAL_OFF);
  assert.equal(yellow.yellow, SIGNAL_YELLOW);
  assert.equal(yellow.green, SIGNAL_OFF);

  const green = vehicleLampColors('green');
  assert.equal(green.red, SIGNAL_OFF);
  assert.equal(green.yellow, SIGNAL_OFF);
  assert.equal(green.green, SIGNAL_GREEN);
}

// 2. Kiểm tra quy đổi màu đèn đi bộ
{
  const dontWalk = pedestrianLampColors('dont_walk', false);
  assert.equal(dontWalk.stop, SIGNAL_RED);
  assert.equal(dontWalk.walk, SIGNAL_OFF);

  const walk = pedestrianLampColors('walk', false);
  assert.equal(walk.stop, SIGNAL_OFF);
  assert.equal(walk.walk, SIGNAL_GREEN);

  const clearingBlinkOn = pedestrianLampColors('clearing', true);
  assert.equal(clearingBlinkOn.stop, SIGNAL_RED);
  assert.equal(clearingBlinkOn.walk, SIGNAL_OFF);

  const clearingBlinkOff = pedestrianLampColors('clearing', false);
  assert.equal(clearingBlinkOff.stop, SIGNAL_OFF);
  assert.equal(clearingBlinkOff.walk, SIGNAL_OFF);
}

// 3. Kiểm tra quy đổi vạch qua đường thành hình chữ nhật trên mặt đất
{
  const cw = STORE_FRONT_CROSSWALK;
  const rects = crosswalkBarRects(cw);
  assert.equal(rects.length, 8, '8 thanh kẻ vạch');
  for (const r of rects) {
    assert.equal(r.width, (cw.x1 - cw.x0) / TILE_SIZE, 'chiều rộng vạch chuẩn theo TILE_SIZE');
    assert.equal(r.depth, 5 / TILE_SIZE, 'chiều dày 5px theo TILE_SIZE');
    assert.ok(r.x0 >= cw.x0 / TILE_SIZE);
    assert.ok(r.x1 <= cw.x1 / TILE_SIZE);
    assert.ok(r.z0 >= cw.nearY / TILE_SIZE);
    assert.ok(r.z1 <= cw.farY / TILE_SIZE);
    assert.ok(r.centerZ > r.z0 && r.centerZ < r.z1);
  }
  // Khoảng cách giữa các vạch là (5 + 7) = 12 px = 12 / 32
  const step = rects[1].z0 - rects[0].z0;
  assert.ok(Math.abs(step - 12 / TILE_SIZE) < 1e-6);
}

// 4. Kiểm tra vị trí cột ngã tư và cột đèn trước tiệm
{
  const dummyIx = {
    id: 'test-ix',
    crossLeft: -256,
    crossRight: -96,
    roadBottom: 512,
  };
  const poles = intersectionPolePixelPositions(dummyIx, 13);
  assert.equal(poles.length, 4);
  assert.equal(poles[0].x, -256 + 16);
  assert.equal(poles[0].y, 512 + 24);
  assert.equal(poles[1].x, -96 - 16);
  assert.equal(poles[1].y, (13 - 1) * 32 + 28);

  const frontPole = storeFrontPolePixel(STORE_FRONT_CROSSWALK);
  assert.equal(frontPole.x, STORE_FRONT_CROSSWALK.x1 - 22);
  assert.equal(frontPole.y, STORE_FRONT_CROSSWALK.farY + 6);
}

// 5. hexToColor3
{
  const c = hexToColor3(SIGNAL_RED);
  assert.ok(Math.abs(c.r - 0xe0 / 255) < 1e-4);
  assert.ok(Math.abs(c.g - 0x53 / 255) < 1e-4);
  assert.ok(Math.abs(c.b - 0x3f / 255) < 1e-4);
}

console.log('PASS signals-data: quy đổi tín hiệu đèn và vạch qua đường thành hình học 3D');
