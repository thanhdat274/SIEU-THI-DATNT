import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1686 — thêm Nước mắm chai vào danh mục; cá viên chiên nước mắm thật sự dùng nước mắm.
describe('GĐ1686 — cá viên chiên nước mắm dùng nước mắm', () => {
  const r = RECIPE_MAP['recipe_ca_vien_chien_mam'];
  it('nước mắm có trong danh mục, mở sau golden 30', () => {
    expect(productById('x_nuoc_mam').name).toBe('Nước mắm');
    expect(productById('x_nuoc_mam').unlock).toBeGreaterThan(30);
  });
  it('có cá viên + nước mắm, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_ca_vien', 'x_nuoc_mam']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
