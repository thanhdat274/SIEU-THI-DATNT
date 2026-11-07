import { describe, expect, it } from 'vitest';
import { CROPS } from '../data/garden';

describe('GĐ1657 — mít không trùng icon với thơm', () => {
  it('mỗi giống một icon riêng', () => {
    const icons = CROPS.map((c) => c.icon);
    expect(CROPS.find((c) => c.id === 'mit')!.icon).not.toBe(CROPS.find((c) => c.id === 'thom')!.icon);
    expect(new Set(icons).size, 'trùng icon').toBe(icons.length);
  });
});
