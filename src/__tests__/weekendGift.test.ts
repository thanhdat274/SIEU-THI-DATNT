import { describe, it, expect } from 'vitest';
import { weekendGift } from '../data/weekendGift';
import { isWeekend } from '../data/calendar';

const we = [1, 2, 3, 4, 5, 6, 7].find((d) => isWeekend(d))!;
const wd = [1, 2, 3, 4, 5, 6, 7].find((d) => !isWeekend(d))!;
const g = { money: 40_000, xp: 50, label: 'Phong bao' };

describe('GĐ1555 — quà điểm danh cuối tuần', () => {
  it('cuối tuần cấp ≥37: tiền +25%, XP giữ nguyên', () => {
    const out = weekendGift(g, 37, we);
    expect(out.money).toBe(50_000);
    expect(out.xp).toBe(50);
  });
  it('ngày thường, cấp thấp, quà không tiền: giữ nguyên', () => {
    expect(weekendGift(g, 37, wd)).toBe(g);
    expect(weekendGift(g, 36, we)).toBe(g);
    const noMoney = { xp: 10, label: 'XP' };
    expect(weekendGift(noMoney, 40, we)).toBe(noMoney);
  });
});
