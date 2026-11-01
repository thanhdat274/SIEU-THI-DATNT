import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { FORGIVE_FRIEND_GAIN, REMIND_FRIEND_LOSS } from '../data/credit';
import { PRODUCTS } from '../data/products';
import { REGULARS } from '../data/regulars';
import { REVIEW_CAP } from '../data/reviews';

/**
 * regulars.ts (slice) — sổ nợ khách quen, lời hẹn giữ món, đánh giá: chỗ tiền vào/ra két và thân thiết thay đổi.
 * Khoá: ghi sổ lấy lại tiền khỏi két (không mất doanh thu thật), thu nợ cộng két + sổ "repaid", nhắc nợ chỉ 1 lần,
 * xoá nợ tặng thân thiết, hẹn giữ món hẹn cho NGÀY MAI, đánh giá có trần và đếm 5★.
 */

const g = () => useGame.getState();
const R = REGULARS[0].id;
const PID = PRODUCTS[0].id;
const cart = (n: number, price = 10_000) => Array.from({ length: n }, () => ({ id: PID, price }));

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 500_000, level: 20, debts: {}, reservations: {}, reviews: [] });
});

describe('sổ nợ — ghi sổ / thu / nhắc / xoá', () => {
  it('ghi sổ: két không nhận tiền (tổng nợ cộng dồn, since giữ lần đầu), sổ credited tăng', () => {
    const m0 = g().money;
    g().checkoutOnCredit(R, cart(2), 0, 0); // 20k
    const afterFirst = g().money;
    expect(g().debts[R].amount).toBe(20_000);
    useGame.setState({ day: g().day + 3 });
    g().checkoutOnCredit(R, cart(1), 0, 0); // +10k
    expect(g().debts[R].amount).toBe(30_000);
    expect(g().debts[R].since).toBe(g().day - 3); // mốc nợ giữ lần đầu
    // so với bán thường: tiền két sau ghi sổ KHÔNG cao hơn trước khi bán (khách chưa trả)
    expect(afterFirst).toBe(m0);
    expect(g().money).toBe(m0);
    expect(g().stats.credited).toBe(30_000);
  });

  it('thu nợ: cộng két đúng số nợ, xoá khỏi sổ, ghi repaid; không nợ thì trả 0 và không đổi gì', () => {
    expect(g().collectDebt(R)).toBe(0);
    useGame.setState({ debts: { [R]: { amount: 45_000, since: 1 } } });
    const m0 = g().money;
    expect(g().collectDebt(R)).toBe(45_000);
    expect(g().money).toBe(m0 + 45_000);
    expect(g().debts[R]).toBeUndefined();
    expect(g().stats.repaid).toBe(45_000);
  });

  it('nhắc nợ: đánh dấu reminded, trừ thân thiết đúng 1 lần (nhắc lại không trừ thêm)', () => {
    useGame.setState({ debts: { [R]: { amount: 10_000, since: 1 } }, regulars: { [R]: { friendship: 10, visits: 3, perks: [], discovered: [] } } });
    g().remindDebt(R);
    expect(g().debts[R].reminded).toBe(true);
    expect(g().regulars[R].friendship).toBe(10 - REMIND_FRIEND_LOSS);
    g().remindDebt(R);
    expect(g().regulars[R].friendship).toBe(10 - REMIND_FRIEND_LOSS);
  });

  it('xoá nợ: bỏ khỏi sổ, KHÔNG cộng tiền, tặng thân thiết FORGIVE_FRIEND_GAIN', () => {
    useGame.setState({ debts: { [R]: { amount: 80_000, since: 1 } }, regulars: { [R]: { friendship: 5, visits: 2, perks: [], discovered: [] } } });
    const m0 = g().money;
    g().forgiveDebt(R);
    expect(g().debts[R]).toBeUndefined();
    expect(g().money).toBe(m0);
    expect(g().regulars[R].friendship).toBe(5 + FORGIVE_FRIEND_GAIN);
  });
});

describe('lời hẹn giữ món', () => {
  it('đặt hẹn: hẹn cho ngày MAI; id khách lạ thì bỏ qua; từ chối thì xoá không mất thân thiết', () => {
    g().addReservation('khong-ton-tai', PID, 3);
    expect(g().reservations).toEqual({});
    g().addReservation(R, PID, 3);
    expect(g().reservations[R]).toMatchObject({ productId: PID, qty: 3, day: g().day + 1 });
    useGame.setState({ regulars: { [R]: { friendship: 7, visits: 1, perks: [], discovered: [] } } });
    g().cancelReservation(R);
    expect(g().reservations[R]).toBeUndefined();
    expect(g().regulars[R].friendship).toBe(7);
  });
});

describe('thân thiết & đánh giá', () => {
  it('adjustFriendship: tăng/giảm, không xuống dưới 0, id lạ bỏ qua', () => {
    g().adjustFriendship('khong-ton-tai', 5);
    g().adjustFriendship(R, 3);
    expect(g().regulars[R].friendship).toBe(3);
    g().adjustFriendship(R, -10);
    expect(g().regulars[R].friendship).toBe(0);
  });

  it('addReview: id tăng dần, giữ tối đa REVIEW_CAP bản mới nhất, 5★ cộng cả totals lẫn stats ngày', () => {
    for (let i = 0; i < REVIEW_CAP + 5; i++) g().addReview(i % 2 ? 5 : 3, undefined);
    const rs = g().reviews;
    expect(rs).toHaveLength(REVIEW_CAP);
    expect(rs.at(-1)!.id).toBe(REVIEW_CAP + 5);
    expect(rs[0].id).toBe(6);
    const fives = Math.floor((REVIEW_CAP + 5) / 2);
    expect(g().totals.fiveStars).toBe(fives);
    expect(g().stats.fiveStars).toBe(fives);
  });
});
