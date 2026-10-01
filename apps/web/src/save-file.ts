import { CURRENT_SAVE_SCHEMA_VERSION, validateSaveGameData, type SaveGameData } from '@game/shared';

/** Định dạng file xuất: bọc save trong một phong bì có nhãn để nhận ra file lạ và đổi định dạng sau này. */
export const SAVE_FILE_FORMAT = 'tiem-tap-hoa-dau-hem-save';
export const SAVE_FILE_FORMAT_VERSION = 1;
/** File lớn hơn mức này bị từ chối trước khi parse (save thật vài trăm KB; sổ cái tăng dần). */
export const MAX_SAVE_FILE_BYTES = 5 * 1024 * 1024;

export interface SaveFileEnvelope {
  format: typeof SAVE_FILE_FORMAT;
  formatVersion: number;
  exportedAt: string;
  save: SaveGameData;
}

export interface SaveSummary {
  day: number;
  level: number;
  money: number;
  totalRevenue: number;
  updatedAt: string;
}

export type ParsedSaveFile =
  | { ok: true; save: SaveGameData; summary: SaveSummary; migratedFromSchema?: number }
  | { ok: false; error: string };

export function summarizeSave(save: SaveGameData): SaveSummary {
  return {
    day: save.worldTime.day,
    level: save.player.level,
    money: save.player.money,
    totalRevenue: save.statistics.totalRevenue,
    updatedAt: save.updatedAt,
  };
}

/** Chuỗi JSON của file xuất. Không kèm trường nào ngoài save (không có token/tài khoản). */
export function buildSaveFile(save: SaveGameData, exportedAt = new Date().toISOString()): string {
  const envelope: SaveFileEnvelope = { format: SAVE_FILE_FORMAT, formatVersion: SAVE_FILE_FORMAT_VERSION, exportedAt, save };
  return JSON.stringify(envelope, null, 2);
}

export function saveFileName(save: SaveGameData, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  return `tiem-tap-hoa-ngay${save.worldTime.day}-${stamp}.json`;
}

/**
 * Đọc và kiểm tra nội dung file nhập. Chấp nhận phong bì của game; từ chối file lạ, JSON hỏng, schema tương lai
 * hoặc save không qua `validateSaveGameData`. Không ghi gì: người gọi tự quyết định có áp dụng không.
 */
export function parseSaveFile(text: string): ParsedSaveFile {
  if (text.length > MAX_SAVE_FILE_BYTES) return { ok: false, error: 'File quá lớn để là bản lưu của game.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File không phải JSON hợp lệ.' };
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'File không phải bản lưu của game.' };
  const envelope = raw as Partial<SaveFileEnvelope>;
  if (envelope.format !== SAVE_FILE_FORMAT) return { ok: false, error: 'File không phải bản lưu của Tiệm Tạp Hóa Đầu Hẻm.' };
  if (typeof envelope.formatVersion !== 'number' || envelope.formatVersion > SAVE_FILE_FORMAT_VERSION) {
    return { ok: false, error: 'File được xuất từ phiên bản game mới hơn, chưa hỗ trợ.' };
  }
  const validation = validateSaveGameData(envelope.save);
  if (!validation.valid || !validation.data) return { ok: false, error: validation.error ?? 'Bản lưu trong file bị hỏng hoặc thiếu dữ liệu.' };
  const save = structuredClone(validation.data);
  const migratedFromSchema = (envelope.save as { schemaVersion?: number }).schemaVersion;
  return {
    ok: true,
    save,
    summary: summarizeSave(save),
    ...(typeof migratedFromSchema === 'number' && migratedFromSchema < CURRENT_SAVE_SCHEMA_VERSION ? { migratedFromSchema } : {}),
  };
}
