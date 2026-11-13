import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES, recipeCupCost } from '../data/quanRecipes';
import { productById } from '../data/products';

// GĐ2437 — chanh tuyết: đá xay chanh tươi trứ danh của quán vỉa hè vào menu quán nước.
describe('GĐ2437 — chanh tuyết', () => {
  const r = QUAN_RECIPES.find((x) => x.id === 'chanh_tuyet')!;
  it('món mát, chanh + đường + đá, nguyên liệu mở trước, lời hơn 2× vốn', () => {
    expect(r.hot).toBeFalsy();
    expect(r.uses.map((u) => u.id)).toEqual(expect.arrayContaining(['x_chanh_khong_hat', 'x_duong', 'x_nuoc_da']));
    for (const u of r.uses) expect(productById(u.id).unlock).toBeLessThanOrEqual(r.unlock);
    expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
  });
});
