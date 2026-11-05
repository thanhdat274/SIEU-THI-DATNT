import { describe, expect, it } from 'vitest';
import { huiPayoff, huiRoundSummary } from '../data/minorPayoff';
import type { Hui } from '../data/biz';

/** GĐ1271 — soi GIÁ TRỊ + RỦI RO hụi: hốt sớm đáng bao nhiêu (lãi vay tránh được) + nguy cơ vỡ.
 *  Helper THUẦN — chỉ đọc state + hằng số game (LOAN_DAILY_RATE, HUI_COLLAPSE), không đổi kinh tế. */

const makeHui = (over: Partial<Hui> = {}): Hui => ({
  daily: 30000, members: 10, startDay: 1, turnDay: 2, received: false, paidDays: 3, ...over,
});

describe('huiPayoff — giá trị hốt sớm + rủi ro vỡ', () => {
  it('hốt sớm `members − turnDay` ngày: tiết kiệm lãi vay NH của số tiền dùng sớm', () => {
    const p = huiPayoff(makeHui()); // turnDay 2 → hốt sớm 8 ngày; pot 300k × 0.008 × 8 = 19.200
    expect(p.daysSaved).toBe(8);
    expect(p.saveEarly).toBe(19200);
  });

  it('rủi ro vỡ ~ HUI_COLLAPSE × members mỗi vòng (0.006 × 10 = 6%)', () => {
    expect(huiPayoff(makeHui()).collapsePct).toBeCloseTo(6);
  });

  it('mất đúng số tiền đã góp nếu vỡ (daily × paidDays)', () => {
    expect(huiPayoff(makeHui()).loseOnCollapse).toBe(90000);
  });

  it('hốt cuối (turnDay = members) → không có lợi tiền-sớm (saveEarly 0, daysSaved 0)', () => {
    const p = huiPayoff(makeHui({ turnDay: 10 }));
    expect(p.daysSaved).toBe(0);
    expect(p.saveEarly).toBe(0);
  });

  it('hốt ngày đầu (turnDay 1) → hốt sớm `members−1` ngày, lãi tránh lớn nhất', () => {
    const p = huiPayoff(makeHui({ turnDay: 1 }));
    expect(p.daysSaved).toBe(9);
    expect(p.saveEarly).toBe(300000 * 0.008 * 9); // 21.600
  });

  it('thuần — cùng đầu vào cho ra cùng kết quả (không RNG)', () => {
    expect(huiPayoff(makeHui())).toEqual(huiPayoff(makeHui()));
  });

  it('khớp huiRoundSummary về con số góp/hột (hai helper cùng một state)', () => {
    const h = makeHui();
    const s = huiRoundSummary(h);
    expect(s.contributed).toBe(h.daily * h.paidDays);
    expect(s.pot).toBe(h.daily * h.members);
  });
});
