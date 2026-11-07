import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1659 — gà Đông Tảo có lối ra thứ hai, dùng gừng trại.
describe('GĐ1659 — gà Đông Tảo hấp gừng', () => {
  it('nấu từ gà Đông Tảo + gừng, có lời, nguyên liệu mở trước món', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_ga_dt_hap_gung')!;
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['thit_ga_dt', 'x_gung']));
    const p = productById('ga_dt_hap_gung')!;
    expect(p.sell).toBeGreaterThan(p.buy);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
});
