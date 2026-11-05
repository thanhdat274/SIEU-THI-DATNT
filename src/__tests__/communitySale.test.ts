import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { activeGoals, openingGoal } from '../data/community';
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
    // GĐ1195: thưởng mục tiêu cả hẻm phải vào sổ questIncome (tổng kết ngày so được với lãi bán thật — Luật 10)
    expect(g().stats.questIncome).toBe(goal.reward.money);
    g().communitySale(Array(10).fill(PID)); // bán thêm không thưởng lại
    expect(g().money).toBe(goal.reward.money);
    expect(g().stats.questIncome).toBe(goal.reward.money); // và không ghi lại lần hai
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

describe('GĐ1049 — hoàn thành mục tiêu hẻm có HOST lễ hội (communitySale 287–295)', () => {
  // Ngày hội xóm (hoi_xom): host 'bac_tam', không cổng rep (traffic 1.15 < 1.3, không goods).
  // level 3 (< COOK_LEVEL 21): cookedTarget 0; decorTarget 2 (đủ 2 chậu cây). itemTarget ~12.
  // Todo trước đây các test khai trương không hề kiểm tra món quà thân thiết với host, và arm
  // `regularById(goal.festival.host)` (287) + notify "thân hơn" (295) chưa từng chạy.
  it('đủ số món + đủ chậu cây → thưởng tiền, host (khách quen) thân hơn +3, báo "thân hơn"', () => {
    const toasts: string[] = [];
    const day = 80; // hoi_xom khai mạc: f.from=79 (dayOfYear 79 → game day 80)
    useGame.setState({
      ...newGameData(), money: 0, level: 3, day,
      community: {}, furniture: plant(2) as never, notify: (m) => void toasts.push(m),
    });
    const goal = activeGoals(day, 3)[0];
    const need = goal.itemTarget;
    const id = goal.items.length ? goal.items[0] : PID; // món tính vào mục tiêu cả hẻm
    g().communitySale(Array(need).fill(id));

    expect(g().community[goal.key].done).toBe(true);
    expect(g().money).toBe(goal.reward.money); // thưởng tiền
    expect(g().regulars['bac_tam'].friendship).toBe(goal.reward.friendship); // 3 — quà thân thiết
    expect(g().regulars['bac_tam'].discovered.length).toBeGreaterThanOrEqual(0);
    expect(toasts.some((t) => t.includes('Cả hẻm hoàn thành'))).toBe(true);
    expect(toasts.some((t) => t.includes('thân hơn'))).toBe(true); // nhánh 295 host truthy
  });

  it('hoàn thành mục tiêu DỊP KHÔNG HOST (mua_mua) → thưởng tiền, KHÔNG tặng thân thiết, báo không "thân hơn"', () => {
    const toasts: string[] = [];
    const day = 274; // mua_mua: f.from=273 (10/1, dayOfYear 273 → game day 274), không host không goods
    // (GĐ1346: valentine có Giỏ quà Valentine → thành dịp LỚN có goods như 8/3/20-11/Trung thu —
    //  không còn là ví dụ dịp nhỏ; đổi ví dụ sang mua_mua giữ nguyên nhánh host-false cần test.)
    useGame.setState({
      ...newGameData(), money: 0, level: 3, day,
      community: {}, furniture: plant(2) as never, notify: (m) => void toasts.push(m),
    });
    const goal = activeGoals(day, 3)[0];
    expect(goal.festival.id).toBe('mua_mua');
    expect(goal.festival.host).toBeUndefined(); // dịp này không có host
    expect(goal.festival.goods).toBeUndefined(); // và không phải dịp lớn
    const id = goal.items.length ? goal.items[0] : PID;
    g().communitySale(Array(goal.itemTarget).fill(id));

    expect(g().community[goal.key].done).toBe(true);
    expect(g().money).toBe(goal.reward.money);
    expect(g().regulars).toEqual({}); // không tặng thân thiết (dòng 287/292 nhánh host false)
    expect(toasts.some((t) => t.includes('Cả hẻm hoàn thành'))).toBe(true);
    expect(toasts.some((t) => t.includes('thân hơn'))).toBe(false); // nhánh 295 host false
  });
});
