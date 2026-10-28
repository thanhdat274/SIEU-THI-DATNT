import { describe, it, expect } from 'vitest';
import { branchMorningPlan } from '../data/branchMorning';
import { newBranch, nightNeed, shelfTotal, type BranchState } from '../data/branches';
import type { Staff } from '../data/staff';

const staff = (role: Staff['role'], shift: Staff['shift'], id: number): Staff => ({
  id, name: role, role, skill: 3, wage: 10000, shift,
});

const openBranch = (opts: { shelf?: Record<string, number>; staff?: Staff[] } = {}): BranchState => {
  const b = newBranch();
  b.open = true;
  b.shelf = opts.shelf ?? { milk: 5 };
  b.staff = opts.staff ?? [];
  return b;
};

describe('branchMorningPlan — Tiện lợi 24/7 việc hôm nay', () => {
  it('chi nhánh đóng / chưa mở → không có việc gì', () => {
    expect(branchMorningPlan(null, 0, {}, 5)).toEqual([]);
    const b = newBranch(); // open = false
    expect(branchMorningPlan(b, 0, {}, 5)).toEqual([]);
  });

  it('đêm chưa có thu ngân ca đêm → cảnh báo', () => {
    const b = openBranch({ staff: [staff('cashier', 'morning', 1)] });
    const out = branchMorningPlan(b, 0, {}, 5);
    expect(out.some((c) => c.icon === '🌙')).toBe(true);
    expect(out.find((c) => c.icon === '🌙')!.danger).toBe(true);
  });

  it('có thu ngân ca đêm → hết cảnh báo thu ngân', () => {
    const b = openBranch({ staff: [staff('cashier', 'night', 2)] });
    expect(branchMorningPlan(b, 0, {}, 5).some((c) => c.icon === '🌙')).toBe(false);
  });

  it('kệ có rượu bia mà đêm chưa có bảo vệ → cảnh báo trộm', () => {
    const b = openBranch({ shelf: { bia: 3 }, staff: [staff('cashier', 'night', 2)] });
    const out = branchMorningPlan(b, 0, {}, 5);
    expect(out.some((c) => c.icon === '🍺')).toBe(true);
  });

  it('có bảo vệ ca đêm → hết cảnh báo trộm', () => {
    const b = openBranch({ shelf: { bia: 3 }, staff: [staff('cashier', 'night', 2), staff('guard', 'night', 3)] });
    expect(branchMorningPlan(b, 0, {}, 5).some((c) => c.icon === '🍺')).toBe(false);
  });

  it('manager che bớt cảnh báo nhân sự (thu ngân + bảo vệ)', () => {
    const b = openBranch({ shelf: { bia: 3 }, staff: [staff('manager', 'full', 9)] });
    const out = branchMorningPlan(b, 0, {}, 5);
    expect(out.some((c) => c.icon === '🌙')).toBe(false);
    expect(out.some((c) => c.icon === '🍺')).toBe(false);
  });

  it('kệ có rượu bia mà giấy phép chưa có → nhắc mua (danger)', () => {
    const b = openBranch({ shelf: { bia: 3 } });
    const out = branchMorningPlan(b, 0, {}, 5);
    const lic = out.find((c) => c.icon === '🧾');
    expect(lic).toBeDefined();
    expect(lic!.danger).toBe(true);
    expect(lic!.text).toContain('chưa có');
  });

  it('giấy phép đã hết hạn → danger', () => {
    const b = openBranch({ shelf: { bia: 3 } });
    const lic = branchMorningPlan(b, 0, { alcohol: 2 }, 5)!.find((c) => c.icon === '🧾');
    expect(lic!.text).toContain('đã hết hạn');
    expect(lic!.danger).toBe(true);
  });

  it('giấy phép sắp hết hạn → nhắc nhưng không danger đỏ', () => {
    const b = openBranch({ shelf: { bia: 3 } });
    // RENEW_WARN_DAYS trước khi hết hạn
    const lic = branchMorningPlan(b, 0, { alcohol: 6 }, 5)!.find((c) => c.icon === '🧾');
    expect(lic!.text).toContain('sắp hết hạn');
    expect(lic!.danger).toBe(false);
  });

  it('giá trị licenseStatus valid → không nhắc giấy phép', () => {
    const b = openBranch({ shelf: { bia: 3 } });
    const out = branchMorningPlan(b, 0, { alcohol: 500 }, 5);
    expect(out.some((c) => c.icon === '🧾')).toBe(false);
  });

  it('tổng kệ + kho chung dưới nhu cầu đêm → nhắc châm hàng', () => {
    const need = nightNeed();
    const b = openBranch({ shelf: { a: 1 } }); // shelfTotal = 1
    const out = branchMorningPlan(b, 0, {}, 5);
    expect(out.some((c) => c.icon === '🕳️')).toBe(1 + 0 < need);
  });

  it('đủ hàng → không nhắc châm', () => {
    const need = nightNeed();
    const b = openBranch({ shelf: { a: need + 50 } });
    const out = branchMorningPlan(b, need + 50, {}, 5);
    expect(out.some((c) => c.icon === '🕳️')).toBe(false);
  });

  it('định lực: cùng đầu vào cho kết quả giống nhau', () => {
    const b = openBranch({ shelf: { bia: 3 }, staff: [staff('cashier', 'morning', 1)] });
    const a = branchMorningPlan(b, 0, {}, 5);
    const c = branchMorningPlan(b, 0, {}, 5);
    expect(a).toEqual(c);
  });
});
