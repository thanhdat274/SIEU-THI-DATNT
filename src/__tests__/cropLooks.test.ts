import { describe, expect, it } from 'vitest';
import { CROPS } from '../data/garden';
import { cropHasLook } from '../world/farmCrops';

describe('GĐ1656 — mọi giống có dáng riêng', () => {
  it('không giống nào rơi về dáng cây ăn trái mặc định', () => {
    for (const c of CROPS) expect(cropHasLook(c.id), c.id).toBe(true);
  });
});

// GĐ1676 — mọi giống dựng được mô hình 3D ở cả 4 giai đoạn (không chỉ có khóa trong bảng dáng).
describe('GĐ1676 — mọi giống dựng được 4 giai đoạn', () => {
  it('build(id, 0..3) đều có mesh, giai đoạn chín đủ cỡ', async () => {
    const { createCropBuilder } = await import('../world/farmCrops');
    const build = createCropBuilder();
    for (const c of CROPS) for (const st of [0, 1, 2, 3]) {
      const g = build(c.id, st);
      expect(g.children.length, `${c.id}@${st}`).toBeGreaterThan(0);
      if (st === 3) expect(g.scale.x, c.id).toBe(1);
    }
  });
});
