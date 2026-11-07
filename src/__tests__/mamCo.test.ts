import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

/** GĐ1523 — Mâm cỗ đầu ngõ: món cuối chuỗi ghép từ 5 món TỰ NẤU (Xóm C#4). */
describe('mâm cỗ đầu ngõ (GĐ1523)', () => {
  const r = RECIPE_MAP.recipe_mam_co_ngo;
  it('mọi nguyên liệu là món nấu được (có công thức), mở trước mâm', () => {
    expect(r.inputs).toHaveLength(5);
    const cooked = new Set(Object.values(RECIPE_MAP).map((x) => x.outputId));
    for (const i of r.inputs) {
      expect(cooked.has(i.productId)).toBe(true);
      expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
    }
  });
  it('sau golden 30, tránh mốc soát biên, đáng làm hơn bán lẻ 5 món nhưng biên nhập ≤1,42', () => {
    expect(r.unlock).toBeGreaterThan(30);
    expect([82, 86, 91, 96, 100]).not.toContain(r.unlock);
    const out = productById(r.outputId);
    const parts = r.inputs.reduce((n, i) => n + productById(i.productId).sell * i.quantity, 0);
    expect(out.sell * r.outputQty).toBeGreaterThan(parts);
    expect(out.sell / out.buy).toBeLessThanOrEqual(1.42);
    expect(r.reputationGain).toBeGreaterThan(3);
  });
});
