import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1660 — trứng vịt trại có lối ra thứ hai.
describe('GĐ1660 — hột vịt muối', () => {
  it('nấu từ trứng vịt + muối, có lời, nguyên liệu mở trước món', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_hot_vit_muoi')!;
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['trung_vit', 'x_muoi']));
    const p = productById('hot_vit_muoi')!;
    expect(p.sell).toBeGreaterThan(p.buy);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
});
