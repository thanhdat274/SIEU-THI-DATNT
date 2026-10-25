import { describe, expect, it } from 'vitest';
import { analyticsAdvice, itemHealthList, logAnalyticsDay, newAnalytics, promoEffect, type AnalyticsState } from '../data/analytics';
import { gardenNight, newGarden, plotReady, GARDEN_UNLOCK } from '../data/garden';
import { rivalNightAI, newRival, RIVAL_UNDERCUT } from '../data/biz';

describe('Sổ phân tích 30 ngày', () => {
  it('ghi dòng theo món và giữ tối đa 30 ngày', () => {
    let a: AnalyticsState = newAnalytics();
    for (let day = 1; day <= 35; day++) {
      a = logAnalyticsDay(a, day, { mi: { qty: 2, revenue: 10000, cost: 6000 } }, { mi: 1 }, { sua: 3 }, { combo: false, happyHour: false });
    }
    const lines = a.items['mi']!;
    expect(lines.length).toBe(30);
    expect(lines.at(-1)!.day).toBe(35);
    expect(lines.at(-1)!.lost).toBe(1);
    // Món không bán nhưng hỏng vẫn được ghi dòng 0
    const sua = a.items['sua']!;
    expect(sua.at(-1)!.qty).toBe(0);
    expect(sua.at(-1)!.spoiled).toBe(3);
    expect(Object.keys(a.flags).every((k) => Number(k) > 35 - 30)).toBe(true);
  });

  it('tính sức khoẻ món: biên lãi, ngày còn hàng, ABC', () => {
    let a = newAnalytics();
    for (let day = 1; day <= 30; day++) {
      a = logAnalyticsDay(a, day, {
        mi: { qty: 10, revenue: 50000, cost: 30000 },
        gao: { qty: 1, revenue: 100000, cost: 120000 },
      }, {}, {}, { combo: false, happyHour: false });
    }
    const list = itemHealthList(a, 30, { mi: 15 }, {}, { mi: 10 });
    const mi = list.find((h) => h.id === 'mi')!;
    expect(mi.qty30).toBe(300);
    expect(mi.profit30).toBe(600000);
    expect(mi.margin).toBeCloseTo(0.4);
    expect(mi.daysLeft).toBeCloseTo(15 / 10);
    expect(mi.abc).toBe('A');
    const gao = list.find((h) => h.id === 'gao')!;
    expect(gao.profit30).toBeLessThan(0);
    expect(gao.abc).toBe('C');
  });

  it('gợi ý nhập thêm khi sắp cạn và bỏ món lỗ 3 tuần', () => {
    let a = newAnalytics();
    for (let day = 1; day <= 30; day++) {
      a = logAnalyticsDay(a, day, {
        mi: { qty: 10, revenue: 50000, cost: 30000 },
        kem: { qty: 3, revenue: 30000, cost: 45000 },
      }, {}, {}, { combo: false, happyHour: false });
    }
    const list = itemHealthList(a, 30, { mi: 10 }, {}, {});
    const advice = analyticsAdvice(list, {}, []);
    expect(advice.some((x) => x.text.includes('Nhập thêm') && x.text.includes('Mì gói'))).toBe(true);
    expect(advice.some((x) => x.text.includes('bỏ Kem que'))).toBe(true);
  });

  it('so sánh ngày có combo/giờ vàng với ngày thường', () => {
    let a = newAnalytics();
    const history: { day: number; profit: number; revenue: number }[] = [];
    for (let day = 1; day <= 10; day++) {
      const combo = day % 2 === 0;
      a = logAnalyticsDay(a, day, {}, {}, {}, { combo, happyHour: false });
      history.push({ day, profit: 0, revenue: combo ? 200 : 100 });
    }
    const fx = promoEffect(a, history, 'combo');
    expect(fx).not.toBeNull();
    expect(fx!.withAvg).toBe(200);
    expect(fx!.withoutAvg).toBe(100);
  });
});

