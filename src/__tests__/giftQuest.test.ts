import { describe, expect, it } from 'vitest';
import { newGameData } from '../core/store';
import { dailyQuests, emptyQuestLog, type QuestContext } from '../data/quests';

// GĐ1584 — nhiệm vụ ngày "Tặng quà khách quen" (cấp 38, đếm stats.gifts tuỳ chọn).
const ctx = (day: number, level: number, gifts?: number): QuestContext => ({
  day, level, stats: { ...newGameData().stats, gifts }, totals: newGameData().totals,
  staffCount: 0, shopTier: 0, warehouseTier: 0, ordersDone: 0, log: emptyQuestLog(),
  festivalGoods: [], reservationsToday: 0, rent: 20000,
});
const find = (level: number, gifts?: number) => {
  for (let d = 1; d <= 60; d++) { const q = dailyQuests(ctx(d, level, gifts)).find((x) => x.id === 'daily_gift'); if (q) return q; }
  return undefined;
};

describe('GĐ1584 daily_gift', () => {
  it('không xuất hiện dưới cấp 38', () => { expect(find(37)).toBeUndefined(); });
  it('xuất hiện từ cấp 38 và đọc stats.gifts (save cũ = 0)', () => {
    expect(find(40, 2)?.current).toBe(2);
    expect(find(40)?.current).toBe(0);
  });
});

describe('GĐ1597 daily_gift có hướng dẫn', () => {
  it('desc chỉ chỗ bấm', () => { expect(find(40)?.description).toContain('bảng Khách quen'); });
});
