import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { emptyQuestLog, type QuestLog } from '../data/quests';

/**
 * 📜 claimQuest (GĐ1024) — nhận thưởng nhiệm vụ: ghi CỐT TRUYỆN (story_, một lần) hay nhiệm vụ NGÀY
 * (theo ngày, sang ngày mới làm lại), nạp tiền + XP. Cần nhân giữa 3 đường: daily-claim,
 * story-claim, và reset bộ ngày khi qua ngày mới.
 */

const g = () => useGame.getState();

/** Ván sạch cấp 1, stats đủ cho "daily_customers" (≥5 khách) + cốt truyện đầu (≥10 khách tổng). */
const setup = (log: Partial<QuestLog> = {}, over: Record<string, unknown> = {}) => {
  useGame.setState({
    ...newGameData(), day: 2, level: 1, money: 1_000_000, notify: () => {},
    questLog: { ...emptyQuestLog(), ...log },
    stats: { ...newGameData().stats, customers: 10, itemsSold: 10, revenue: 120_000, unhappy: 0 },
    totals: { ...newGameData().totals, customers: 10 },
    ...over,
  } as never);
};

beforeEach(() => useGame.setState(newGameData()));

describe('claimQuest — nhận thưởng nhiệm vụ', () => {
  it('nhiệm vụ NGÀY (cùng ngày, không reset): nạp tiền, ghi claimedDaily', () => {
    setup({ day: 2 }); // questLog.day === s.day → không reset
    const before = g().money;
    expect(g().claimQuest('daily_customers')).toBe(true);
    expect(g().money).toBeGreaterThan(before);
    expect(g().questLog.claimedDaily).toContain('daily_customers');
    expect(g().questLog.day).toBe(2);
  });

  it('CỐT TRUYỆN (story_): ghi claimedStory một lần, không chạm claimedDaily', () => {
    setup({ day: 2 });
    const before = g().money;
    expect(g().claimQuest('story_first_customers')).toBe(true);
    expect(g().money).toBeGreaterThan(before);
    expect(g().questLog.claimedStory).toContain('story_first_customers');
    expect(g().questLog.claimedDaily).toEqual([]);
  });

  it('ngày MỚI (questLog.day ≠ s.day): reset bộ nhiệm vụ ngày rồi mới ghi', () => {
    // questLog còn ngày 1 (đã claim 1 việc ngày hôm trước) — giờ sang ngày 2
    setup({ day: 1, claimedDaily: ['daily_customers'] });
    const before = g().money;
    expect(g().claimQuest('daily_customers')).toBe(true);
    // reset: bộ ngày làm lại từ đầu, chỉ còn việc vừa lĩnh hôm nay
    expect(g().questLog.day).toBe(2);
    expect(g().questLog.claimedDaily).toEqual(['daily_customers']);
    expect(g().money).toBeGreaterThan(before);
  });

  it('chưa xong / đã lĩnh → false, không nạp tiền', () => {
    // stats 0 → daily_customers chưa done
    useGame.setState({ ...newGameData(), day: 2, level: 1, money: 1_000_000, notify: () => {}, questLog: { ...emptyQuestLog(), day: 2 } } as never);
    expect(g().claimQuest('daily_customers')).toBe(false);
    expect(g().money).toBe(1_000_000);

    // đã lĩnh daily_customers hôm nay → không lĩnh lại
    setup({ day: 2 });
    expect(g().claimQuest('daily_customers')).toBe(true);
    expect(g().claimQuest('daily_customers')).toBe(false); // đã claimed
  });

  it('cốt truyện nhận được XP nữa (thưởng xp > 0)', () => {
    setup({ day: 2 });
    const xpBefore = g().xp;
    g().claimQuest('story_first_customers');
    expect(g().xp).toBeGreaterThan(xpBefore);
  });
});
