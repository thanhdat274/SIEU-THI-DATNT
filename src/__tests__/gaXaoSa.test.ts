import { describe, expect, it } from 'vitest';
import { RECIPE_MAP, RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1706 — Gà xào sả: thêm lối ra cho sả trồng (GĐ1704) và gà nguyên con.
describe('GĐ1706 — gà xào sả', () => {
  const r = RECIPE_MAP['recipe_ga_xao_sa'];
  it('có công thức duy nhất ở chảo chiên, dùng gà + sả, mở sau golden 30', () => {
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['thit_ga', 'x_sa']));
    expect(r.unlock).toBeGreaterThan(30);
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ga_xao_sa')).toBe(true);
    expect(RECIPES.filter((x) => x.outputId === 'ga_xao_sa').length).toBe(1);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
