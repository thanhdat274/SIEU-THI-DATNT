import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES, recipeCupCost } from '../data/quanRecipes';
import { productById } from '../data/products';

// GĐ1663 — gừng trại có món mát ở quán nước.
describe('GĐ1663 — cam gừng đá', () => {
  const r = QUAN_RECIPES.find((x) => x.id === 'cam_gung_da')!;
  it('món mát, dùng gừng + cam, nguyên liệu mở trước, lời hơn 2× vốn', () => {
    expect(r.hot).toBeFalsy();
    expect(r.uses.map((u) => u.id)).toEqual(expect.arrayContaining(['x_gung', 'x_cam']));
    for (const u of r.uses) expect(productById(u.id).unlock).toBeLessThanOrEqual(r.unlock);
    expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
  });
});
