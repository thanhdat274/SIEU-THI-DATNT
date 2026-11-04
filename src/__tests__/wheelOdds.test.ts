import { describe, it, expect } from 'vitest';
import { wheelOdds, WHEEL_PRIZES, giftMoneyScale, giftXpScale } from '../data/gifts';

describe('wheelOdds (GĐ1191) — lộ trọng số + giá trị kỳ vọng vòng quay', () => {
  it('tổng xác suất các ô = 100% và pct = weight/tổng (khớp spinWheelPrize)', () => {
    const total = WHEEL_PRIZES.reduce((n, p) => n + p.weight, 0);
    const o = wheelOdds(1);
    expect(o.total).toBe(total);
    expect(o.entries.reduce((s, e) => s + e.pct, 0)).toBeCloseTo(100, 6);
    o.entries.forEach((e, i) => {
      expect(e.pct).toBeCloseTo((WHEEL_PRIZES[i].weight / total) * 100, 6);
    });
  });

  it('giá trị kỳ vọng = Σ (tiền/XP scaled × pct)', () => {
    const level = 20;
    const o = wheelOdds(level);
    const total = WHEEL_PRIZES.reduce((n, p) => n + p.weight, 0);
    let expMoney = 0;
    let expXp = 0;
    let expBoost = 0;
    WHEEL_PRIZES.forEach((p) => {
      const pct = p.weight / total;
      if (p.money !== undefined) expMoney += Math.round(p.money * giftMoneyScale(level) / 1000) * 1000 * pct;
      if (p.xp !== undefined) expXp += Math.round(p.xp * giftXpScale(level)) * pct;
      if (p.boost !== undefined) expBoost += pct * 100;
    });
    expect(o.moneyEv).toBeCloseTo(expMoney, 2);
    expect(o.xpEv).toBeCloseTo(expXp, 2);
    expect(o.boostPct).toBeCloseTo(expBoost, 6);
  });

  it('theo cấp → EV tiền/XP tăng lên (nhân hệ số scale)', () => {
    const low = wheelOdds(5);
    const high = wheelOdds(30);
    expect(high.moneyEv).toBeGreaterThan(low.moneyEv);
    expect(high.xpEv).toBeGreaterThan(low.xpEv);
  });

  it('giữ nguyên 8 ô vòng quay', () => {
    expect(WHEEL_PRIZES).toHaveLength(8);
  });
});
