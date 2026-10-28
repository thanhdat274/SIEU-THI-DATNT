import { describe, expect, it } from 'vitest';
import { weekPace, WEEK_DAYS } from '../data/biz';

/**
 * GĐ121 — Nhịp chạy tuần: tín hiệu thuần đọc cho thử thách tuần (có theo kịp cuối tuần không?
 * có nguy cơ mất chuỗi không?). Đúng mô-típ GĐ119/120 — đọc tally + streak có sẵn, KHÔNG đổi
 * state/save/kinh tế. Game Designer đề xuất 'Nhịp chạy tuần' (cadence tuần là hệ còn hộp đen).
 */
describe('weekPace — dự báo + nguy cơ mất chuỗi của thử thách tuần (GĐ121)', () => {
  it('mục tiêu vô nghĩa (≤0) hoặc hết tuần (≤0 ngày): trả null (không vẽ nhiễu)', () => {
    expect(weekPace(10, 0, 4, 1, 100000)).toBeNull();
    expect(weekPace(10, 100, 0, 1, 100000)).toBeNull();
    expect(weekPace(10, 100, -2, 1, 100000)).toBeNull();
  });

  it('pace = current/target; dự kiến = giữ nhịp mỗi ngày (current/số ngày đã trôi × 7)', () => {
    // target 100, hiện 40, còn 4 ngày → đã trôi 3 ngày: projected = 40 × 7 / 3 ≈ 93,3
    const v = weekPace(40, 100, 4, 0, 100000);
    expect(v!.pace).toBeCloseTo(0.4);
    expect(v!.remainingDays).toBe(4);
    expect(v!.projected).toBeCloseTo(40 * 7 / 3);
    expect(v!.onTrack).toBe(false); // 93,3 < 100
  });

  it('biên onTrack: đủ tốc độ hằng ngày để kịp cuối tuần là kịp (>=)', () => {
    // hụt: 20 trên 100, đã trôi 3 ngày → projected 46,7 < 100
    expect(weekPace(20, 100, 4, 0, 100000)!.onTrack).toBe(false);
    // hụt: 80/100 đã trôi 6 ngày (còn 1) → projected 93,3 < 100
    expect(weekPace(80, 100, 1, 0, 100000)!.onTrack).toBe(false);
    // kịp: 50/100 đã trôi 2 ngày → projected 175 >= 100
    expect(weekPace(50, 100, 5, 0, 100000)!.onTrack).toBe(true);
  });

  it('streakAtRisk chỉ khi đang hụt MÀ có chuỗi (>=1) và chưa đủ', () => {
    expect(weekPace(20, 100, 4, 3, 100000)!.streakAtRisk).toBe(true);
    // hụt nhưng chưa có chuỗi → không gọi là "rủi ro mất chuỗi"
    expect(weekPace(20, 100, 4, 0, 100000)!.streakAtRisk).toBe(false);
    // đủ mục tiêu → không còn rủi ro
    const done = weekPace(120, 100, 4, 5, 100000);
    expect(done!.onTrack).toBe(true);
    expect(done!.streakAtRisk).toBe(false);
  });

  it('streakExtra khớp công thức thưởng chuỗi của closeWeek (+20%/tuần, trần +80%)', () => {
    // closeWeek: chReward = reward × (1 + 0.2×min(streak,4)); phần cộng dồn = reward × 0.2×min(streak,4)
    expect(weekPace(40, 100, 4, 3, 100000)!.streakExtra).toBe(Math.round(100000 * 0.2 * 3));
    // streak 4 → min(streak,4)=4; streak 6 cũng cap ở 4
    expect(weekPace(40, 100, 4, 4, 100000)!.streakExtra).toBe(Math.round(100000 * 0.2 * 4));
    expect(weekPace(40, 100, 4, 6, 100000)!.streakExtra).toBe(Math.round(100000 * 0.2 * 4));
    // streak 0 → không có cộng dồn
    expect(weekPace(40, 100, 4, 0, 100000)!.streakExtra).toBe(0);
  });

  it('remainingDays từ WEEK_DAYS: tính đúng số ngày còn lại trong tuần', () => {
    expect(WEEK_DAYS).toBe(7);
    // startDay 1, hôm nay day 4 → còn 7 + 1 - 4 = 4 ngày (ngày 5,6,7)
    const daysLeft = (start: number, today: number) => weekPace(10, 100, start + WEEK_DAYS - today, 0, 100000)!.remainingDays;
    expect(daysLeft(1, 4)).toBe(4);
    expect(daysLeft(1, 1)).toBe(7); // đầu tuần
    expect(daysLeft(1, 7)).toBe(1); // cuối tuần
  });

  it('missing = còn thiếu để đủ target (clamp ≥0)', () => {
    expect(weekPace(40, 100, 4, 0, 100000)!.missing).toBe(60);
    expect(weekPace(130, 100, 4, 0, 100000)!.missing).toBe(0);
  });
});
