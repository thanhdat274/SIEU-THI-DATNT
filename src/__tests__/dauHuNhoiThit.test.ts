import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1969 — Đậu hũ nhồi thịt: chảo chiên, đậu hũ + thịt xay.
describe('GĐ1969 — Đậu hũ nhồi thịt', () => {
  const r = RECIPE_MAP['recipe_dau_hu_nhoi_thit'];
  it('chảo chiên, dùng đậu hũ + thịt xay, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_dau_hu', 'x_thit_xay']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
