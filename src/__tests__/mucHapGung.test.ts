import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1682 — mực hấp gừng phải thật sự dùng gừng (gừng trồng được ở nông trại).
describe('GĐ1682 — mực hấp gừng dùng gừng', () => {
  const r = RECIPE_MAP['recipe_muc_hap_gung'];
  it('có mực tươi + gừng, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_muc_tuoi', 'x_gung']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
