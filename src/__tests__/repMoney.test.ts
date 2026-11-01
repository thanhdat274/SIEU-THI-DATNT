import { describe, expect, it } from 'vitest';
import { avgPerVisit, repMoney } from '../data/repMoney';
import type { RepPayoff } from '../data/repPayoff';

const payoff = (o: Partial<RepPayoff>): RepPayoff => ({
  insufficient: false, absolute: 0, pct: 0, extraKhach: 0, nextStarPct: 0, nextStarKhach: 0, ...o,
});

describe('repMoney', () => {
  it('avgPerVisit = doanh thu / khách, 0 khi chưa có khách', () => {
    expect(avgPerVisit(120000, 30)).toBeCloseTo(4000, 5);
    expect(avgPerVisit(120000, 0)).toBe(0);
  });

  it('moneyPerDay = extraKhach × avg (thêm khi dương, mất khi âm)', () => {
    const m = repMoney(payoff({ extraKhach: 5 }), 4000);
    expect(m.moneyPerDay).toBe(20000);
    const neg = repMoney(payoff({ extraKhach: -3 }), 4000);
    expect(neg.moneyPerDay).toBe(-12000);
  });

  it('nextStarMoney = nextStarKhach × avg', () => {
    const m = repMoney(payoff({ nextStarKhach: 4 }), 4000);
    expect(m.nextStarMoney).toBe(16000);
  });

  it('avg = 0 thì mọi tiền = 0', () => {
    const m = repMoney(payoff({ extraKhach: 5, nextStarKhach: 4 }), 0);
    expect(m.moneyPerDay).toBe(0);
    expect(m.nextStarMoney).toBe(0);
  });
});
