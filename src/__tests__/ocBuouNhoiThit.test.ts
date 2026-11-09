import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ2103 — Ốc bươu nhồi thịt.
describe('GĐ2103 — Ốc bươu nhồi thịt', () => {
  const r = RECIPE_MAP['recipe_oc_buou_nhoi_thit'];
  it('đúng trạm + nguyên liệu, nguyên liệu mở không trễ hơn món', () => {
    expect(r.station).toBe('steamer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['x_oc', 'x_thit_heo', 'x_gung']);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
