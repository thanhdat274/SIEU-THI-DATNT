import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '../data/calendar';
import { PRODUCTS } from '../data/products';

// GĐ1669 — mỗi mục "hot" của lễ hội phải trỏ tới món hoặc nhóm hàng có thật (gõ sai id sẽ âm thầm vô tác dụng).
describe('GĐ1669 — hàng hot lễ hội hợp lệ', () => {
  it('mọi id hot là id món có thật (productById)', () => {
    const valid = new Set<string>(PRODUCTS.map((p) => p.id));
    const bad = FESTIVALS.flatMap((f) => [...(f.hot ?? []), ...(f.goods ?? [])].filter((h) => !valid.has(h)).map((h) => `${f.id}:${h}`));
    expect(bad).toEqual([]);
  });
});
