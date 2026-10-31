import { describe, expect, it } from 'vitest';
import { WEEKEND_PULL, weekendPullOf, weekendSellingDays } from '../data/weekendRestock';
import { WEEKEND_SNACKS } from '../data/products';

// GĐ266 — gợi ý nhập hàng biết cuối tuần: helper thuần đọc, không đụng store/kinh tế.
// Ngày chơi: 1 = Thứ 2 → cuối tuần là ngày ≡ 6,7 (mod 7), vd 6 (Thứ 7), 7 (CN), 13, 14…

describe('weekendSellingDays — khung bán của lô có rơi vào cuối tuần không', () => {
  it('không giao chậm: chỉ nhìn hôm nay', () => {
    expect(weekendSellingDays(6, 0)).toBe(true); // hôm nay Thứ 7
    expect(weekendSellingDays(7, 0)).toBe(true); // hôm nay CN
    expect(weekendSellingDays(5, 0)).toBe(false); // hôm nay Thứ 6 (mai mới cuối tuần)
    expect(weekendSellingDays(8, 0)).toBe(false); // Thứ 2
  });

  it('giao sáng mai: nhìn mai + ngày kia (khớp forecastTraffic)', () => {
    expect(weekendSellingDays(5, 1)).toBe(true); // Thứ 6 đặt → bán Thứ 7/CN
    expect(weekendSellingDays(4, 1)).toBe(true); // Thứ 5 đặt → bán Thứ 6? không — bán Thứ 7 (mai+1 Thứ 6, +2 Thứ 7)
    expect(weekendSellingDays(33, 1)).toBe(true); // Thứ 6
    expect(weekendSellingDays(31, 1)).toBe(false); // Thứ 4 đặt → bán Thứ 5, Thứ 6
    expect(weekendSellingDays(6, 1)).toBe(true); // Thứ 7 đặt → bán CN, Thứ 2 (CN có mặt)
  });
});

describe('weekendPullOf — hệ số kéo cầu', () => {
  it('chỉ nhân khi đủ 3 điều kiện: bán cuối tuần + có cầu thật + thuộc nhóm ăn vặt', () => {
    const snack = WEEKEND_SNACKS[0];
    expect(weekendPullOf(snack, 2, true)).toBe(WEEKEND_PULL);
    expect(weekendPullOf(snack, 2, false)).toBe(1); // không bán cuối tuần
    expect(weekendPullOf(snack, 0, true)).toBe(1); // chưa có cầu — món nhập thử không nhân
    expect(weekendPullOf('giay', 5, true)).toBe(1); // giấy vệ sinh không phải ăn vặt
  });
});

// ── GĐ268 — phản hồi cuối ngày cuối tuần ──
import { weekendRecap } from '../data/weekendRestock';
import { weekendQuestTarget } from '../data/quests';
import type { DayStats } from '../core/store';

describe('weekendRecap — tổng kết nhóm ăn vặt cuối ngày cuối tuần (GĐ268)', () => {
  const stats = (byItem: Record<string, { qty: number; revenue: number; cost: number }>, revenue: number) =>
    ({ byItem, revenue }) as DayStats;

  it('gộp đúng nhóm WEEKEND_SNACKS, tính % doanh thu và đối chiếu mục tiêu quest', () => {
    const target = weekendQuestTarget(10); // round(6 × (1 + 0.15 × 9)) = 14
    expect(target).toBe(14);
    const r = weekendRecap(
      stats({ mi: { qty: 8, revenue: 40000, cost: 0 }, banh: { qty: 5, revenue: 40000, cost: 0 }, giay: { qty: 9, revenue: 135000, cost: 0 } }, 215000),
      10, target,
    );
    expect(r.sold).toBe(13); // mì 8 + bánh 5 — giấy không thuộc nhóm
    expect(r.value).toBe(80000);
    expect(r.sharePct).toBe(37); // round(80000 / 215000 × 100)
    expect(r.met).toBe(false); // 13 < 14
  });

  it('đủ mục tiêu → met; ngày doanh thu 0 → share 0, không chia 0', () => {
    const t = weekendQuestTarget(1); // 6
    const ok = weekendRecap(stats({ mi: { qty: 6, revenue: 30000, cost: 0 } }, 30000), 1, t);
    expect(ok.met).toBe(true);
    const empty = weekendRecap(stats({}, 0), 1, t);
    expect(empty.sold).toBe(0);
    expect(empty.sharePct).toBe(0);
    expect(empty.met).toBe(false);
  });
});
