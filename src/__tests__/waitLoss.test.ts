import { describe, expect, it } from 'vitest';
import { waitLossStats } from '../data/advice';

/**
 * GĐ120 — Phản hồi cuối ngày 'mất khách vì chờ quầy': helper THUẦN ĐỌC nhặt từ state có sẵn
 * (missed.wait / byHour / customers) để vẽ thẻ dạy chơi trong Tổng kết ngày, đóng vòng lặp của
 * dấu hiệu sốt ruột GĐ119 (😕→😤→bỏ về). Đề xuất Game Designer (H1). KHÔNG đổi save/kinh tế —
 * chỉ đọc và quy đổi, không đẻ ra con số kinh tế mới.
 */
describe('waitLossStats — bức tranh khách bỏ vì chờ quầy (GĐ120)', () => {
  it('hôm đó không ai bỏ vì chờ: trả null (không nhiễu Tổng kết)', () => {
    expect(waitLossStats({ 12: { customers: 8, revenue: 50000 } }, {}, 8)).toBeNull();
    expect(waitLossStats(undefined, { wait: 0 }, 8)).toBeNull();
    expect(waitLossStats(undefined, undefined, 8)).toBeNull();
  });

  it('có khách bỏ vì chờ: trả số đúng + tỉ lệ so với khách ghé', () => {
    const v = waitLossStats({ 17: { customers: 20, revenue: 100000 } }, { wait: 4 }, 40);
    expect(v).not.toBeNull();
    expect(v!.count).toBe(4);
    expect(v!.pct).toBeCloseTo(0.1); // 4/40
    expect(v!.peakHour).toBe(17);
  });

  it('ngày chưa có khách (customers=0) mà có người bỏ: không chia cho 0, coi là 100%', () => {
    const v = waitLossStats(undefined, { wait: 2 }, 0);
    expect(v!.count).toBe(2);
    expect(v!.pct).toBe(1);
    expect(v!.peakHour).toBeNull();
  });

  it('peakHour đọc từ giờ đông nhất in byHour (không chỉ giờ có record đầu)', () => {
    // hai giờ có khách, giá trị khác nhau → peak phải là giờ đông hơn
    const v = waitLossStats({ 10: { customers: 3, revenue: 30000 }, 18: { customers: 15, revenue: 90000 } }, { wait: 1 }, 20);
    expect(v!.peakHour).toBe(18);
  });
});
