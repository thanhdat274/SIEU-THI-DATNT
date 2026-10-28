import { beforeEach, describe, expect, it } from 'vitest';
import {
  closeMonth, emptyMonth, MONTHLY_CHALLENGES, monthlyChallenge, newBiz, WEEKLY_CHALLENGES, type MonthTally,
} from '../data/biz';
import { monthOf } from '../data/calendar';
import { bizEndOfDay } from '../core/biz';
import { newGameData, useGame, type DayStats, type GameState } from '../core/store';

/** Tháng vận hành: mốc nhịp tháng theo lịch thật — chốt tháng có thưởng theo chuỗi, tích lũy counter ngày. */

describe('monthOf — mốc tháng theo lịch thật', () => {
  it('ngày 1 là tháng 1 (1/1), ngày 31 vẫn tháng 1, ngày 32 sang tháng 2', () => {
    expect(monthOf(1)).toBe(1);
    expect(monthOf(15)).toBe(1);
    expect(monthOf(31)).toBe(1);
    expect(monthOf(32)).toBe(2);
  });

  it('một năm lặp lại: ngày 366 lại là tháng 1', () => {
    expect(monthOf(366)).toBe(1);
  });

  it('newBiz mặc định tháng 1, chuỗi tháng = 0', () => {
    expect(newBiz().month.month).toBe(1);
    expect(newBiz().monthStreak).toBe(0);
    expect(newBiz().lastMonth).toBe(null);
  });
});

describe('monthlyChallenge — chọn thử thách xác định theo tháng', () => {
  it('cùng tháng + cấp luôn ra cùng thử thách; tháng 1 và 13 (cùng vị trí xoay) trùng nhau', () => {
    expect(monthlyChallenge(4, 12)).toBe(monthlyChallenge(4, 12));
    expect(monthlyChallenge(1, 30).id).toBe(monthlyChallenge(13, 30).id);
  });

  it('cấp 1 chỉ có thử thách doanh thu tháng', () => {
    const ids = new Set(Array.from({ length: 12 }, (_, mo) => monthlyChallenge(mo, 1).id));
    expect(ids).toEqual(new Set(['mq_revenue']));
  });

  it('cấp 30 xoay hết một vòng pool đã mở rồi lặp lại', () => {
    const pool = MONTHLY_CHALLENGES.filter((c) => c.minLevel <= 30);
    const first = Array.from({ length: pool.length }, (_, mo) => monthlyChallenge(mo, 30).id);
    expect(new Set(first).size).toBe(pool.length);
    expect(monthlyChallenge(pool.length, 30).id).toBe(first[0]);
  });

  it('thử thách tháng to hơn hẳn thử thách tuần cùng loại', () => {
    const mq = MONTHLY_CHALLENGES.find((c) => c.id === 'mq_revenue')!;
    const weekly = WEEKLY_CHALLENGES.find((c) => c.id === 'wq_revenue')!;
    expect(mq.target(20)).toBeGreaterThan(weekly.target(20) * 4);
  });
});

