import { describe, expect, it } from 'vitest';
import { blockedLabel } from '../ui/shortLabel';

describe('GĐ1958 nút khóa ghi lý do', () => {
  it('có lý do → ghi lý do; không → nhãn/thiếu tiền như cũ', () => {
    expect(blockedLabel('🎓 Mai học tiếp', 'Đào tạo', 100, 0)).toBe('🎓 Mai học tiếp');
    expect(blockedLabel(null, 'Đào tạo', 100, 500)).toBe('Đào tạo');
    expect(blockedLabel(null, 'Đào tạo', 100, 0)).toMatch(/^Thiếu/);
  });
});
