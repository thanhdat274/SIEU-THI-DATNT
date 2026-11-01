import { describe, expect, it } from 'vitest';
import { onlineNet, ONLINE_GRAB_SHARE_WARN } from '../data/onlineNet';
import type { OnlineState } from '../data/online';

const state = (o: Partial<OnlineState>): OnlineState => ({
  open: false, orders: [], nextAt: 0, ratingSum: 0, ratingCount: 0, done: 0, late: 0,
  nextId: 1, revenueToday: 0, grabFeesToday: 0, ...o,
});

describe('onlineNet', () => {
  it('net = revenue − grabFees, good khi lời và phí giao nhẹ', () => {
    const r = onlineNet(state({ revenueToday: 500000, grabFeesToday: 40000 }));
    expect(r.net).toBe(460000);
    expect(r.grabShare).toBeCloseTo(0.08, 5);
    expect(r.verdict).toBe('good');
  });

  it('warn khi phí Grab ăn ≥ 15% doanh thu dù vẫn lời', () => {
    const r = onlineNet(state({ revenueToday: 100000, grabFeesToday: 20000 }));
    expect(r.net).toBe(80000);
    expect(r.grabShare).toBeCloseTo(0.2, 5);
    expect(r.verdict).toBe('warn');
  });

  it('low khi lời ròng ≤ 0', () => {
    const r = onlineNet(state({ revenueToday: 30000, grabFeesToday: 35000 }));
    expect(r.net).toBe(-5000);
    expect(r.verdict).toBe('low');
  });

  it('savingsIfOwn = grabFees (cận trên tự chở)', () => {
    const r = onlineNet(state({ revenueToday: 200000, grabFeesToday: 50000 }));
    expect(r.savingsIfOwn).toBe(50000);
  });

  it('không doanh thu → net 0, grabShare 0, good', () => {
    const r = onlineNet(state({}));
    expect(r.revenue).toBe(0);
    expect(r.net).toBe(0);
    expect(r.grabShare).toBe(0);
  });

  it('hằng số ngưỡng có giá trị dùng được', () => {
    expect(ONLINE_GRAB_SHARE_WARN).toBeGreaterThan(0);
    expect(ONLINE_GRAB_SHARE_WARN).toBeLessThan(1);
  });
});
