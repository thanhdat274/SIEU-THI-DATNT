import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ2048 — Trứng chưng.
describe('GĐ2048 — Trứng chưng', () => {
  const r = RECIPE_MAP['recipe_trung_chung'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('steamer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_trung_ga', 'x_thit_heo', 'x_hanh_la']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
