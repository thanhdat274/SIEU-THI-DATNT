import { describe, expect, it } from 'vitest';
import { catPayoff, dogPayoff, CAT_PITCH_MIN } from '../data/petPayoff';
import type { AnalyticsState } from '../data/analytics';
import type { RiskDay } from '../data/risk';

/**
 * GĐ157 — kinh tế thú cưng "con này đáng bữa cơm không?": quy lợi ích mèo (hệ số hỏng 0.8) và
 * chó (sổ rủi ro tuần) ra tiền, đối chiếu tiền thức ăn. THUẦN ĐỌC — không đổi state/kinh tế.
 */

// Đã verify products.ts: 'rau' fresh, buy 10000. spoilNightReport tự quy cost = spoiled × buy.
const mk = (recs: Record<string, { day: number; spoiled: number }[]>): AnalyticsState => {
  const items: Record<string, { day: number; qty: number; revenue: number; cost: number; spoiled: number; lost: number }[]> = {};
  for (const [id, list] of Object.entries(recs)) {
    items[id] = list.map((r) => ({ day: r.day, qty: 0, revenue: 0, cost: 0, spoiled: r.spoiled, lost: 0 }));
  }
  return { items, flags: {} };
};

const DAY = 20; // cửa sổ 7 ngày đã chốt = 19..13

describe('catPayoff — đại số 0.25 (quan sát × 0.25 = tiền mèo cứu)', () => {
  it('quan sát 4.000.000đ (đã qua hệ số 0.8) → mèo cứu đúng ×0.25 = 1.000.000đ', () => {
    const a = mk({ rau: [{ day: 19, spoiled: 400 }] }); // 400 × 10000 = 4.000.000
    const r = catPayoff(a, { cat: { fedDay: 19 } }, DAY, { x_thuc_an_meo: 3 });
    expect(r.owned).toBe(true);
    expect(r.weekSpoilCost).toBe(4000000);
    expect(r.savedYesterday).toBe(1000000); // round(4.000.000 × 0.25)
    expect(r.savedWeek).toBe(1000000);
    expect(r.hungry).toBe(false);
    expect(r.verdict).toBe('saved'); // 1.000.000 > 1,15 × 154.000
  });

  it('chỉ tính công vào ngày mèo ĐANG làm việc — ngày đói hệ số 0.8 không áp dụng, không gán công oan', () => {
    // fedDay 17 → active tới ngày 18; ngày 19 (hôm qua) mèo đã đói, hỏng 2.000.000 không được cộng công
    const a = mk({
      rau: [
        { day: 19, spoiled: 200 }, // mèo đói hôm qua → công 0
        { day: 18, spoiled: 100 }, // còn active → cứu 250.000
        { day: 17, spoiled: 100 }, // còn active → cứu 250.000
      ],
    });
    const r = catPayoff(a, { cat: { fedDay: 17 } }, DAY, { x_thuc_an_meo: 3 });
    expect(r.hungry).toBe(true);
    expect(r.savedYesterday).toBe(0);
    expect(r.savedWeek).toBe(500000);
    expect(r.weekSpoilCost).toBe(4000000); // quan sát đủ cả ngày đói
    expect(r.verdict).toBe('saved');
  });
});

describe('catPayoff — verdict biên theo foodWeek (giá thùng 22.000 × 7 = 154.000đ)', () => {
  it('savedWeek trong ±15% foodWeek → breakeven (160.000/154.000 ≈ 1,04)', () => {
    const a = mk({ rau: [{ day: 19, spoiled: 64 }] }); // 640.000 × 0.25 = 160.000
    expect(catPayoff(a, { cat: { fedDay: 19 } }, DAY, { x_thuc_an_meo: 3 }).verdict).toBe('breakeven');
  });

  it('savedWeek dưới 85% foodWeek → losing (25.000đ so 154.000đ)', () => {
    const a = mk({ rau: [{ day: 19, spoiled: 10 }] }); // 100.000 × 0.25 = 25.000
    const r = catPayoff(a, { cat: { fedDay: 19 } }, DAY, { x_thuc_an_meo: 3 });
    expect(r.verdict).toBe('losing');
  });

  it('savedWeek trên 115% foodWeek → saved (200.000đ so 154.000đ)', () => {
    const a = mk({ rau: [{ day: 19, spoiled: 80 }] }); // 800.000 × 0.25 = 200.000
    expect(catPayoff(a, { cat: { fedDay: 19 } }, DAY, { x_thuc_an_meo: 3 }).verdict).toBe('saved');
  });

  it('tuần không hỏng gì → nothing-spoiled (kể cả khi có record spoiled=0)', () => {
    const a = mk({ rau: [{ day: 19, spoiled: 0 }], mi: [{ day: 18, spoiled: 0 }] });
    const r = catPayoff(a, { cat: { fedDay: 19 } }, DAY, { x_thuc_an_meo: 3 });
    expect(r.verdict).toBe('nothing-spoiled');
    expect(r.savedWeek).toBe(0);
    expect(catPayoff({ items: {}, flags: {} }, { cat: { fedDay: 19 } }, DAY, { x_thuc_an_meo: 3 }).verdict).toBe('nothing-spoiled');
  });
});

