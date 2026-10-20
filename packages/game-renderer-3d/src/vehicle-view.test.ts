import assert from 'node:assert/strict';
import { STREET_VEHICLE_RULES, TRUCK_KINDS } from '@game/data';
import { parkedVehicleKey, vehicleFacing, vehicleFootY, vehicleTextureKey } from './vehicle-view';

// Quarter 0 giống bản 2D: đường ngang right/left, đường dọc xuôi nam = quay mặt về camera.
assert.equal(vehicleFacing('x', 'right', 0), 'right');
assert.equal(vehicleFacing(undefined, 'left', 0), 'left');
assert.equal(vehicleFacing('y', 'right', 0), 'down');
assert.equal(vehicleFacing('y', 'left', 0), 'up');

// Quarter 2 (xoay 180°): ngược lại.
assert.equal(vehicleFacing('x', 'right', 2), 'left');
assert.equal(vehicleFacing('y', 'right', 2), 'up');

// Quarter 1 và 3: đường ngang thành nhìn trước/sau, đường dọc thành nhìn ngang; hai quarter đối nhau thì ngược nhau.
for (const dir of ['left', 'right'] as const) {
  assert.ok(['down', 'up'].includes(vehicleFacing('x', dir, 1)));
  assert.ok(['left', 'right'].includes(vehicleFacing('y', dir, 1)));
  assert.notEqual(vehicleFacing('x', dir, 1), vehicleFacing('x', dir, 3));
  assert.notEqual(vehicleFacing('y', dir, 1), vehicleFacing('y', dir, 3));
}

// Khóa texture đúng như Pixi.
assert.equal(vehicleTextureKey({ type: 'car', variant: 0 }, 'right'), 'vehicle_car_right');
assert.equal(vehicleTextureKey({ type: 'car', variant: 3 }, 'left'), 'vehicle_car_v3_left');
assert.equal(vehicleTextureKey({ type: 'minibus', variant: 2 }, 'right'), 'vehicle_minibus_2_right');
assert.equal(vehicleTextureKey({ type: 'bicycle', variant: 1 }, 'left'), 'vehicle_bicycle_rider_left');
assert.equal(vehicleTextureKey({ type: 'motorbike', variant: 4 }, 'right'), 'vehicle_motorbike_rider_4_right');
assert.equal(vehicleTextureKey({ type: 'truck', variant: TRUCK_KINDS.length + 1 }, 'left'), `truck_${TRUCK_KINDS[1]}_left`);
assert.equal(vehicleTextureKey({ type: 'truck', variant: 0 }, 'down'), 'vehicle_ns_truck_0_down');

// Chân xe: đường dọc lùi nửa chiều dài về nam, đường ngang giữ nguyên.
assert.equal(vehicleFootY({ type: 'car', position: { x: 10, y: 100 }, axis: 'x' }), 100);
assert.equal(vehicleFootY({ type: 'minibus', position: { x: 10, y: 100 }, axis: 'y' }), 100 + STREET_VEHICLE_RULES.halfLengthY.minibus);

// Xe khách đỗ.
assert.equal(parkedVehicleKey('car', 2), 'vehicle_car_right');
assert.equal(parkedVehicleKey('motorbike', 1), 'vehicle_motorbike_parked_1');
assert.equal(parkedVehicleKey('walk', 1), null);

console.log('PASS vehicle-view: hướng nhìn theo quarter, khóa texture, chân xe, xe đỗ');
