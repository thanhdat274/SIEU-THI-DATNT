import { describe, expect, it } from 'vitest';
import { RECIPE_MAP, RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';
import { FESTIVALS } from '../data/calendar';

// GĐ1728 + GĐ1730 (gộp GĐ1731): lối ra bếp thứ hai cho trái cây trồng.
const CASES: [string, string, string[]][] = [
  ['recipe_goi_buoi_tom', 'goi_buoi_tom', ['x_buoi', 'x_tom_tuoi']],
  ['recipe_mit_chien_gion', 'mit_chien_gion', ['x_mit', 'dauan']],
];

describe.each(CASES)('%s', (rid, out, ings) => {
  const r = RECIPE_MAP[rid];
  it('đúng nguyên liệu, mở sau golden 30, công thức duy nhất, nguyên liệu mở trước', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(ings));
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

// GĐ1729: Tết rơi đúng mùa bưởi (12–2) → gỏi bưởi tôm là hàng hot Tết.
describe('Tết hút gỏi bưởi tôm', () => {
  it('goi_buoi_tom trong hot Tết Nguyên Đán', () => {
    expect(FESTIVALS.find((f) => f.id === 'tet')!.hot).toContain('goi_buoi_tom');
  });
});
