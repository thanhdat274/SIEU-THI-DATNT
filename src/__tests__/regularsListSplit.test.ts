import { describe, expect, it } from 'vitest';
import { REGULARS, regularById } from '../data/regulars';
import { REGULARS as LIST } from '../data/regularsList';

describe('GĐ974 — data/regularsList tách khỏi data/regulars', () => {
  it('regulars.ts xuất lại cùng mảng REGULARS', () => {
    expect(REGULARS).toBe(LIST);
    expect(LIST.length).toBeGreaterThan(5);
  });
  it('id duy nhất và regularById tìm được', () => {
    const ids = LIST.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(regularById(ids[0])).toBe(LIST[0]);
  });
  it('mỗi khách có đặc quyền với ngưỡng thân thiết dương', () => {
    for (const r of LIST) {
      expect(r.perks.length).toBeGreaterThanOrEqual(1);
      for (const p of r.perks) expect(p.threshold).toBeGreaterThan(0);
    }
  });
});
