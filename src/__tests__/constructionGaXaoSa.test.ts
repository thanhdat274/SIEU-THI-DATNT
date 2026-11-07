import { describe, expect, it } from 'vitest';
import { PROFESSIONS } from '../data/professions';
import { productById } from '../data/products';

// GĐ1710 — thợ xây thích gà xào sả: món mới có cầu hằng ngày, không chỉ qua đơn/lễ hội.
describe('thợ xây thích gà xào sả (GĐ1710)', () => {
  it('likes có ga_xao_sa và sản phẩm tồn tại', () => {
    const c = PROFESSIONS.find((p) => p.id === 'construction')!;
    expect(c.likes).toContain('ga_xao_sa');
    expect(productById('ga_xao_sa')).toBeTruthy();
  });
});
