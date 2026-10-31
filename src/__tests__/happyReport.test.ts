import { describe, expect, it } from 'vitest';
import { HAPPY_HOURS, happyHourReport, type HappyHour } from '../data/rhythm';

/** Báo cáo hiệu quả khung giờ vàng tự đặt từ sổ theo giờ (stats.byHour) — thuần đọc, đóng vòng "chọn giờ → xem kết quả". */

describe('happyHourReport — khung giờ vàng hôm nay chạy ra sao', () => {
  it('chưa có dữ liệu trong khung → present=false, mọi con số 0', () => {
    const r = happyHourReport({ from: 14, off: 10 }, { 16: { customers: 9, revenue: 8000 } });
    expect(r.present).toBe(false);
    expect(r.customers).toBe(0);
    expect(r.revenue).toBe(0);
    expect(r.extraCustomers).toBe(0);
    expect(r.discountCost).toBe(0);
  });

  it('cộng dồn đúng 2 giờ trong cửa sổ 14h–16h (không lẫn giờ ngoài khung)', () => {
    const byHour = {
      13: { customers: 50, revenue: 40000 }, // ngoài khung — không tính
      14: { customers: 10, revenue: 9000 },
      15: { customers: 2, revenue: 1000 },
      16: { customers: 99, revenue: 99000 }, // tận cùng to=16 — không tính
    };
    const r = happyHourReport({ from: 14, off: 10 }, byHour);
    expect(r.present).toBe(true);
    expect(r.customers).toBe(12);
    expect(r.revenue).toBe(10000);
    expect(r.from).toBe(14);
    expect(r.to).toBe(14 + HAPPY_HOURS);
  });

  it('giảm 10% → khách nhờ giờ vàng ≈ 20% số khách trong khung (1 − 1/1.25), làm tròn', () => {
    const r = happyHourReport({ from: 14, off: 10 }, { 14: { customers: 10, revenue: 9000 }, 15: { customers: 2, revenue: 1000 } });
    expect(r.extraCustomers).toBe(Math.round(12 * (1 - 1 / 1.25))); // 2
  });

  it('giảm 20% → khách nhờ giờ vàng ≈ 1/3 số khách (1 − 1/1.5)', () => {
    const r = happyHourReport({ from: 14, off: 20 }, { 14: { customers: 9, revenue: 9000 }, 15: { customers: 3, revenue: 3000 } });
    expect(r.extraCustomers).toBe(Math.round(12 * (1 - 1 / 1.5))); // 4
  });

  it('tiền giảm giá ước tính = doanh thu trong khung × mức giảm', () => {
    const r = happyHourReport({ from: 14, off: 15 }, { 14: { customers: 10, revenue: 20000 }, 15: { customers: 2, revenue: 2000 } });
    expect(r.discountCost).toBe(Math.round(22000 * 15 / 100)); // 3300
  });

  it('cửa sổ 9h–11h chỉ đọc 2 giờ 9 và 10', () => {
    const byHour = {
      9: { customers: 4, revenue: 4000 },
      10: { customers: 6, revenue: 6000 },
      11: { customers: 100, revenue: 100000 },
    };
    const r = happyHourReport({ from: 9, off: 10 }, byHour);
    expect(r.customers).toBe(10);
    expect(r.revenue).toBe(10000);
  });

  it('mọi cửa sổ hợp lệ 9–20 đều có to = from + HAPPY_HOURS', () => {
    for (let from = 9; from <= 20; from++) {
      const r = happyHourReport({ from, off: 10 }, {});
      expect(r.to).toBe(from + HAPPY_HOURS);
      expect(r.present).toBe(false);
    }
  });

  it('helper thuần: hai lần cùng đầu vào cho kết quả giống hệt', () => {
    const byHour = { 14: { customers: 5, revenue: 5000 } };
    expect(happyHourReport({ from: 14, off: 10 }, byHour)).toEqual(happyHourReport({ from: 14, off: 10 }, byHour));
  });

  it('byHour undefined/thiếu → present=false an toàn (save/ngày mới chưa có sổ)', () => {
    const a = happyHourReport({ from: 14, off: 10 }, undefined);
    expect(a.present).toBe(false);
    const b = happyHourReport({ from: 14, off: 10 }, {});
    expect(b.present).toBe(false);
  });
});

// Giữ type import để đánh dấu hợp đồng kiểu (biên dịch ts).
void (0 as unknown as HappyHour);
