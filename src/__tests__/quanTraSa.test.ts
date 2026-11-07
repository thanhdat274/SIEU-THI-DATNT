import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES, recipeCupCost } from '../data/quanRecipes';
import { productById } from '../data/products';

// GĐ1703 — sả (GĐ1683) có món mát ở quán nước.
describe('GĐ1703 — trà sả đá', () => {
  const r = QUAN_RECIPES.find((x) => x.id === 'tra_sa_da')!;
  it('món mát, dùng trà + sả, nguyên liệu mở trước, lời hơn 2× vốn', () => {
    expect(r.hot).toBeFalsy();
    expect(r.uses.map((u) => u.id)).toEqual(expect.arrayContaining(['tra', 'x_sa']));
    for (const u of r.uses) expect(productById(u.id).unlock).toBeLessThanOrEqual(r.unlock);
    expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
  });
});