describe('catPayoff — cửa sổ 7 ngày, chưa nuôi, dữ liệu thiếu', () => {
  it('chỉ cộng 7 ngày đã chốt (19..13): ngày 12 (thứ 8) bị bỏ qua', () => {
    const a = mk({ rau: [{ day: 12, spoiled: 999 }, { day: 13, spoiled: 4 }] });
    const r = catPayoff(a, {}, DAY, { x_thuc_an_meo: 3 });
    expect(r.owned).toBe(false);
    expect(r.weekSpoilCost).toBe(40000); // chỉ ngày 13
    expect(r.savedWeek).toBe(0);
  });

  it('analytics undefined / rỗng → an toàn, số 0, không văng lỗi', () => {
    expect(catPayoff(undefined, { cat: { fedDay: 19 } }, DAY, { x_thuc_an_meo: 3 })).toMatchObject({ owned: true, weekSpoilCost: 0, savedYesterday: 0, verdict: 'nothing-spoiled' });
    expect(catPayoff(undefined, undefined, DAY, { x_thuc_an_meo: 3 })).toMatchObject({ owned: false, weekSpoilCost: 0 });
  });

  it('foodCostToday theo cơ chế feedPet thật: kho còn gói → giá thùng, hết kho → mua lẻ ×2 (mọi cấp)', () => {
    const a = mk({});
    expect(catPayoff(a, { cat: { fedDay: 19 } }, DAY, { x_thuc_an_meo: 3 }).foodCostToday).toBe(22000);
    expect(catPayoff(a, { cat: { fedDay: 19 } }, DAY, {}).foodCostToday).toBe(44000); // hết kho → mua lẻ
    expect(catPayoff(a, { cat: { fedDay: 19 } }, DAY, undefined).foodCostToday).toBe(44000);
    // foodWeek là ước trạng thái đều tay — luôn giá thùng × 7, không phồng theo kho hôm nay
    expect(catPayoff(a, { cat: { fedDay: 19 } }, DAY, {}).foodWeek).toBe(154000);
    // chưa nuôi: pitch theo giá thùng (giả định nuôi là trữ gói đều)
    expect(catPayoff(a, undefined, DAY, {}).foodCostToday).toBe(22000);
  });

  it('ngưỡng góp ý nuôi mèo khi chưa nuôi là 100.000đ/tuần (đáng kể, tránh nhiễu)', () => {
    expect(CAT_PITCH_MIN).toBe(100000);
  });
});

describe('dogPayoff — bối cảnh sổ rủi ro tuần (không verdict, dữ liệu chung)', () => {
  it('tổng chặn/lọt đúng 7 ngày gần nhất của cửa sổ', () => {
    const rv: RiskDay[] = Array.from({ length: 9 }, (_, i) => ({ day: i + 1, leak: 1000, blocked: (i + 1) * 100, events: 1 }));
    const r = dogPayoff(rv);
    expect(r.days).toBe(9);
    expect(r.weekBlocked).toBe(4200); // ngày 3..9: 300+400+...+900
    expect(r.weekLeak).toBe(7000); // 7 ngày × 1000
  });

  it('undefined / rỗng → số 0, days 0 (UI ẩn dòng)', () => {
    expect(dogPayoff(undefined)).toEqual({ weekBlocked: 0, weekLeak: 0, days: 0 });
    expect(dogPayoff([])).toEqual({ weekBlocked: 0, weekLeak: 0, days: 0 });
  });
});
