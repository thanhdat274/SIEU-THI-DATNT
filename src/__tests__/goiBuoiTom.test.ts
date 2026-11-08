import { describe, expect, it } from 'vitest';
import { RECIPE_MAP, RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1728 — Gỏi bưởi tôm: lối ra bếp thứ hai cho bưởi trồng.
describe('Gỏi bưởi tôm (GĐ1728)', () => {
  const r = RECIPE_MAP['recipe_goi_buoi_tom'];
  it('bưởi + tôm, mở sau golden 30, công thức duy nhất, nguyên liệu mở trước', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_buoi', 'x_tom_tuoi']));
    expect(r.unlock).toBeGreaterThan(30);
    expect(COOKED_PRODUCTS.some((c) => c.id === 'goi_buoi_tom')).toBe(true);
    expect(RECIPES.filter((x) => x.outputId === 'goi_buoi_tom').length).toBe(1);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
