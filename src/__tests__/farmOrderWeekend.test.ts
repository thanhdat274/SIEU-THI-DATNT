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

describe('đơn quán xóm theo món trại làm ra (GĐ542)', () => {
  it('trại có rau + gà thì đơn chỉ đặt rau/trứng; trại trống thì lấy cả pool', async () => {
    const { farmOrderProduce, newGarden } = await import('../data/garden');
    const g = newGarden();
    expect(farmOrderProduce(g)).toEqual([]);
    g.plots[0] = { crop: 'rau_cai', growth: 1, wateredDay: 0 };
    g.pens.chicken = { count: 2, fedDay: 0, feedKg: 0, pending: 0 } as never;
    const produce = farmOrderProduce(g);
    expect(produce.sort()).toEqual(['rau', 'trung']);
    for (let i = 0; i < 5; i++) {
      const o = makeFarmOrder(3, () => (i + 0.5) / 5, produce);
      expect(o.items.map((it) => it.productId).sort()).toEqual(['rau', 'trung']);
    }
    expect(makeFarmOrder(3, () => 0.99, ['rau']).items.some((it) => it.productId !== 'rau')).toBe(true);
  });
});

describe('đơn quán xóm theo sức trại (GĐ543)', () => {
  it('1 con ngỗng (≈1 trứng/2 ngày) không đủ đặt; rau còn non thì chưa tính', async () => {
    const { farmOrderProduce, newGarden } = await import('../data/garden');
    const g = newGarden();
    g.pens.goose = { count: 1, fedDay: 0, feedKg: 0, pending: 0 } as never;
    g.plots[0] = { crop: 'rau_cai', growth: 0, wateredDay: 0 };
    expect(farmOrderProduce(g)).toEqual([]);
    g.plots[0] = { crop: 'rau_cai', growth: 1, wateredDay: 0 };
    g.pens.goose = { count: 4, fedDay: 0, feedKg: 0, pending: 0 } as never;
    expect(farmOrderProduce(g).sort()).toEqual(['rau', 'trung_goos']);
    expect(farmOrderProduce({ ...newGarden(), homegrown: { sua_de: 5 } })).toEqual(['sua_de']);
  });
});
