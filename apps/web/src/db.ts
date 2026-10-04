import Dexie, { type EntityTable } from 'dexie';
import { SaveGameData, CURRENT_SAVE_SCHEMA_VERSION, validateSaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE } from '@game/data';

/** Ô lưu số 1 giữ nguyên khóa cũ để bản lưu hiện có tiếp tục dùng được, không cần migration. */
export const SAVE_STORAGE_KEY = 'local_save_default';
export const SAVE_BACKUP_KEY = 'local_save_backup';

/** Ba ô lưu cục bộ. Mỗi ô có một bản backup riêng (`backupKeyFor`). */
export const SAVE_SLOT_IDS = [SAVE_STORAGE_KEY, 'local_save_slot_2', 'local_save_slot_3'] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

const ACTIVE_SLOT_STORAGE_KEY = 'tiem.activeSaveSlot';

export function isSaveSlotId(value: unknown): value is SaveSlotId {
  return typeof value === 'string' && (SAVE_SLOT_IDS as readonly string[]).includes(value);
}

export function slotNumber(slotId: SaveSlotId): number {
  return SAVE_SLOT_IDS.indexOf(slotId) + 1;
}

export function backupKeyFor(slotId: SaveSlotId): string {
  return slotId === SAVE_STORAGE_KEY ? SAVE_BACKUP_KEY : `${slotId}_backup`;
}

function readStoredSlot(): SaveSlotId {
  try {
    const stored = globalThis.localStorage?.getItem(ACTIVE_SLOT_STORAGE_KEY);
    if (isSaveSlotId(stored)) return stored;
  } catch {
    // localStorage có thể bị chặn (chế độ riêng tư): dùng ô 1.
  }
  return SAVE_STORAGE_KEY;
}

let activeSlotId: SaveSlotId = readStoredSlot();

/** Ô đang chọn của tab này. Giữ trong bộ nhớ nên hai tab có thể chọn hai ô khác nhau; localStorage chỉ nhớ lựa chọn cho lần mở sau. */
export function getActiveSlotId(): SaveSlotId {
  return activeSlotId;
}

export function setActiveSlotId(slotId: SaveSlotId): void {
  if (!isSaveSlotId(slotId)) throw new Error('Ô lưu không hợp lệ.');
  activeSlotId = slotId;
  try {
    globalThis.localStorage?.setItem(ACTIVE_SLOT_STORAGE_KEY, slotId);
  } catch {
    // Không lưu được lựa chọn thì chỉ mất việc nhớ ô cho lần sau.
  }
}

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

export interface SaveSlotInfo {
  slotId: SaveSlotId;
  number: number;
  /** `empty`: chưa có bản lưu; `ok`: đọc được; `corrupt`: có dữ liệu nhưng không hợp lệ (không bị ghi đè). */
  status: 'empty' | 'ok' | 'corrupt';
  day?: number;
  level?: number;
  money?: number;
  updatedAt?: string;
}

/** Tóm tắt cả ba ô để hiển thị. Không tạo, không sửa dữ liệu. */
export async function listSaveSlots(): Promise<SaveSlotInfo[]> {
  const rows = await db.saves.bulkGet([...SAVE_SLOT_IDS]);
  return SAVE_SLOT_IDS.map((slotId, index) => {
    const row = rows[index];
    const base = { slotId, number: index + 1 };
    if (!row) return { ...base, status: 'empty' as const };
    const validation = validateSaveGameData(row);
    if (!validation.valid) return { ...base, status: 'corrupt' as const };
    return {
      ...base,
      status: 'ok' as const,
      day: row.worldTime?.day,
      level: row.player?.level,
      money: row.player?.money,
      updatedAt: row.updatedAt,
    };
  });
}

/** Xóa một ô và backup của nó. Người gọi chịu trách nhiệm xác nhận với người chơi. */
export async function deleteSaveSlot(slotId: SaveSlotId): Promise<void> {
  if (!isSaveSlotId(slotId)) throw new Error('Ô lưu không hợp lệ.');
  await db.saves.bulkDelete([slotId, backupKeyFor(slotId)]);
}

/**
 * Inspect local save without creating default if absent.
 * Throws if database encounters a read failure.
 */
export async function loadExistingSave(slotId: SaveSlotId = activeSlotId): Promise<SaveGameData | undefined> {
  return await db.saves.get(slotId);
}

const emergencyKeyFor = (slotId: SaveSlotId) => `tiem.emergencySave.${slotId}`;

/**
 * Bản chụp khẩn cấp: ghi ĐỒNG BỘ vào localStorage khi trang sắp đóng/tải lại (IndexedDB là bất đồng bộ nên có thể không kịp).
 * Lần mở sau `loadOrCreateSave` nhận bản này nếu mới hơn bản trong IndexedDB. Lỗi (đầy bộ nhớ, bị chặn) thì bỏ qua.
 */
export function writeEmergencySave(saveData: SaveGameData): boolean {
  try {
    localStorage.setItem(emergencyKeyFor(activeSlotId), JSON.stringify({ savedAtMs: Date.now(), save: saveData }));
    return true;
  } catch {
    return false;
  }
}

export function clearEmergencySave(slotId: SaveSlotId = activeSlotId): void {
  try { localStorage.removeItem?.(emergencyKeyFor(slotId)); } catch { /* bỏ qua */ }
}

