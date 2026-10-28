import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';
import {
  emptyDemographics, demoAdd, summarizeDemographics, adReach,
} from '../data/demographics';
import { PRODUCTS } from '../data/products';

/** GĐ62 "Khách của tôi là ai": nhân khẩu học khách vãng lai + quảng cáo chạm đúng nghề —
 *  thuần ghi sổ mô phỏng + 1 field optional save-safe, KHÔNG đổi kinh tế/odds/save. */

beforeEach(() => useGame.setState(newGameData()));

describe('tallyDemographics (action store cộng dồn, no-op khi rỗng)', () => {
  it('cộng dồn visits/revenue/walkouts theo nghề; default {} cho ván mới', () => {
    const s0 = useGame.getState();
    expect(s0.biz.demographics).toEqual({});
    useGame.getState().tallyDemographics('construction', { visits: 3, revenue: 45000 });
    useGame.getState().tallyDemographics('construction', { visits: 1, walkouts: 1 });
    useGame.getState().tallyDemographics('nurse', { visits: 2, revenue: 9000 });
    const d = useGame.getState().biz.demographics;
    expect(d.construction).toEqual({ visits: 4, revenue: 45000, walkouts: 1 });
    expect(d.nurse).toEqual({ visits: 2, revenue: 9000, walkouts: 0 });
  });

  it('no-op khi patch rỗng — không tạo dòng mới', () => {
    useGame.getState().tallyDemographics('mom', {});
    expect(useGame.getState().biz.demographics).toEqual({});
  });
});

describe('checkout truyền profId (ghi doanh thu theo nghề; không truyền = không ghi)', () => {
  it('checkout có profId → cộng revenue vào demographics, kinh tế không đổi', () => {
    const mi = PRODUCTS.find((p) => p.id === 'mi')!;
    const rev0 = useGame.getState().stats.revenue;
    const item = { id: mi.id, price: mi.sell };
    useGame.getState().checkout([item], 0, 0, 'cash', 'construction');
    const d = useGame.getState().biz.demographics;
    expect(d.construction.revenue).toBe(mi.sell);
    expect(useGame.getState().stats.revenue).toBe(rev0 + mi.sell); // kinh tế như cũ
  });

  it('checkout không truyền profId → không tạo demographic (caller/tests cũ không đổi)', () => {
    const mi = PRODUCTS.find((p) => p.id === 'mi')!;
    useGame.getState().checkout([{ id: mi.id, price: mi.sell }], 0, 0, 'cash');
    expect(useGame.getState().biz.demographics).toEqual({});
  });
});

describe('summarizeDemographics (thuần: sort, revenuePct, walkoutRate, bỏ nghề toàn 0)', () => {
  it('sort theo doanh thu desc, phá bằng lượt; revenuePct 1 chữ số thập phân', () => {
    const d = {
      nurse: { visits: 2, revenue: 10000, walkouts: 0 },
      construction: { visits: 10, revenue: 30000, walkouts: 5 },
      mom: { visits: 1, revenue: 10000, walkouts: 0 },
    };
    const rows = summarizeDemographics(d);
    expect(rows.map((r) => r.id)).toEqual(['construction', 'nurse', 'mom']); // 30k > 10k, phá bằng theo lượt 2>1
    expect(rows[0].revenuePct).toBe(60); // 30k / 50k
    expect(rows[1].revenuePct).toBe(20);
  });

  it('walkoutRate = walkouts/visits; nghề chưa ghé (toàn 0) bị bỏ khỏi danh sách', () => {
    const rows = summarizeDemographics({ construction: { visits: 10, revenue: 30000, walkouts: 5 } });
    expect(rows[0].walkoutRate).toBe(0.5);
    // Vision nghề có dòng nhưng chưa từng ghé: drug "guard" toàn 0 → lọc bỏ
    expect(summarizeDemographics({ guard: { visits: 0, revenue: 0, walkouts: 0 } })).toEqual([]);
  });

  it('tally undefined / rỗng → [] (an toàn)', () => {
    expect(summarizeDemographics(undefined)).toEqual([]);
    expect(summarizeDemographics(emptyDemographics())).toEqual([]);
  });
});

describe('adReach (nhóm mục tiêu nào đã ghé)', () => {
  const ad = { targets: ['construction', 'electrician', 'mechanic'] };
  it('matched theo visits>0; coverage = phần đã chạm', () => {
    const r = adReach(ad, { construction: { visits: 4, revenue: 0, walkouts: 0 }, mechanic: { visits: 1, revenue: 0, walkouts: 0 } });
    const m = Object.fromEntries(r.targets.map((t) => [t.id, t.matched]));
    expect(m).toEqual({ construction: true, electrician: false, mechanic: true });
    expect(r.coverage).toBeCloseTo(2 / 3);
  });

  it('chưa ai nhóm nào ghé → coverage 0; không có targets → trống coverage 0', () => {
    expect(adReach(ad, {}).coverage).toBe(0);
    expect(adReach(ad, undefined).coverage).toBe(0);
    expect(adReach({ targets: [] }, {}).targets).toEqual([]);
  });
});

describe('demoAdd (helper thuần cộng dồn)', () => {
  it('tạo mới + cộng dồn', () => {
    let d = emptyDemographics();
    d = demoAdd(d, 'chef', { visits: 1 });
    d = demoAdd(d, 'chef', { visits: 1, revenue: 500, walkouts: 1 });
    expect(d.chef).toEqual({ visits: 2, revenue: 500, walkouts: 1 });
  });
});

describe('save-safe (field optional như venueTrend/rivalTrend)', () => {
  it('applySnapshot thiếu demographics → tự bù mặc định {} (save cũ lên)', () => {
    const raw = { ...newGameData() } as Record<string, unknown>;
    delete raw.biz;
    applySnapshot(raw as never);
    expect(useGame.getState().biz.demographics).toEqual({});
  });

  it('round-trip snapshot → applySnapshot giữ demographics', () => {
    useGame.getState().tallyDemographics('teacher', { visits: 3, revenue: 9000, walkouts: 1 });
    const snap = snapshot();
    applySnapshot(snap);
    expect(useGame.getState().biz.demographics.teacher).toEqual({ visits: 3, revenue: 9000, walkouts: 1 });
  });

  it('snapshot ghi demographics đúng nghề', () => {
    useGame.getState().tallyDemographics('shipper', { visits: 2, revenue: 12000 });
    const snap = snapshot();
    expect(snap.biz.demographics.shipper).toEqual({ visits: 2, revenue: 12000, walkouts: 0 });
  });
});
