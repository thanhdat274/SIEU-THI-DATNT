import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1690 — cá basa chiên sả dùng sả (x_sa, GĐ1683) thay vì gừng.
describe('GĐ1690 — cá basa chiên sả dùng sả', () => {
  const r = RECIPE_MAP['recipe_ca_basa_chien_sa'];
  it('có cá basa + sả, không còn gừng', () => {
    const ids = r.inputs.map((i) => i.productId);
    expect(ids).toEqual(expect.arrayContaining(['ca_basa', 'x_sa']));
    expect(ids).not.toContain('x_gung');
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
