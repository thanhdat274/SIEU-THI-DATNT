import { describe, expect, it } from 'vitest';
import { blockedLabel } from '../ui/shortLabel';

describe('GĐ1958 nút khóa ghi lý do', () => {
  it('có lý do → ghi lý do; không → nhãn/thiếu tiền như cũ', () => {
    expect(blockedLabel('🎓 Mai học tiếp', 'Đào tạo', 100, 0)).toBe('🎓 Mai học tiếp');
    expect(blockedLabel(null, 'Đào tạo', 100, 500)).toBe('Đào tạo');
    expect(blockedLabel(null, 'Đào tạo', 100, 0)).toMatch(/^Thiếu/);
  });
});

describe('GĐ1959 nút không giá', () => {
  it('giá 0 → nhãn gốc khi không vướng, lý do khi vướng', () => {
    expect(blockedLabel(null, '🍹 Tự pha 4 ly', 0, 0)).toBe('🍹 Tự pha 4 ly');
    expect(blockedLabel('🍹 Chọn món vào thực đơn trước', 'x', 0, 0).length).toBeLessThanOrEqual(40);
  });
});
