import assert from 'node:assert/strict';
import { rayHitsBox, shouldOpenRoof, stepAlpha, type RoofRef } from './roof-fade';
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
// Bóc mái: chỉ tòa đang đứng + kho thông với tiệm chính; tòa kề sát giữ mái.
{
  const main: RoofRef = { id: 'main', warehouse: false };
  const kho: RoofRef = { id: 'main', warehouse: true };
  const xoi: RoofRef = { id: 'xoi', warehouse: false };
  const snack: RoofRef = { id: 'snack', warehouse: false };
  const all = [main, kho, xoi, snack];
  const open = (inside: RoofRef[]) => all.filter(r => shouldOpenRoof(r, inside));
  assert.deepEqual(open([main]), [main, kho], 'đứng trong tiệm: tiệm + kho');
  assert.deepEqual(open([kho]), [main, kho], 'đứng trong kho: kho + tiệm');
  assert.deepEqual(open([xoi]), [xoi], 'đứng trong tiệm xôi sát kho: chỉ xôi');
  assert.deepEqual(open([snack]), [snack], 'quán kề tiệm chính (chung tường) giữ mái của tiệm/kho');
  assert.deepEqual(open([]), [], 'ngoài đường: không bóc');
}
console.log('PASS roof-fade: alpha mờ dần, tia cắt hộp, chọn mesh tòa ưu tiên hơn ô đất');
