import { describe, expect, it } from 'vitest';
import { weekPace, WEEK_DAYS, STREAK_XP_FROM, STREAK_XP_RATE_WEEK } from '../data/biz';
import { xpToNext } from '../data/levels';

/**
 * GĐ121 — Nhịp chạy tuần: tín hiệu thuần đọc cho thử thách tuần (có theo kịp cuối tuần không?
 * có nguy cơ mất chuỗi không?). Đúng mô-típ GĐ119/120 — đọc tally + streak có sẵn, KHÔNG đổi
 * state/save/kinh tế. Game Designer đề xuất 'Nhịp chạy tuần' (cadence tuần là hệ còn hộp đen).
 * GĐ169 — phần cộng chuỗi đổi từ tiền sang XP (streakXp): tham số cuối là `level` (thay baseReward).
 */
describe('weekPace — dự báo + nguy cơ mất chuỗi của thử thách tuần (GĐ121)', () => {
  it('mục tiêu vô nghĩa (≤0) hoặc hết tuần (≤0 ngày): trả null (không vẽ nhiễu)', () => {
    expect(weekPace(10, 0, 4, 1, 12)).toBeNull();
    expect(weekPace(10, 100, 0, 1, 12)).toBeNull();
    expect(weekPace(10, 100, -2, 1, 12)).toBeNull();
  });

  it('pace = current/target; dự kiến = giữ nhịp mỗi ngày (current/số ngày đã trôi × 7)', () => {
    // target 100, hiện 40, còn 4 ngày → đã trôi 3 ngày: projected = 40 × 7 / 3 ≈ 93,3
    const v = weekPace(40, 100, 4, 0, 12);
    expect(v!.pace).toBeCloseTo(0.4);
    expect(v!.remainingDays).toBe(4);
    expect(v!.projected).toBeCloseTo(40 * 7 / 3);
    expect(v!.onTrack).toBe(false); // 93,3 < 100
  });

  it('biên onTrack: đủ tốc độ hằng ngày để kịp cuối tuần là kịp (>=)', () => {
    // hụt: 20 trên 100, đã trôi 3 ngày → projected 46,7 < 100
    expect(weekPace(20, 100, 4, 0, 12)!.onTrack).toBe(false);
    // hụt: 80/100 đã trôi 6 ngày (còn 1) → projected 93,3 < 100
    expect(weekPace(80, 100, 1, 0, 12)!.onTrack).toBe(false);
    // kịp: 50/100 đã trôi 2 ngày → projected 175 >= 100
    expect(weekPace(50, 100, 5, 0, 12)!.onTrack).toBe(true);
  });

  it('streakAtRisk chỉ khi đang hụt MÀ có chuỗi (>=1) và chưa đủ', () => {
    expect(weekPace(20, 100, 4, 3, 12)!.streakAtRisk).toBe(true);
    // hụt nhưng chưa có chuỗi → không gọi là "rủi ro mất chuỗi"
    expect(weekPace(20, 100, 4, 0, 12)!.streakAtRisk).toBe(false);
    // đủ mục tiêu → không còn rủi ro
    const done = weekPace(120, 100, 4, 5, 12);
    expect(done!.onTrack).toBe(true);
    expect(done!.streakAtRisk).toBe(false);
  });

  it('streakXp (GĐ169) = XP chuỗi tuần này sẽ nhận nếu đủ chuỗi ≥3: khớp công thức closeWeek', () => {
    expect(STREAK_XP_FROM).toBe(3);
    // streak 2 → đạt tuần này là chuỗi 3 → có XP; streak 3+ cũng vậy (đều 35% xpToNext)
    expect(weekPace(40, 100, 4, 2, 30)!.streakXp).toBe(Math.round(STREAK_XP_RATE_WEEK * xpToNext(30)));
    expect(weekPace(40, 100, 4, 5, 30)!.streakXp).toBe(Math.round(STREAK_XP_RATE_WEEK * xpToNext(30)));
    // streak 0/1 → chưa đủ chuỗi, không có XP bị đặt cược
    expect(weekPace(40, 100, 4, 1, 30)!.streakXp).toBe(0);
    expect(weekPace(40, 100, 4, 0, 30)!.streakXp).toBe(0);
  });

  it('remainingDays từ WEEK_DAYS: tính đúng số ngày còn lại trong tuần', () => {
    expect(WEEK_DAYS).toBe(7);
    // startDay 1, hôm nay day 4 → còn 7 + 1 - 4 = 4 ngày (ngày 5,6,7)
    const daysLeft = (start: number, today: number) => weekPace(10, 100, start + WEEK_DAYS - today, 0, 12)!.remainingDays;
    expect(daysLeft(1, 4)).toBe(4);
    expect(daysLeft(1, 1)).toBe(7); // đầu tuần
    expect(daysLeft(1, 7)).toBe(1); // cuối tuần
  });

  it('missing = còn thiếu để đủ target (clamp ≥0)', () => {
    expect(weekPace(40, 100, 4, 0, 12)!.missing).toBe(60);
    expect(weekPace(130, 100, 4, 0, 12)!.missing).toBe(0);
  });
});
