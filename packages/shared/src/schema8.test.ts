import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE } from '@game/data';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  isBuildingPlacementRecord,
  isSaveGameData,
  validateSaveGameData,
  type SaveGameData,
} from './index';

/**
 * Round-trip kiểm chứng Schema 8 (`builtBy` + migration 7→8) — OpenSpec `open-world-coop-land` task 3.1.
 * Phạm vi: shared (chỉ schema/validation/migration). Nối `runSchema8Tests()` vào `test-runner.ts` bởi chủ sở hữu game-core.
 * Chạy độc lập: `tsx src/schema8.test.ts`.
 */

// Một vị trí đặt tòa hợp lệ ở schema 7 (chưa có builtBy).
function makePlacement(): { buildingId: string; parcelId: string; originX: number; originY: number } {
  return { buildingId: 'main-shop', parcelId: 'lot-center', originX: 0, originY: 0 };
}

export function runSchema8Tests() {
  assert.equal(CURRENT_SAVE_SCHEMA_VERSION, 9, 'schemaVersion hiện tại phải là 9');

  // isBuildingPlacementRecord: optional builtBy — có là phải non-empty string.
  assert.equal(isBuildingPlacementRecord({ ...makePlacement() }), true, 'bản ghi không builtBy vẫn hợp lệ (optional)');
  assert.equal(isBuildingPlacementRecord({ ...makePlacement(), builtBy: 'local' }), true);
  assert.equal(isBuildingPlacementRecord({ ...makePlacement(), builtBy: 'user-abc' }), true);
  assert.equal(isBuildingPlacementRecord({ ...makePlacement(), builtBy: '' }), false, 'builtBy rỗng là sai hình dạng');
  assert.equal(isBuildingPlacementRecord({ ...makePlacement(), builtBy: 123 }), false, 'builtBy không phải string là sai hình dạng');

  // 1) Save schema 7 có buildingPlacements → migrateToW8 tự điền builtBy='local', schemaVersion=8, isSaveGameData accept.
  const schema7 = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  schema7.schemaVersion = 7;
  const placement7 = makePlacement();
  schema7.storeLayout.buildingPlacements = [placement7];
  assert.equal(isSaveGameData(schema7), true, 'v7 hợp lệ được isSaveGameData chấp nhận');
  const res7 = validateSaveGameData(schema7);
  assert.equal(res7.valid, true);
  assert.equal(res7.versionStatus, 'legacy_migrate');
  const migrated7 = res7.data as SaveGameData;
  assert.equal(migrated7.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(migrated7.storeLayout.buildingPlacements?.[0]?.builtBy, 'local', 'migration điền builtBy=local cho bản ghi chưa có');
  assert.equal(isSaveGameData(migrated7), true, 'save sau migrate là hợp lệ');

  // 2) Save có builtBy sẵn → GIỮ NGUYÊN (không ghi đè).
  const schema7WithBuilt = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  schema7WithBuilt.schemaVersion = 7;
  schema7WithBuilt.storeLayout.buildingPlacements = [
    { ...makePlacement() },
    { ...makePlacement(), parcelId: 'lot-west', builtBy: 'user-owner' },
  ];
  const resWithBuilt = validateSaveGameData(schema7WithBuilt);
  const migratedWithBuilt = resWithBuilt.data as SaveGameData;
  const lists = migratedWithBuilt.storeLayout.buildingPlacements ?? [];
  assert.equal(lists[0].builtBy, 'local', 'bản ghi chưa có builtBy được điền local');
  assert.equal(lists[1].builtBy, 'user-owner', 'bản ghi đã có builtBy KHÔNG bị ghi đè');

  // 3) Save schema 8 hợp lệ (isSaveGameData accept; validate → legacy_migrate về schema hiện tại, gắn typeId).
  const schema8 = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  schema8.schemaVersion = 8;
  schema8.storeLayout.buildingPlacements = [{ ...makePlacement(), builtBy: 'local' }];
  assert.equal(isSaveGameData(schema8), true, 'save 8 hợp lệ');
  const res8 = validateSaveGameData(schema8);
  assert.equal(res8.valid, true);
  assert.equal(res8.versionStatus, 'legacy_migrate', 'save 8 vẫn là legacy (chưa có typeId), cần migrate lên schema hiện tại');
  const migrated8 = res8.data as SaveGameData;
  assert.equal(migrated8.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION, 'v8 → schema hiện tại');
  assert.equal(migrated8.storeLayout.buildingPlacements?.[0]?.builtBy, 'local', 'builtBy cũ được giữ nguyên');

  // 4) validateSaveGameData trả legacy_migrate cho v6 → hiện tại.
  const schema6 = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  delete (schema6 as Partial<SaveGameData>).world;
  delete (schema6.storeLayout as { ownedParcelIds?: string[] }).ownedParcelIds;
  schema6.schemaVersion = 6;
  schema6.storeLayout.buildingPlacements = [makePlacement()];
  assert.equal(isSaveGameData(schema6), true, 'v6 (chưa có world/ownedParcelIds) hợp lệ');
  const res6 = validateSaveGameData(schema6);
  assert.equal(res6.valid, true);
  assert.equal(res6.versionStatus, 'legacy_migrate');
  const migrated6 = res6.data as SaveGameData;
  assert.equal(migrated6.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.ok(Array.isArray(migrated6.storeLayout.ownedParcelIds), 'ownedParcelIds giữ nguyên string[] sau migrate');
  assert.equal(migrated6.storeLayout.buildingPlacements?.[0]?.builtBy, 'local', 'v6→8 cũng điền builtBy=local');
}

// Cho phép chạy độc lập (tsx src/schema8.test.ts) — chỉ chạy khi là entry point.
declare const process: any;
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('schema8.test')) {
  runSchema8Tests();
  // eslint-disable-next-line no-console
  console.log('schema8.test: OK');
}
