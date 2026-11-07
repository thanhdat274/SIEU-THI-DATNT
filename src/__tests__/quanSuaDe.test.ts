import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES, recipeCupCost } from '../data/quanRecipes';
import { productById } from '../data/products';

// GĐ1658 — sữa dê trại có lối ra quán nước.
describe('GĐ1658 — sữa dê đá', () => {
  const r = QUAN_RECIPES.find((x) => x.id === 'sua_de_da')!;
  it('món mát, dùng sữa dê, nguyên liệu mở trước, lời hơn 2× vốn', () => {
    expect(r.hot).toBeFalsy();
    expect(r.uses.map((u) => u.id)).toContain('sua_de');
    for (const u of r.uses) expect(productById(u.id).unlock).toBeLessThanOrEqual(r.unlock);
    expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
  });
});
