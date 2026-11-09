import { describe, expect, it } from 'vitest';
import { productById } from '../data/products';
import { RECIPES } from '../data/recipes';

describe('GĐ1925 — Trà ô mai sấu (lối ra thứ hai của ô mai sấu, quầy pha)', () => {
  const r = RECIPES.find((x) => x.id === 'recipe_tra_o_mai_sau')!;
  const ing = productById('hx_o_mai_sau');
  it('đúng trạm, mở sau golden 30 và sau nguyên liệu', () => {
    expect(r.station).toBe('drink_counter');
    expect(r.unlock).toBeGreaterThan(30);
    expect(r.unlock).toBeGreaterThanOrEqual(ing.unlock);
    expect(r.inputs.some((i) => i.productId === 'hx_o_mai_sau')).toBe(true);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu, outputId duy nhất', () => {
    const cost = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = r.outputQty * productById(r.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
    expect(RECIPES.filter((x) => x.outputId === r.outputId).length).toBe(1);
  });
});
