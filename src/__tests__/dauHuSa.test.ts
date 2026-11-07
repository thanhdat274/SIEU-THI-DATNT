import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1683 — thêm Sả vào danh mục; đậu hũ chiên sả thật sự dùng sả.
describe('GĐ1683 — đậu hũ chiên sả dùng sả', () => {
  const r = RECIPE_MAP['recipe_dau_hu_chien_sa'];
  it('sả có trong danh mục, mở sau golden 30', () => {
    const sa = productById('x_sa');
    expect(sa.name).toBe('Sả');
    expect(sa.unlock).toBeGreaterThan(30);
  });
  it('có đậu hũ + sả, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_dau_hu', 'x_sa']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
