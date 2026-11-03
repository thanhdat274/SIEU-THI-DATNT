import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame, type DayStats } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import { emptyMonth } from '../data/biz';

/** GĐ1056 — core/biz.bizEndOfDay chốt SỔ THÁNG theo THỬ THÁCH THÁNG (dòng 392–393 met / 396 chưa đạt):
 *  qua mốc sang tháng mới, thử thách tháng ĐẠT → `money += reward` + báo "… xong! +Thưởng…", chuỗi tháng +1;
 *  CHƯA đạt → báo "… chưa xong (X/Y) — tháng tới thử lại", không thưởng, chuỗi về 0. (Nhánh anh em GĐ1054 bên tuần.)
 *  Dùng cấp 30, tháng 1 → mq_five (pool[1]) cần 140 lời khen 5★. */

const dayStats = (over: Partial<DayStats> = {}): DayStats => ({
  revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0,
  byItem: {},
  ...over,
});

describe('GĐ1056 — bizEndOfDay chốt sổ tháng theo thử thách tháng', () => {
  beforeEach(() => {
    useGame.setState(newGameData());
  });

  it('thử thách tháng ĐẠT: báo "xong!", thưởng + chuỗi tháng +1 (nhánh met 392–393)', () => {
    const s = {
      ...useGame.getState(), day: 32, level: 30,
      biz: {
        ...(useGame.getState().biz as object),
        month: { ...emptyMonth(1, 1, 5_000_000), revenue: 6_000_000, fiveStars: 140 }, // goal đạt + mq_five(30) met
        monthStreak: 2,
      } as never,
    };
    const out = bizEndOfDay(s, dayStats());
    expect(out.news.some((n) => n.includes('Thử thách tháng') && n.includes('xong!'))).toBe(true);
    expect(out.news.some((n) => n.includes('Thử thách tháng') && n.includes('chưa xong'))).toBe(false);
    expect(out.money).toBeGreaterThan(0); // thưởng mục tiêu (6% 5tr) + thưởng thử thách
    expect(out.biz.monthStreak).toBe(3); // thử thách đạt → chuỗi +1
    expect(out.biz.lastMonth?.challenge?.met).toBe(true);
  });

  it('sang tháng mới mà thử thách tháng CHƯA đạt: báo "chưa xong", không thưởng, chuỗi về 0', () => {
    const s = {
      ...useGame.getState(), day: 32, level: 30,
      biz: {
        ...(useGame.getState().biz as object),
        month: { ...emptyMonth(1, 1, 5_000_000), revenue: 1_000_000 }, // mq_five(30) cần 140 lời, fiveStars 0 → unmet
        monthStreak: 2,
      } as never,
    };
    const out = bizEndOfDay(s, dayStats());
    // Thử thách tháng chưa xong → nhánh else 396
    expect(out.news.some((n) => n.includes('Thử thách tháng') && n.includes('chưa xong'))).toBe(true);
    expect(out.news.some((n) => n.includes('Thử thách tháng') && n.includes('xong!'))).toBe(false);
    // Không thưởng thử thách + goal cũng không đạt (1tr<5tr) → phần thưởng ngày = 0
    expect(out.money).toBe(0);
    expect(out.biz.monthStreak).toBe(0); // thử thách chưa xong → chuỗi về 0
    expect(out.streakXp ?? 0).toBe(0);
    expect(out.biz.lastMonth?.challenge?.met).toBe(false);
  });
});
