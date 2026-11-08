import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1689 — mực khoanh chiên giòn phải dùng bột chiên giòn.
describe('GĐ1689 — mực khoanh chiên giòn dùng bột chiên', () => {
  const r = RECIPE_MAP['recipe_muc_khoanh_chien'];
  it('có mực khoanh + bột chiên, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_muc_khoanh_dong_lanh', 'x_bot_chien']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
