import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1996 — Mực chiên nước mắm.
describe('GĐ1996 — Mực chiên nước mắm', () => {
  const r = RECIPE_MAP['recipe_muc_chien_nuoc_mam'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_muc_tuoi', 'x_toi', 'hx_nuoc_mam']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
