import { describe, expect, it } from 'vitest';
import { CROPS, cropById } from '../data/garden';
import { QUAN_RECIPES } from '../data/quanRecipes';
import { createCropBuilder } from '../world/farmCrops';

describe('GĐ1088 — trồng Chanh dây (nông trại → quán nước, tự cung)', () => {
  it('giống chanh dây tồn tại, ra đúng sản phẩm x_chanh_day, mở cấp ≥32 (> mốc golden 30)', () => {
    const c = CROPS.find((x) => x.id === 'chanhday');
    expect(c).toBeDefined();
    expect(c!.productId).toBe('x_chanh_day');
    expect(c!.unlock).toBeGreaterThanOrEqual(32);
    expect(c!.yieldQty).toBeGreaterThan(0);
    expect(CROPS.filter((x) => x.id === 'chanhday')).toHaveLength(1);
  });

  it('x_chanh_day là nguyên liệu trực tiếp của món "Chanh dây đá" ở quán nước', () => {
    const r = QUAN_RECIPES.find((x) => x.id === 'chanh_day')!;
    expect(r).toBeDefined();
    expect(r.unlock).toBeGreaterThanOrEqual(32);
    expect(r.uses.some((u) => u.id === 'x_chanh_day')).toBe(true);
  });

  it('giống chanh dây dựng được ở 4 giai đoạn và lớn dần (CROP_LOOK)', () => {
    const build = createCropBuilder();
    const sizes = [0, 1, 2, 3].map((st) => {
      const g = build('chanhday', st);
      expect(g.children.length).toBeGreaterThan(0);
      return g.scale.x;
    });
    expect(sizes[3]).toBe(1);
    expect(sizes[0]).toBeLessThan(sizes[3]);
  });

  it('cấp 30 (mốc golden) chưa mở giống chanh dây → không làm lệch RNG mốc', () => {
    const c = cropById('chanhday');
    expect(c.unlock).toBeGreaterThan(30);
    // chưa mở khóa ở cấp 30 thì bot không trồng được → không đổi sim mốc
    expect(CROPS.filter((x) => x.unlock <= 30).map((x) => x.id)).not.toContain('chanhday');
  });
});
