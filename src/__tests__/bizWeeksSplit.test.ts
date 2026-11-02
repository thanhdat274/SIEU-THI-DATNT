import { describe, expect, it } from 'vitest';
import * as biz from '../data/biz';
import * as weeks from '../data/bizWeeks';

describe('GĐ972 — data/bizWeeks tách khỏi data/biz', () => {
  it('biz.ts xuất lại đúng các hàm/hằng của bizWeeks (cùng tham chiếu)', () => {
    for (const k of ['emptyWeek', 'closeWeek', 'weekPace', 'emptyMonth', 'closeMonth', 'weeklyChallenge', 'monthlyChallenge', 'WEEKLY_CHALLENGES', 'MONTHLY_CHALLENGES', 'WEEK_DAYS', 'STREAK_XP_FROM']) {
      expect((biz as Record<string, unknown>)[k]).toBe((weeks as Record<string, unknown>)[k]);
      expect((weeks as Record<string, unknown>)[k]).toBeDefined();
    }
  });
  it('sổ tuần/tháng trống khởi tạo đúng mốc', () => {
    expect(weeks.emptyWeek(8).startDay).toBe(8);
    expect(weeks.emptyMonth(1, 1).startDay).toBe(1);
  });
});
