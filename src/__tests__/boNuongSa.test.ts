import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ2047 — Bò nướng sả.
describe('GĐ2047 — Bò nướng sả', () => {
  const r = RECIPE_MAP['recipe_bo_nuong_sa'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('food_grill');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_thit_bo', 'x_sa']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
