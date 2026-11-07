import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1672 — chè chuối từ chuối nhà trồng.
describe('GĐ1672 — chè chuối', () => {
  it('nấu từ chuối + cốt dừa, nguyên liệu < doanh thu mẻ, mở sau nguyên liệu', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_che_chuoi')!;
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['x_chuoi', 'x_dua_cot_hop']));
    const cost = r.inputs.reduce((s, i) => s + productById(i.productId).buy * i.quantity, 0);
    expect(cost).toBeLessThan(productById('che_chuoi').sell * r.outputQty);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
});
