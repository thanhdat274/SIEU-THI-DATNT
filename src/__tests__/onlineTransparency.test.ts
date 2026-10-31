import { describe, expect, it } from 'vitest';
import { appRating, ONLINE_HOURS, onlineOrderCap, orderGap, orderRateTone, type OnlineState } from '../data/online';

/**
 * Bộ test GĐ-ONLINE-CAP — "gỡ hộp đen đơn app": người chơi thấy điểm app ảnh hưởng thế nào tới độ dày
 * đơn và trần đơn/ngày. Helper thuần trong data/online.ts, hiển thị trong OnlinePanel.
 *
 * Hợp đồng:
 * - orderGap(rating, level): khoảng cách 2 đơn (phút) — cấp cao, điểm cao thì đơn dày hơn.
 * - onlineOrderCap(rating, level): trần đơn/ngày = độ rộng khung giờ / orderGap.
 * - orderRateTone(rating): mô tả độ dày theo mức điểm (mồi minh bạch).
 * - ONLINE_HOURS = [7*60, 21*60+30] → 870 phút nhận đơn.
 */

const stub = (rating: number): OnlineState => ({
  open: true, orders: [], nextAt: 0, ratingSum: rating * 10, ratingCount: 10, done: 0, late: 0, nextId: 1, revenueToday: 0, grabFeesToday: 0,
});

describe('orderGap — khoảng cách 2 đơn (phút)', () => {
  it('cấp cao → đơn dày hơn (gap nhỏ) cùng điểm', () => {
    expect(orderGap(5, 10)).toBeGreaterThan(orderGap(5, 60)); // 10: 85 phút, 60+: 35 phút
    expect(orderGap(5, 200)).toBe(35); // sàn 35
    expect(orderGap(5, 5)).toBe(90); // 95-5
  });

  it('điểm cao → gap ngắn hơn (đơn dày) cùng cấp; nhân 1 / 1.4 / 2.2 / 4', () => {
    const base35 = 35;
    expect(orderGap(5, 60)).toBeCloseTo(base35 * 1); // 4.5+
    expect(orderGap(4.2, 60)).toBeCloseTo(base35 * 1.4);
    expect(orderGap(3.5, 60)).toBeCloseTo(base35 * 2.2);
    expect(orderGap(2, 60)).toBeCloseTo(base35 * 4);
  });
});

describe('onlineOrderCap — trần đơn/ngày ≈ 870 / gap', () => {
  it('cấp 40 + điểm 5★ → ~16 đơn/ngày (khớp chú thích quests)', () => {
    const span = ONLINE_HOURS[1] - ONLINE_HOURS[0]; // 870
    expect(span).toBe(870);
    const gap = orderGap(5, 40); // max(35,55)=55
    expect(gap).toBe(55);
    expect(onlineOrderCap(5, 40)).toBe(Math.round(870 / 55)); // 16
  });

  it('cấp 10 + điểm 5★ → ~10 đơn/ngày; cấp 60+ → ~25', () => {
    expect(onlineOrderCap(5, 10)).toBe(Math.round(870 / 85)); // 10
    expect(onlineOrderCap(5, 60)).toBe(Math.round(870 / 35)); // 25
  });

  it('điểm thấp làm trần giảm hẳn (cùng cấp 60): 25 → ~6 đơn', () => {
    expect(onlineOrderCap(2, 60)).toBe(Math.round(870 / (35 * 4))); // 6
    expect(onlineOrderCap(2, 60)).toBeLessThan(onlineOrderCap(5, 60));
  });

  it('cap không âm và luôn nguyên dương với mọi cấp trong [10, 100]', () => {
    for (let lv = 10; lv <= 100; lv++) {
      for (const r of [2, 3.5, 4.2, 5]) {
        const cap = onlineOrderCap(r, lv);
        expect(cap).toBeGreaterThan(0);
        expect(Number.isInteger(cap)).toBe(true);
      }
    }
  });
});

describe('orderRateTone — mồi minh bạch theo điểm', () => {
  it('4.5+ / 4–4.49 / 3–3.99 / <3 ra 4 tone khác nhau', () => {
    expect(orderRateTone(5)).toContain('dày');
    expect(orderRateTone(4.3)).toContain('đều');
    expect(orderRateTone(3.5)).toContain('thưa');
    expect(orderRateTone(2)).toContain('thưa');
    expect(orderRateTone(2)).not.toBe(orderRateTone(3.5));
  });
});

describe('appRating — ván mới chưa ai chấm mặc định 5★', () => {
  it('ratingCount=0 → 5.0 (gian hàng mới)', () => {
    expect(appRating({ ...stub(5), ratingSum: 0, ratingCount: 0 })).toBe(5);
  });
});
