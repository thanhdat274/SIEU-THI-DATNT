import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';
import { cropById } from '../data/garden';

// GĐ1655 — món bếp "Cá kho thơm" dùng thơm trồng được.
describe('GĐ1655 — cá kho thơm', () => {
  const r = RECIPES.find((x) => x.id === 'recipe_ca_kho_thom')!;
  it('nguyên liệu có thật, mở trước món; thơm trồng được ở trại', () => {
    for (const i of r.inputs) expect(productById(i.productId).unlock, i.productId).toBeLessThanOrEqual(r.unlock);
    expect(r.inputs.some((i) => i.productId === 'x_thom')).toBe(true);
    expect(cropById('thom').productId).toBe('x_thom');
  });
  it('bán lời hơn giá vốn nguyên liệu mỗi phần', () => {
    const cost = r.inputs.reduce((a, i) => a + productById(i.productId).buy * i.quantity, 0) / r.outputQty;
    expect(productById(r.outputId).sell).toBeGreaterThan(cost * 1.5);
  });
});
