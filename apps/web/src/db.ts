import Dexie, { type EntityTable } from 'dexie';
import { SaveGameData } from '@game/shared';
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

export const db = new AppDatabase();

/**
 * Load or initialize the active local game save
 */
export async function loadOrCreateSave(): Promise<SaveGameData> {
  try {
    const existing = await db.saves.get(SAVE_STORAGE_KEY);
    if (existing) {
      return existing;
    }
  } catch (err) {
    console.warn('Failed to load from Dexie, fallback to default:', err);
  }

  // Create initial save
  const newSave: SaveGameData = {
    ...DEFAULT_INITIAL_SAVE,
    id: SAVE_STORAGE_KEY,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.saves.put(newSave);
  } catch (err) {
    console.warn('Failed to persist initial save to Dexie:', err);
  }

  return newSave;
}

/**
 * Persist active save state to IndexedDB
 */
export async function persistSave(saveData: SaveGameData): Promise<SaveGameData> {
  const updated: SaveGameData = { ...saveData, id: SAVE_STORAGE_KEY, updatedAt: new Date().toISOString() };
  await db.transaction('rw', db.saves, async () => {
    const existing = await db.saves.get(SAVE_STORAGE_KEY);
    if (existing && updated.revision !== existing.revision + 1) {
      throw new Error('Bản lưu đã thay đổi. Vui lòng tải lại trò chơi trước khi lưu.');
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
