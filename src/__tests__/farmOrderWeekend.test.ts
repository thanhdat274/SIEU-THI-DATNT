import { describe, expect, it } from 'vitest';
import { isWeekend } from '../data/calendar';
import { FARM_ORDER_BONUS, FARM_ORDER_DAYS, FARM_ORDER_WEEKEND_BONUS, farmOrderBonus, makeFarmOrder } from '../data/garden';

describe('đơn quán xóm cuối tuần (GĐ536)', () => {
  it('đơn tới hạn Thứ 7/CN trả ×1,35, ngày thường ×1,25', () => {
    let we = 0, wd = 0;
    for (let d = 1; d <= 14; d++) {
      const o = makeFarmOrder(d, () => 0.3);
      const due = d + FARM_ORDER_DAYS;
      expect(o.dueDay).toBe(due);
      expect(o.bonus).toBe(isWeekend(due) ? FARM_ORDER_WEEKEND_BONUS : FARM_ORDER_BONUS);
      if (isWeekend(due)) we++; else wd++;
    }
    expect(we).toBeGreaterThan(0);
    expect(wd).toBeGreaterThan(we);
  });
  it('thưởng cuối tuần chỉ nhỉnh hơn, không lấn bán hàng', () => {
    expect(FARM_ORDER_WEEKEND_BONUS).toBeGreaterThan(FARM_ORDER_BONUS);
    expect(FARM_ORDER_WEEKEND_BONUS).toBeLessThanOrEqual(1.4);
    expect([1, 2, 3, 4, 5, 6, 7].map(farmOrderBonus).filter((b) => b > FARM_ORDER_BONUS).length).toBe(2);
  });
});
