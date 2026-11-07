import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { RECIPE_MAP } from '../data/recipes';
import { MASTERY_UNLOCK, batchesToNext, masteredDuration, masteryTier } from '../data/cookMastery';

/** GĐ1522 — thông thạo món: đếm mẻ theo công thức, mốc 20/50/100 → nấu nhanh 5/10/15%, mở từ cấp 31. */
const GRILL = { uid: 1, type: 'food_grill', x: 0, z: 0, rot: 0 } as const;
const prep = (level: number, done: number) => useGame.setState({
  ...newGameData(), level, furniture: [GRILL as never], storage: { xucxich: 10 }, cookMastery: { recipe_xuc_xich: done },
});
beforeEach(() => useGame.setState(newGameData()));

describe('cookMastery (GĐ1522)', () => {
  it('mốc và thời gian', () => {
    expect(MASTERY_UNLOCK).toBeGreaterThan(30);
    expect([0, 19, 20, 49, 50, 100].map(masteryTier)).toEqual([0, 0, 1, 1, 2, 3]);
    expect(masteredDuration(20, 50, 40)).toBe(18);
    expect(masteredDuration(20, 500, 30)).toBe(20); // dưới cấp mở: không giảm (golden giữ nguyên)
    expect(masteredDuration(2, 100, 40)).toBeGreaterThanOrEqual(1);
    expect(batchesToNext(19)).toBe(1);
    expect(batchesToNext(100)).toBeNull();
  });

  it('nấu cộng 1 mẻ; thông thạo rút ngắn mẻ ở cấp ≥31, dưới đó dùng thời gian gốc', () => {
    const base = RECIPE_MAP.recipe_xuc_xich.durationMin;
    prep(22, 100);
    useGame.getState().startCook('recipe_xuc_xich');
    expect(useGame.getState().cookJobs[0].total).toBe(base);
    expect(useGame.getState().cookMastery.recipe_xuc_xich).toBe(101);
    prep(40, 100);
    useGame.getState().startCook('recipe_xuc_xich');
    expect(useGame.getState().cookJobs[0].total).toBe(masteredDuration(base, 100, 40));
  });

  it('bản lưu cũ không có cookMastery vẫn nấu được', () => {
    prep(40, 0);
    useGame.setState({ cookMastery: undefined as never });
    expect(useGame.getState().startCook('recipe_xuc_xich')).toBe(true);
    expect(useGame.getState().cookMastery.recipe_xuc_xich).toBe(1);
  });
});
