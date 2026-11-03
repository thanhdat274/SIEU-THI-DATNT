import { describe, expect, it } from 'vitest';
import * as split from '../core/bizAchieve';
import * as biz from '../core/biz';

describe('GĐ977 — core/bizAchieve tách khỏi core/biz', () => {
  it('biz vẫn re-export đúng các hàm thành tựu và nhắc hàng', () => {
    expect(biz.achievementCtx).toBe(split.achievementCtx);
    expect(biz.checkAchievements).toBe(split.checkAchievements);
    expect(biz.stockReminders).toBe(split.stockReminders);
  });
});
