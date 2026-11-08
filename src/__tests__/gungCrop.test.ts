import { describe, expect, it } from 'vitest';
import { CROPS, cropById } from '../data/garden';
import { QUAN_RECIPES } from '../data/quanRecipes';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';
import { createCropBuilder } from '../world/farmCrops';

// GĐ1652 — trồng Gừng tự cung quán nước + bếp.
describe('GĐ1652 — giống gừng', () => {
  const c = cropById('gung');
  it('ra x_gung, mở sau mốc golden 30, sau khi hàng gừng mở bán', () => {
    expect(c.productId).toBe('x_gung');
    expect(c.unlock).toBeGreaterThan(30);
    expect(productById('x_gung').unlock).toBeLessThanOrEqual(c.unlock);
    expect(CROPS.filter((x) => x.id === 'gung')).toHaveLength(1);
  });
  it('gừng có chỗ dùng: Trà gừng nóng và ít nhất một món bếp', () => {
    expect(QUAN_RECIPES.some((r) => r.id === 'tra_gung' && r.uses.some((u) => u.id === 'x_gung'))).toBe(true);
    expect(RECIPES.some((r) => r.inputs.some((i) => i.productId === 'x_gung'))).toBe(true);
  });
  it('vụ thu lời hơn tiền giống; dựng được 4 giai đoạn', () => {
    expect(c.yieldQty * productById('x_gung').buy).toBeGreaterThan(c.seedCost);
    const build = createCropBuilder();
    for (const st of [0, 1, 2, 3]) expect(build('gung', st).children.length).toBeGreaterThan(0);
  });
});
