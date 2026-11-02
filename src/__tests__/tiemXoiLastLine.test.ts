import { describe, expect, it } from 'vitest';
import { tiemXoiLastLine } from '../data/tiemXoi';

describe('dòng Hôm qua tiệm xôi (GĐ554)', () => {
  it('hiện suất ăn tại chỗ khi có, bỏ khi 0/thiếu (save cũ)', () => {
    const base = { total: 80, cost: 100_000, wages: 180_000, saved: 50_000 };
    expect(tiemXoiLastLine({ ...base, dine: 12 })).toContain('🪑 12 suất ăn tại chỗ');
    expect(tiemXoiLastLine(base)).not.toContain('🪑');
    expect(tiemXoiLastLine({ ...base, dine: 0 })).not.toContain('🪑');
    expect(tiemXoiLastLine(base).length).toBeLessThanOrEqual(90);
  });
});
