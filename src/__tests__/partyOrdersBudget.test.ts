import { describe, expect, it } from 'vitest';
import { PARTY_ORDERS } from '../data/orders';

// GĐ1759 — chống phình đơn tiệc: tổng số đơn có trần, id không trùng, và không có hai đơn
// một-món trùng món (mỗi món chỉ có tối đa một đơn đặt riêng).
describe('ngân sách đơn tiệc (GĐ1759)', () => {
  it('tổng số đơn tiệc ≤ 45', () => {
    expect(PARTY_ORDERS.length).toBeLessThanOrEqual(45);
  });
  it('id đơn không trùng', () => {
    const ids = PARTY_ORDERS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('không có hai đơn một-món đặt cùng một món', () => {
    const seen: Record<string, string> = {};
    const dup: string[] = [];
    for (const o of PARTY_ORDERS) {
      const keys = Object.keys(o.items);
      if (keys.length !== 1) continue;
      if (seen[keys[0]]) dup.push(`${seen[keys[0]]}/${o.id}`);
      else seen[keys[0]] = o.id;
    }
    expect(dup).toEqual([]);
  });
});
