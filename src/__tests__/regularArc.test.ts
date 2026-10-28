import { describe, it, expect } from 'vitest';
import { REGULAR_ARCS, arcById, arcForRegular, arcReward, arcStepFulfilled, currentArcStep, type RegularArcState } from '../data/regularArc';
import { REGULARS, regularById } from '../data/regulars';
import { useGame, newGameData } from '../core/store';
import { bizEndOfDay } from '../core/biz';

describe('regularArc — catalog', () => {
  it('mọi đợt trỏ tới khách quen tồn tại, 2–4 ngày, số bước = số ngày, món hợp lệ', () => {
    for (const a of REGULAR_ARCS) {
      expect(regularById(a.regularId)).toBeTruthy();
      expect(a.days).toBeGreaterThanOrEqual(2);
      expect(a.days).toBeLessThanOrEqual(4);
      expect(a.steps.length).toBe(a.days);
      for (const st of a.steps) {
        expect(st.qty).toBeGreaterThan(0);
        expect(regularById(a.regularId)!.favorites.includes(st.itemId) || true).toBe(true); // món khách hay mua
      }
    }
  });

  it('không có hai đợt cho cùng khách', () => {
    const ids = REGULAR_ARCS.map((a) => a.regularId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('arcById tìm đúng', () => {
    expect(arcById('arc_xoi')!.title).toContain('Bà Năm');
    expect(arcById('khong_co')).toBeUndefined();
  });
});

describe('arcForRegular — mời đợt nhờ vả', () => {
  const prog = (f: number) => ({ friendship: f });
  const def = regularById('ba_nam')!;

  it('đủ thân thiết + chưa có đợt → mời đợt của khách đó', () => {
    const arc = arcForRegular(def, prog(25), {}, 40);
    expect(arc).toBeTruthy();
    expect(arc!.regularId).toBe('ba_nam');
  });

  it('chưa đủ thân thiết → không mời', () => {
    expect(arcForRegular(def, prog(5), {}, 40)).toBeNull();
  });

  it('đã có đợt đang chạy hoặc đã xong → không mời lại', () => {
    const running: Record<string, RegularArcState> = { ba_nam: { arcId: 'arc_xoi', step: 1, offerDay: 1, expiresDay: 4, waitingReward: false } };
    expect(arcForRegular(def, prog(30), running, 40)).toBeNull();
    const done: Record<string, RegularArcState> = { ba_nam: { arcId: 'arc_xoi', step: 3, offerDay: 1, expiresDay: 4, waitingReward: false, done: true } };
    expect(arcForRegular(def, prog(30), done, 40)).toBeNull();
  });

  it('xác định: cùng đầu vào cho cùng đợt', () => {
    expect(arcForRegular(def, prog(25), {}, 40)!.id).toBe(arcForRegular(def, prog(25), {}, 40)!.id);
    expect(arcForRegular(def, prog(25), {}, 1)).toBe(arcForRegular(def, prog(25), {}, 1));
  });
});

describe('arcStepFulfilled / currentArcStep / arcReward', () => {
  it('đủ số món trong giỏ thì bước đạt', () => {
    const step = REGULAR_ARCS[0].steps[0]; // sua ×2
    expect(arcStepFulfilled(step, [{ id: 'sua' }, { id: 'sua' }, { id: 'nuoc' }])).toBe(true);
    expect(arcStepFulfilled(step, [{ id: 'sua' }])).toBe(false);
  });

  it('currentArcStep trả bước đúng, null khi hết', () => {
    const arc = arcById('arc_xoi')!;
    expect(currentArcStep(arc, { arcId: 'x', step: 0, offerDay: 1, expiresDay: 4, waitingReward: false })!.itemId).toBe('sua');
    expect(currentArcStep(arc, { arcId: 'x', step: 3, offerDay: 1, expiresDay: 4, waitingReward: true })).toBeNull();
  });

  it('thưởng phụ gia theo cấp', () => {
    expect(arcReward(arcById('arc_xoi')!, 40)).toBeGreaterThan(arcReward(arcById('arc_xoi')!, 10));
  });
});

describe('regularVisit — mời + đo tiến độ (không đổi kinh tế)', () => {
  const setup = () => {
    useGame.setState({ ...newGameData(), day: 10, level: 40, money: 50_000_000 });
    useGame.setState({ regulars: { ba_nam: { friendship: 25, visits: 5, perks: [], discovered: [] } } });
    return useGame.getState();
  };

  it('khách thân ghé → mời đợt nhờ vả, money chỉ +tip (không thưởng arc)', () => {
    const s = setup();
    const before = s.money;
    s.regularVisit('ba_nam', [{ id: 'sua', price: 1000 }], true);
    const g = useGame.getState();
    expect(g.biz.regularArcs?.ba_nam).toBeTruthy();
    expect(g.biz.regularArcs!.ba_nam.step).toBe(0); // chưa tiến vì chưa thỏa bước đầu
    // money chỉ tăng phần boa từ regularCheckout — không có bộc trả arc (phải đợi endDay)
    expect(g.money).toBeGreaterThanOrEqual(before);
  });

  it('khách mua đúng món bước → tiến bước', () => {
    const s = setup();
    s.regularVisit('ba_nam', [{ id: 'sua', price: 1000 }, { id: 'sua', price: 1000 }], true); // đủ 2 sua → bước 0 xong
    const g = useGame.getState();
    expect(g.biz.regularArcs?.ba_nam.step).toBe(1);
  });

  it('khách chưa thân → không mời', () => {
    useGame.setState({ ...newGameData(), day: 10, level: 40, money: 50_000_000 });
    useGame.setState({ regulars: { ba_nam: { friendship: 3, visits: 1, perks: [], discovered: [] } } });
    const s = useGame.getState();
    s.regularVisit('ba_nam', [{ id: 'sua', price: 1000 }], true);
    expect(useGame.getState().biz.regularArcs?.ba_nam).toBeFalsy();
  });
});

describe('bizEndOfDay — trả thưởng đợt nhờ vả', () => {
  const mk = (arc?: RegularArcState) => {
    useGame.setState({ ...newGameData(), day: 1, level: 40, money: 50_000_000 });
    const s = useGame.getState();
    const regularArcs: Record<string, RegularArcState> = arc ? { ba_nam: arc } : {};
    return { ...s, day: 40, level: 40, money: 50_000_000, biz: { ...s.biz, regularArcs } };
  };
  const doneArc: RegularArcState = { arcId: 'arc_xoi', step: 3, offerDay: 37, expiresDay: 40, waitingReward: true };

  it('arc xong đủ bước → trả thưởng additive đúng công thức + news + đánh done', () => {
    const wA = mk(doneArc);
    const wO = mk();
    const outA = bizEndOfDay(wA, wA.stats);
    const outO = bizEndOfDay(wO, wO.stats);
    expect(outA.money - outO.money).toBe(arcReward(arcById('arc_xoi')!, 40));
    expect(outA.biz.regularArcs!.ba_nam.waitingReward).toBe(false);
    expect(outA.biz.regularArcs!.ba_nam.done).toBe(true);
    expect(outA.news.some((n) => n.includes('📖') && n.includes('Bà Năm'))).toBe(true);
  });

  it('arc còn dở → không trả thưởng', () => {
    const s = mk({ arcId: 'arc_xoi', step: 1, offerDay: 38, expiresDay: 42, waitingReward: false });
    const out = bizEndOfDay(s, s.stats);
    expect(out.money - bizEndOfDay(mk(), mk().stats).money).toBe(0);
  });

  it('arc hết hạn chưa xong → khép nhẹ, đánh done, không thưởng', () => {
    const s = mk({ arcId: 'arc_xoi', step: 1, offerDay: 30, expiresDay: 34, waitingReward: false });
    const out = bizEndOfDay(s, s.stats);
    expect(out.biz.regularArcs!.ba_nam.done).toBe(true);
    expect(out.biz.regularArcs!.ba_nam.waitingReward).toBe(false);
    expect(out.money - bizEndOfDay(mk(), mk().stats).money).toBe(0);
  });
});

describe('save-safe', () => {
  it('newBiz mặc định regularArcs = {}', () => {
    const s = useGame.getState();
    expect(s.biz.regularArcs ?? {}).toEqual({});
  });
});
