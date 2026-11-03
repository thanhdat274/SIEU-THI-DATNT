import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame, type DayStats } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import { newBiz } from '../data/biz';
import { emptyWeek } from '../data/bizWeeks';

/** GĐ1054 — core/biz.bizEndOfDay chốt SỔ TUẦN (dòng 349–371): đủ WEEK_DAYS lần mới đóng tuần,
 *  đạt/nhỡ mục tiêu doanh thu, thử thách tuần, chuỗi thử thách trả XP (GĐ169). Dùng level 1 để
 *  thử thách luôn là wq_revenue (pool 1 phần tử) nên số thưởng xác định được. */

const stats = (rev = 2_000_000): DayStats => ({
  revenue: rev, spent: 200_000, wages: 0, itemsSold: 50, customers: 20, unhappy: 0, xp: 0,
  byItem: { nuoc: { qty: 50, revenue: rev, cost: 600_000 } },
});

describe('GĐ1054 — bizEndOfDay chốt sổ tuần', () => {
  beforeEach(() => {
    useGame.setState(newGameData());
  });
  it('cuối tuần ĐẠT mục tiêu + thử thách: thưởng 5% goal + thưởng thử thách, tin báo đạt, sang tuần mới', () => {
    const s = {
      ...useGame.getState(), day: 7, level: 1,
      biz: { ...newBiz(), week: { ...emptyWeek(1, 1_000_000), revenue: 2_000_000 } },
    };
    const out = bizEndOfDay(s, stats());
    expect(out.money).toBe(50_000 + 150_000); // 5% goal (1tr) + thưởng thử thách doanh thu (level 1)
    expect(out.news.some((n) => n.includes('đạt mục tiêu doanh thu'))).toBe(true);
    expect(out.news.some((n) => n.includes('Thử thách tuần: Doanh thu tuần xong!'))).toBe(true);
    expect(out.biz.week.startDay).toBe(8); // đã chuyển sang tuần mới
    expect(out.biz.weekStreak).toBe(1);
    expect(out.biz.lastWeek?.goalMet).toBe(true);
  });

  it('cuối tuần NHỠ mục tiêu: không thưởng, tin báo xem báo cáo, chuỗi về 0', () => {
    const s = {
      ...useGame.getState(), day: 7, level: 1,
      biz: { ...newBiz(), weekStreak: 2, week: { ...emptyWeek(1, 1_000_000), revenue: 100_000 } },
    };
    const out = bizEndOfDay(s, stats(0));
    expect(out.news.some((n) => n.includes('kết thúc, xem báo cáo'))).toBe(true);
    expect(out.news.some((n) => n.includes('đạt mục tiêu'))).toBe(false);
    expect(out.biz.weekStreak).toBe(0);
    expect(out.money).toBe(0);
  });

  it('giữ chuỗi thử thách ≥3 tuần: trả streakXp > 0 + tin báo "Chuỗi … XP", không trừ chuỗi', () => {
    const s = {
      ...useGame.getState(), day: 7, level: 1,
      biz: { ...newBiz(), weekStreak: 2, week: { ...emptyWeek(1, 1_000_000), revenue: 2_000_000 } },
    };
    const out = bizEndOfDay(s, stats());
    expect(out.streakXp ?? 0).toBeGreaterThan(0);
    expect(out.news.some((n) => n.includes('Chuỗi'))).toBe(true);
    expect(out.biz.weekStreak).toBe(3);
  });

  it('chưa đủ WEEK_DAYS ngày thì KHÔNG chốt tuần (giữ sổ cũ)', () => {
    const s = {
      ...useGame.getState(), day: 3, level: 1,
      biz: { ...newBiz(), week: { ...emptyWeek(1, 1_000_000), revenue: 900_000 } },
    };
    const out = bizEndOfDay(s, stats());
    expect(out.money).toBe(0); // chưa đóng tuần, chưa thưởng
    expect(out.news.some((n) => n.includes('tuần'))).toBe(false);
    expect(out.biz.week.startDay).toBe(1); // sổ giữ nguyên
    expect(out.biz.lastWeek).toBeNull();
  });
});
