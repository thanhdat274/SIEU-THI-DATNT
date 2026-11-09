import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ2104 — Nghêu nướng mỡ hành.
describe('GĐ2104 — Nghêu nướng mỡ hành', () => {
  const r = RECIPE_MAP['recipe_ngheu_nuong_mo_hanh'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('food_grill');
    expect(r.inputs.map((i) => i.productId)).toEqual(['ngheu', 'x_hanh_la', 'x_dau_phong']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
