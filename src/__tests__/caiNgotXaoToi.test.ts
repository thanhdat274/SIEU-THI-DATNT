import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ2207 — Cải ngọt xào tỏi.
describe('GĐ2207 — Cải ngọt xào tỏi', () => {
  const r = RECIPE_MAP['recipe_cai_ngot_xao_toi'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_cai_ngot', 'x_toi', 'x_muoi']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
