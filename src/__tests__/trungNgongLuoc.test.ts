import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1661 — trứng ngỗng trại có lối ra thứ hai.
describe('GĐ1661 — trứng ngỗng luộc', () => {
  it('nấu từ trứng ngỗng, có lời so với giá nhập món, nguyên liệu mở trước', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_trung_ngong_luoc')!;
    expect(r.inputs.map((i) => i.productId)).toContain('trung_goos');
    const p = productById('trung_ngong_luoc')!;
    expect(p.sell).toBeGreaterThan(p.buy);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
});
