import { describe, expect, it } from 'vitest';
import { RECIPE_MAP, RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1730 — Mít chiên giòn: lối ra bếp thứ hai cho mít trồng.
describe('Mít chiên giòn (GĐ1730)', () => {
  const r = RECIPE_MAP['recipe_mit_chien_gion'];
  it('mít + dầu ăn, mở sau golden 30, công thức duy nhất, nguyên liệu mở trước', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_mit', 'dauan']));
    expect(r.unlock).toBeGreaterThan(30);
    expect(COOKED_PRODUCTS.some((c) => c.id === 'mit_chien_gion')).toBe(true);
    expect(RECIPES.filter((x) => x.outputId === 'mit_chien_gion').length).toBe(1);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});

