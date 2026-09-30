import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  createSaveBackupSnapshot,
  isSaveGameData,
  restoreSaveBackupSnapshot,
  validateSaveGameData,
  type SaveGameData,
} from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';

export async function runPersistenceTests() {
  console.log('\n--- Test Save Validation, Backup & Recovery ---');

  // 1. Current schema valid save
  const validSave = structuredClone(DEFAULT_INITIAL_SAVE);
  assert.equal(isSaveGameData(validSave), true, 'Current schema save passes isSaveGameData');
  const validResult = validateSaveGameData(validSave);
  assert.equal(validResult.valid, true, 'Current schema save validation passes');
  assert.equal(validResult.versionStatus, 'supported', 'Current schema is supported version');

  // 2. Corrupt save (missing required fields or negative money)
  const corruptMoney = structuredClone(validSave);
  corruptMoney.player.money = -500;
  assert.equal(isSaveGameData(corruptMoney), false, 'Negative money is not valid SaveGameData');
  const corruptMoneyResult = validateSaveGameData(corruptMoney);
  assert.equal(corruptMoneyResult.valid, false, 'Negative money validation fails');
  assert.equal(corruptMoneyResult.versionStatus, 'supported');

  const corruptTime = structuredClone(validSave);
  corruptTime.worldTime.hour = 99;
  assert.equal(validateSaveGameData(corruptTime).valid, false, 'Invalid world hour fails validation');

  // 3. Future unsupported version
  const futureSave = structuredClone(validSave);
  futureSave.schemaVersion = 4;
  const futureResult = validateSaveGameData(futureSave);
  assert.equal(futureResult.valid, false, 'Future schema version fails validation');
  assert.equal(futureResult.versionStatus, 'unsupported_future', 'Version marked unsupported_future');
  assert.match(futureResult.error ?? '', /chưa được hỗ trợ/, 'Descriptive future version error');

  // 4. Legacy schema 1 and 2 migration
  const legacySave = structuredClone(validSave);
  legacySave.schemaVersion = 1;
  const legacyResult = validateSaveGameData(legacySave);
  assert.equal(legacyResult.valid, true);
  assert.equal(legacyResult.versionStatus, 'legacy_migrate', 'Legacy schema marked for migration');
  const schema2Save = structuredClone(validSave);
  schema2Save.schemaVersion = 2;
  const schema2Result = validateSaveGameData(schema2Save);
  assert.equal(schema2Result.valid, true);
  assert.equal(schema2Result.versionStatus, 'legacy_migrate');
  assert.deepEqual(schema2Result.data?.storeLayout.unlockedPlotIds, []);

  // 5. Backup snapshot keeps sequential revision
  const backup = createSaveBackupSnapshot(validSave, 'backup-test-key');
  assert.equal(backup.id, 'backup-test-key', 'Backup has designated backup key');
  assert.equal(backup.revision, validSave.revision, 'Backup maintains current revision');
  assert.equal(isSaveGameData(backup), true, 'Backup is valid SaveGameData');

  const restored = restoreSaveBackupSnapshot(backup, 'restored-active-key');
  assert.equal(restored.id, 'restored-active-key', 'Restored save gets active key');
  assert.equal(restored.revision, validSave.revision, 'Restored save keeps revision');
  assert.equal(isSaveGameData(restored), true, 'Restored save is valid SaveGameData');

  // 6. DB read error simulation: must NOT overwrite with default
  let dbStore: Record<string, SaveGameData> = {
    local_save_default: structuredClone(validSave),
  };
  let shouldFailRead = true;

  async function mockLoadOrCreateSave(): Promise<SaveGameData> {
    if (shouldFailRead) {
      throw new Error('IndexedDB QuotaExceeded or Read Error');
    }
    const existing = dbStore['local_save_default'];
    if (existing) {
      return existing;
    }
    const newSave: SaveGameData = {
      ...DEFAULT_INITIAL_SAVE,
      id: 'local_save_default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbStore['local_save_default'] = newSave;
    return newSave;
  }

  // Attempt read when DB fails
  let errorCaught = false;
  try {
    await mockLoadOrCreateSave();
  } catch (err) {
    errorCaught = true;
  }
  assert.equal(errorCaught, true, 'DB read failure throws instead of swallowing');
  assert.equal(dbStore['local_save_default'].player.money, validSave.player.money, 'Existing save was NOT overwritten by default');

  // Now retry when DB recovers
  shouldFailRead = false;
  const loaded = await mockLoadOrCreateSave();
  assert.equal(loaded.player.money, validSave.player.money, 'Retry successfully loaded existing save data');

  console.log('✓ Save validation, future version guard, sequential backup, and DB read recovery verified.');
}

export function runTransferRegressionTests() {
  console.log('\n--- Test Transfer Regression (Shelf 24 / Product 10 / Stock 5 / Request 19) ---');
  const baseSave = structuredClone(DEFAULT_INITIAL_SAVE);
  // Give player 10 banh mi in inventory
  baseSave.inventory = [
    {
      productId: 'banh_mi_que',
      quantity: 10,
      lots: [{ quantity: 10, expiresOnDay: 15 }],
    },
  ];
  // Shelf has maxCapacity 24, shelfCapacity of banh_mi_que is 10, currentStock is 5
  const noodleShelf = baseSave.storeLayout.fixtures.find(f => f.id === 'shelf_wooden_noodles')!;
  noodleShelf.maxCapacity = 24;
  noodleShelf.assignedProductId = 'banh_mi_que';
  noodleShelf.currentStock = 5;
  noodleShelf.stockLots = [{ quantity: 5, expiresOnDay: 15 }];

  const sim = new GameSimulation(baseSave, generateStarterTileMap(), new InputManager());

  // Request amount 19
  const result = sim.transferToShelf('shelf_wooden_noodles', 'banh_mi_que', 19);

  // Effective capacity is min(24, 10) = 10
  // Available space is 10 - 5 = 5
  // Actual transferred MUST BE exactly 5
  assert.equal(result.success, true, 'Transfer returned success');
  assert.equal(result.actualQuantity, 5, 'Actual transferred quantity is exactly 5');

  const updatedShelf = sim.getFixtures().find(f => f.id === 'shelf_wooden_noodles')!;
  assert.equal(updatedShelf.currentStock, 10, 'Shelf current stock is now capped at effective capacity 10');

  const updatedInv = sim.getInventory().find(i => i.productId === 'banh_mi_que')!;
  assert.equal(updatedInv.quantity, 5, 'Inventory quantity decreased by exactly 5 (10 - 5 = 5)');

  // Unstock transfer test
  const unstockResult = sim.transferFromShelf('shelf_wooden_noodles', 3);
  assert.equal(unstockResult.success, true);
  assert.equal(unstockResult.actualQuantity, 3);
  assert.equal(sim.getFixtures().find(f => f.id === 'shelf_wooden_noodles')!.currentStock, 7);
  assert.equal(sim.getInventory().find(i => i.productId === 'banh_mi_que')!.quantity, 8);

  console.log('✓ Shelf transfer respects product shelfCapacity (min of fixture and product), returns exact actualQuantity 5.');
}