describe('closeMonth — chấm thử thách tháng', () => {
  const tally = (over: Partial<MonthTally> = {}): MonthTally => ({ ...emptyMonth(1, 1, 5000000), revenue: 5000000, ...over });

  it('đạt mục tiêu: thưởng 6% mục tiêu + thử thách theo chuỗi 0/2/5 (nhân 1.0/1.4/1.8)', () => {
    const r0 = closeMonth(tally(), 31, 1, 0);
    expect(r0.month).toBe(1);
    expect(r0.goalMet).toBe(true);
    expect(r0.reward).toBe(300000); // 5.000.000 × 6%
    expect(r0.challenge!.id).toBe('mq_revenue');
    expect(r0.challenge!.met).toBe(true);
    expect(r0.challenge!.target).toBe(5000000);
    expect(r0.challenge!.reward).toBe(800000);
    expect(r0.monthStreak).toBe(1);
    expect(closeMonth(tally(), 31, 1, 2).challenge!.reward).toBe(1120000); // ×1.4
    expect(closeMonth(tally(), 31, 1, 5).challenge!.reward).toBe(1440000); // trần ×1.8
  });

  it('không đạt: thưởng 0, current/target đúng, chuỗi về 0', () => {
    const r = closeMonth(tally({ revenue: 4000000 }), 31, 1, 3);
    expect(r.goalMet).toBe(false);
    expect(r.reward).toBe(0);
    expect(r.challenge!.met).toBe(false);
    expect(r.challenge!.reward).toBe(0);
    expect(r.challenge!.current).toBe(4000000);
    expect(r.monthStreak).toBe(0);
  });

  it('measure ngoài doanh thu đọc đúng counter trong MonthTally', () => {
    const r = closeMonth({ ...tally(), fiveStars: 140 }, 31, 30, 0);
    expect(r.challenge!.id).toBe('mq_five');
    expect(r.challenge!.target).toBe(20 + 4 * 30); // 140
    expect(r.challenge!.current).toBe(140);
    expect(r.challenge!.met).toBe(true);
    // Thiếu counter (save cũ) thì coi như 0
    expect(closeMonth(tally(), 31, 30, 0).challenge!.current).toBe(0);
  });

  it('nextGoal đặt mốc tháng tới = 115% của max(doanh thu, mục tiêu), tròn 10k', () => {
    expect(closeMonth(tally({ revenue: 6000000 }), 31, 1, 0).nextGoal).toBe(6900000);
  });
});

describe('Tích lũy tháng qua endDay', () => {
  const emptyDay = (): DayStats => ({ revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 });
  const dayStats = (over: Partial<DayStats> = {}): DayStats => ({
    ...emptyDay(),
    revenue: 100000, spent: 60000, itemsSold: 10, customers: 30,
    byItem: { mi: { qty: 5, revenue: 60000, cost: 30000 }, com_hop_ga: { qty: 2, revenue: 40000, cost: 20000 } },
    onlineDone: 2, cookOrders: 1, farmHarvest: 3, socialPosts: 1, combos: 2, services: 5000, fiveStars: 2,
    ...over,
  });

  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 1, level: 30 });
  });

  it('counters tháng cộng dồn từng ngày trong cùng tháng (không qua mốc)', () => {
    let s = useGame.getState();
    for (let d = 1; d <= 6; d++) {
      s = { ...s, day: d + 1, biz: bizEndOfDay({ ...s, day: d }, dayStats()).biz };
    }
    const mo = s.biz.month;
    expect(mo.month).toBe(1);
    expect(mo.revenue).toBe(600000);
    expect(mo.cookedSold).toBe(12);
    expect(mo.onlineDone).toBe(12);
    expect(mo.farmHarvest).toBe(18);
    expect(mo.socialPosts).toBe(6);
    expect(mo.combos).toBe(12);
    expect(mo.services).toBe(30000);
    expect(mo.fiveStars).toBe(12);
  });

  it('qua mốc sang tháng 2 thì chốt tháng 1: đạt mục tiêu +6% thưởng, tháng mới reset', () => {
    useGame.setState({ ...newGameData(), day: 32, level: 30 });
    let s = useGame.getState();
    s.biz.month = { ...emptyMonth(1, 1, 1000000), revenue: 2000000, profit: 1200000 };
    const out = bizEndOfDay({ ...s, day: 32 }, dayStats());
    const b = out.biz;
    expect(b.lastMonth!.month).toBe(1);
    expect(b.lastMonth!.goalMet).toBe(true);
    expect(b.lastMonth!.reward).toBe(60000); // 6% của 1.000.000
    expect(b.month.month).toBe(2);
    expect(b.month.revenue).toBe(0); // tháng mới bắt đầu trống
    expect(b.month.goal).not.toBe(null); // đặt mốc tháng tới từ lastMonth.nextGoal
    expect(out.money).toBeGreaterThanOrEqual(60000);
  });

  it('không đạt mục tiêu tháng thì không thưởng mục tiêu, vẫn có báo cáo', () => {
    useGame.setState({ ...newGameData(), day: 32, level: 30 });
    const s = useGame.getState();
    s.biz.month = { ...emptyMonth(1, 1, 5000000), revenue: 1000000 };
    const out = bizEndOfDay({ ...s, day: 32 }, dayStats());
    expect(out.biz.lastMonth!.goalMet).toBe(false);
    expect(out.biz.lastMonth!.reward).toBe(0);
  });
});
