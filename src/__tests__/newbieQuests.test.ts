import { describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import {
  dailyQuests, emptyQuestLog, emptyTotals, NEWBIE_REVENUE_TARGET, type QuestContext,
} from '../data/quests';
import { productById } from '../data/products';
import { REGULARS } from '../data/regulars';

/**
 * GĐ160 — 🌱 Người mới: vá 3 mớt ngày đầu + nhiệm vụ tuỳ chọn có từ cấp 1 (audit trải nghiệm 28/10).
 *  (c) nhiệm vụ doanh thu ngày 1 không còn đòi bán sạch kho khởi đầu (150.000đ → ~65% = 100.000đ);
 *  (d) pool tuỳ chọn mở từ cấp 1: "Sớm hôm đón khách" (luôn có), "Bán đồ mưa" (ngày mưa),
 *      "Đón khách quen" (ngày có khách quen hẹn ghé) — KHÔNG đụng BET_CORE_IDS.
 */

const ctx = (over: Partial<QuestContext> = {}): QuestContext => ({
  day: 1, level: 1, stats: newGameData().stats, totals: emptyTotals(), staffCount: 0, shopTier: 0,
  warehouseTier: 0, ordersDone: 0, log: emptyQuestLog(), festivalGoods: [], reservationsToday: 0,
  rent: 20000, ...over,
});

const find = (c: QuestContext, id: string) => dailyQuests(c).find((q) => q.id === id);

// ─── (c) Nới nhiệm vụ doanh thu ngày 1 ───

describe('daily_revenue — mục tiêu riêng người mới (GĐ160)', () => {
  // Kho khởi đầu từ dữ liệu thật (newGameData): mi 10 + nuoc 10 + banh 5 = 25 món
  const stock = newGameData();
  const storageValue = Object.entries(stock.storage).reduce((n, [id, q]) => n + productById(id).sell * q, 0);

  it('số liệu nền: kho khởi đầu bán sạch đúng 150.000đ (con số audit)', () => {
    expect(storageValue).toBe(150_000);
  });

  it('cấp 1: mục tiêu 100.000đ ≈ 65% giá trị kho khởi đầu (không đòi bán sạch)', () => {
    expect(NEWBIE_REVENUE_TARGET).toBe(100_000);
    expect(dailyQuests(ctx()).find((q) => q.id === 'daily_revenue')!.target).toBe(100_000);
    expect(NEWBIE_REVENUE_TARGET / storageValue).toBeGreaterThan(0.6);
    expect(NEWBIE_REVENUE_TARGET / storageValue).toBeLessThanOrEqual(0.7);
  });

  it('từ cấp 2 trở lên GIỮ NGUYÊN thang cũ scale(150000, lv, 0.25) — không đổi dốc cho cấp cao', () => {
    for (const lv of [2, 3, 10, 30, 50, 100]) {
      const expected = Math.round(150_000 * (1 + 0.25 * (lv - 1)));
      expect(find(ctx({ level: lv }), 'daily_revenue')!.target).toBe(expected);
    }
  });

  it('đạt 100.000đ là xong ngay cấp 1 (thiếu 1.000đ thì chưa)', () => {
    expect(find(ctx({ stats: { ...newGameData().stats, revenue: 100_000 } as never }), 'daily_revenue')!.done).toBe(true);
    expect(find(ctx({ stats: { ...newGameData().stats, revenue: 99_999 } as never }), 'daily_revenue')!.done).toBe(false);
  });
});

// ─── (d1) "Sớm hôm đón khách" — đo doanh thu khung sáng sớm 6h–9h qua sổ theo giờ ───

describe('daily_morning — nhiệm vụ tuỳ chọn mở từ cấp 1 (GĐ160)', () => {
  // Pool tuỳ chọn cấp 30 (ctx không mưa/không khách quen): 8 mục, xoay 3 mục liên tiếp theo ngày —
  // ngày 5 (5 % 8 = 5) xoay tới social + cook_orders + morning (index 7)
  it('có trong pool từ cấp 1 và được xoay tới ở cấp cao', () => {
    expect(find(ctx(), 'daily_morning')).toBeTruthy();
    expect(find(ctx({ level: 30, day: 5 }), 'daily_morning')).toBeTruthy();
  });

  it('current = tổng doanh thu ghế 6h, 7h, 8h — ghế khác (9h trỏ đi) không tính', () => {
    const stats = {
      ...newGameData().stats,
      byHour: {
        6: { customers: 3, revenue: 12_000 },
        7: { customers: 4, revenue: 15_000 },
        8: { customers: 2, revenue: 9_000 },
        9: { customers: 50, revenue: 900_000 }, // ngoài khung sáng sớm
      },
    };
    // cấp 30 mục tiêu 136.000đ → current chưa bị kẹp trần, soi đúng phép cộng
    const q = find(ctx({ level: 30, day: 5, stats: stats as never }), 'daily_morning')!;
    expect(q.current).toBe(36_000);
    expect(q.done).toBe(false);
  });

  it('chưa bán gì buổi sáng thì chưa xong; bán đủ mục tiêu cấp 1 (20.000đ) là xong', () => {
    const q = find(ctx(), 'daily_morning')!;
    expect(q.current).toBe(0);
    expect(q.done).toBe(false);
    expect(q.target).toBe(20_000);
    const hit = find(ctx({ stats: { ...newGameData().stats, byHour: { 6: { customers: 2, revenue: 20_000 } } } as never }), 'daily_morning')!;
    expect(hit.done).toBe(true);
  });
});

// ─── (d2) "Bán đồ mưa" — biến thể THEO THỜI TIẾT ───

describe('daily_rain — chỉ vào pool ngày mưa/giông (GĐ160)', () => {
  it('ẩn khi trời đẹp/nhiều mây/sương hoặc không có dữ liệu thời tiết (save/test cũ)', () => {
    for (const weather of [undefined, 'sunny', 'cloudy', 'fog'] as const) {
      expect(find(ctx({ weather: weather as never }), 'daily_rain')).toBeUndefined();
    }
  });

  it('hiện ngày mưa và giông; đo đúng ô dù + áo mưa (món khác không tính, chưa kẹp trần ở cấp cao)', () => {
    for (const weather of ['rain', 'storm'] as const) {
      // cấp 100, ngày 8 (8 % 9 = 8 — xoay tới daily_rain index 8); mục tiêu cấp 100 = 6 món
      const stats = {
        ...newGameData().stats,
        byItem: {
          o: { qty: 2, revenue: 50_000, cost: 30_000 },
          aomua: { qty: 3, revenue: 27_000, cost: 15_000 },
          nuoc: { qty: 50, revenue: 300_000, cost: 40_000 }, // mưa nhưng không phải đồ mưa
        },
      };
      const q = find(ctx({ level: 100, day: 8, weather, stats: stats as never }), 'daily_rain')!;
      expect(q).toBeTruthy();
      expect(q.current).toBe(5); // 2 ô + 3 áo mưa, không cộng nước suối
      expect(q.target).toBe(6);
      expect(q.done).toBe(false);
    }
  });

  it('ngày mưa ở cấp 1: bán 1 món đồ mưa là xong (current kẹp trần theo mục tiêu như mọi nhiệm vụ)', () => {
    const stats = { ...newGameData().stats, byItem: { o: { qty: 4, revenue: 100_000, cost: 60_000 } } };
    const q = find(ctx({ weather: 'rain', stats: stats as never }), 'daily_rain')!;
    expect(q.target).toBe(1);
    expect(q.current).toBe(1);
    expect(q.done).toBe(true);
  });
});

// ─── (d3) "Đón khách quen" — biến thể theo khách quen hẹn ghé ───

describe('daily_regulars — chỉ vào pool ngày có khách quen hẹn ghé (GĐ160)', () => {
  it('ẩn khi không có dữ liệu (save/test cũ) hoặc hôm nay không ai hẹn ghé', () => {
    expect(find(ctx(), 'daily_regulars')).toBeUndefined();
    expect(find(ctx({ regularsComingToday: 0, regularsServedToday: 0 }), 'daily_regulars')).toBeUndefined();
  });

  it('hiện khi có người hẹn ghé: mục tiêu = số người ghé hôm nay, current = số đã phục vụ', () => {
    const q = find(ctx({ regularsComingToday: 1, regularsServedToday: 0 }), 'daily_regulars')!;
    expect(q.target).toBe(1);
    expect(q.current).toBe(0);
    expect(q.done).toBe(false);
    const served = find(ctx({ regularsComingToday: 1, regularsServedToday: 1 }), 'daily_regulars')!;
    expect(served.done).toBe(true);
  });

  it('nhiều khách quen ghé cùng lúc: mục tiêu tăng theo, nhưng chặn trần thang cấp', () => {
    // cấp 1: 2 người hẹn ghé → phải phục vụ đủ 2
    expect(find(ctx({ regularsComingToday: 2, regularsServedToday: 1 }), 'daily_regulars')!.target).toBe(2);
    // cấp cao trần = scale(2, lv, 0.05) — cấp 100 trần 12, dù hôm nay 30 người ghé.
    // Ngày 7 (7 % 9 = 7 — pool cấp 100 có 9 mục, xoay tới daily_regulars index 8)
    const cap = find(ctx({ level: 100, day: 7, regularsComingToday: 30, regularsServedToday: 12 }), 'daily_regulars')!;
    expect(cap.target).toBe(12);
    expect(cap.done).toBe(true);
    const short = find(ctx({ level: 100, day: 7, regularsComingToday: 30, regularsServedToday: 11 }), 'daily_regulars')!;
    expect(short.done).toBe(false);
  });
});

// ─── Nối dây questContext (store) → các field mới ───

describe('questContext — dẫn dữ liệu thật vào ngữ cảnh nhiệm vụ (GĐ160)', () => {
  it('đưa thời tiết hôm nay vào context', () => {
    useGame.setState({ ...newGameData(), weather: 'rain' });
    expect(questContext(useGame.getState()).weather).toBe('rain');
    useGame.setState({ ...newGameData(), weather: 'sunny' });
    expect(questContext(useGame.getState()).weather).toBe('sunny');
  });

  it('đếm khách quen đã phục vụ hôm nay + tổng người hẹn ghé (mọi khách ghé hôm qua → chỉ còn người đã phục vụ)', () => {
    const day = 7;
    // Mọi khách quen ghé hôm qua (day - 1): luật "không ghé hai ngày liền" tắt hết dự báo hôm nay
    const visitedYesterday = Object.fromEntries(
      REGULARS.map((d) => [d.id, { friendship: 0, visits: 1, lastVisitDay: day - 1, perks: [], discovered: [] }]),
    );
    useGame.setState({ ...newGameData(), day, level: 1, regulars: visitedYesterday });
    expect(questContext(useGame.getState()).regularsServedToday).toBe(0);
    expect(questContext(useGame.getState()).regularsComingToday).toBe(0);

    // Bà Năm phục vụ đúng hôm nay: chuyển sang cột "đã phục vụ", tổng người ghé hôm nay = 1
    const withBaNam = {
      ...visitedYesterday,
      ba_nam: { friendship: 2, visits: 2, lastVisitDay: day, perks: [], discovered: [] },
    };
    useGame.setState({ regulars: withBaNam as never });
    const c = questContext(useGame.getState());
    expect(c.regularsServedToday).toBe(1);
    expect(c.regularsComingToday).toBe(1);
    // và nhiệm vụ "Đón khách quen" hiện với mục tiêu đạt được ngay
    const q = dailyQuests(c).find((it) => it.id === 'daily_regulars')!;
    expect(q).toBeTruthy();
    expect(q.done).toBe(true);
  });
});
