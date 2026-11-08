import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1717 — Bò xào sả: lãi khi nấu, nguyên liệu mở không muộn hơn công thức.
describe('Bò xào sả (GĐ1717)', () => {
  const r = RECIPES.find((x) => x.id === 'recipe_bo_xao_sa')!;
  it('tồn tại, có sả, mở 54', () => {
    expect(r.unlock).toBe(54);
    expect(r.inputs.map((i) => i.productId)).toContain('x_sa');
  });
  it('lãi: đầu ra > tổng giá bán nguyên liệu; nguyên liệu mở sớm hơn', () => {
    const cost = r.inputs.reduce((s, i) => s + productById(i.productId).sell * i.quantity, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(cost);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
});
