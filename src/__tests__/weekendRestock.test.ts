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
