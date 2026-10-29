import { describe, it, expect } from 'vitest';
import { onlineRatingValue } from '../data/onlineRatingValue';
import { onlineOrderCap } from '../data/online';

describe('onlineRatingValue — soi giá trị điểm app ra đơn/ngày và tiền', () => {
  it('không có đơn giao nào → noData', () => {
    const r = onlineRatingValue({ rating: 4.5, level: 30, revenueToday: 0, done: 0, grabFeesToday: 0 });
    expect(r.verdict).toBe('noData');
    expect(r.avgNetPerOrder).toBe(0);
  });

  it('tính đơn/ngày thêm khi lên 4,5⭐ và tiền/ngày (bộ số khớp orderGap/orderCap)', () => {
    // level 30: base orderGap = 95-30 = 65; span 870 phút.
    // cap(4.0)=round(870/(65*1.4))=10, cap(4.5)=round(870/65)=13, cap(3.0)=round(870/(65*2.2))=6
    const r = onlineRatingValue({ rating: 4.0, level: 30, revenueToday: 1_300_000, done: 10, grabFeesToday: 130_000 });
    expect(r.avgRevenuePerOrder).toBe(130_000);
    expect(r.avgNetPerOrder).toBe(117_000); // 10% phí grab
    expect(r.capNow).toBe(10);
    expect(r.capBest).toBe(13);
    expect(r.capFloor).toBe(6);
    expect(r.ordersToBest).toBe(3);
    expect(r.ordersToFloor).toBe(4);
    expect(r.moneyBestPerDay).toBe(351_000);
    expect(r.moneyFloorPerDay).toBe(468_000);
    expect(r.verdict).toBe('upside');
  });

  it('đang ở 4,5⭐ → best, không còn dư địa tăng đơn', () => {
    const r = onlineRatingValue({ rating: 4.5, level: 30, revenueToday: 1_300_000, done: 10, grabFeesToday: 0 });
    expect(r.verdict).toBe('best');
    expect(r.ordersToBest).toBe(0);
    expect(r.moneyBestPerDay).toBe(0);
  });

  it('khớp chính xác giới hạn onlineOrderCap', () => {
    expect(onlineOrderCap(4.0, 30)).toBe(10);
    expect(onlineOrderCap(4.5, 30)).toBe(13);
    expect(onlineOrderCap(3.0, 30)).toBe(6);
  });

  it('cấp cao → đơn dày hơn, dư địa tăng vẫn tính đúng', () => {
    // level 80: base orderGap = max(35, 95-80) = 35; rating 4.0 dùng ×1.4, floor 3.0 dùng ×2.2
    const low = onlineRatingValue({ rating: 4.0, level: 80, revenueToday: 800_000, done: 8, grabFeesToday: 80_000 });
    expect(low.avgNetPerOrder).toBe(90_000); // 100k × (1-0.1)
    expect(low.capNow).toBe(18); // round(870/(35*1.4))
    expect(low.capFloor).toBe(11); // round(870/(35*2.2))
    expect(low.capFloor).toBeLessThan(low.capNow);
    expect(low.capBest).toBeGreaterThan(low.capNow); // 25 > 18
  });
});
