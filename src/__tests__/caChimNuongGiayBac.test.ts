import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ2157 — Cá chim nướng giấy bạc.
describe('GĐ2157 — Cá chim nướng giấy bạc', () => {
  const r = RECIPE_MAP['recipe_ca_chim_nuong_giay_bac'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('food_grill');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_ca_chim', 'x_sa', 'x_hanh_la']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
