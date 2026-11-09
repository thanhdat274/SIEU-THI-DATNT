import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1966 — Đậu hũ sốt cà chua: chảo chiên, đậu hũ + cà chua.
describe('GĐ1966 — Đậu hũ sốt cà chua', () => {
  const r = RECIPE_MAP['recipe_dau_hu_sot_ca_chua'];
  it('chảo chiên, dùng đậu hũ + cà chua, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_dau_hu', 'x_ca_chua']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
