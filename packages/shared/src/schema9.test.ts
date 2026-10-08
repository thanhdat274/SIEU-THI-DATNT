import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE } from '@game/data';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  isBuildingPlacementRecord,
  isSaveGameData,
  validateSaveGameData,
  type BuildingPlacementRecord,
  type SaveGameData,
} from './index';

/**
 * Round-trip kiểm chứng Schema 9 (`buildingPlacements[].typeId` + migration 8→9) — OpenSpec `open-world-building-types` D8,
 * task 5.1 phần THUẦN. Phạm vi: shared (chỉ schema/validation/migration). Refactor BuildingId→string (Bước 1.2) và đổ
 * `typeId` vào gameplay là SAU (chờ máy thật) — KHÔNG ở task này.
 * Nối `runSchema9Tests()` vào `test-runner.ts` bởi chủ sở hữu game-core. Chạy độc lập: `tsx src/schema9.test.ts`.
 */

// Một vị trí đặt tòa hợp lệ (schema ≤8, chưa có typeId).
function makePlacement(overrides: Partial<BuildingPlacementRecord> = {}): BuildingPlacementRecord {
  return { buildingId: 'main', parcelId: 'lot-center', originX: 0, originY: 0, ...overrides };
}

// Bản ghi 4 instance cũ (main/xoi/drink/snack) như save thật trước schema 9.
function makeLegacyPlacements(): BuildingPlacementRecord[] {
  return [
    makePlacement({ buildingId: 'main', parcelId: 'lot-center', originX: 0, originY: 0 }),
    makePlacement({ buildingId: 'xoi', parcelId: 'lot-west', originX: 5, originY: 0 }),
    makePlacement({ buildingId: 'drink', parcelId: 'lot-east-1', originX: 9, originY: 0 }),
    makePlacement({ buildingId: 'snack', parcelId: 'lot-east-2', originX: 14, originY: 0 }),
  ];
}

export function runSchema9Tests() {
  assert.equal(CURRENT_SAVE_SCHEMA_VERSION, 9, 'schemaVersion hiện tại phải là 9');

  // --- isBuildingPlacementRecord: typeId OPTIONAL — thiếu là hợp lệ; có phải là non-empty string. ---
  assert.equal(isBuildingPlacementRecord(makePlacement()), true, 'bản ghi chưa có typeId vẫn hợp lệ (optional)');
  assert.equal(isBuildingPlacementRecord(makePlacement({ typeId: 'grocery_main' })), true, 'typeId hợp lệ được chấp nhận');
  assert.equal(isBuildingPlacementRecord(makePlacement({ typeId: 'xoi_shop' })), true);
  assert.equal(isBuildingPlacementRecord(makePlacement({ typeId: '' })), false, 'typeId rỗng là sai hình dạng');
  assert.equal(isBuildingPlacementRecord(makePlacement({ typeId: 123 as unknown as string })), false, 'typeId không phải string là sai hình dạng');

  // --- Migration 8→9 (chạy qua luồng legacy v6→v9 là luồng duy nhất chạy đủ migrateToW7+W8+W9). ---
  // Save mẫu: 4 instance cũ + 1 bản ghi 'main' đã có typeId custom + 1 buildingId lạ.
  const place8 = [
    ...makeLegacyPlacements(),
    makePlacement({ buildingId: 'main', parcelId: 'lot-center', originX: 1, originY: 1, typeId: 'custom_hub' }),
    makePlacement({ buildingId: 'other_site', parcelId: 'lot-west', originX: 2, originY: 2 }),
  ];

  const v6 = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  delete (v6 as Partial<SaveGameData>).world;
  delete (v6.storeLayout as { ownedParcelIds?: string[] }).ownedParcelIds;
  v6.schemaVersion = 6;
  v6.storeLayout.buildingPlacements = place8;
  assert.equal(isSaveGameData(v6), true, 'v6 (chưa có world/ownedParcelIds/typeId) vẫn hợp lệ cho migration');

  const res = validateSaveGameData(v6);
  assert.equal(res.valid, true);
  assert.equal(res.versionStatus, 'legacy_migrate');
  const migrated = res.data as SaveGameData;
  assert.equal(migrated.schemaVersion, 9, 'migration đưa save lên schema 9');

  const placements = migrated.storeLayout.buildingPlacements ?? [];
  const find = (buildingId: string, originX = 0, originY = 0) => placements.find(p => p.buildingId === buildingId && p.originX === originX && p.originY === originY);

  assert.equal(find('main', 0, 0)?.typeId, 'grocery_main', 'main → grocery_main');
  assert.equal(find('xoi', 5, 0)?.typeId, 'xoi_shop', 'xoi → xoi_shop');
  assert.equal(find('drink', 9, 0)?.typeId, 'drink_shop', 'drink → drink_shop');
  assert.equal(find('snack', 14, 0)?.typeId, 'snack_shop', 'snack → snack_shop');

  // bản ghi 'main' thứ hai (typeId custom) phải được GIỮ NGUYÊN — dùng vị trí gốc để phân biệt hai bản 'main'.
  const customRec = placements.find(p => p.parcelId === 'lot-center' && p.originX === 1 && p.originY === 1);
  assert.ok(customRec, 'bản ghi typeId custom còn tồn tại');
  assert.equal(customRec?.typeId, 'custom_hub', 'typeId đã có KHÔNG bị ghi đè');

  const foreign = placements.find(p => p.buildingId === 'other_site');
  assert.equal(foreign?.typeId, undefined, 'buildingId lạ giữ nguyên, không suy diễn typeId');

  // --- Giữ nguyên builtBy / ownedParcelIds (không phá schema 8). ---
  assert.ok(migrated.storeLayout.buildingPlacements?.every(p => p.builtBy === 'local'), 'migrateToW8 vẫn điền builtBy=local');
  assert.ok(Array.isArray(migrated.storeLayout.ownedParcelIds), 'ownedParcelIds giữ nguyên string[] sau migrate');
  assert.ok((migrated.storeLayout.ownedParcelIds ?? []).length >= 4, '4 lô W0 đã sở hữu được gieo');

  // Save sau migrate phải hợp lệ ở schema 9.
  assert.equal(isSaveGameData(migrated), true, 'save sau migrate là hợp lệ ở schema 9');
  const res9 = validateSaveGameData(migrated);
  assert.equal(res9.valid, true);
  assert.equal(res9.versionStatus, 'supported');

  // --- Round-trip: object có typeId optional vẫn pass isBuildingPlacementRecord. ---
  for (const p of migrated.storeLayout.buildingPlacements ?? []) {
    assert.equal(isBuildingPlacementRecord(p), true, `round-trip bản ghi ${p.buildingId} vẫn hợp lệ sau khi thêm typeId`);
  }

  // --- isSaveGameData: chỉ chấp nhận đúng các phiên bản trong validation list (1..9), từ chối tương lai. ---
  const future = structuredClone(migrated);
  (future as SaveGameData).schemaVersion = 10;
  assert.equal(isSaveGameData(future), false, 'schema tương lai (10) bị từ chối');
  const resFuture = validateSaveGameData(future);
  assert.equal(resFuture.valid, false);
  assert.equal(resFuture.versionStatus, 'unsupported_future');

  // Save đúng schema 9 → supported.
  assert.equal(isSaveGameData(structuredClone(migrated)), true, 'save schema 9 hợp lệ');
}

// Cho phép chạy độc lập (tsx src/schema9.test.ts) — chỉ chạy khi là entry point.
declare const process: any;
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('schema9.test')) {
  runSchema9Tests();
  // eslint-disable-next-line no-console
  console.log('schema9.test: OK');
}
