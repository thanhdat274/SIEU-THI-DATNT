import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1691 — bánh mì bơ tỏi phải thật sự dùng tỏi.
describe('GĐ1691 — bánh mì bơ tỏi dùng tỏi', () => {
  const r = RECIPE_MAP['recipe_banh_mi_bo_toi'];
  it('có bánh mì + bơ + tỏi, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_banh_mi', 'bo_sua', 'x_toi']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
