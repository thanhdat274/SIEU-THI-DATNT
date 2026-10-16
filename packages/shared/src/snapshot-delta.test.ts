import assert from 'node:assert/strict';
import { applySnapshotPatches, diffSnapshot } from './snapshot-delta';

const base = {
  world: { id: 'w', revision: 3, worldTime: { day: 1, minute: 10 } },
  businesses: [{ id: 'b', save: { money: 100, shelves: [{ id: 's1', qty: 2 }], log: ['a'], gone: 1 } }],
  serverTime: '',
};
const next = structuredClone(base);
const nextSave = next.businesses[0].save as Record<string, unknown>;
next.world.worldTime.minute = 11;
nextSave.money = 90;
next.businesses[0].save.shelves[0].qty = 1;
delete nextSave.gone;
nextSave.extra = { x: 1 };

const patches = diffSnapshot(base, next);
// Không đụng nhánh không đổi; save không bị gửi nguyên khối.
assert.ok(patches.every((p) => p.p.join('.') !== 'businesses.0.save'));
assert.ok(!patches.some((p) => p.p.join('.').startsWith('businesses.0.save.log')));
const applied = applySnapshotPatches(base, patches);
assert.deepEqual(applied, next);
// Bất biến: bản gốc không bị sửa, nhánh không đổi được dùng chung.
assert.equal(base.businesses[0].save.money, 100);
assert.equal((applied as typeof base).businesses[0].save.log, base.businesses[0].save.log);
assert.deepEqual(diffSnapshot(base, structuredClone(base)), []);
// Mảng đổi độ dài thay nguyên mảng.
const grown = structuredClone(base); grown.businesses.push({ id: 'c', save: { money: 0, shelves: [], log: [], gone: 0 } });
assert.deepEqual(applySnapshotPatches(base, diffSnapshot(base, grown)), grown);
console.log('snapshot-delta test passed');
