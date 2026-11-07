import { describe, expect, it } from 'vitest';
import { shortLabel } from '../ui/shortLabel';

describe('GĐ1631 — nút mua thiếu tiền nêu số thiếu', () => {
  it('đủ tiền giữ nhãn; thiếu thì ghi số thiếu', () => {
    expect(shortLabel('Chọn', 100000, 150000)).toBe('Chọn');
    expect(shortLabel('Chọn', 100000, 100000)).toBe('Chọn');
    expect(shortLabel('Chọn', 100000, 40000)).toMatch(/^Thiếu 60/);
  });
});
