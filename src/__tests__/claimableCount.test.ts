import { describe, expect, it } from 'vitest';
import { newGameData } from '../core/store';
import {
  claimableCount, dailyQuests, storyQuest, emptyQuestLog, emptyTotals, type QuestContext,
} from '../data/quests';

/**
 * 🔴 claimableCount (GĐ1021) — số nhiệm vụ ĐÃ XONG mà chưa nhận thưởng (chấm đỏ trên nút Nhiệm vụ).
 * Thuần đọc: ghép dailyQuests + storyQuest rồi đếm (done && !claimed).
 */

const ctx = (over: Partial<QuestContext> = {}): QuestContext => ({
  day: 1, level: 20, stats: newGameData().stats, totals: emptyTotals(),
  staffCount: 0, shopTier: 0, warehouseTier: 0, ordersDone: 0, log: emptyQuestLog(),
  festivalGoods: [], reservationsToday: 0, rent: 20000, ...over,
});

/** Stats cực lớn để MỌI nhiệm vụ đạt mục tiêu (xương sống + tuỳ chọn đã mở đều done). */
const richStats = { ...newGameData().stats, customers: 9999, revenue: 9e9, itemsSold: 9999, unhappy: 0, services: 9e9, combos: 999 };

describe('claimableCount — chấm đỏ số nhiệm vụ xong chưa lĩnh', () => {
  it('ngày mới, chưa làm gì → 0 (không mục nào done)', () => {
    expect(claimableCount(ctx({ day: 7, log: { ...emptyQuestLog(), day: 0 } }))).toBe(0);
  });

  it('stats đầy đủ + chưa ai lĩnh → đếm ĐÚNG số việc done (cả daily lẫn story)', () => {
    const c = ctx({ day: 7, level: 25, stats: richStats, log: { ...emptyQuestLog(), day: 0 } });
    const expected = dailyQuests(c).filter((q) => q.done && !q.claimed).length
      + (storyQuest(c) && storyQuest(c)!.done ? 1 : 0);
    expect(expected).toBeGreaterThan(0); // chắc chắn có ít nhất vài việc done
    expect(claimableCount(c)).toBe(expected);
  });

  it('lĩnh hết (daily + story) → 0 dù vẫn done', () => {
    const base = ctx({ day: 7, level: 25, stats: richStats, log: { ...emptyQuestLog(), day: 0 } });
    const dailyIds = dailyQuests(base).map((q) => q.id);
    const storyId = storyQuest(base)?.id;
    const allClaimed = ctx({
      day: 7, level: 25, stats: richStats,
      log: {
        ...emptyQuestLog(), day: 7, claimedDaily: dailyIds,
        claimedStory: storyId ? [storyId] : [],
      },
    });
    expect(claimableCount(allClaimed)).toBe(0);
  });

  it('lĩnh một phần → chỉ giảm đúng phần đã lĩnh (số còn lại vẫn đếm)', () => {
    const base = ctx({ day: 7, level: 25, stats: richStats, log: { ...emptyQuestLog(), day: 0 } });
    const first = dailyQuests(base)[0];
    expect(first.done).toBe(true);
    const partClaimed = ctx({
      day: 7, level: 25, stats: richStats,
      log: { ...emptyQuestLog(), day: 7, claimedDaily: [first.id] },
    });
    // đối chiếu cùng cách đếm: chính bằng danh sách quests trừ phần đã lĩnh
    const expected = dailyQuests(partClaimed).filter((q) => q.done && !q.claimed).length
      + (storyQuest(partClaimed) && storyQuest(partClaimed)!.done ? 1 : 0);
    expect(claimableCount(partClaimed)).toBe(expected);
  });
});
