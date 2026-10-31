import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../data/biz';
import { newGameData, useGame } from '../core/store';
import { SAP_BASE_INCOME, SAP_LOT_COST, SAP_LOTS, sapRongIncome } from '../data/sapRong';

/** GĐ501 — sạp hàng rong Ngõ 2: thuê lô sau khi mở khu, mưa nghỉ bán, cuối tuần đông. */

const g = () => useGame.getState();
let msgs: string[] = [];
beforeEach(() => {
  msgs = [];
  useGame.setState({ ...newGameData(), level: 50, money: 100_000_000, notify: (m: string) => { msgs.push(m); } });
});

describe('sapRongIncome', () => {
  it('mưa/bão = 0, nắng theo số lô, tối đa 4 lô', () => {
    expect(sapRongIncome(2, 'rain', 1)).toBe(0);
    expect(sapRongIncome(2, 'storm', 1)).toBe(0);
    expect(sapRongIncome(0, 'sunny', 1)).toBe(0);
    expect(sapRongIncome(9, 'sunny')).toBe(SAP_LOTS * SAP_BASE_INCOME);
  });
  it('cuối tuần nhiều hơn ngày thường', () => {
    const days = Array.from({ length: 7 }, (_, i) => sapRongIncome(1, 'sunny', i + 1));
    expect(Math.max(...days)).toBeGreaterThan(Math.min(...days));
  });
});

afterEach(() => vi.restoreAllMocks());

describe('rentSapLot', () => {
  it('chưa mở Ngõ 2: không thuê được; mở rồi thuê tới 4 lô, trừ tiền', () => {
    expect(g().rentSapLot()).toBe(false);
    expect(g().openZone('ngo2')).toBe(true);
    const m = g().money;
    for (let i = 0; i < SAP_LOTS; i++) expect(g().rentSapLot()).toBe(true);
    expect(g().rentSapLot()).toBe(false);
    expect(g().biz.sapRong).toBe(SAP_LOTS);
    expect(g().money).toBe(m - SAP_LOTS * SAP_LOT_COST);
    expect(msgs.every((x) => [...x].length <= 90)).toBe(true);
  });
});

describe('endDay — sạp hàng rong', () => {
  const run = (weather: 'sunny' | 'rain') => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const s = g();
    useGame.setState({ minutes: 20 * 60, weather, biz: { ...s.biz, achievements: ACHIEVEMENTS.map((a) => a.id), zones: ['ngo2'], sapRong: 2 } });
    expect(g().sleep()).toBe(true);
    return msgs.find((m) => m.includes('🛒')) ?? '';
  };
  it('nắng: có tin thu tiền sạp', () => {
    expect(run('sunny')).toContain('sạp hàng rong Ngõ 2');
  });
  it('mưa: sạp nghỉ bán', () => {
    expect(run('rain')).toContain('nghỉ bán');
  });
});

describe('sapStrollerCount (GĐ503)', () => {
  it('2 người/sạp tối đa 6, chỉ ban ngày, mưa vắng', async () => {
    const { sapStrollerCount } = await import('../data/sapRong');
    expect(sapStrollerCount(2, 'sunny', 9 * 60)).toBe(4);
    expect(sapStrollerCount(4, 'sunny', 9 * 60)).toBe(6);
    expect(sapStrollerCount(4, 'rain', 9 * 60)).toBe(0);
    expect(sapStrollerCount(4, 'sunny', 21 * 60)).toBe(0);
    expect(sapStrollerCount(undefined, 'sunny', 9 * 60)).toBe(0);
  });
});

describe('GĐ507: món từng lô sạp', () => {
  it('save cũ không có món = Tổng hợp, thu như trước', async () => {
    const { sapKindOf } = await import('../data/sapRong');
    expect(sapKindOf(undefined, 0).id).toBe('tonghop');
    expect(sapRongIncome(2, 'sunny', 1, undefined)).toBe(sapRongIncome(2, 'sunny', 1));
  });
  it('nước mía thắng ngày nắng, xôi thắng ngày sương; bánh mì thắng ngày thường, thua cuối tuần', async () => {
    const { SAP_KINDS, sapLotIncome } = await import('../data/sapRong');
    const k = Object.fromEntries(SAP_KINDS.map((x) => [x.id, x]));
    const best = (w: 'sunny' | 'fog', day: number) => SAP_KINDS.reduce((a, b) => (sapLotIncome(b, w, day) > sapLotIncome(a, w, day) ? b : a)).id;
    const weekday = Array.from({ length: 7 }, (_, i) => i + 1).find((d) => sapLotIncome(k.tonghop, 'cloudy', d) === SAP_BASE_INCOME)!;
    const weekend = Array.from({ length: 7 }, (_, i) => i + 1).find((d) => sapLotIncome(k.tonghop, 'cloudy', d) > SAP_BASE_INCOME)!;
    expect(best('sunny', weekday)).toBe('nuocmia');
    expect(best('fog', weekday)).toBe('xoi');
    expect(sapLotIncome(k.banhmi, 'cloudy', weekday)).toBeGreaterThan(sapLotIncome(k.tonghop, 'cloudy', weekday));
    expect(sapLotIncome(k.banhmi, 'cloudy', weekend)).toBeLessThan(sapLotIncome(k.tonghop, 'cloudy', weekend));
    for (const x of SAP_KINDS) expect(sapLotIncome(x, 'rain', weekday)).toBe(0);
  });
  it('cycleSapKind: chỉ lô đã thuê, đổi vòng tròn, lưu save, tin ≤90', () => {
    expect(g().cycleSapKind(0)).toBe(false);
    g().openZone('ngo2'); g().rentSapLot(); g().rentSapLot();
    expect(g().cycleSapKind(1)).toBe(true);
    expect(g().biz.sapKinds).toEqual(['tonghop', 'nuocmia']);
    for (let i = 0; i < 3; i++) g().cycleSapKind(1);
    expect(g().biz.sapKinds?.[1]).toBe('tonghop');
    expect(g().cycleSapKind(2)).toBe(false);
    expect(msgs.every((x) => [...x].length <= 90)).toBe(true);
  });
});

describe('GĐ508: gợi ý món theo dự báo', () => {
  it('bestSapKind: nắng → nước mía, sương → xôi, mưa → Tổng hợp (đều nghỉ)', async () => {
    const { bestSapKind } = await import('../data/sapRong');
    expect(bestSapKind('sunny', 1).id).toBe('nuocmia');
    expect(bestSapKind('fog', 1).id).toBe('xoi');
    expect(bestSapKind('rain', 1).id).toBe('tonghop');
  });
});
