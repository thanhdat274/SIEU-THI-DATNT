import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { openingGoal } from '../data/community';
import { PRODUCTS } from '../data/products';

/**
 * communitySale (orders.ts) — mục tiêu cả hẻm ngày khai trương: dồn món bán vào tiến độ,
 * chỉ trả thưởng khi ĐỦ cả số món lẫn chậu cây, và chỉ trả một lần.
 */

const g = () => useGame.getState();
const PID = PRODUCTS[0].id;
const LEVEL = 10;
const goal = openingGoal({ day: 5, tier: 1 }, LEVEL);
const plant = (n: number) => Array.from({ length: n }, (_, i) => ({ uid: i + 1, type: 'plant', x: i, z: 0, rot: 0, tiers: [], wear: 0 }));

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 0, level: LEVEL, day: 5, opening: { day: 5, tier: 1 }, community: {}, furniture: plant(goal.decorTarget) as never });
});

describe('communitySale — khai trương', () => {
  it('chưa đủ số món: chỉ cộng tiến độ, không thưởng', () => {
    g().communitySale(Array(goal.itemTarget - 1).fill(PID));
    expect(g().community[goal.key].sold).toBe(goal.itemTarget - 1);
    expect(g().community[goal.key].done).toBeFalsy();
    expect(g().money).toBe(0);
  });

  it('tiến độ cộng dồn qua nhiều lần bán; đủ thì thưởng tiền đúng một lần', () => {
    g().communitySale(Array(goal.itemTarget - 1).fill(PID));
    g().communitySale([PID]);
    expect(g().community[goal.key].done).toBe(true);
    expect(g().money).toBe(goal.reward.money);
    g().communitySale(Array(10).fill(PID)); // bán thêm không thưởng lại
    expect(g().money).toBe(goal.reward.money);
  });

  it('đủ món nhưng thiếu chậu cây: chưa hoàn thành, chưa thưởng', () => {
    useGame.setState({ furniture: plant(goal.decorTarget - 1) as never });
    g().communitySale(Array(goal.itemTarget).fill(PID));
    expect(g().community[goal.key].done).toBeFalsy();
    expect(g().money).toBe(0);
  });

  it('không có sự kiện hôm nay (sai ngày): không ghi tiến độ gì', () => {
    useGame.setState({ day: 6 });
    g().communitySale(Array(50).fill(PID));
    expect(g().community).toEqual({});
    expect(g().money).toBe(0);
  });
});