/** Trả bản chụp khẩn cấp hợp lệ và mới hơn `existing`; xóa nó dù dùng hay bỏ để không nạp lại lần sau. */
function takeEmergencySave(slotId: SaveSlotId, existing: SaveGameData): SaveGameData | undefined {
  let raw: string | null = null;
  try { raw = localStorage.getItem(emergencyKeyFor(slotId)); } catch { return undefined; }
  if (!raw) return undefined;
  clearEmergencySave(slotId);
  try {
    const parsed = JSON.parse(raw) as { savedAtMs?: unknown; save?: unknown };
    if (typeof parsed.savedAtMs !== 'number' || !parsed.save) return undefined;
    if (parsed.savedAtMs < Date.parse(existing.updatedAt)) return undefined; // IndexedDB đã có bản mới hơn
    const validation = validateSaveGameData(parsed.save);
    if (!validation.valid || !validation.data || validation.versionStatus !== 'supported') return undefined;
    return { ...validation.data, id: slotId, revision: existing.revision + 1, updatedAt: new Date().toISOString() };
  } catch {
    return undefined;
  }
}

/**
 * Load active local game save, or create initial save ONLY if not found.
 * If reading the database fails, throws an error rather than silently overwriting with default.
 */
export async function loadOrCreateSave(): Promise<SaveGameData> {
  const slotId = activeSlotId;
  const existing = await db.saves.get(slotId);
  if (existing) {
    const validation = validateSaveGameData(existing);
    if (!validation.valid) throw new Error(validation.error ?? 'Bản lưu không hợp lệ; dữ liệu cũ được giữ nguyên.');
    if (existing.schemaVersion < CURRENT_SAVE_SCHEMA_VERSION) {
      const migrated = validation.data;
      if (!migrated) throw new Error(`Chưa có migration an toàn cho save schema ${existing.schemaVersion}; dữ liệu cũ được giữ nguyên.`);
      migrated.id = slotId;
      await db.transaction('rw', db.saves, async () => {
        const latest = await db.saves.get(slotId);
        if (!latest || latest.schemaVersion !== existing.schemaVersion || latest.revision !== existing.revision) {
          throw new Error('Bản lưu đã đổi trong lúc nâng cấp. Hãy tải lại trang và thử lại.');
        }
        await db.saves.put({ ...latest, id: backupKeyFor(slotId) });
        await db.saves.put(migrated);
      });
      return migrated;
    }
    const recovered = takeEmergencySave(slotId, existing);
    if (recovered) {
      await db.transaction('rw', db.saves, async () => {
        await db.saves.put({ ...existing, id: backupKeyFor(slotId) });
        await db.saves.put(recovered);
      });
      return recovered;
    }
    return existing;
  }

  // Create initial save ONLY when no record was found in the database
  const newSave: SaveGameData = {
    ...DEFAULT_INITIAL_SAVE,
    id: slotId,
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
    id: backupKeyFor(activeSlotId),
    updatedAt: new Date().toISOString(),
  };
  await db.saves.put(backup);
  return backup;
}

/**
 * Load backup save from IndexedDB
 */
export async function loadBackupSave(): Promise<SaveGameData | undefined> {
  return await db.saves.get(backupKeyFor(activeSlotId));
}

/**
 * Restore active save from backup
 */
export async function restoreFromBackup(): Promise<SaveGameData | undefined> {
  const backup = await loadBackupSave();
  if (!backup) return undefined;
  const restored: SaveGameData = {
    ...backup,
    id: activeSlotId,
    updatedAt: new Date().toISOString(),
  };
  await db.saves.put(restored);
  return restored;
}

/**
 * Persist active save state to IndexedDB, keeping previous valid revision as backup
 */
export async function persistSave(saveData: SaveGameData): Promise<SaveGameData> {
  const slotId = activeSlotId;
  const updated: SaveGameData = { ...saveData, id: slotId, updatedAt: new Date().toISOString() };
  const validation = validateSaveGameData(updated);
  if (!validation.valid || validation.versionStatus !== 'supported') throw new Error(validation.error ?? 'Không thể lưu dữ liệu chưa được nâng cấp hợp lệ.');
  await db.transaction('rw', db.saves, async () => {
    const existing = await db.saves.get(slotId);
    if (existing && updated.revision !== existing.revision + 1) {
      throw new Error('Bản lưu đã thay đổi. Vui lòng tải lại trò chơi trước khi lưu.');
    }
    if (existing) {
      await db.saves.put({ ...existing, id: backupKeyFor(slotId) });
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
    id: activeSlotId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 1,
  };

  await db.saves.put(freshSave);
  return freshSave;
}

/**
 * Thay bản lưu hiện tại bằng save nhập từ file. Save được kiểm tra lại, bản hiện tại giữ làm backup (một bản)
 * và revision đi tiếp từ bản cũ để hàng đợi lưu tuần tự không báo lệch.
 */
export async function replaceSaveWithImported(imported: SaveGameData): Promise<SaveGameData> {
  const validation = validateSaveGameData(imported);
  if (!validation.valid || !validation.data) throw new Error(validation.error ?? 'Bản lưu nhập vào không hợp lệ.');
  const slotId = activeSlotId;
  return await db.transaction('rw', db.saves, async () => {
    const existing = await db.saves.get(slotId);
    const next: SaveGameData = {
      ...validation.data!,
      id: slotId,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    if (existing) await db.saves.put({ ...existing, id: backupKeyFor(slotId) });
    await db.saves.put(next);
    return next;
  });
}
