import { describe, expect, it } from 'vitest';
import {
  MAX_BUTCHER_FACTOR,
  butcherValueToday,
  meatFromByItem,
  missedMeatRevenue,
  recentMeatRevenue,
} from '../data/butcherValue';
import type { Staff } from '../data/staff';
import type { AnalyticsState } from '../data/analytics';

const staff = (rows: Pick<Staff, 'role' | 'skill' | 'shift'>[]) => rows as Pick<Staff, 'role' | 'skill' | 'shift'>[];

describe('butcherValueToday — trạng thái người bán thịt cá hôm nay', () => {
  it('không có người bán thịt cá → present=false, factor=0.35, pct=22%', () => {
    const v = butcherValueToday(staff([]));
    expect(v.present).toBe(false);
    expect(v.skill).toBe(0);
    expect(v.factor).toBe(0.35);
    expect(v.pct).toBe(22);
  });

  it('chỉ có người bán ca đêm → xem như không trực quầy ban ngày', () => {
    const v = butcherValueToday(staff([{ role: 'butcher', skill: 4, shift: 'night' }]));
    expect(v.present).toBe(false);
    expect(v.factor).toBe(0.35);
  });

  it('người bán thịt cá 1★ ca sáng → present=true, factor=1.12, pct=70', () => {
    const v = butcherValueToday(staff([{ role: 'butcher', skill: 1, shift: 'morning' }]));
    expect(v.present).toBe(true);
    expect(v.factor).toBeCloseTo(1.12, 10);
    expect(v.pct).toBe(70);
  });

  it('3★ ca chiều → factor=1.36, pct=85', () => {
    const v = butcherValueToday(staff([{ role: 'butcher', skill: 3, shift: 'afternoon' }]));
    expect(v.factor).toBeCloseTo(1.36, 10);
    expect(v.pct).toBe(85);
  });

  it('5★ ca cả ngày → factor=1.6=maxFactor, pct=100', () => {
    const v = butcherValueToday(staff([{ role: 'butcher', skill: 5, shift: 'full' }]));
    expect(v.present).toBe(true);
    expect(v.factor).toBeCloseTo(1.6, 10);
    expect(v.factor).toBe(MAX_BUTCHER_FACTOR);
    expect(v.pct).toBe(100);
  });

  it('lấy max sao trong nhiều người bán thịt cá trực', () => {
    const v = butcherValueToday(staff([
      { role: 'butcher', skill: 2, shift: 'morning' },
      { role: 'butcher', skill: 4, shift: 'afternoon' },
    ]));
    expect(v.skill).toBe(4);
    expect(v.factor).toBeCloseTo(1 + 0.12 * 4, 10); // 1.48
  });

  it('chỉ tính người bán thịt cá, không tính vai khác', () => {
    const v = butcherValueToday(staff([{ role: 'cashier', skill: 5, shift: 'full' }]));
    expect(v.present).toBe(false);
    expect(v.factor).toBe(0.35);
  });
});

describe('missedMeatRevenue — tiền thịt cá tăng thêm nếu lên người bán 5★', () => {
  it('không ai trực, doanh thu 140.000đ/ngày → thêm ~500.000đ/ngày', () => {
    const v = butcherValueToday(staff([]));
    // round(140000 × (1.6/0.35 − 1)) = round(140000 × 3.5714) = 500000
    expect(missedMeatRevenue(140000, v)).toBe(500000);
  });

  it('3★ trực, doanh thu 140.000đ/ngày → thêm ~24.706đ/ngày', () => {
    const v = butcherValueToday(staff([{ role: 'butcher', skill: 3, shift: 'afternoon' }]));
    // round(140000 × (1.6/1.36 − 1)) = round(140000 × 0.17647) = 24706
    expect(missedMeatRevenue(140000, v)).toBe(24706);
  });

  it('đã đủ 5★ → thêm 0đ', () => {
    const v = butcherValueToday(staff([{ role: 'butcher', skill: 5, shift: 'full' }]));
    expect(missedMeatRevenue(140000, v)).toBe(0);
  });

  it('chưa có doanh thu thịt cá (0đ) → thêm 0đ', () => {
    const v = butcherValueToday(staff([]));
    expect(missedMeatRevenue(0, v)).toBe(0);
  });
});

describe('meatFromByItem — lọc món thịt cá từ sổ bán theo món', () => {
  it('chỉ cộng món thịt cá, bỏ qua món khác', () => {
    const r = meatFromByItem({
      thit_heo_tuoi: { qty: 3, revenue: 390000, cost: 285000 },
      gao: { qty: 5, revenue: 500000, cost: 400000 },
      ca_loc_tuoi: { qty: 1, revenue: 98000, cost: 70000 },
    });
    expect(r.revenue).toBe(390000 + 98000); // 488000
    expect(r.qty).toBe(4);
  });

  it('byItem rỗng/undefined → 0', () => {
    expect(meatFromByItem(undefined)).toEqual({ revenue: 0, qty: 0 });
    expect(meatFromByItem({})).toEqual({ revenue: 0, qty: 0 });
  });
});

describe('recentMeatRevenue — doanh thu thịt cá trung bình/ngày gần nhất từ analytics', () => {
  const rec = (day: number, id: string, revenue: number, qty: number) => ({
    day, qty, revenue, cost: 0, spoiled: 0, lost: 0,
  });

  it('trung bình ngày của các ngày có dòng, chỉ món thịt cá', () => {
    const a: AnalyticsState = {
      flags: {},
      items: {
        thit_heo_tuoi: [
          rec(10, 'thit_heo_tuoi', 200000, 2),
          rec(9, 'thit_heo_tuoi', 100000, 1),
        ],
        gao: [rec(10, 'gao', 999999, 3)], // không phải thịt → bỏ
        ca_loc_tuoi: [rec(10, 'ca_loc_tuoi', 98000, 1)],
      },
    };
    const r = recentMeatRevenue(a, 7);
    // ngày 10: 200000+98000 = 298000; ngày 9: 100000 → trung bình 2 ngày = 199000
    expect(r.revenue).toBe(199000);
    // qty: ngày10 (2+1)=3 + ngày9 (1)=1 → /2 = 2
    expect(r.qty).toBe(2);
  });

  it('giới hạn đúng số ngày lấy (days)', () => {
    const a: AnalyticsState = {
      flags: {},
      items: {
        thit_heo_tuoi: [
          rec(12, 'thit_heo_tuoi', 120000, 1),
          rec(11, 'thit_heo_tuoi', 100000, 1),
          rec(10, 'thit_heo_tuoi', 80000, 1),
        ],
      },
    };
    const r = recentMeatRevenue(a, 2); // lấy 2 ngày gần: 12,11 → (120000+100000)/2 = 110000
    expect(r.revenue).toBe(110000);
  });

  it('analytics rỗng → 0', () => {
    const a: AnalyticsState = { flags: {}, items: {} };
    expect(recentMeatRevenue(a, 7)).toEqual({ revenue: 0, qty: 0 });
    expect(recentMeatRevenue(undefined, 7)).toEqual({ revenue: 0, qty: 0 });
  });
});
