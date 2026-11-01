import { describe, expect, it } from 'vitest';
import { showRestockExtras } from '../data/onboarding';

describe('Nhập hàng ngày 1 gọn cho người mới (GĐ551)', () => {
  it('ẩn chợ phiên + cần nhập gấp ở ngày 1, hiện từ ngày 2', () => {
    expect(showRestockExtras(1)).toBe(false);
    expect(showRestockExtras(2)).toBe(true);
    expect(showRestockExtras(31)).toBe(true);
  });
});
