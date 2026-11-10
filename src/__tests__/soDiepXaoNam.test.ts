import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ2150 — Sò điệp xào nấm.
describe('GĐ2150 — Sò điệp xào nấm', () => {
  const r = RECIPE_MAP['recipe_so_diep_xao_nam'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_so_diep', 'x_nam_kim_cham', 'x_toi']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
