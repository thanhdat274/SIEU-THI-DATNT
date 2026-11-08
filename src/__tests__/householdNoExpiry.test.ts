import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../data/products';
import { shelfLife } from '../data/freshness';

// GĐ1630 — playtest đợt 2 M3 nghi "Diêm/bật lửa hết hạn": đồ gia dụng không bao giờ cận hạn.
describe('GĐ1630 — đồ gia dụng không hết hạn', () => {
  it('diêm/bật lửa và mọi món household có hạn vô tận', () => {
    expect(shelfLife('diem')).toBe(Infinity);
    for (const p of PRODUCTS.filter((x) => x.category === 'household')) expect(shelfLife(p.id), p.id).toBe(Infinity);
  });
});
