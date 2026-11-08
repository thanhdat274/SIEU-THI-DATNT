import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1681 — chè khoai môn nấu với nước cốt dừa.
describe('GĐ1681 — chè khoai môn có nước cốt dừa', () => {
  const r = RECIPE_MAP['recipe_che_khoai_mon'];
  it('dùng khoai môn + cốt dừa, nguyên liệu mở không trễ hơn món', () => {
    const ids = r.inputs.map((i) => i.productId);
    expect(ids).toEqual(expect.arrayContaining(['x_khoai_mon', 'x_dua_cot_hop']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
