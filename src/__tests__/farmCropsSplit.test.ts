import { describe, expect, it } from 'vitest';
import { CROPS } from '../data/garden';
import { createCropBuilder } from '../world/farmCrops';

describe('GĐ987 — world/farmCrops tách khỏi world/farm', () => {
  it('mọi giống dựng được ở cả 4 giai đoạn và lớn dần', () => {
    const build = createCropBuilder();
    for (const c of CROPS) {
      const sizes = [0, 1, 2, 3].map((st) => {
        const g = build(c.id, st);
        expect(g.children.length).toBeGreaterThan(0);
        return g.scale.x;
      });
      expect(sizes[3]).toBe(1);
      expect(sizes[0]).toBeLessThan(sizes[3]);
    }
  });
  it('giống lạ rơi về dáng cây ăn trái', () => {
    expect(createCropBuilder()('khong_co', 3).children.length).toBeGreaterThan(5);
  });
});
