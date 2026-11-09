import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1998 — Canh chua tôm.
describe('GĐ1998 — Canh chua tôm', () => {
  const r = RECIPE_MAP['recipe_canh_chua_tom'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('hot_kettle');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_tom_tuoi', 'x_thom', 'x_ca_chua']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
