import { describe, expect, it } from 'vitest';
import { RECIPE_MAP, RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1706 + GĐ1717 (gộp GĐ1723): món xào sả ở chảo chiên.
const CASES: [string, string, string][] = [
  ['recipe_ga_xao_sa', 'ga_xao_sa', 'thit_ga'],
  ['recipe_bo_xao_sa', 'bo_xao_sa', 'thit_bo_tuoi'],
];

describe.each(CASES)('%s', (rid, out, meat) => {
  const r = RECIPE_MAP[rid];
  it('chảo chiên, thịt + sả, mở sau golden 30, công thức duy nhất, nguyên liệu mở sớm hơn', () => {
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining([meat, 'x_sa']));
    expect(r.unlock).toBeGreaterThan(30);
    expect(COOKED_PRODUCTS.some((c) => c.id === out)).toBe(true);
    expect(RECIPES.filter((x) => x.outputId === out).length).toBe(1);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
