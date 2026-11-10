import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ2199 — Cá bớp hấp xì dầu.
describe('GĐ2199 — Cá bớp hấp xì dầu', () => {
  const r = RECIPE_MAP['recipe_ca_bop_hap_xi_dau'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('steamer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_ca_bop', 'x_nuoc_tuong', 'x_gung']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
