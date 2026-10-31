import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { DELIVERY_MINUTES, FAST_TIP, NEIGHBOR_HOUSES, ON_TIME_TIP, phoneOrderValue, type PhoneOrder } from '../data/phoneOrders';
import { PRODUCTS } from '../data/products';

/**
 * orders.ts (slice) — đơn điện thoại: nghe máy lấy hàng khỏi kho, giao kịp/trễ ăn boa khác nhau, từ chối thì không mất gì.
 * Khoá: thiếu kho chặn nghe máy, soạn hàng trừ kho, boa x2 nửa đầu khung hẹn, trễ thì không boa và đánh giá 3★.
 */

const g = () => useGame.getState();
const PID = PRODUCTS[0].id;
const order = (over: Partial<PhoneOrder> = {}): PhoneOrder => ({
  id: 1, houseId: NEIGHBOR_HOUSES[0].id, caller: 'Cô Ba', reason: 'x', items: { [PID]: 2 },
  calledAt: 600, answerBy: 620, dueAt: 600 + DELIVERY_MINUTES, status: 'ringing', ...over,
});

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 100_000, level: 20, phoneOrders: [order()], storage: { [PID]: 5 }, minutes: 610 });
});

describe('nghe máy / từ chối', () => {
  it('đủ hàng: trừ kho, chuyển carrying; id lạ hoặc đã carrying thì trả false', () => {
    expect(g().answerPhone(99)).toBe(false);
    expect(g().answerPhone(1)).toBe(true);
    expect(g().storage[PID]).toBe(3);
    expect(g().phoneOrders[0].status).toBe('carrying');
    expect(g().answerPhone(1)).toBe(false);
    expect(g().storage[PID]).toBe(3);
  });

  it('thiếu hàng: không nghe máy, kho nguyên, vẫn đổ chuông', () => {
    useGame.setState({ storage: { [PID]: 1 } });
    expect(g().answerPhone(1)).toBe(false);
    expect(g().storage[PID]).toBe(1);
    expect(g().phoneOrders[0].status).toBe('ringing');
  });

  it('từ chối: bỏ đơn đang đổ chuông, không đổi tiền/kho', () => {
    g().declinePhone(1);
    expect(g().phoneOrders).toEqual([]);
    expect(g().money).toBe(100_000);
    expect(g().storage[PID]).toBe(5);
  });
});

describe('giao đơn điện thoại', () => {
  const carry = (minutes: number) => {
    g().answerPhone(1);
    useGame.setState({ minutes });
  };

  it('chưa soạn hàng (ringing) thì không giao được', () => {
    expect(g().deliverPhone(1)).toBe(false);
  });

  it('giao ngay nửa đầu khung hẹn: boa FAST_TIP, cộng két + doanh thu, đơn xong', () => {
    carry(620);
    const o = g().phoneOrders[0];
    const value = phoneOrderValue(o, g().priceOf);
    const tip = Math.round((value * FAST_TIP) / 1000) * 1000;
    const m0 = g().money;
    expect(g().deliverPhone(1)).toBe(true);
    expect(g().money).toBe(m0 + value + tip);
    expect(g().stats.revenue).toBeGreaterThanOrEqual(value + tip);
    expect(g().phoneOrdersDone).toBe(1);
    expect(g().phoneOrders).toEqual([]);
  });

  it('giao kịp hẹn nhưng không lẹ: boa ON_TIME_TIP', () => {
    carry(600 + DELIVERY_MINUTES - 5);
    const o = g().phoneOrders[0];
    const value = phoneOrderValue(o, g().priceOf);
    const tip = Math.round((value * ON_TIME_TIP) / 1000) * 1000;
    const m0 = g().money;
    g().deliverPhone(1);
    expect(g().money).toBe(m0 + value + tip);
  });

  it('giao trễ: chỉ nhận giá hàng, không boa, đánh giá 3★ thay vì 5★', () => {
    carry(600 + DELIVERY_MINUTES + 10);
    const o = g().phoneOrders[0];
    const value = phoneOrderValue(o, g().priceOf);
    const m0 = g().money;
    g().deliverPhone(1);
    expect(g().money).toBe(m0 + value);
    expect(g().reviews.at(-1)?.stars).toBe(3);
  });
});
