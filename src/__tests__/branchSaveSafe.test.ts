import { describe, it, expect, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';
import { normalizeBranch, branchAlerts, newBranch } from '../data/branches';

/**
 * Save schema cũ chứa object `branch` dở dang (thiếu staff...) từng làm BranchAlert trong HUD sập
 * `Cannot read properties of undefined (reading 'some')` → cả cây React unmount, màn hình trắng
 * (bắt được trên QA trình duyệt thật 27/10, save ngày 60). Chốt: normalizeBranch ở applySnapshot
 * + branchAlerts tự phòng thủ, không bao giờ ném vì field thiếu.
 */
describe('branch save-safe (phòng màn hình trắng HUD)', () => {
  beforeEach(() => {
    useGame.setState(newGameData());
  });

  it('normalizeBranch: null/undefined → null; object dở dang bù đủ field từ newBranch', () => {
    expect(normalizeBranch(null)).toBeNull();
    expect(normalizeBranch(undefined)).toBeNull();
    const fixed = normalizeBranch({ open: true, shelf: { mi: 5 } } as never)!;
    expect(fixed.open).toBe(true); // giá trị save thắng
    expect(fixed.shelf).toEqual({ mi: 5 });
    expect(Array.isArray(fixed.staff)).toBe(true); // field thiếu bù mặc định
    expect(fixed.vendingEnabled).toBe(false);
    expect(fixed.lastTrip).toBe(-999);
  });

  it('normalizeBranch giữ nguyên staff có sẵn', () => {
    const b = { ...newBranch(), staff: [{ id: 1, name: 'A' } as never] };
    expect(normalizeBranch(b)!.staff).toHaveLength(1);
  });

  it('applySnapshot: save cũ chỉ có {open,shelf} → branch đủ field, không undefined', () => {
    const old = snapshot();
    (old as Record<string, unknown>).branch = { open: true, shelf: { mi: 3 } };
    applySnapshot(old as Parameters<typeof applySnapshot>[0]);
    const b = useGame.getState().branch!;
    expect(b.open).toBe(true);
    expect(b.shelf).toEqual({ mi: 3 });
    expect(Array.isArray(b.staff)).toBe(true);
    expect(typeof b.simAt).toBe('number');
  });

  it('applySnapshot: branch null thì vẫn null (ván mới chưa mua chi nhánh)', () => {
    const fresh = snapshot();
    expect(fresh.branch).toBeNull();
    applySnapshot(fresh as Parameters<typeof applySnapshot>[0]);
    expect(useGame.getState().branch).toBeNull();
  });

  it('branchAlerts không ném với branch thiếu staff/shelf (ngay cả khi chưa qua normalize)', () => {
    const partial = { open: true } as never as Parameters<typeof branchAlerts>[0];
    expect(() => branchAlerts(partial, 600)).not.toThrow();
    const out = branchAlerts(partial, 600);
    expect(out.length).toBeGreaterThanOrEqual(1); // kệ trống + thiếu thu ngân
    expect(out.some((a) => a.danger)).toBe(true);
  });

  it('branchAlerts với branch đủ vẫn chạy đúng (không hồi quy)', () => {
    const b = newBranch();
    b.open = true;
    b.shelf = { mi: 10 };
    const out = branchAlerts(b, 600); // 10h sáng, có hàng, chưa tuyển ai → chỉ alert thiếu thu ngân
    expect(out).toEqual([{ text: '🛒 Chi nhánh: không có thu ngân trực lúc này — khách bỏ về', danger: true }]);
  });
});
