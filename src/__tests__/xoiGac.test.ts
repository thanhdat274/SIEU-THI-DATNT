import { describe, expect, it } from 'vitest';
import { CROPS } from '../data/garden';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1665 — gấc trại → xôi gấc ở tiệm xôi.
describe('GĐ1665 — gấc và xôi gấc', () => {
  it('giống gấc cho trái gấc, mở sau cấp 30', () => {
    const c = CROPS.find((x) => x.id === 'gac')!;
    expect(c.productId).toBe('x_gac');
    expect(c.unlock).toBeGreaterThan(30);
  });
  it('xôi gấc nấu từ nếp + gấc, lời, nguyên liệu mở trước', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_xoi_gac')!;
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['nep', 'x_gac']));
    const p = productById('xoi_gac');
    expect(p.sell).toBeGreaterThan(p.buy);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
});
