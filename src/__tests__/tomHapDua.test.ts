import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1684 — tôm hấp nước dừa phải thật sự dùng nước dừa.
describe('GĐ1684 — tôm hấp nước dừa dùng nước dừa', () => {
  const r = RECIPE_MAP['recipe_tom_tuoi_hap'];
  it('có tôm tươi + nước dừa, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_tom_tuoi', 'x_nuoc_dua_hop']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
