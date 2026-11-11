import { describe, expect, it } from 'vitest';
import { adById, adTodayLine } from '../data/advertising';

// GĐ2223 — dòng SỐNG "hôm nay" cho chiến dịch quảng cáo đang chạy: kéo thêm bao nhiêu khách + tiền
// hôm nay theo phí chi tiêu bình quân THẬT của hôm nay. THUẦN đọc + tái dùng adPayoff (không đổi sim).
// Mọi khẳng định từ đúng công thức decorVisitBoost = (boost/100)×(sao/5) và customersPerDay = 20 + cấp×4.

describe('GĐ2223 — adTodayLine (quảng cáo đang chạy · số sống hôm nay)', () => {
  it('băng rôn 40🩷 sao 5 · cấp 50 → 88 khách/ngày, kèm tiền theo avg thật', () => {
    // decorVisitBoost(40,5) = 0.4; customersPerDay(50) = 220 → extra = 88
    const line = adTodayLine(adById('bang_ron')!, 5, 50, 30_000);
    expect(line).toContain('88 khách');
    expect(line).toContain('2.640.000đ hôm nay'); // 88 × 30.000, vi-VN cách số bằng dấu chấm
  });

  it('chưa có khách hôm nay (avg 0) → chỉ nêu khách, không bịa tiền', () => {
    const line = adTodayLine(adById('bang_ron')!, 5, 50, 0);
    expect(line).toContain('88 khách');
    expect(line).not.toContain('đ hôm nay');
  });

  it('tờ rơi 20🩷 sao 3 · cấp 42 → giảm theo sao (0.12) → 23 khách', () => {
    // decorVisitBoost(20,3) = 0.12; customersPerDay(42) = 188 → 0.12×188 = 22.56 → 23
    const line = adTodayLine(adById('to_roi')!, 3, 42, 25_000);
    expect(line).toContain('23 khách');
  });

  it('line ≤ 90 ký tự với tiếng Việt đời thường', () => {
    const line = adTodayLine(adById('tien_lanh')!, 4, 50, 20_000);
    expect(line.length).toBeLessThanOrEqual(90);
    expect(line.startsWith('Hôm nay')).toBe(true);
  });
});
