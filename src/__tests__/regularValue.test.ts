import { describe, it, expect } from 'vitest';
import { REGULARS, emptyProgress, type RegularProgress } from '../data/regulars';
import { regularSpendEstimate, regularValueLine, expectedFavoriteItems, nextPerkValue, weeklyContribution, weeklyTop, referValue, type WeeklyContribution } from '../data/regularValue';
import { productById } from '../data/products';

/** Giá 1000đ mọi món — để cô lập công thức giỏ (không phụ thuộc dữ liệu giá thật). */
const price1000 = () => 1000;

/**
 * GĐ1289 — "khách quen nào đáng giữ nhất về TIỀN?": tái dựng giỏ món ưa + boa theo đúng công thức sim
 * (regularWants count 1 + floor(rng*2) + extra_item, 75% món ưa, bulk_buy nhân bản; regularCheckout boa =
 * round(giỏ × bonus_tip% /100)×100). Helper THUẦN ĐỌC — không import store (co-op an toàn), không đổi
 * kinh tế/save/seed, chỉ nói con số ƯỚC TÍNH (~) không bịa khách.
 */
describe('GĐ1289 — regularValue (khách quen nào đáng giữ nhất về tiền)', () => {
  it('chưa mở món ưa nào (level 0) → null (không ồn)', () => {
    const def = REGULARS.find((r) => r.id === 'ba_nam')!;
    expect(regularSpendEstimate({ def, level: 0, priceOf: price1000 })).toBeNull();
  });

  it('giỏ = giá món ưa × số món ưa ước tính; boa = 0 khi chưa có perk Hay boa', () => {
    const def = REGULARS.find((r) => r.id === 'ba_nam')!;
    const favs = def.favorites.filter((id) => productById(id).unlock <= 30);
    const items = expectedFavoriteItems(def, undefined);
    const s = regularSpendEstimate({ def, level: 30, priceOf: price1000, progress: emptyProgress() })!;
    expect(s.spend).toBe(Math.round(1000 * items));
    expect(s.tip).toBe(0);
    expect(s.total).toBe(s.spend);
    expect(s.favCount).toBe(favs.length);
  });

  it('mở perk Mua theo lô (bulk_buy) → giỏ nhân (1 + bulk)', () => {
    const def = REGULARS.find((r) => r.perks.some((p) => p.effect === 'bulk_buy'))!;
    const bulkPerk = def.perks.find((p) => p.effect === 'bulk_buy')!;
    const prog: RegularProgress = { friendship: 999, visits: 1, perks: [bulkPerk.title], discovered: [] };
    const s = regularSpendEstimate({ def, level: 30, priceOf: price1000, progress: prog })!;
    const items = expectedFavoriteItems(def, prog);
    expect(s.spend).toBe(Math.round(1000 * items * (1 + bulkPerk.value)));
  });

  it('mở perk Hay boa (bonus_tip) → boa = round(giỏ × tỉ lệ / 100) × 100 (> 0)', () => {
    const def = REGULARS.find((r) => r.perks.some((p) => p.effect === 'bonus_tip'))!;
    const tipPerk = def.perks.find((p) => p.effect === 'bonus_tip')!;
    const prog: RegularProgress = { friendship: 999, visits: 1, perks: [tipPerk.title], discovered: [] };
    const s = regularSpendEstimate({ def, level: 30, priceOf: price1000, progress: prog })!;
    expect(s.tip).toBe(Math.round((s.spend * tipPerk.value) / 100) * 100);
    expect(s.tip).toBeGreaterThan(0);
  });

  it('số món ưa ước tính nằm trong khoảng hợp lý (1–3 món/lần ghé)', () => {
    const def = REGULARS.find((r) => r.id === 'ba_nam')!;
    const n = expectedFavoriteItems(def, undefined);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả', () => {
    const def = REGULARS.find((r) => r.id === 'ba_nam')!;
    const a = regularSpendEstimate({ def, level: 30, priceOf: price1000 });
    const b = regularSpendEstimate({ def, level: 30, priceOf: price1000 });
    expect(a).toEqual(b);
  });

  it('regularValueLine ghép tên khách + số tiền mỗi lần ghé', () => {
    const def = REGULARS.find((r) => r.id === 'ba_nam')!;
    const s = regularSpendEstimate({ def, level: 30, priceOf: price1000 })!;
    const line = regularValueLine(s);
    expect(line).toContain(def.name);
    expect(line).toContain('đ/lần');
  });
});

