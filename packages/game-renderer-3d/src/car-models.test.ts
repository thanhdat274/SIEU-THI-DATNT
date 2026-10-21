import assert from 'node:assert/strict';
import {
  CAR_CATALOG,
  CAR_MODELS,
  resolveCarModelForStreetVehicle,
  resolveCarModelForLogisticsTruck,
  vehicleYawFromMovement,
  motorbikeColorForVariant,
  MOTORBIKE_COLORS,
} from './car-models';
import { SCALE_TARGETS } from './scale-spec';

// 1. Catalog kiểm tra đủ 8 model car-kit
assert.equal(CAR_MODELS.length, 8);
for (const k of CAR_MODELS) {
  const spec = CAR_CATALOG[k];
  assert.ok(spec, `Catalog phải có spec cho ${k}`);
  assert.ok(spec.url.endsWith('.glb'), 'URL model glb hợp lệ');
  assert.ok(spec.scale > 0.8 && spec.scale < 1.6, `Scale ${k} (${spec.scale}) nằm trong phạm vi chuẩn`);
  assert.ok(spec.headlightOffset.z > 0, 'Đèn trước ở phía +Z');
  assert.ok(spec.taillightOffset.z < 0, 'Đèn sau ở phía -Z');
}

// Chiều cao sedan khớp target 0.75 * D = 1.20
assert.ok(Math.abs(CAR_CATALOG.car_sedan.rawHeight * CAR_CATALOG.car_sedan.scale - SCALE_TARGETS.car.sedan.height) < 0.01);

// Chiều cao truck/delivery khớp target 1.20 * D = 1.92
assert.ok(Math.abs(CAR_CATALOG.car_delivery.rawHeight * CAR_CATALOG.car_delivery.scale - SCALE_TARGETS.car.delivery.height) < 0.01);
assert.ok(Math.abs(CAR_CATALOG.car_truck.rawHeight * CAR_CATALOG.car_truck.scale - SCALE_TARGETS.car.truck.height) < 0.01);

// 2. Ánh xạ xe chạy trên đường
assert.equal(resolveCarModelForStreetVehicle('car', 0), 'car_sedan');
assert.equal(resolveCarModelForStreetVehicle('car', 1), 'car_suv');
assert.equal(resolveCarModelForStreetVehicle('car', 2), 'car_taxi');
assert.equal(resolveCarModelForStreetVehicle('car', 3), 'car_police');
assert.equal(resolveCarModelForStreetVehicle('minibus', 0), 'car_van');
assert.equal(resolveCarModelForStreetVehicle('minibus', 1), 'car_ambulance');
assert.equal(resolveCarModelForStreetVehicle('truck', 0), 'car_truck');
assert.equal(resolveCarModelForStreetVehicle('truck', 1), 'car_delivery');

// 3. Ánh xạ xe tải logistics
assert.equal(resolveCarModelForLogisticsTruck('truck_dry_goods'), 'car_delivery');
assert.equal(resolveCarModelForLogisticsTruck('truck_refrigerated'), 'car_delivery');
assert.equal(resolveCarModelForLogisticsTruck('truck_fresh_produce'), 'car_truck');
assert.equal(resolveCarModelForLogisticsTruck('truck_heavy_container'), 'car_truck');
assert.equal(resolveCarModelForLogisticsTruck('truck_beverage_sweets'), 'car_van');

// 4. Góc quay xe (Yaw) theo hướng di chuyển
assert.equal(vehicleYawFromMovement('x', 'right'), Math.PI / 2);
assert.equal(vehicleYawFromMovement('x', 'left'), -Math.PI / 2);
assert.equal(vehicleYawFromMovement(undefined, 'right'), Math.PI / 2);
assert.equal(vehicleYawFromMovement('y', 'right'), 0);
assert.equal(vehicleYawFromMovement('y', 'left'), Math.PI);

// 5. Bảng màu xe máy
for (let v = 0; v < 10; v++) {
  const color = motorbikeColorForVariant(v);
  assert.ok(MOTORBIKE_COLORS.includes(color as any));
}

console.log('PASS car-models: catalog, scale đều khớp scale-spec, ánh xạ model, yaw rotation, màu xe máy');
