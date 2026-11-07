import { describe, expect, it } from 'vitest';
import { PROFESSIONS } from '../data/professions';
import { productById } from '../data/products';

// GĐ1711 — bà nội trợ mua sả tươi về nấu: x_sa có cầu lẻ hằng ngày.
describe('bà nội trợ thích sả (GĐ1711)', () => {
  it('likes của mom có x_sa và sản phẩm tồn tại', () => {
    const m = PROFESSIONS.find((p) => p.id === 'mom')!;
    expect(m.likes).toContain('x_sa');
    expect(productById('x_sa')).toBeTruthy();
  });
});
