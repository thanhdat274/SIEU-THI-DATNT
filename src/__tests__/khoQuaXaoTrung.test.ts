import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1968 — Khổ qua xào trứng: chảo chiên, khổ qua + trứng.
describe('GĐ1968 — Khổ qua xào trứng', () => {
  const r = RECIPE_MAP['recipe_kho_qua_xao_trung'];
  it('chảo chiên, dùng khổ qua + trứng, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_kho_qua', 'x_trung_ga']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