/**
 * GĐ1293 — "nâng thân thiết tới mốc perk kế tiếp đáng không?": So regularSpendEstimate (GĐ1289) TRƯỚC/SAU khi
 * mở perk kế tiếp (nextPerk) để báo tăng bao nhiêu mỗi lần ghé. THUẦN — chỉ quy ra tiền cho 3 hiệu ứng đổi
 * giỏ/boa (extra_item/bulk_buy/bonus_tip); ghé-chung/nhóm (frequent/refer/festival) không đổi giỏ nên delta
 * null (không bịa con số). Không import store, không đổi kinh tế/save/seed.
 */
describe('GĐ1293 — nextPerkValue (nâng thân thiết tới mốc perk kế tiếp đáng không)', () => {
  /** Một khách quen có PERK KẾ TIẾP (đầu danh sách chưa mở) đổi GIỎ/BOA + món ưa mở ở level ≤ 30. */
  function moneyPerkDef() {
    return REGULARS.find((r) => {
      const p = r.perks[0];
      return p && ['extra_item', 'bulk_buy', 'bonus_tip'].includes(p.effect)
        && r.favorites.some((id) => productById(id).unlock <= 30);
    })!;
  }

  it('đã mở HẾT mọi perk → null (hết mốc để gợi ý, không ồn)', () => {
    const def = REGULARS.find((r) => r.id === 'ba_nam')!;
    const prog: RegularProgress = { friendship: 999, visits: 1, perks: def.perks.map((p) => p.title), discovered: [] };
    expect(nextPerkValue({ def, level: 30, priceOf: price1000, progress: prog })).toBeNull();
  });

  it('perk kế tiếp đổi giỏ/boa (extra_item/bulk_buy/bonus_tip) → delta > 0 và nextTotal = hiện tại + delta', () => {
    const def = moneyPerkDef();
    const base = regularSpendEstimate({ def, level: 30, priceOf: price1000, progress: emptyProgress() })!;
    const nv = nextPerkValue({ def, level: 30, priceOf: price1000, progress: emptyProgress() })!;
    expect(nv.perk.effect).not.toBe('frequent_visit');
    expect(nv.delta).not.toBeNull();
    expect(nv.nextTotal).not.toBeNull();
    expect(nv.delta!).toBeGreaterThan(0);
    expect(nv.nextTotal).toBe(base.total + nv.delta!);
    expect(nv.delta).toBe(nv.nextTotal! - base.total);
  });

  it('toGo = mốc thân thiết − thân thiết hiện tại (≥ 0, không âm khi đã quá mốc)', () => {
    const def = moneyPerkDef();
    const prog: RegularProgress = { friendship: def.perks[0].threshold - 2, visits: 1, perks: [], discovered: [] };
    const nv = nextPerkValue({ def, level: 30, priceOf: price1000, progress: prog })!;
    expect(nv.toGo).toBe(2);
  });

  it('perk kế tiếp KHÔNG đổi giỏ/boa (frequent/refer/festival) → delta null (trung thực, không bịa tiền)', () => {
    const def = REGULARS.find((r) => {
      const p = r.perks[0];
      return p && ['frequent_visit', 'refer_friend', 'festival'].includes(p.effect);
    })!;
    const prog: RegularProgress = { friendship: 0, visits: 1, perks: [], discovered: [] };
    expect(nextPerkValue({ def, level: 30, priceOf: price1000, progress: prog })).toEqual(
      expect.objectContaining({ delta: null, nextTotal: null })
    );
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (deterministic)', () => {
    const def = moneyPerkDef();
    const a = nextPerkValue({ def, level: 30, priceOf: price1000, progress: emptyProgress() });
    const b = nextPerkValue({ def, level: 30, priceOf: price1000, progress: emptyProgress() });
    expect(a).toEqual(b);
  });

  it('không import store: chỉ dựa vào đối số (def/level/priceOf/progress)', () => {
    const def = moneyPerkDef();
    const nv = nextPerkValue({ def, level: 30, priceOf: price1000, progress: emptyProgress() })!;
    // Delta bằng đúng chênh giữa 2 lần gọi regularSpendEstimate — cô lập công thức, không cần store/state
    const withPerk: RegularProgress = {
      friendship: nv.perk.threshold, visits: 0, lastVisitDay: undefined, lastFriendshipDay: undefined,
      perks: [nv.perk.title], discovered: [],
    };
    const sim = regularSpendEstimate({ def, level: 30, priceOf: price1000, progress: withPerk })!;
    expect(nv.delta).toBe(sim.total - regularSpendEstimate({ def, level: 30, priceOf: price1000, progress: emptyProgress() })!.total);
  });
});

