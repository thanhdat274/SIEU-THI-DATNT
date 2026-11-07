import { describe, expect, it } from 'vitest';
import { CROPS, cropById } from '../data/garden';
import { QUAN_RECIPES } from '../data/quanRecipes';
import { productById } from '../data/products';
import { createCropBuilder } from '../world/farmCrops';

// GĐ1651 — trồng Thơm (dứa) tự cung quán nước.
describe('GĐ1651 — giống thơm', () => {
  const c = cropById('thom');
  it('ra x_thom, mở sau mốc golden 30 và sau khi hàng thơm mở bán', () => {
    expect(c.productId).toBe('x_thom');
    expect(c.unlock).toBeGreaterThan(30);
    expect(productById('x_thom').unlock).toBeLessThanOrEqual(c.unlock);
    expect(CROPS.filter((x) => x.id === 'thom')).toHaveLength(1);
  });
  it('thơm là nguyên liệu quán nước (Trà dứa, Nước ép thơm)', () => {
    const users = QUAN_RECIPES.filter((r) => r.uses.some((u) => u.id === 'x_thom')).map((r) => r.id);
    expect(users).toEqual(expect.arrayContaining(['tra_dua_da', 'ep_thom_da']));
  });
  it('vụ thu lời hơn tiền giống (giá nhập)', () => {
    expect(c.yieldQty * productById('x_thom').buy).toBeGreaterThan(c.seedCost);
  });
  it('dựng được 4 giai đoạn', () => {
    const build = createCropBuilder();
    for (const st of [0, 1, 2, 3]) expect(build('thom', st).children.length).toBeGreaterThan(0);
  });
});
