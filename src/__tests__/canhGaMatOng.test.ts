import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1687 — cánh gà nướng mật (id 'canh_ga_nuong_mat') thật sự dùng mật ong.
describe('GĐ1687 — cánh gà nướng mật ong', () => {
  const r = RECIPE_MAP['recipe_canh_ga_nuong_mat'];
  it('có cánh gà + mật ong, tên khớp, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_canh_ga', 'x_mat_ong']));
    expect(productById(r.outputId).name).toBe('Cánh gà nướng mật ong');
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
