import { describe, expect, it } from 'vitest';
import { tomorrowTeaser, type TeaserInput } from '../data/tomorrowTeaser';
import { REGULARS } from '../data/regulars';

/**
 * 🔮 "Mai tiệm có gì" (GĐ126): mồi quay lại ngày mai ở tổng kết cuối ngày.
 * Thuần dữ liệu — dựng TeaserInput rồi gọi helper trực tiếp, không render.
 */

/** Khách quen nào cũng đã quen (visits>0) để bỏ qua ngưỡng danh tiếng — ghé hay không chỉ theo hash. */
const allRegulars = (): Record<string, { friendship: number; visits: number; lastVisitDay: number; perks: string[]; discovered: string[] }> => {
  const m: Record<string, { friendship: number; visits: number; lastVisitDay: number; perks: string[]; discovered: string[] }> = {};
  for (const r of REGULARS) m[r.id] = { friendship: 100, visits: 10, lastVisitDay: 0, perks: ['Ghé thường hơn', 'Mua thêm món', 'Hay boa'], discovered: [] };
  return m;
};

/** Không ai ghé: ai cũng đã ghé ĐÚNG ngày đó (visitsToday trả false vì lastVisitDay===day). */
const nobodyVisits = (day: number): Record<string, { friendship: number; visits: number; lastVisitDay: number; perks: string[]; discovered: string[] }> => {
  const m: Record<string, { friendship: number; visits: number; lastVisitDay: number; perks: string[]; discovered: string[] }> = {};
  for (const r of REGULARS) m[r.id] = { friendship: 0, visits: 1, lastVisitDay: day, perks: [], discovered: [] };
  return m;
};

const base = (over: Partial<TeaserInput> = {}): TeaserInput => ({
  day: 2,
  level: 1,
  weatherSeed: 0,
  weather: 'cloudy',
  regulars: {},
  repLog: [],
  totals: { revenue: 0, itemsSold: 0, customers: 0 },
  history: [],
  giftStreak: 0,
  giftLastDay: 0,
  giftGraceDay: 0,
  ...over,
});

const row = (rows: ReturnType<typeof tomorrowTeaser>, id: string) => rows.find((r) => r.id === id);

describe('R0 · quà điểm danh (người chơi 7 ngày đầu)', () => {
  it('(a) ngày 2 sau khi đã điểm danh ngày 1 → nhắc tiếp chuỗi, còn 5 ngày nữa tới rương', () => {
    const rows = tomorrowTeaser(base({ day: 2, level: 1, giftStreak: 1, giftLastDay: 1 }));
    const gift = row(rows, 'gift');
    expect(gift).toBeTruthy();
    expect(gift!.text).toContain('ngày 2');
    expect(gift!.text).toContain('còn 5 ngày nữa');
    expect(gift!.text).toContain('100.000đ'); // DAILY_GIFTS[6] Rương vàng, level 1 chưa scale
    expect(gift!.panel).toBe('gifts');
    expect(gift!.hint).toBeUndefined();
  });

  it('(b) điểm danh đủ 7 ngày → nhắc "Mai đủ 7 ngày … Rương vàng"', () => {
    const rows = tomorrowTeaser(base({ day: 7, giftStreak: 6, giftLastDay: 6 }));
    const gift = row(rows, 'gift');
    expect(gift).toBeTruthy();
    expect(gift!.text).toContain('đủ 7 ngày');
    expect(gift!.text).toContain('Rương vàng');
    expect(gift!.text).toContain('100.000đ');
  });

  it('(c) từ ngày 8 không còn nhắc điểm danh', () => {
    const rows = tomorrowTeaser(base({ day: 8, giftStreak: 7, giftLastDay: 7 }));
    expect(row(rows, 'gift')).toBeUndefined();
  });

  it('(d) chuỗi đứt thì không nhắc vì lần mai tính lại từ 1', () => {
    // bỏ quên 2 ngày, không đủ điều kiện vé tha → mai streak = 1 (chưa đáng nhắc)
    const rows = tomorrowTeaser(base({ day: 5, giftStreak: 2, giftLastDay: 2 }));
    expect(row(rows, 'gift')).toBeUndefined();
  });
});

