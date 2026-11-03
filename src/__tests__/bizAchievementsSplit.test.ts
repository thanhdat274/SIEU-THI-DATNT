import { describe, expect, it } from 'vitest';
import * as biz from '../data/biz';
import * as ach from '../data/bizAchievements';

describe('GĐ973 — data/bizAchievements tách khỏi data/biz', () => {
  it('biz.ts xuất lại đúng các hằng/hàm (cùng tham chiếu)', () => {
    for (const k of ['PETS', 'petDef', 'petActive', 'theftFactor', 'spoilFactor', 'ACHIEVEMENTS', 'INSPECTION_UNLOCK', 'INSPECTION_EVERY', 'INSPECTION_REWARD', 'INSPECTION_FINE']) {
      expect((biz as Record<string, unknown>)[k]).toBe((ach as Record<string, unknown>)[k]);
      expect((ach as Record<string, unknown>)[k]).toBeDefined();
    }
  });
  it('thú cưng chỉ có tác dụng khi được cho ăn trong 1 ngày', () => {
    expect(ach.petActive({ fedDay: 5 }, 6)).toBe(true);
    expect(ach.petActive({ fedDay: 5 }, 7)).toBe(false);
    expect(ach.petActive(undefined, 6)).toBe(false);
  });
  it('mọi thành tựu có id duy nhất', () => {
    const ids = ach.ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
