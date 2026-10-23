import assert from 'node:assert/strict';
import {
  CHARACTER_CATALOG,
  CHARACTER_MODELS,
  TARGET_CHARACTER_HEIGHT,
  characterModelForDelivery,
  characterModelForId,
  characterModelForPartner,
  characterModelForPlayer,
  shouldHaveNonLa,
  stepYawTowards,
  targetYawFromMovement,
} from './character-models';
import { SCALE_TARGETS } from './scale-spec';

// 1. Kiểm tra 12 model catalog
assert.equal(CHARACTER_MODELS.length, 12);
assert.equal(TARGET_CHARACTER_HEIGHT, SCALE_TARGETS.adultPlayer); // 1.28

for (const k of CHARACTER_MODELS) {
  const spec = CHARACTER_CATALOG[k];
  assert.ok(spec, `Catalog phải có model ${k}`);
  assert.equal(spec.targetHeight, TARGET_CHARACTER_HEIGHT);
  assert.ok(spec.scale > 1.4 && spec.scale < 2.2, `Scale ${k} (${spec.scale}) nằm trong khoảng chuẩn`);
  assert.ok(Math.abs(spec.rawHeight * spec.scale - TARGET_CHARACTER_HEIGHT) < 0.01, 'Sau khi scale phải đạt đúng chiều cao mục tiêu');
}

// 2. Gán cố định người chơi, bạn co-op và nhân viên giao hàng
assert.equal(characterModelForPlayer(), 'character_female_a');
assert.equal(characterModelForPartner(), 'character_male_a');
assert.equal(characterModelForDelivery(), 'character_male_c');

// 3. Phân bổ ổn định theo id và seed
const idA = 'customer_123';
assert.equal(characterModelForId(idA, 42), characterModelForId(idA, 42));
assert.equal(characterModelForId(idA, 99), characterModelForId(idA, 99));

// 4. atan2 góc xoay hướng di chuyển
// Đi sang Nam (+Z): dx = 0, dz = 1 -> atan2(0, 1) = 0
assert.ok(Math.abs(targetYawFromMovement(0, 1, 0) - 0) < 1e-4);
// Đi sang Bắc (-Z): dx = 0, dz = -1 -> atan2(0, -1) = PI hoặc -PI
assert.ok(Math.abs(Math.abs(targetYawFromMovement(0, -1, 0)) - Math.PI) < 1e-4);
// Đi sang Đông (+X): dx = 1, dz = 0 -> atan2(1, 0) = PI/2
assert.ok(Math.abs(targetYawFromMovement(1, 0, 0) - Math.PI / 2) < 1e-4);
// Đi sang Tây (-X): dx = -1, dz = 0 -> atan2(-1, 0) = -PI/2
assert.ok(Math.abs(targetYawFromMovement(-1, 0, 0) - -Math.PI / 2) < 1e-4);

// 5. Nội suy mượt stepYawTowards
const yaw1 = stepYawTowards(0, Math.PI / 2, 0.016, 10);
assert.ok(yaw1 > 0 && yaw1 <= Math.PI / 2, 'Góc quay tiến dần về đích');
const yawArrived = stepYawTowards(0, 0.05, 0.016, 10);
assert.equal(yawArrived, 0.05, 'Bước đủ lớn thì tới thẳng đích');

// 6. Nón lá
assert.equal(shouldHaveNonLa('vendor_1', 'cart'), true);
assert.equal(shouldHaveNonLa('vendor_2', 'street_vendor'), true);

console.log('PASS character-models: catalog 12 model ~1.28m, gán cố định player/partner, atan2 mượt, nón lá');
