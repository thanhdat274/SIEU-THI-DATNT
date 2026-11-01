import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { STORY_ORDER_FRIEND_LOSS } from '../data/orders';

/**
 * GĐ696 — coverage sweep chốt ngày (endDay.ts, covlines GĐ693):
 *  231-234  đơn tiệc đã nhận mà quá hạn qua đêm → phật ý 1★ + mất thân thiết
 *  276      tin sáng về hợp đồng: kỳ đầu chờ giao vs kỳ tới hạn đã giao
 */

const g = () => useGame.getState();
const DAY = 10;

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  useGame.setState({
    ...newGameData(),
    day: DAY,
    level: 25,
    money: 10_000_000,
    minutes: 20 * 60,
    notify: () => {},
  });
});
afterEach(() => vi.restoreAllMocks());

const news = () => g().lastSummary?.news ?? [];

describe('chốt ngày: đơn tiệc quá hạn (GĐ696)', () => {
  it('đã nhận mà hẹn đúng hôm nay/chưa giao: 1★ phật ý, khách quen mất thân thiết, tin 😠', () => {
    useGame.setState({
      order: { id: 'com_trua_vp', accepted: true, dueDay: DAY } as never, // đơn của Chị Lan
      regulars: { chi_lan: { friendship: 30, visits: 5, perks: [], discovered: [] } },
    });
    const before = (g().regulars['chi_lan'].friendship);
    expect(g().sleep()).toBe(true);
    expect(news().some((n) => n.includes('Lỡ hẹn đơn'))).toBe(true);
    expect(g().reviews.at(-1)?.stars).toBe(1);
    expect(g().regulars['chi_lan'].friendship).toBe(before - STORY_ORDER_FRIEND_LOSS);
  });

  it('đơn quá hạn bị gỡ sau đêm chốt (không treo mãi)', () => {
    useGame.setState({ order: { id: 'thoi_noi', accepted: true, dueDay: DAY } as never });
    g().sleep();
    // endDay thay order bằng lời mời mới của ngày mai — đơn cũ hết hạn không còn accepted
    const o = g().order;
    expect(o === null || !o.accepted).toBe(true);
  });
});

describe('chốt ngày: tin sáng hợp đồng (GĐ696)', () => {
  it('kỳ đầu chưa giao lần nào: tin "chờ giao kỳ đầu"', () => {
    useGame.setState({
      contracts: { quan_nhau: { defId: 'quan_nhau', dueDay: DAY + 1, delivered: 0, pending: true } },
    });
    g().sleep();
    expect(news().some((n) => n.includes('chờ giao kỳ đầu'))).toBe(true);
  });

  it('đã giao ít nhất một kỳ, tới hạn mới: tin "tới kỳ giao hàng"', () => {
    useGame.setState({
      contracts: { quan_nhau: { defId: 'quan_nhau', dueDay: DAY + 1, delivered: 1, pending: false } },
    });
    g().sleep();
    expect(news().some((n) => n.includes('tới kỳ giao hàng'))).toBe(true);
  });

  it('hợp đồng chưa tới hạn: không có tin hợp đồng nào', () => {
    useGame.setState({
      contracts: { quan_nhau: { defId: 'quan_nhau', dueDay: DAY + 5, delivered: 0, pending: true } },
    });
    g().sleep();
    expect(news().some((n) => n.includes('quan_nhau') || n.includes('Quán nhậu'))).toBe(false);
  });
});
