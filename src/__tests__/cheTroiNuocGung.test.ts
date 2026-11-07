import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1664 — chè trôi nước có gừng (đúng món thật), vẫn lời.
describe('GĐ1664 — chè trôi nước gừng', () => {
  it('có gừng, tiền nguyên liệu < doanh thu mẻ', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_che_troi_nuoc')!;
    expect(r.inputs.map((i) => i.productId)).toContain('x_gung');
    const cost = r.inputs.reduce((s, i) => s + productById(i.productId).buy * i.quantity, 0);
    expect(cost).toBeLessThan(productById('che_troi_nuoc').sell * r.outputQty);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
});
