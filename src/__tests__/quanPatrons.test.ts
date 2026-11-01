import { describe, expect, it } from 'vitest';
import { quanPatrons } from '../data/quanNuoc';

/** GĐ426 — khách ngồi trong cửa hàng nước 3D. */
describe('quanPatrons', () => {
  it('không bàn hoặc chưa bán: không khách', () => {
    expect(quanPatrons(0, 100)).toBe(0);
    expect(quanPatrons(2, undefined)).toBe(0);
  });
  it('mỗi 12 ly một khách, tối đa 2 ghế mỗi bàn', () => {
    expect(quanPatrons(3, 13)).toBe(2);
    expect(quanPatrons(1, 500)).toBe(2);
    expect(quanPatrons(9, 500)).toBe(6);
  });
});

import { QUAN_TIERS } from '../data/quanNuoc';
import { QUAN_TIER_SIGNS } from '../world/quanNuocStand';
describe('biển hiệu theo bậc (GĐ429)', () => {
  it('mỗi bậc có một biển', () => {
    expect(QUAN_TIER_SIGNS).toHaveLength(QUAN_TIERS.length);
  });
});
