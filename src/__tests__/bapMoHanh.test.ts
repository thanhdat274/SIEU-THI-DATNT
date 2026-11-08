import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';

// GĐ1680 — bắp nướng "mỡ hành" phải thật sự dùng hành lá.
describe('GĐ1680 — bắp ngọt nướng mỡ hành dùng hành lá', () => {
  const r = RECIPE_MAP['recipe_bap_ngot_nuong'];
  it('có x_bap và x_hanh_la, hành lá mở không trễ hơn món', () => {
    const ids = r.inputs.map((i) => i.productId);
    expect(ids).toEqual(expect.arrayContaining(['x_bap', 'x_hanh_la']));
    expect(productById('x_hanh_la').unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ vẫn lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});