/**
 * GĐ1295 — "ai là khách vàng THẬT theo tuần?": gộp giỏ+boa mỗi lần ghé (GĐ1289) × tần suất ghé (visitsToday,
 * regulars.ts:137: chance = 0.35 + 0.2 nếu có ghé thường xuyên) → đóng góp/tuần. THUẦN — chỉ ~~ ƯỚC TÍNH,
 * không bịa khách/giỏ; không import store, không đổi kinh tế/save/seed.
 */
describe('GĐ1295 — weeklyContribution / weeklyTop (khách vàng theo tuần: giỏ × tần ghé)', () => {
  const ba_nam = REGULARS.find((r) => r.id === 'ba_nam')!;

  it('chưa mở món ưa nào (level 0) → null (không ồn)', () => {
    expect(weeklyContribution({ def: ba_nam, level: 0, priceOf: price1000 })).toBeNull();
  });

  it('week = perVisit × 7 × chance; chưa ghé thường xuyên → chance 0.35 → 7 × 0.35 = 2.4 lần/tuần (làm tròn 1 số lẻ)', () => {
    const per = regularSpendEstimate({ def: ba_nam, level: 30, priceOf: price1000, progress: emptyProgress() })!;
    const w = weeklyContribution({ def: ba_nam, level: 30, priceOf: price1000, progress: emptyProgress() })!;
    expect(w.visitChance).toBe(0.35);
    expect(w.weeklyVisits).toBe(2.4);
    expect(w.perVisit).toBe(per.total);
    expect(w.weekly).toBe(Math.round(per.total * 2.4));
  });

  it('mở perk GHÉ THƯỜNG XUYÊN (frequent_visit) → chance 0.55, ghé ~3,9 lần/tuần, week cao hơn rõ', () => {
    const def = REGULARS.find((r) => r.perks.some((p) => p.effect === 'frequent_visit'))!;
    const fPerk = def.perks.find((p) => p.effect === 'frequent_visit')!;
    const prog: RegularProgress = { friendship: 999, visits: 1, perks: [fPerk.title], discovered: [] };
    const w = weeklyContribution({ def, level: 30, priceOf: price1000, progress: prog })!;
    const base = weeklyContribution({ def, level: 30, priceOf: price1000, progress: emptyProgress() })!;
    expect(w.visitChance).toBe(0.55);
    expect(w.weeklyVisits).toBe(3.9);
    expect(w.weekly).toBeGreaterThan(base.weekly);
  });

  it('weeklyTop xếp giảm dần theo đóng góp/tuần + giữ đúng topN', () => {
    const all = REGULARS.map((def) => weeklyContribution({ def, level: 30, priceOf: price1000 }))
      .filter((c): c is WeeklyContribution => c !== null)
      .sort((a, b) => b.weekly - a.weekly)
      .slice(0, 3);
    const top = weeklyTop({ regulars: REGULARS, level: 30, priceOf: price1000, progressOf: () => undefined, topN: 3 })!;
    expect(top.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].weekly).toBeGreaterThanOrEqual(top[i].weekly);
    expect(top[0]!.weekly).toBe(all[0]!.weekly); // đúng người dẫn đầu
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (deterministic)', () => {
    const a = weeklyContribution({ def: ba_nam, level: 30, priceOf: price1000 });
    const b = weeklyContribution({ def: ba_nam, level: 30, priceOf: price1000 });
    expect(a).toEqual(b);
  });
});

