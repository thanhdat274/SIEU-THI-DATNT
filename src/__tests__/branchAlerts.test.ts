import { describe, expect, it } from 'vitest';
import { branchAlerts, type BranchEvent, type BranchState } from '../data/branches';
import type { Staff } from '../data/staff';

/**
 * Bộ test GĐ-BRANCH-ALERT — "chi nhánh lên tiếng": trước đây trạng thái nguy hiểm của tài sản lớn
 * nhất (calloff/mất điện/trộm/thiếu thu ngân/kệ cạn) chỉ hiện khi mở BranchPanel; giờ một hàm thuần
 * branchAlerts() gộp chúng thành cảnh báo HUD.
 *
 * Hợp đồng: branchAlerts(branch, minute) → list {text, danger}; rỗng khi chi nhánh chưa mở/ổn;
 * ưu tiên danger đúng cho các sự kiện gây mất tiền/khách bỏ về. Visually QA pending (Cần duyệt).
 */

const staff = (id: number, role: Staff['role'], shift: Staff['shift']): Staff => ({
  id, name: `NV${id}`, role, skill: 3, wage: 50000, shift,
});

const baseBranch = (): BranchState => ({
  open: true, shelf: { mi: 20 }, staff: [], simAt: 0, lastTrip: -999, revenueToday: 0, customersToday: 0, lostToday: 0, missedToday: 0,
});

describe('branchAlerts — chi nhánh chưa mở hoặc ổn thì im lặng', () => {
  it('chưa mở → rỗng dù có nguy cơ', () => {
    expect(branchAlerts({ ...baseBranch(), open: false }, 360)).toEqual([]);
  });

  it('đêm có bảo vệ + thu ngân + hàng → rỗng', () => {
    const b = { ...baseBranch(), staff: [staff(1, 'cashier', 'night'), staff(2, 'guard', 'night')] };
    expect(branchAlerts(b, 1 * 60 + 30)).toEqual([]); // 1h30 sáng
  });
});

describe('branchAlerts — sự kiện đêm', () => {
  it('calloff chưa cover → cảnh báo; có cover → không còn', () => {
    const calloff: BranchEvent = { kind: 'calloff', at: 22 * 60, staffId: 9 };
    const b = { ...baseBranch(), staff: [staff(9, 'cashier', 'night')], event: calloff };
    const a = branchAlerts(b, 23 * 60);
    expect(a.some((x) => x.text.includes('xin nghỉ'))).toBe(true);
    expect(a.some((x) => x.danger)).toBe(true); // không thu ngân khác → danger
    // Đã cover → hết cảnh báo calloff (nhưng nếu vẫn thiếu thu ngân thì cảnh báo khác giữ)
    const covered = branchAlerts({ ...b, event: { ...calloff, covered: true } }, 23 * 60);
    expect(covered.some((x) => x.text.includes('xin nghỉ'))).toBe(false);
  });

  it('drunk đã xảy ra → cảnh báo danger; chưa tới (done false) → chưa có', () => {
    const drunk: BranchEvent = { kind: 'drunk', at: 23 * 60, done: true };
    const b = { ...baseBranch(), event: drunk, blockedUntil: 23 * 60 + 60, staff: [staff(1, 'cashier', 'night')] };
    const a = branchAlerts(b, 23 * 60 + 10);
    expect(a.some((x) => x.text.includes('say quậy'))).toBe(true);
    expect(a.some((x) => x.text.includes('ngưng bán'))).toBe(true);
    expect(a.some((x) => x.danger)).toBe(true);
    // Chưa bắn (done undefined) → không báo
    const notYet = branchAlerts({ ...b, event: { kind: 'drunk', at: 25 * 60 } }, 22 * 60);
    expect(notYet.some((x) => x.text.includes('say quậy'))).toBe(false);
  });

  it('blackout đã xảy ra → cảnh báo danger', () => {
    const b = { ...baseBranch(), staff: [staff(1, 'cashier', 'night')], event: { kind: 'blackout', at: 23 * 60, done: true } as BranchEvent };
    const a = branchAlerts(b, 23 * 60 + 5);
    expect(a.some((x) => x.text.includes('mất điện'))).toBe(true);
    expect(a.some((x) => x.danger)).toBe(true);
  });
});

describe('branchAlerts — vận hành thiếu', () => {
  it('không có thu ngân trực → danger', () => {
    const b = { ...baseBranch(), staff: [staff(1, 'stocker', 'morning')] };
    // 15h chiều: stocker ca morning đã hết, không thu ngân
    const a = branchAlerts(b, 15 * 60);
    expect(a.some((x) => x.text.includes('thu ngân'))).toBe(true);
    expect(a.some((x) => x.danger)).toBe(true);
  });

  it('kệ trống hàng → nhắc; đêm kệ trống thì danger', () => {
    const b = { ...baseBranch(), shelf: {}, staff: [staff(1, 'cashier', 'morning')] };
    const day = branchAlerts(b, 10 * 60); // sáng, thu ngân trực
    expect(day.some((x) => x.text.includes('kệ trống') || x.text.includes('kệ cạn'))).toBe(true);
    expect(day.some((x) => x.danger)).toBe(false);
    const nightAlert = branchAlerts(b, 23 * 60);
    const empty = nightAlert.find((x) => x.text.includes('kệ trống'));
    expect(empty?.danger).toBe(true);
  });

  it('đêm không bảo vệ → danger (nguy cơ trộm)', () => {
    const b = { ...baseBranch(), staff: [staff(1, 'cashier', 'night')] }; // thiếu guard
    const a = branchAlerts(b, 0 * 60 + 30);
    expect(a.some((x) => x.text.includes('bảo vệ'))).toBe(true);
    expect(a.some((x) => x.danger)).toBe(true);
  });

  it('có quản lý thì không báo thiếu thu ngân/bảo vệ (tự xếp ca)', () => {
    const b = { ...baseBranch(), staff: [staff(1, 'manager', 'full')] };
    const a = branchAlerts(b, 15 * 60);
    expect(a.some((x) => x.text.includes('thu ngân'))).toBe(false);
    const night = branchAlerts({ ...b }, 0 * 60 + 30);
    expect(night.some((x) => x.text.includes('bảo vệ'))).toBe(false);
  });
});

describe('branchAlerts — không trùng lặp và giới hạn', () => {
  it('calloff + thiếu thu ngân + kệ trống + đêm không bảo vệ không báo trùng text', () => {
    const b: BranchState = {
      ...baseBranch(), shelf: {},
      staff: [staff(1, 'stocker', 'morning')],
      event: { kind: 'calloff', at: 22 * 60, staffId: 5 } as BranchEvent,
    };
    const a = branchAlerts(b, 0 * 60 + 30);
    const texts = a.map((x) => x.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(a.length).toBeGreaterThanOrEqual(2);
  });

  it('mọi nguy cơ đều an toàn khi đầy đủ nhân sự', () => {
    const full = {
      ...baseBranch(),
      staff: [staff(1, 'cashier', 'night'), staff(2, 'guard', 'night'), staff(3, 'stocker', 'night'), staff(4, 'courier', 'night')],
    };
    expect(branchAlerts(full, 2 * 60)).toEqual([]);
  });
});
