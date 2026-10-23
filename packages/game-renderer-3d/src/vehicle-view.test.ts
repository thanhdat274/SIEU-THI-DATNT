import assert from 'node:assert/strict';
import { STREET_VEHICLE_RULES } from '@game/data';
import { vehicleFootY } from './vehicle-view';

// Chân xe: đường dọc lùi nửa chiều dài về nam, đường ngang giữ nguyên.
assert.equal(vehicleFootY({ type: 'car', position: { x: 10, y: 100 }, axis: 'x' }), 100);
assert.equal(vehicleFootY({ type: 'minibus', position: { x: 10, y: 100 }, axis: 'y' }), 100 + STREET_VEHICLE_RULES.halfLengthY.minibus);

console.log('PASS vehicle-view: chân xe');
