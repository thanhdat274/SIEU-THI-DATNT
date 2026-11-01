import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { achievementCtx, checkAchievements } from '../core/biz';
import { ACHIEVEMENTS } from '../data/biz';

/**
 * biz.ts — checkAchievements: thưởng thành tựu đúng một lần, cộng nhiều thành tựu cùng lúc, không trao lại.
 */

const g = () => useGame.getState();
const A = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 1_000, level: 1, day: 5 });
  useGame.setState({ biz: { ...g().biz, achievements: [] } });
});

describe('checkAchievements', () => {
  it('chưa đạt gì: không thưởng, không ghi', () => {
    const m0 = g().money;
    checkAchievements();
    expect(g().money).toBe(m0);
    expect(g().biz.achievements).toEqual([]);
  });

  it('đạt một mốc: ghi id và cộng đúng tiền thưởng', () => {
    useGame.setState({ totals: { ...g().totals, itemsSold: 100 } });
    const m0 = g().money;
    checkAchievements();
    expect(g().biz.achievements).toContain('first_100');
    expect(g().money).toBe(m0 + A('first_100').reward);
  });

  it('gọi lại không thưởng lần hai', () => {
    useGame.setState({ totals: { ...g().totals, itemsSold: 100 } });
    checkAchievements();
    const m1 = g().money;
    checkAchievements();
    expect(g().money).toBe(m1);
    expect(g().biz.achievements.filter((x) => x === 'first_100')).toHaveLength(1);
  });

  it('đạt nhiều mốc cùng lúc: cộng tổng thưởng', () => {
    useGame.setState({ totals: { ...g().totals, itemsSold: 1000 } });
    const m0 = g().money;
    checkAchievements();
    expect(g().biz.achievements).toEqual(expect.arrayContaining(['first_100', 'items_1000']));
    expect(g().money).toBe(m0 + A('first_100').reward + A('items_1000').reward);
  });

  it('achievementCtx đếm khách thân từ 40 💛', () => {
    const base = { visits: 1, perks: [], discovered: [] };
    useGame.setState({ regulars: { a: { ...base, friendship: 40 }, b: { ...base, friendship: 39 } } });
    expect(achievementCtx(g()).closeFriends).toBe(1);
  });
});
