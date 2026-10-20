import assert from 'node:assert/strict';
import { rayHitsBox, stepAlpha } from './roof-fade';
import { pickTarget } from './tile-target';

assert.equal(stepAlpha(1, 0, 0.1), 0.5);
assert.equal(stepAlpha(0.1, 0, 0.5), 0);
assert.equal(stepAlpha(0, 1, 1), 1);
assert.equal(stepAlpha(1, 0.35, 0.01), 0.95);

const box = { x0: 0, x1: 4, y0: 0, y1: 2, z0: 10, z1: 14 };
// Người ở sau tòa (z=8) nhìn về phía camera ở +z, lên trên: bị che
assert.equal(rayHitsBox({ x: 2, y: 0.9, z: 8 }, { x: 0, y: 0.3, z: 0.95 }, box), true);
// Tia hướng ra xa tòa: không che
assert.equal(rayHitsBox({ x: 2, y: 0.9, z: 8 }, { x: 0, y: 0.5, z: -0.85 }, box), false);
// Tia bay quá cao qua nóc
assert.equal(rayHitsBox({ x: 2, y: 0.9, z: 8 }, { x: 0, y: 5, z: 0.5 }, box), false);

assert.deepEqual(pickTarget('main', null), { kind: 'building', id: 'main' });
assert.deepEqual(pickTarget('main', { kind: 'parcel', id: 'p1' }), { kind: 'building', id: 'main' });
assert.deepEqual(pickTarget(null, { kind: 'parcel', id: 'p1' }), { kind: 'parcel', id: 'p1' });
assert.equal(pickTarget(undefined, null), null);
console.log('PASS roof-fade: alpha mờ dần, tia cắt hộp, chọn mesh tòa ưu tiên hơn ô đất');
