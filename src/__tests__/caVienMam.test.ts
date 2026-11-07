import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById, PRODUCTS } from '../data/products';
import { aliasProductIds } from '../core/save';

// GĐ1686 — thêm Nước mắm chai vào danh mục; cá viên chiên nước mắm thật sự dùng nước mắm.
describe('GĐ1686 — cá viên chiên nước mắm dùng nước mắm', () => {
  const r = RECIPE_MAP['recipe_ca_vien_chien_mam'];
  it('GĐ1693: dùng nước mắm sẵn có (nuocmam), không còn mã trùng x_nuoc_mam', () => {
    expect(productById('nuocmam').name).toBe('Nước mắm');
    expect(PRODUCTS.some((p) => p.id === 'x_nuoc_mam')).toBe(false);
    expect(aliasProductIds({ storage: { x_nuoc_mam: 3, hx_nuoc_mam: 1 } })).toEqual({ storage: { nuocmam: 3, hx_nuoc_mam: 1 } });
  });
  it('có cá viên + nước mắm, nguyên liệu mở không trễ hơn món', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_ca_vien', 'nuocmam']));
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