describe('R1 · thời tiết', () => {
  it('(e) nhiều mây (trung tính) không phải mồi', () => {
    const rows = tomorrowTeaser(base({ weather: 'cloudy' }));
    expect(row(rows, 'weather')).toBeUndefined();
  });

  it('(e) nắng → dòng chính xác, gợi ý đông khách', () => {
    const rows = tomorrowTeaser(base({ day: 20, weather: 'sunny', weatherSeed: 777 }));
    const w = row(rows, 'weather');
    expect(w).toBeTruthy();
    expect(w!.icon).toBe('☀️');
    expect(w!.text).toBe('Mai Nắng đẹp');
    expect(w!.hint).toBe('đông khách hơn');
    expect(w!.hintColor).toBe('#2ecc71');
    expect(w!.panel).toBe('morning');
  });

  it('(e) mưa → ít khách hơn', () => {
    const rows = tomorrowTeaser(base({ weather: 'rain' }));
    const w = row(rows, 'weather');
    expect(w).toBeTruthy();
    expect(w!.text.startsWith('Mai Mưa')).toBe(true);
    expect(w!.hint).toBe('ít khách hơn');
    expect(w!.hintColor).toBe('#e74c3c');
  });
});

describe('R2 · lễ sắp tới', () => {
  it('(f) lễ bắt đầu ngày mai', () => {
    const rows = tomorrowTeaser(base({ day: 27, weatherSeed: 1234 }));
    const f = row(rows, 'festival');
    expect(f).toBeTruthy();
    expect(f!.text).toBe('Tết Nguyên Đán ngày mai');
    expect(f!.hint).toBe('+70% khách'); // traffic 1.7
    expect(f!.icon).toBe('🧧');
    expect(f!.panel).toBe('morning');
  });

  it('(f) lễ còn vài ngày nữa', () => {
    const rows = tomorrowTeaser(base({ day: 25, weatherSeed: 1234 }));
    const f = row(rows, 'festival');
    expect(f).toBeTruthy();
    expect(f!.text).toBe('Tết Nguyên Đán còn 3 ngày nữa');
  });
});

describe('R3 · khách quen ghé mai', () => {
  it('(g) có lịch khách quen → liệt kê, hint đếm, cắt tên nếu quá 3', () => {
    const rows = tomorrowTeaser(base({
      day: 19, weatherSeed: 1234, level: 40, regulars: allRegulars(), repLog: [],
    }));
    const r3 = row(rows, 'regulars');
    expect(r3).toBeTruthy();
    expect(r3!.text).toBe('Mai Chú Ba xe ôm, Bé Na học sinh, Anh Tuấn lập trình… ghé');
    expect(r3!.hint).toBe('14 khách quen');
    expect(r3!.panel).toBe('morning');
  });
});

describe('R4 · mốc gần đạt', () => {
  it('(h) doanh thu gần 100 triệu → còn lại định dạng vi-VN', () => {
    const rows = tomorrowTeaser(base({
      day: 3, level: 5, weather: 'cloudy',
      totals: { revenue: 95_000_000, itemsSold: 0, customers: 0 },
    }));
    const m = row(rows, 'milestone');
    expect(m).toBeTruthy();
    expect(m!.text).toBe('Sắp tới Doanh thu 100 triệu — còn 5.000.000 đồng');
    expect(m!.panel).toBe('business');
  });

  it('(h) mốc theo ngày dùng unit "ngày"', () => {
    const rows = tomorrowTeaser(base({
      day: 6, level: 3, weather: 'cloudy',
      totals: { revenue: 0, itemsSold: 0, customers: 0 },
    }));
    const m = row(rows, 'milestone');
    expect(m).toBeTruthy();
    expect(m!.text).toBe('Sắp tới Tròn 1 tuần mở tiệm — còn 1 ngày');
  });
});

describe('ghép chung', () => {
  it('(i) không có gì đáng mồi → [] (ẩn thẻ)', () => {
    // kỳ cựu (nowDay>7, đủ mọi mốc), trời nhiều mây, không lễ, không khách quen ghé
    expect(tomorrowTeaser(base({
      day: 366, level: 999, weather: 'cloudy', regulars: nobodyVisits(366),
      totals: { revenue: 1e12, itemsSold: 1e7, customers: 1e6 },
    }))).toEqual([]);
  });
});
