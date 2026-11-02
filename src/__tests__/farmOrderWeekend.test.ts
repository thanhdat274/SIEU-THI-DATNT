import { describe, expect, it } from 'vitest';
import { isWeekend } from '../data/calendar';
import { isXoiCungDay } from '../data/tiemXoi';
import { FARM_ORDER_BONUS, FARM_ORDER_DAYS, FARM_ORDER_WEEKEND_BONUS, farmOrderBonus, makeFarmOrder } from '../data/garden';

describe('đơn quán xóm cuối tuần (GĐ536)', () => {
  it('đơn tới hạn Thứ 7/CN trả ×1,35, ngày thường ×1,25', () => {
    let we = 0, wd = 0;
    for (let d = 1; d <= 14; d++) {
      const o = makeFarmOrder(d, () => 0.3);
      const due = d + FARM_ORDER_DAYS;
      expect(o.dueDay).toBe(due);
      expect(o.bonus).toBe(isWeekend(due) || isXoiCungDay(due) ? FARM_ORDER_WEEKEND_BONUS : FARM_ORDER_BONUS); // GĐ605: ngày cúng như cuối tuần
      if (isWeekend(due)) we++; else wd++;
    }
    expect(we).toBeGreaterThan(0);
    expect(wd).toBeGreaterThan(we);
  });
  it('thưởng cuối tuần chỉ nhỉnh hơn, không lấn bán hàng', () => {
    expect(FARM_ORDER_WEEKEND_BONUS).toBeGreaterThan(FARM_ORDER_BONUS);
    expect(FARM_ORDER_WEEKEND_BONUS).toBeLessThanOrEqual(1.4);
    expect([8, 9, 10, 11, 12, 13, 14].map(farmOrderBonus).filter((b) => b > FARM_ORDER_BONUS).length).toBe(2);
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

describe('số lượng đơn theo sức trại (GĐ544)', () => {
  it('đơn lọc theo trại không đặt quá số kịp làm, vẫn tối thiểu 3', async () => {
    const { farmOrderCapacity, farmOrderProduce, newGarden } = await import('../data/garden');
    const g = newGarden();
    g.pens.chicken = { count: 2, fedDay: 0, feedKg: 0, pending: 0 } as never; // ≈3,6 trứng/2 ngày
    g.pens.cow = { count: 1, fedDay: 0, feedKg: 0, pending: 0 } as never; // 4 lốc/2 ngày
    const o = makeFarmOrder(3, () => 0.99, farmOrderProduce(g), farmOrderCapacity(g));
    for (const it of o.items) expect(it.qty).toBeLessThanOrEqual(Math.max(3, Math.floor(farmOrderCapacity(g)[it.productId])));
    expect(makeFarmOrder(3, () => 0.99).items.every((it) => it.qty === 8)).toBe(true);
  });
});

describe('tin đơn quán xóm (GĐ549)', () => {
  it('đơn cuối tuần báo giá hời, đơn thường chỉ đường tới bảng; ≤90 ký tự', async () => {
    const { farmOrderNews, FARM_BUYERS } = await import('../data/garden');
    const longest = FARM_BUYERS.reduce((a, b) => (b.length > a.length ? b : a));
    const weDay = Array.from({ length: 14 }, (_, i) => 1230 + i).find((d) => isWeekend(d))!;
    const we = farmOrderNews({ id: 1, from: longest, items: [], dueDay: weDay, bonus: FARM_ORDER_WEEKEND_BONUS });
    const wd = farmOrderNews({ id: 2, from: longest, items: [], dueDay: 1234, bonus: FARM_ORDER_BONUS });
    expect(we).toContain('cuối tuần trả ×1,35');
    expect(wd).toContain('xem ở bảng Trang trại');
    expect(we.length).toBeLessThanOrEqual(90);
    expect(wd.length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ606: panel trang trại ghi lý do giá hời', () => {
  it('đơn hạn ngày cúng (ngày thường) ghi "quán cần đồ cúng"', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/ui/panels/GardenPanel.tsx', 'utf8');
    expect(src).toContain("isXoiCungDay(order.dueDay) && !isWeekend(order.dueDay) ? ' (quán cần đồ cúng)'");
  });
});
