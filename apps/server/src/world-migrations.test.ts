import assert from 'node:assert/strict';
import { createInitialOnlineWorld } from '@game/data';
import { CURRENT_SAVE_SCHEMA_VERSION, type GameWorld, type SaveGameData } from '@game/shared';
import { planWorldMigration } from './world-migrations.js';

const seeded = createInitialOnlineWorld({ id: 'mig-owner', displayName: 'Owner', photoUrl: null }, 'mig-world');
const docWith = (version: number) => {
  const save = structuredClone(seeded.business.save) as SaveGameData;
  save.schemaVersion = version;
  return { _id: 'mig-world', world: seeded.world as GameWorld, businesses: [{ save }] };
};

assert.equal(planWorldMigration(docWith(CURRENT_SAVE_SCHEMA_VERSION)).plans.length, 0, 'save mới không cần nâng cấp');
for (const old of [1, 2, 3]) {
  const doc = docWith(old);
  const { plans, error } = planWorldMigration(doc);
  assert.equal(error, undefined, `schema ${old} nâng cấp được`);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].from, old);
  assert.equal(plans[0].save.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(doc.businesses[0].save.schemaVersion, old, 'không sửa document gốc');
  assert.equal(planWorldMigration({ ...doc, businesses: [{ save: plans[0].save }] }).plans.length, 0, 'idempotent');
}
const broken = docWith(3); (broken.businesses[0].save as unknown as Record<string, unknown>).player = null;
assert.ok(planWorldMigration(broken).error, 'save hỏng báo lỗi, không ghi đè');
console.log('world-migrations tests PASS');
