import { SAVE_SLOT_IDS, type SaveSlotId } from './db';

/**
 * Khóa ô lưu giữa các tab bằng Web Locks API: tab đang chơi một ô giữ khóa cho tới khi về menu hoặc đóng tab
 * (trình duyệt tự nhả khi tab đóng/treo). Trình duyệt không có Web Locks thì không khóa (vẫn còn kiểm revision trong `persistSave`).
 */
const lockName = (slotId: SaveSlotId) => `tiem-tap-hoa-save-${slotId}`;

let held: { slotId: SaveSlotId; release: () => void } | null = null;

export function slotLocksSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.locks;
}

/** Nhả khóa đang giữ (nếu có). Gọi khi về menu chính. */
export function releaseSlotLock(): void {
  held?.release();
  held = null;
}

/**
 * Xin khóa ô trước khi vào chơi. Trả về false nếu tab khác đang giữ ô này. Lỗi bất thường của Web Locks không chặn người chơi.
 */
export async function acquireSlotLock(slotId: SaveSlotId): Promise<boolean> {
  releaseSlotLock();
  if (!slotLocksSupported()) return true;
  return new Promise<boolean>((resolve) => {
    navigator.locks.request(lockName(slotId), { ifAvailable: true }, (lock) => {
      if (!lock) {
        resolve(false);
        return undefined;
      }
      return new Promise<void>((release) => {
        held = { slotId, release: () => release() };
        resolve(true);
      });
    }).catch(() => resolve(true));
  });
}

/** Các ô đang được tab khác giữ (ở menu tab này không giữ ô nào). */
export async function slotsLockedElsewhere(): Promise<Set<SaveSlotId>> {
  const result = new Set<SaveSlotId>();
  if (!slotLocksSupported()) return result;
  try {
    const state = await navigator.locks.query();
    for (const lock of state.held ?? []) {
      const slotId = SAVE_SLOT_IDS.find((id) => lockName(id) === lock.name);
      if (slotId && held?.slotId !== slotId) result.add(slotId);
    }
  } catch {
    // Không đọc được trạng thái khóa: coi như không có ô nào bị khóa.
  }
  return result;
}
