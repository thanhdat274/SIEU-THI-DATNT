import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { onlineDayEnd, updateOnline } from '../core/slices/online';
import {
  grabFee, newOnline, onlineDayEvent, onlineEventLine, ONLINE_HOURS,
  onlineOrderCap, orderGap, ONLINE_OPEN_COST,
} from '../data/online';
import { setSimSeed, clearSimSeed } from '../core/rand';

/**
 * GĐ717 — sự kiện một ngày ở mảng app (pattern GĐ703/711/712): endDay rút bằng simRng cho NGÀY MAI.
 *  🚀 promo (p 0,06): đơn dày hơn — khoảng cách 2 đơn ×0,65. 🛵 grabSurge (p 0,05): phí Grab ×1,5.
 *  Chỉ hiệu chỉnh nhịp đơn/phí của ngày đó; bản lưu cũ thiếu trường event = không có sự kiện.
 */

const g = () => useGame.getState();

describe('onlineDayEvent — phân bố và tất định (băm riêng theo seed ván + ngày)', () => {
  it('400 seed (cùng một ngày): promo ~6%, grabSurge ~5%, phần lớn không có; cùng seed+ngày cùng kết quả', () => {
    let promo = 0;
    let surge = 0;
    for (let s = 1; s <= 400; s++) {
      const ev = onlineDayEvent(s, 12);
      if (ev === 'promo') promo++;
      if (ev === 'grabSurge') surge++;
    }
    expect(promo).toBeGreaterThanOrEqual(10);
    expect(promo).toBeLessThanOrEqual(40);
    expect(surge).toBeGreaterThanOrEqual(8);
    expect(surge).toBeLessThanOrEqual(36);
    expect(onlineDayEvent(7, 12)).toBe(onlineDayEvent(7, 12));
    expect(onlineDayEvent(7, 12)).toBe(onlineDayEvent(7, 12));
  });
  it('một seed qua 400 ngày: cả hai loại sự kiện đều xuất hiện, nhiều ngày không có gì', () => {
    let promo = 0;
    let surge = 0;
    for (let d = 2; d <= 401; d++) {
      const ev = onlineDayEvent(1234, d);
      if (ev === 'promo') promo++;
      if (ev === 'grabSurge') surge++;
    }
    expect(promo).toBeGreaterThanOrEqual(10);
    expect(promo).toBeLessThanOrEqual(40);
    expect(surge).toBeGreaterThanOrEqual(8);
    expect(surge).toBeLessThanOrEqual(36);
  });
});

describe('hệ số sự kiện — thuần, khớp nơi tiêu tiền', () => {
  it('promo co khoảng cách đơn đúng 0,65 → cap tăng; grabSurge nhân phí Grab ×1,5 làm tròn nghìn', () => {
    expect(orderGap(4.6, 20, 0.65)).toBeCloseTo(orderGap(4.6, 20) * 0.65, 10);
    expect(onlineOrderCap(4.6, 20, 0.65)).toBeGreaterThan(onlineOrderCap(4.6, 20));
    expect(grabFee(2)).toBe(16000);
    expect(grabFee(2, 1)).toBe(16000);
    expect(grabFee(2, 1.5)).toBe(24000);
    expect(grabFee(5, 1.5)).toBe(42000);
  });
  it('dòng tin sự kiện ngắn ≤90 ký tự, đúng nội dung, không có sự kiện thì rỗng', () => {
    expect(onlineEventLine('promo')).toContain('khuyến mãi');
    expect(onlineEventLine('grabSurge')).toContain('Grab');
    expect(onlineEventLine(undefined)).toBe('');
    for (const ev of ['promo', 'grabSurge'] as const) expect([...onlineEventLine(ev)].length).toBeLessThanOrEqual(90);
  });
});

describe('onlineDayEnd — nhận sự kiện cho ngày mai, không truyền giữ hành vi cũ', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), level: 20, money: 5_000_000, notify: () => {} }));
  it('truyền sự kiện: lưu vào online.event; không truyền: event undefined kể cả khi hôm qua có', () => {
    useGame.setState({ online: { ...newOnline(), open: true, done: 3, event: 'promo' } });
    expect(onlineDayEnd(g()).online.event).toBeUndefined(); // không truyền → hết sự kiện (hành vi cũ)
    expect(onlineDayEnd(g(), 'grabSurge').online.event).toBe('grabSurge');
  });
});

