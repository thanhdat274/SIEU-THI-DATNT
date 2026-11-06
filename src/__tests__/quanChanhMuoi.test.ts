import { describe, it, expect } from 'vitest';
import { QUAN_RECIPES } from '../data/quanRecipes';
import { HOMEMADE_PRODUCTS } from '../data/homemade';

describe('GĐ1445 — chanh muối hàng xóm có lối ra quán nước', () => {
  const hx = HOMEMADE_PRODUCTS.find((p) => p.id === 'hx_chanh_muoi')!;
  const drink = QUAN_RECIPES.find((r) => r.id === 'chanh_muoi_da')!;
  it('hàng tồn tại, mở không sớm hơn nguyên liệu', () => {
    expect(hx).toBeTruthy();
    expect(drink.unlock).toBeGreaterThanOrEqual(hx.unlock);
  });
  it('một ly lãi hơn phần chanh muối bán thẳng', () => {
    expect(drink.price).toBeGreaterThan(hx.sell / 12);
  });
});
