import { describe, expect, it } from 'vitest';
import { HAPPY_HOURS, happyPayoff, happyTraffic, type HappyHour } from '../data/rhythm';

/**
 * GĐ130 — Chi phí–lợi ích giờ vàng tự đặt hôm nay: khách kéo thêm (extraCustomers) quy ra giá trị
 * so tiền đã giảm giá (discountCost). THUẦN đọc từ `happyHourReport` — không đổi state/kinh tế.
 */

const hh = (over: Partial<HappyHour> = {}): HappyHour => ({ from: 14, off: 20, ...over });
// Khung 14h–16h; giảm 20% → happyTraffic=1.5 → extraCustomers = round(customers×(1−1/1.5)) = round(customers/3)
const byHour = (cust: number, rev: number) => {
  const b: Record<number, { customers: number; revenue: number }> = {};
  for (let h = hh().from; h < hh().from + HAPPY_HOURS; h++) b[h] = { customers: cust, revenue: rev };
  return b;
};

describe('happyPayoff — giờ vàng có đáng không hôm nay', () => {
  it('chưa đặt giờ vàng (null) → null (không nhiễu)', () => {
    expect(happyPayoff(null, byHour(10, 10000))).toBeNull();
  });

  it('không có dữ liệu trong khung (present=false) → null', () => {
    expect(happyPayoff(hh(), {})).toBeNull();
    expect(happyPayoff(hh(), undefined)).toBeNull();
  });

  it('customers=0 trong khung → null (không chia 0)', () => {
    expect(happyPayoff(hh(), byHour(0, 0))).toBeNull();
  });

  it('extraValue = extraCustomers × (revenue/customers); extraCustomers khớp pattern happyHourReport', () => {
    // 2 giờ mỗi giờ 9 khách, 9000đ → customers=18, revenue=18000; avg/customer=1000
    // extraCustomers = round(18×(1−1/1.5)) = round(6) = 6 → extraValue=6000
    const p = happyPayoff(hh({ off: 20 }), byHour(9, 9000))!;
    expect(p.customers).toBe(18);
    expect(p.extraCustomers).toBe(Math.round(18 * (1 - 1 / happyTraffic(20))));
    expect(p.extraCustomers).toBe(6);
    expect(p.extraValue).toBe(6000);
  });

  it('discountCost = revenue × off/100; giảm 20% → 20% doanh thu trong khung', () => {
    // revenue=18000, off=10 → discountCost=1800
    const p = happyPayoff(hh({ off: 10 }), byHour(9, 9000))!;
    expect(p.discountCost).toBe(1800);
  });

  it('verdict=great khi efficiency ≥ 2 — mức giảm thấp hiệu quả cao (extraValue ~revenue/3 so chi phí)', () => {
    // off=10: extraValue=6000 (R/3), discount=1800 → efficiency≈3.33 → great
    const p = happyPayoff(hh({ off: 10 }), byHour(9, 9000))!;
    expect(p.verdict).toBe('great');
    expect(p.efficiency).toBeGreaterThanOrEqual(2);
  });

  it('verdict=ok khi chi phí chiết khấu ăn phần lớn lợi (off=20 → efficiency≈1.67)', () => {
    // off=20: extraValue=6000, discount=3600 → efficiency=1.667 → ok (gợi ý hạ mức giảm)
    const p = happyPayoff(hh({ off: 20 }), byHour(9, 9000))!;
    expect(p.verdict).toBe('ok');
    expect(p.efficiency).toBeCloseTo(1.667, 1);
  });

  it('verdict=weak khi tiền giảm giá vượt lợi khách kéo thêm (off rất cao, ngoài mức hợp lệ)', () => {
    // off=80: extraValue=6000 (R/3), discount=0.8×18000=14400 → efficiency=0.42 → weak
    const p = happyPayoff(hh({ off: 80 }), byHour(9, 9000))!;
    expect(p.discountCost).toBe(14400);
    expect(p.verdict).toBe('weak');
  });
});
