import { describe, expect, it } from 'vitest';
import { productById } from '../data/products';
import { RECIPES } from '../data/recipes';

describe('GĐ1951 — Bánh căn (món có thật)', () => {
  const r = RECIPES.find((x) => x.id === 'recipe_banh_can')!;
  it('đổ khuôn đất ở bếp nướng, mở sau golden 30 và sau mọi nguyên liệu', () => {
    expect(r.station).toBe('food_grill');
    expect(r.unlock).toBeGreaterThan(30);
    for (const i of r.inputs) expect(r.unlock).toBeGreaterThanOrEqual(productById(i.productId).unlock);
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
