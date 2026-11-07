import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES, recipeCupCost } from '../data/quanRecipes';
import { productById } from '../data/products';

// GĐ1666 — gấc trại có món ở quán nước.
describe('GĐ1666 — nước ép gấc', () => {
  const r = QUAN_RECIPES.find((x) => x.id === 'ep_gac_da')!;
  it('món mát, dùng gấc, nguyên liệu mở trước, lời hơn 2× vốn', () => {
    expect(r.hot).toBeFalsy();
    expect(r.uses.map((u) => u.id)).toContain('x_gac');
    for (const u of r.uses) expect(productById(u.id).unlock).toBeLessThanOrEqual(r.unlock);
    expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
  });
});
