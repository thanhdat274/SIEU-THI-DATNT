import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES, recipeCupCost } from '../data/quanRecipes';
import { productById } from '../data/products';

// GĐ1650 — món mát mới "Nước ép thơm" ở quán nước.
describe('GĐ1650 — nước ép thơm', () => {
  const r = QUAN_RECIPES.find((x) => x.id === 'ep_thom_da')!;
  it('có thật, không nóng, nguyên liệu mở trước, lời hơn 2× giá vốn', () => {
    expect(r.hot).toBeFalsy();
    for (const u of r.uses) expect(productById(u.id).unlock).toBeLessThanOrEqual(r.unlock);
    expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
  });
});