describe('tick và nhận đơn áp sự kiện của hôm nay', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(), level: 20, money: 1_000_000, shopOpen: true, minutes: 600, notify: () => {},
    });
  });
  afterEach(() => clearSimSeed());

  it('promo: khoảng cách đơn thực tế ngắn đúng 0,65 lần so với không có sự kiện (cùng seed)', () => {
    const run = (ev: 'promo' | undefined) => {
      setSimSeed(21);
      useGame.setState({
        online: { ...newOnline(), open: true, nextAt: 600, nextId: 1, ratingSum: 460, ratingCount: 100, ...(ev ? { event: ev } : {}) },
      });
      updateOnline(useGame.setState, useGame.getState);
      clearSimSeed();
      return g().online.nextAt - 600;
    };
    const withPromo = run('promo');
    const plain = run(undefined);
    expect(withPromo).toBeGreaterThan(0);
    expect(withPromo / plain).toBeCloseTo(0.65, 2);
  });

  it('grabSurge: gọi Grab bị trừ phí ×1,5 (tin báo hiện đúng phí); không sự kiện thì phí cũ', () => {
    const order = { id: 1, customer: 'QA', items: { nuoc: 2 }, km: 2, placedAt: 600, dueAt: 700, status: 'new' as const };
    useGame.setState({
      storage: { nuoc: 5 },
      online: { ...newOnline(), open: true, nextAt: 9999, orders: [order], event: 'grabSurge' },
    });
    expect(g().acceptOnline(1, 'grab')).toBe(true);
    expect(g().money).toBe(1_000_000 - grabFee(2, 1.5));
    expect(g().online.grabFeesToday).toBe(grabFee(2, 1.5));
  });

  it('ngày thường: mọi đường giữ nguyên như trước GĐ717 (không event)', () => {
    setSimSeed(5);
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 600, nextId: 1, ratingSum: 460, ratingCount: 100 } });
    updateOnline(useGame.setState, useGame.getState);
    expect(g().online.nextAt - 600).toBeGreaterThan(0);
    expect(g().online.orders).toHaveLength(1); // đơn mới vẫn đổ về bình thường
    expect(ONLINE_HOURS[0]).toBeLessThanOrEqual(600);
    expect(ONLINE_OPEN_COST).toBe(500000); // kinh tế mở gian hàng không đổi
  });
});

describe('endDay rút sự kiện app cho ngày mai (harness như endDayOverdue)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 10, level: 25, money: 10_000_000, minutes: 20 * 60, notify: () => {} });
  });
  afterEach(() => vi.restoreAllMocks());

  it('ngày mai có sự kiện theo hash: sáng mai có đúng dòng tin đó và online.event khớp', () => {
    const seed = useGame.getState().weatherSeed;
    const expected = onlineDayEvent(seed, 11);
    expect(g().sleep()).toBe(true);
    expect(g().online.event).toBe(expected);
    const news = g().lastSummary?.news ?? [];
    if (expected === 'promo') expect(news.some((n) => n.includes('app khuyến mãi'))).toBe(true);
    else if (expected === 'grabSurge') expect(news.some((n) => n.includes('Grab tăng giá'))).toBe(true);
    else expect(news.some((n) => n.includes('app khuyến mãi') || n.includes('Grab tăng giá'))).toBe(false);
  });
  it('seed cứng: đặt weatherSeed để ngày mai là promo → tin và state đúng; không rút dòng simRng (Math.random mock không ảnh hưởng)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    // tìm seed mà ngày 11 ra promo
    let seed = 1;
    while (onlineDayEvent(seed, 11) !== 'promo') seed++;
    useGame.setState({ weatherSeed: seed });
    expect(g().sleep()).toBe(true);
    expect(g().online.event).toBe('promo');
    expect((g().lastSummary?.news ?? []).some((n) => n.includes('app khuyến mãi'))).toBe(true);
  });
});
