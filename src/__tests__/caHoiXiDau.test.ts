import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1685 — cá hồi hấp xì dầu phải thật sự dùng nước tương.
describe('GĐ1685 — cá hồi hấp xì dầu dùng nước tương', () => {
  const r = RECIPE_MAP['recipe_ca_hoi_hap_xi_dau'];
  it('có cá hồi + nước tương, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_ca_hoi_dong_lanh', 'x_nuoc_tuong']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
