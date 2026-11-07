import { describe, it, expect } from 'vitest';
import { finePaidXp } from '../data/inspection';

describe('GĐ1546 — nộp phạt đàng hoàng có XP', () => {
  it('nộp đủ ở cấp ≥35: 0,2% tiền phạt; vệ sinh gấp hoặc cấp thấp: 0', () => {
    expect(finePaidXp(0, 100_000, 35)).toBe(200);
    expect(finePaidXp(1, 100_000, 40)).toBe(0);
    expect(finePaidXp(0, 100_000, 34)).toBe(0);
  });
});