/**
 * GĐ1298 — "perk giới thiệu bạn bè đáng bao nhiêu?": refer_friend rủ thêm khách lẻ (customers.ts friendsBurst →
 * spawn true) → giá trị = bạn/lần ghé × tần suất/ngày (regulars.ts:137) × avgPerVisit (GĐ1221). THUẦN — chỉ nhân
 * số có sẵn, không bịa; không import store, không đổi kinh tế/save/seed.
 */
describe('GĐ1298 — referValue (perk giới thiệu bạn bè: khách + tiền/tuần)', () => {
  /** Khách quen có perk refer_friend giá trị 1 (số bạn rủ gọn để dễ kiểm). */
  function referDef(value = 1) {
    return REGULARS.find((r) => {
      const p = r.perks.find((pp) => pp.effect === 'refer_friend');
      return p && p.value === value;
    })!;
  }

  it('chưa mở perk refer_friend → null (không ồn)', () => {
    const def = REGULARS.find((r) => !r.perks.some((p) => p.effect === 'refer_friend'))!;
    expect(referValue({ def, avgPerVisit: 20000 })).toBeNull();
  });

  it('avgPerVisit ≤ 0 → null (chưa có dữ liệu doanh thu, không bịa)', () => {
    const def = referDef();
    const prog: RegularProgress = { friendship: 999, visits: 1, perks: [def.perks.find((p) => p.effect === 'refer_friend')!.title], discovered: [] };
    expect(referValue({ def, progress: prog, avgPerVisit: 0 })).toBeNull();
  });

  it('bạn/lần × tần ghé 0.35 × 7 → khách lẻ/tuần; x doanh thu bình quân → tiền thêm', () => {
    const def = referDef(1);
    const fPerk = def.perks.find((p) => p.effect === 'refer_friend')!;
    const prog: RegularProgress = { friendship: 999, visits: 1, perks: [fPerk.title], discovered: [] };
    const r = referValue({ def, progress: prog, avgPerVisit: 20000 })!;
    expect(r.friends).toBe(1);
    expect(r.visitChance).toBe(0.35);
    expect(r.extraCustomersWeek).toBe(2.4); // 1 × 0.35 × 7 = 2.45 → làm tròn 2.4
    expect(r.extraRevenueWeek).toBe(Math.round(2.4 * 20000));
  });

  it('mở CẢ ghé thường xuyên → tần 0.55, khách + tiền thêm cao hơn rõ', () => {
    const def = referDef(1);
    const fPerk = def.perks.find((p) => p.effect === 'refer_friend')!;
    const freq = def.perks.find((p) => p.effect === 'frequent_visit');
    const prog: RegularProgress = {
      friendship: 999, visits: 1,
      perks: [fPerk.title, ...(freq ? [freq.title] : [])], discovered: [],
    };
    const r = referValue({ def, progress: prog, avgPerVisit: 20000 })!;
    expect(r.visitChance).toBe(0.55);
    expect(r.extraCustomersWeek).toBe(3.9); // 1 × 0.55 × 7 = 3.85 → làm tròn 3.9
    expect(r.extraRevenueWeek).toBeGreaterThan(referValue({ def, progress: { friendship: 999, visits: 1, perks: [fPerk.title], discovered: [] }, avgPerVisit: 20000 })!.extraRevenueWeek);
  });

  it('2 bạn/lần ghé → khách lẻ/tuần gần gấp đôi 1 bạn', () => {
    const def = referDef(2);
    const fPerk = def.perks.find((p) => p.effect === 'refer_friend')!;
    const prog: RegularProgress = { friendship: 999, visits: 1, perks: [fPerk.title], discovered: [] };
    const r = referValue({ def, progress: prog, avgPerVisit: 20000 })!;
    expect(r.friends).toBe(2);
    expect(r.extraCustomersWeek).toBe(4.9); // 2 × 0.35 × 7 = 4.9 → làm tròn 4.9
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (deterministic)', () => {
    const def = referDef();
    const fPerk = def.perks.find((p) => p.effect === 'refer_friend')!;
    const prog: RegularProgress = { friendship: 999, visits: 1, perks: [fPerk.title], discovered: [] };
    expect(referValue({ def, progress: prog, avgPerVisit: 20000 })).toEqual(referValue({ def, progress: prog, avgPerVisit: 20000 }));
  });
});
