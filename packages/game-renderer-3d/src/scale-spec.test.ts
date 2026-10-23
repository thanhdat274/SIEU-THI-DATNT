import assert from 'node:assert/strict';
import {
  DOOR_HEIGHT_D,
  SCALE_TARGETS,
  calculateUniformScale,
  resolveTreeHeightForId,
} from './scale-spec';

// 1. Kiểm tra mốc chuẩn D = 1.6
assert.equal(DOOR_HEIGHT_D, 1.6);
assert.equal(SCALE_TARGETS.door, 1.6);

// 2. Kiểm tra các tỉ lệ mục tiêu theo D
assert.equal(SCALE_TARGETS.adultPlayer, 0.80 * 1.6); // 1.28
assert.equal(SCALE_TARGETS.motorbike.length, 0.95 * 1.6); // 1.52
assert.equal(SCALE_TARGETS.motorbike.height, 0.55 * 1.6); // 0.88
assert.equal(SCALE_TARGETS.motorbike.riderHeadY, 0.95 * 1.6); // 1.52
assert.equal(SCALE_TARGETS.car.sedan.length, 2.0 * 1.6); // 3.20
assert.equal(SCALE_TARGETS.car.sedan.height, 0.75 * 1.6); // 1.20
assert.equal(SCALE_TARGETS.car.truck.length, 2.6 * 1.6); // 4.16
assert.equal(SCALE_TARGETS.streetLamp, 1.7 * 1.6); // 2.72
assert.equal(SCALE_TARGETS.treeMin, 1.5 * 1.6); // 2.40
assert.equal(SCALE_TARGETS.treeMax, 2.2 * 1.6); // 3.52
assert.equal(SCALE_TARGETS.fixtures.gondola, 0.75 * 1.6); // 1.20
assert.equal(SCALE_TARGETS.fixtures.warehouseRack, 1.1 * 1.6); // 1.76
assert.equal(SCALE_TARGETS.fixtures.counter, 0.45 * 1.6); // 0.72
assert.equal(SCALE_TARGETS.fixtures.fridge, 0.90 * 1.6); // 1.44

// 3. Test thuần hàm calculateUniformScale (input bbox -> output scale)
{
  const originalMesh = { width: 0.767, height: 0.67, length: 0.35 };
  // Khớp theo height = 1.28
  const scaleHeight = calculateUniformScale(originalMesh, 1.28, 'height');
  assert.ok(Math.abs(scaleHeight - 1.28 / 0.67) < 1e-6);

  // Khớp theo length = 3.20
  const carMesh = { width: 1.50, height: 1.30, length: 2.55 };
  const scaleLength = calculateUniformScale(carMesh, 3.20, 'length');
  assert.ok(Math.abs(scaleLength - 3.20 / 2.55) < 1e-6);

  // Bảo vệ biên <= 0
  assert.equal(calculateUniformScale({ width: 0, height: 0, length: 0 }, 1.28), 1.0);
}

// 4. Test khẳng định các quan hệ thứ tự (Yêu cầu 5 của đề bài):
// - kệ gondola < người < cửa < đèn đường
assert.ok(
  SCALE_TARGETS.fixtures.gondola < SCALE_TARGETS.adultPlayer,
  'Kệ gondola (1.20) < người lớn (1.28)'
);
assert.ok(
  SCALE_TARGETS.adultPlayer < SCALE_TARGETS.door,
  'Người lớn (1.28) < cửa tiệm D (1.60)'
);
assert.ok(
  SCALE_TARGETS.door < SCALE_TARGETS.streetLamp,
  'Cửa tiệm D (1.60) < đèn đường (2.72)'
);

// - xe máy dài < sedan dài < xe tải dài
assert.ok(
  SCALE_TARGETS.motorbike.length < SCALE_TARGETS.car.sedan.length,
  'Xe máy dài (1.52) < sedan dài (3.20)'
);
assert.ok(
  SCALE_TARGETS.car.sedan.length < SCALE_TARGETS.car.truck.length,
  'Sedan dài (3.20) < xe tải dài (4.16)'
);

// - người lái xe máy cao hơn xe máy
assert.ok(
  SCALE_TARGETS.motorbike.riderHeadY > SCALE_TARGETS.motorbike.height,
  'Người lái xe máy (1.52) > thân xe máy (0.88)'
);

// 5. Chiều cao cây ngẫu nhiên ổn định trong khoảng [treeMin, treeMax]
for (let i = 0; i < 20; i++) {
  const h = resolveTreeHeightForId(`tree_${i}`);
  assert.ok(h >= SCALE_TARGETS.treeMin && h <= SCALE_TARGETS.treeMax, 'Chiều cao cây nằm trong dải [2.40, 3.52]');
}

console.log('PASS scale-spec: thứ tự kích thước chuẩn, hàm uniform scale, dải cây ổn định');
