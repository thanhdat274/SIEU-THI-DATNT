/**
 * Khóa mềm "đang sửa bố cục" theo hẻm: mỗi hẻm tối đa một người giữ khóa.
 * Khóa tự hết hạn nếu người giữ ngừng gia hạn (heartbeat WS 10 s/lần), để tab treo không giữ khóa mãi.
 */
export const LAYOUT_LOCK_TTL_MS = 45_000;

export class LayoutLockRegistry {
  private readonly locks = new Map<string, { accountId: string; expiresAt: number }>();

  /** Người đang giữ khóa còn hiệu lực của hẻm, hoặc null. */
  holder(worldId: string, now = Date.now()): string | null {
    const lock = this.locks.get(worldId);
    if (!lock) return null;
    if (lock.expiresAt <= now) { this.locks.delete(worldId); return null; }
    return lock.accountId;
  }

  /** Lấy (hoặc gia hạn) khóa; false nếu người khác đang giữ. */
  acquire(worldId: string, accountId: string, now = Date.now()): boolean {
    const current = this.holder(worldId, now);
    if (current && current !== accountId) return false;
    this.locks.set(worldId, { accountId, expiresAt: now + LAYOUT_LOCK_TTL_MS });
    return true;
  }

  /** Gia hạn chỉ khi chính người này đang giữ. */
  renew(worldId: string, accountId: string, now = Date.now()): void {
    if (this.holder(worldId, now) === accountId) this.locks.set(worldId, { accountId, expiresAt: now + LAYOUT_LOCK_TTL_MS });
  }

  /** Nhả khóa nếu đúng người giữ; trả true khi có nhả. */
  release(worldId: string, accountId: string, now = Date.now()): boolean {
    if (this.holder(worldId, now) !== accountId) return false;
    this.locks.delete(worldId);
    return true;
  }

  clearWorld(worldId: string): void { this.locks.delete(worldId); }
}

export const layoutLocks = new LayoutLockRegistry();
