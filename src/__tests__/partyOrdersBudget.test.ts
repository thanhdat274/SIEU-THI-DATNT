import { describe, expect, it } from 'vitest';
import { PARTY_ORDERS } from '../data/orders';

// GĐ1759 — chống phình đơn tiệc: tổng số đơn có trần, id không trùng, và không có hai đơn
// một-món trùng món (mỗi món chỉ có tối đa một đơn đặt riêng).
describe('ngân sách đơn tiệc (GĐ1759)', () => {
  it('tổng số đơn tiệc ≤ 50', () => {
    // GĐ2385: Leader chốt nâng trần 45→50 (baseline có chủ ý) để gắn kết 15 món mới GĐ2370–2383
    // vào vòng lặp đơn đặt hàng; 5 đơn mới đủ câu chuyện, mỗi món mới đều có đơn gắn.
    expect(PARTY_ORDERS.length).toBeLessThanOrEqual(50);
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
