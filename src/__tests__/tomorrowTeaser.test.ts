import { beforeAll, describe, expect, it } from 'vitest';
import { tomorrowTeaser, type TeaserInput } from '../data/tomorrowTeaser';
import { REGULARS } from '../data/regulars';
import { setSurpriseArcs, type SurpriseArcState } from '../data/surpriseArcs';

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
    // kỳ cựu (nowDay>7, đủ mọi mốc), trời nhiều mây, không lễ, không khách quen ghé — GĐ615: 366 là mùng 1 (ngày cúng) nên dùng 368 (367 có trận, GĐ617)
    expect(tomorrowTeaser(base({
      day: 368, level: 999, weather: 'cloudy', regulars: nobodyVisits(368),
      totals: { revenue: 1e12, itemsSold: 1e7, customers: 1e6 },
    }))).toEqual([]);
  });
});

describe('mồi cuối tuần (GĐ261 — khép mảnh nhịp GĐ254–257)', () => {
  it('mai là Thứ 7/CN → có dòng "Mai Thứ 7 — cuối tuần"; mai ngày thường → không', () => {
    // ngày 33 = Thứ 6 → mai (34) là Thứ 7
    const before = tomorrowTeaser(base({ day: 33, weather: 'cloudy' }));
    const wk = before.find((r) => r.id === 'weekend');
    expect(wk).toBeTruthy();
    expect(wk!.text).toContain('Thứ 7');
    // ngày 29 = Thứ 2 → mai (30) là Thứ 3
    expect(tomorrowTeaser(base({ day: 29, weather: 'cloudy' })).some((r) => r.id === 'weekend')).toBe(false);
  });
});

// ── GĐ274 — tối Chủ nhật báo trước hàng hot tuần mới ──
describe('mồi hàng hot tuần mới (GĐ274, khớp GĐ273 trên Nhập hàng)', () => {
  it('mai Thứ 2 (day ≡ 1 mod 7) → có dòng "Tuần mới khách săn" với danh sách trending của tuần mới', () => {
    const rows = tomorrowTeaser(base({ day: 8 })); // Thứ 2 — tuần mới bắt đầu
    const t = rows.find((r) => r.id === 'trend');
    expect(t).toBeTruthy();
    expect(t!.text).toContain('Tuần mới khách săn:');
    expect(t!.panel).toBe('order');
  });

  it('các ngày khác tuần → không có dòng này (chỉ cuối khối mới đổi hàng hot)', () => {
    for (const day of [5, 6, 9, 12]) {
      expect(tomorrowTeaser(base({ day })).some((r) => r.id === 'trend')).toBe(false);
    }
  });
});

describe('R6 · GĐ615 mai ngày cúng', () => {
  it('ngày mai 15 có dòng 🙏, ngày 16 không', () => {
    expect(tomorrowTeaser(base({ day: 15 })).some((r) => r.id === 'cung')).toBe(true);
    expect(tomorrowTeaser(base({ day: 16 })).some((r) => r.id === 'cung')).toBe(false);
  });
});

describe('R7 · GĐ617 tối mai có trận', () => {
  it('chỉ hiện khi đã tới cấp quán nước và đúng ngày trận', async () => {
    const { isQuanMatchDay, QUAN_NUOC_UNLOCK } = await import('../data/quanNuoc');
    const d = Array.from({ length: 30 }, (_, i) => i + 2).find((x) => isQuanMatchDay(x, 'sunny'))!;
    const has = (o: Partial<TeaserInput>) => tomorrowTeaser(base(o)).some((r) => r.id === 'match');
    expect(has({ day: d, weather: 'sunny', level: QUAN_NUOC_UNLOCK })).toBe(true);
    expect(has({ day: d, weather: 'sunny', level: QUAN_NUOC_UNLOCK - 1 })).toBe(false);
    expect(has({ day: d, weather: 'rain', level: QUAN_NUOC_UNLOCK })).toBe(false);
  });
});

describe('R5 · chuyện sự kiện đang kể dở (GĐ164) — mồi "mai có tiếp"', () => {
  // Đăng ký một arc thật để surpriseArcById tìm thấy (SURPRISE_ARCS nạp lười, rỗng mặc định).
  beforeAll(() => {
    setSurpriseArcs([{
      id: 'test_arc', baseEventId: 'old_event', title: 'Chuyện con mèo biến mất', icon: '🐈',
      unlock: 1, days: 3,
      scenes: [{ id: 's0', text: 'Mở đầu', options: [] }],
    }]);
  });

  /** Arc đang chờ cảnh mai: mới ở ngày 2, mai (day 3) còn trong hạn, chưa chốt cảnh 2. */
  const pendingArc = (): SurpriseArcState =>
    ({ arcId: 'test_arc', step: 1, choices: [0], startedDay: 2, expiresDay: 4, done: false });

  it('arc còn dở và còn trong hạn → có dòng "Chuyện … còn dở, mai có tiếp"', () => {
    const rows = tomorrowTeaser(base({ day: 3, surpriseArc: pendingArc() }));
    const a = row(rows, 'arc');
    expect(a).toBeTruthy();
    expect(a!.icon).toBe('📖');
    expect(a!.text).toBe('Chuyện Chuyện con mèo biến mất còn dở, mai có tiếp');
    expect(a!.panel).toBe('morning');
  });

  it('arc đã khép (done) → không mồi', () => {
    const rows = tomorrowTeaser(base({ day: 3, surpriseArc: { ...pendingArc(), done: true } }));
    expect(row(rows, 'arc')).toBeUndefined();
  });

  it('đã chốt đủ cảnh cho tới ngày (hết bước) → không mồi mai', () => {
    // choices by kịp ngày: day 3 mà đã chốt 2 cảnh → arcScenePending false (2 <= 1 sai)
    const rows = tomorrowTeaser(base({ day: 3, surpriseArc: { ...pendingArc(), choices: [0, 1], step: 2 } }));
    expect(row(rows, 'arc')).toBeUndefined();
  });

  it('quá hạn (expiresDay < ngày mai) → không mồi', () => {
    const rows = tomorrowTeaser(base({ day: 9, surpriseArc: { ...pendingArc(), expiresDay: 4 } }));
    expect(row(rows, 'arc')).toBeUndefined();
  });

  it('id không có def (SURPRISE_ARCS chưa nạp / lạ) → bỏ qua, không mồi', () => {
    const rows = tomorrowTeaser(base({ day: 3, surpriseArc: { ...pendingArc(), arcId: 'khong_co' } }));
    expect(row(rows, 'arc')).toBeUndefined();
  });

  it('không có arcs (save cũ) → không mồi', () => {
    expect(row(tomorrowTeaser(base({ day: 3 })), 'arc')).toBeUndefined();
  });
});

