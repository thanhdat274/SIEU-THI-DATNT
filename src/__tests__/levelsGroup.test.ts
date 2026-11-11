import { describe, expect, it } from 'vitest';
import { unlockGroups, unlocksAt } from '../data/levels';

// SPEC-TOI-UU T3-L5: gom nhóm ở màn lên cấp. unlockGroups phải giữ đủ mọi mục
// (tổng khớp unlocksAt phẳng) và nhóm cùng loại về với nhau.
describe('unlockGroups (T3-L5 — gom mục mở khóa ở màn lên cấp)', () => {
  it('một cấp mở quá nhiều (vd cấp 30) gom được thành nhóm ít dòng', () => {
    const groups = unlockGroups(30);
    const flat = unlocksAt(30);
    // Cấp 30 theo SPEC mở ~35 mục → phải > 6, nên việc gom có ý nghĩa.
    expect(flat.length).toBeGreaterThan(6);
    // Gom không được mất mục nào: tổng phần tử các nhóm = mảng phẳng.
    const sum = groups.reduce((n, g) => n + g.items.length, 0);
    expect(sum).toBe(flat.length);
    // Không nhóm nào trống.
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });

  it('một cấp ít mục (vd cấp 3) vẫn giữ nguyên mảng phẳng', () => {
    expect(unlocksAt(3)).toEqual(unlockGroups(3).flatMap((g) => g.items));
  });

  it('thứ tự các mục trong một cấp không đổi so với trước khi gom', () => {
    for (const lv of [1, 6, 21, 30, 45, 82, 100]) {
      expect(unlocksAt(lv)).toEqual(unlockGroups(lv).flatMap((g) => g.items));
    }
  });
});
