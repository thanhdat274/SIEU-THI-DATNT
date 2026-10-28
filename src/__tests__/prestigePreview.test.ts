import { describe, it, expect } from 'vitest';
import { prestigePreview, PRESTIGE_MAX_LEVEL, PRESTIGE_MIN_LEVEL, PRESTIGE_MIN_REVENUE } from '../core/prestige';

/** Input mặc định đạt ĐIỀU KIỆN tái sinh: cấp 70, doanh thu 200M, mức prestige 0 (bonus 0). */
const base = (over: Record<string, unknown> = {}) => ({
  level: 70,
  lifetimeRevenue: 200_000_000,
  prestigeLevel: 0,
  bonus: 0,
  avgDailyProfit: 100_000,
  supplierRel: {},
  marketClearedDay: 0,
  currentDay: 14,
  analyticsDays: 14,
  ...over,
} as Parameters<typeof prestigePreview>[0]);

describe('GĐ139 — prestigePreview (dự phóng tái sinh thuần đọc)', () => {
  it('đủ điều kiện → nextBonus = 8% (mức 0→1), nhận ≈ lãi 1 ngày × 8%', () => {
    const r = prestigePreview(base());
    expect(r.eligible).toBe(true);
    expect(r.capped).toBe(false);
    expect(r.nextBonus).toBe(8);
    expect(r.projectedDailyGain).toBe(Math.round(100_000 * 0.08)); // 8000
  });

  it('chưa đủ cấp hoặc chưa đủ doanh thu → không thuận, nhận 0', () => {
    const lowLevel = prestigePreview(base({ level: PRESTIGE_MIN_LEVEL - 1 }));
    const lowRev = prestigePreview(base({ lifetimeRevenue: PRESTIGE_MIN_REVENUE - 1 }));
    expect(lowLevel.eligible).toBe(false);
    expect(lowLevel.projectedDailyGain).toBe(0);
    expect(lowRev.eligible).toBe(false);
    expect(lowRev.projectedDailyGain).toBe(0);
  });

  it('chạm trần (PRESTIGE_MAX_LEVEL) → capped, nhận 0', () => {
    const r = prestigePreview(base({ prestigeLevel: PRESTIGE_MAX_LEVEL, bonus: 0.48 }));
    expect(r.capped).toBe(true);
    expect(r.projectedDailyGain).toBe(0);
  });

  it('mức prestige cao hơn → nextBonus tăng dần (1→16%, 2→24%) và nhận chênh với bonus hiện có', () => {
    const p1 = prestigePreview(base({ prestigeLevel: 1, bonus: 0.08 }));
    const p2 = prestigePreview(base({ prestigeLevel: 2, bonus: 0.16 }));
    expect(p1.nextBonus).toBe(16);
    expect(p2.nextBonus).toBe(24);
    // mức 1, bonus 0.08 → nhận thêm (0.16-0.08)=0.08 × 100k
    expect(p1.projectedDailyGain).toBe(Math.round(100_000 * 0.08));
  });

  it('đếm mối quen có spent>0 và bậc cao nhất theo relTier', () => {
    const r = prestigePreview(base({
      supplierRel: {
        daily: { spent: 5_000_000, orders: 3 },   // bậc 1 (≥3M)
        cho: { spent: 15_000_000, orders: 5 },    // bậc 2 (≥12M)
        lon: { spent: 0, orders: 0 },             // chưa có tiền → không tính
      },
    }));
    expect(r.suppliersActive).toBe(2);
    expect(r.topRelTier).toBe(2);
  });

  it('không có mối quen → suppliersActive 0, topRelTier 0', () => {
    const r = prestigePreview(base());
    expect(r.suppliersActive).toBe(0);
    expect(r.topRelTier).toBe(0);
  });

  it('ngày chợ phiên chưa bán (day%7==0, marketClearedDay≠day, day≥7) → unsoldMarketDay true', () => {
    const r = prestigePreview(base({ currentDay: 21, marketClearedDay: 14 }));
    expect(r.unsoldMarketDay).toBe(true);
  });

  it('đã bán phiên chợ hôm nay → unsoldMarketDay false', () => {
    const r = prestigePreview(base({ currentDay: 21, marketClearedDay: 21 }));
    expect(r.unsoldMarketDay).toBe(false);
  });

  it('không phải ngày chợ → unsoldMarketDay false', () => {
    const r = prestigePreview(base({ currentDay: 22, marketClearedDay: 14 }));
    expect(r.unsoldMarketDay).toBe(false);
  });

  it('trả về analyticsDays đã truyền vào', () => {
    const r = prestigePreview(base({ analyticsDays: 30 }));
    expect(r.analyticsDays).toBe(30);
  });
});
