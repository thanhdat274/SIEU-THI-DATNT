import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1662 — canh chua cá dùng thơm trại + cà chua.
describe('GĐ1662 — canh chua cá', () => {
  it('nấu từ cá + thơm + cà chua, có lời, nguyên liệu mở trước món', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_canh_chua_ca')!;
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['ca', 'x_thom', 'x_ca_chua']));
    const p = productById('canh_chua_ca')!;
    expect(p.sell).toBeGreaterThan(p.buy);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
});