describe('Vườn rau & chuồng gà', () => {
  it('tưới đủ mỗi ngày thì đúng ngày thu hoạch, không tưới thì trễ', () => {
    const g = newGarden();
    const plots = g.plots.map((p, i) => (i === 0 ? { crop: 'rau_cai', growth: 0, wateredDay: 1 } : p));
    let state = { ...g, plots };
    // 3 ngày tưới đủ (ngày 2, 3 mưa tưới hộ)
    state = gardenNight(state, { day: 1, weather: 'sunny', coopFedToday: false }).garden;
    state = gardenNight(state, { day: 2, weather: 'rain', coopFedToday: false }).garden;
    state = gardenNight(state, { day: 3, weather: 'rain', coopFedToday: false }).garden;
    expect(state.plots[0].growth).toBe(3);
    expect(plotReady(state.plots[0])).toBe(true);
    // Lô không tưới ngày 3: lớn chậm
    const lazy = gardenNight({ ...state, plots: state.plots.map((p) => ({ ...p, wateredDay: 0 })) }, { day: 4, weather: 'sunny', coopFedToday: false }).garden;
    expect(lazy.plots[0].growth).toBeCloseTo(3.4);
  });

  it('giông bão có thể phá luống, mưa tưới hộ', () => {
    const g = newGarden();
    const planted = { ...g, plots: g.plots.map((p) => ({ crop: 'bap', growth: 2, wateredDay: 5 })) };
    // Chạy nhiều lần với rng cố định 0 → mưa tưới hộ, không phá (0 < 0.4 là phá → dùng rng 0.9)
    const ok = gardenNight(planted, { day: 5, weather: 'rain', coopFedToday: false, rng: () => 0.9 });
    expect(ok.garden.plots[0].wateredDay).toBe(5);
    expect(ok.news.some((n) => n.includes('tưới hộ'))).toBe(true);
    const broken = gardenNight(planted, { day: 5, weather: 'storm', coopFedToday: false, rng: () => 0.1 });
    expect(broken.garden.plots[0].crop).toBeNull();
    expect(broken.news.some((n) => n.includes('sập'))).toBe(true);
  });

  it('gà được cho ăn thì đẻ trứng', () => {
    const g = { ...newGarden(), coop: { chickens: 3, fedDay: 1, eggs: 0 } };
    const res = gardenNight(g, { day: 1, weather: 'sunny', coopFedToday: true, rng: () => 0 });
    expect(res.garden.coop!.eggs).toBe(3);
    const hungry = gardenNight(res.garden, { day: 2, weather: 'sunny', coopFedToday: false, rng: () => 0 });
    expect(hungry.garden.coop!.eggs).toBe(3);
    expect(hungry.news.some((n) => n.includes('đói'))).toBe(true);
  });

  it('vườn mở ở cấp 8', () => {
    expect(GARDEN_UNLOCK).toBe(8);
  });
});

describe('Đối thủ có AI', () => {
  it('phá giá đúng món bán chạy của mình', () => {
    const rival = newRival('Tạp hóa test', 60, 1, () => 0); // cutter
    const res = rivalNightAI(rival, {
      day: 2,
      byItem: { mi: { qty: 50 }, nuoc: { qty: 30 }, gao: { qty: 5 }, banh: { qty: 2 } },
      priceOf: (id) => (id === 'mi' ? 5000 : id === 'nuoc' ? 6000 : 100000),
      friendships: {},
      giftCounter: false,
      staff: [],
      rng: () => 1,
    });
    expect(res.rival.prices!['mi']).toBe(Math.round((5000 * RIVAL_UNDERCUT.cutter) / 100) * 100);
    expect(res.rival.prices!['mi']).toBeLessThan(5000);
    expect(res.rival.stock!['mi']).toBeGreaterThan(0);
    // Chỉ nhắm top 3 món bán chạy: bánh bán ít nhất không bị bày
    expect(res.rival.prices!['banh']).toBeUndefined();
  });

  it('lôi kéo khách quen xa lạ, rival yếu thì khách quay lại', () => {
    const rival = newRival('Tạp hóa test', 80, 1, () => 0.99); // aggressive
    let cur = rival;
    const friendships: Record<string, number> = { ba_nam: 5, chu_ba: 90 };
    // Chạy nhiều đêm cho tới khi có người bị lôi kéo
    let poached = '';
    for (let day = 2; day < 60 && !poached; day++) {
      const res = rivalNightAI(cur, {
      day, byItem: { mi: { qty: 10 } }, priceOf: () => 5000, friendships: { ...friendships }, giftCounter: false, staff: [], rng: () => 0.01,
    });
      cur = res.rival;
      const keys = Object.keys(cur.poached ?? {});
      if (keys.length) poached = keys[0];
    }
    expect(poached).toBe('ba_nam'); // thân thiết thấp nhất bị nhắm, người 90 điểm an toàn
    // Rival yếu dưới 25 thì khách bị lôi kéo quay lại
    const weak = { ...cur, strength: 20, poached: { [poached]: 3 } };
    const back = rivalNightAI(weak, {
      day: 70, byItem: {}, priceOf: () => 5000, friendships, giftCounter: false, staff: [], rng: () => 0,
    });
    expect(back.rival.poached![poached]).toBeUndefined();
  });

  it('rival máu liều mạnh quá mốc thì giựt nhân viên', () => {
    const rival = newRival('Tạp hóa test', 90, 1, () => 0.99);
    const res = rivalNightAI(rival, {
      day: 2, byItem: { mi: { qty: 10 } }, priceOf: () => 5000, friendships: {}, giftCounter: false,
      staff: [{ id: 7, name: 'Lan', skill: 4 }, { id: 3, name: 'Bình', skill: 1 }], rng: () => 0,
    });
    expect(res.poachedStaffId).toBe(7); // giựt người giỏi nhất
  });
});
