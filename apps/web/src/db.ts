import Dexie, { type EntityTable } from 'dexie';
import { SaveGameData, CURRENT_SAVE_SCHEMA_VERSION, validateSaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE } from '@game/data';

export const SAVE_STORAGE_KEY = 'local_save_default';

export class AppDatabase extends Dexie {
  saves!: EntityTable<SaveGameData, 'id'>;

  constructor() {
    super('TiemTapHoaDauHemDB');
    this.version(1).stores({
      saves: 'id, schemaVersion, updatedAt, revision',
    });
  }
}

export const SAVE_BACKUP_KEY = 'local_save_backup';

export const db = new AppDatabase();

/**
 * Inspect local save without creating default if absent.
 * Throws if database encounters a read failure.
 */
export async function loadExistingSave(): Promise<SaveGameData | undefined> {
  return await db.saves.get(SAVE_STORAGE_KEY);
}

/**
 * Load active local game save, or create initial save ONLY if not found.
 * If reading the database fails, throws an error rather than silently overwriting with default.
 */
export async function loadOrCreateSave(): Promise<SaveGameData> {
  const existing = await db.saves.get(SAVE_STORAGE_KEY);
  if (existing) {
    const validation = validateSaveGameData(existing);
    if (!validation.valid) throw new Error(validation.error ?? 'Bản lưu không hợp lệ; dữ liệu cũ được giữ nguyên.');
    if (existing.schemaVersion < CURRENT_SAVE_SCHEMA_VERSION) {
      const migrated = validation.data;
      if (!migrated) throw new Error(`Chưa có migration an toàn cho save schema ${existing.schemaVersion}; dữ liệu cũ được giữ nguyên.`);
      migrated.id = SAVE_STORAGE_KEY;
      await db.transaction('rw', db.saves, async () => {
        const latest = await db.saves.get(SAVE_STORAGE_KEY);
        if (!latest || latest.schemaVersion !== existing.schemaVersion || latest.revision !== existing.revision) {
          throw new Error('Bản lưu đã đổi trong lúc nâng cấp. Hãy tải lại trang và thử lại.');
        }
        await db.saves.put({ ...latest, id: SAVE_BACKUP_KEY });
        await db.saves.put(migrated);
      });
      return migrated;
    }
    return existing;
  }

  // Create initial save ONLY when no record was found in the database
  const newSave: SaveGameData = {
    ...DEFAULT_INITIAL_SAVE,
    id: SAVE_STORAGE_KEY,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.saves.put(newSave);
  return newSave;
}

/**
 * Create a backup of a save state
 */
export async function createBackupSave(saveData: SaveGameData): Promise<SaveGameData> {
  const backup: SaveGameData = {
    ...saveData,
    id: SAVE_BACKUP_KEY,
    updatedAt: new Date().toISOString(),
  };
  await db.saves.put(backup);
  return backup;
}

/**
 * Load backup save from IndexedDB
 */
export async function loadBackupSave(): Promise<SaveGameData | undefined> {
  return await db.saves.get(SAVE_BACKUP_KEY);
}

/**
 * Restore active save from backup
 */
export async function restoreFromBackup(): Promise<SaveGameData | undefined> {
  const backup = await loadBackupSave();
  if (!backup) return undefined;
  const restored: SaveGameData = {
    ...backup,
    id: SAVE_STORAGE_KEY,
    updatedAt: new Date().toISOString(),
  };
  await db.saves.put(restored);
  return restored;
}

/**
 * Persist active save state to IndexedDB, keeping previous valid revision as backup
 */
export async function persistSave(saveData: SaveGameData): Promise<SaveGameData> {
  const updated: SaveGameData = { ...saveData, id: SAVE_STORAGE_KEY, updatedAt: new Date().toISOString() };
  const validation = validateSaveGameData(updated);
  if (!validation.valid || validation.versionStatus !== 'supported') throw new Error(validation.error ?? 'Không thể lưu dữ liệu chưa được nâng cấp hợp lệ.');
  await db.transaction('rw', db.saves, async () => {
    const existing = await db.saves.get(SAVE_STORAGE_KEY);
    if (existing && updated.revision !== existing.revision + 1) {
      throw new Error('Bản lưu đã thay đổi. Vui lòng tải lại trò chơi trước khi lưu.');
    }
    if (existing) {
      await db.saves.put({ ...existing, id: SAVE_BACKUP_KEY });
    }
    await db.saves.put(updated);
  });
  return updated;
}

/**
 * Reset local save to default starter game state
 */
export async function resetSaveToDefault(): Promise<SaveGameData> {
  const freshSave: SaveGameData = {
    ...DEFAULT_INITIAL_SAVE,
    id: SAVE_STORAGE_KEY,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 1,
  };

  await db.saves.put(freshSave);
  return freshSave;
}
