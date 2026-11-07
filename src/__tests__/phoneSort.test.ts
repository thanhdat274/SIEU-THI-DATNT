import { describe, it, expect } from 'vitest';
import { sortPhoneOrders } from '../data/phoneSort';
import type { PhoneOrder } from '../data/phoneOrders';

const o = (id: number, status: PhoneOrder['status'], items: Record<string, number>, answerBy: number, dueAt: number): PhoneOrder =>
  ({ id, houseId: 'h', caller: 'c', reason: 'r', items, calledAt: 0, answerBy, dueAt, status });

describe('GĐ1556 — xếp thẻ điện thoại', () => {
  it('đang giao (hẹn gần trước) → đủ hàng → thiếu hàng; cùng nhóm sắp hết giờ trước', () => {
    const list = [
      o(1, 'ringing', { mi: 5 }, 100, 0),
      o(2, 'ringing', { mi: 1 }, 120, 0),
      o(3, 'carrying', { mi: 1 }, 0, 300),
      o(4, 'carrying', { mi: 1 }, 0, 200),
      o(5, 'ringing', { mi: 1 }, 90, 0),
    ];
    expect(sortPhoneOrders(list, { mi: 2 }).map((x) => x.id)).toEqual([4, 3, 5, 2, 1]);
  });
  it('không đổi mảng gốc', () => {
    const list = [o(1, 'ringing', {}, 2, 0), o(2, 'ringing', {}, 1, 0)];
    sortPhoneOrders(list, {});
    expect(list.map((x) => x.id)).toEqual([1, 2]);
  });
});
