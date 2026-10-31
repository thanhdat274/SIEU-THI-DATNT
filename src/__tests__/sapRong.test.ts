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

describe('GĐ509: icon món trong tin cuối ngày', () => {
  it('mỗi lô một icon, thiếu món = 🛒, giới hạn 4 lô', async () => {
    const { sapKindIcons } = await import('../data/sapRong');
    expect(sapKindIcons(3, ['nuocmia', 'banhmi'])).toBe('🥤🥖🛒');
    expect(sapKindIcons(0)).toBe('');
    expect([...sapKindIcons(9)].length).toBe(SAP_LOTS);
  });
});

describe('GĐ511: màu sạp 3D theo món', () => {
  it('Tổng hợp giữ màu riêng từng lô; các món khác có màu ô dù riêng, không trùng', async () => {
    const { SAP_KINDS } = await import('../data/sapRong');
    expect(SAP_KINDS[0].colors).toBeUndefined();
    const umbs = SAP_KINDS.slice(1).map((k) => k.colors?.[1]);
    expect(umbs.every((c) => typeof c === 'number')).toBe(true);
    expect(new Set(umbs).size).toBe(umbs.length);
  });
});

describe('GĐ513: nâng bậc lô sạp', () => {
  it('save cũ = gánh; nâng 2 bậc, trừ tiền, thu nhân theo bậc, tin ≤90', async () => {
    const { SAP_TIERS } = await import('../data/sapRong');
    expect(sapRongIncome(1, 'cloudy', 1, undefined, undefined)).toBe(sapRongIncome(1, 'cloudy', 1));
    expect(g().upgradeSapLot(0)).toBe(false);
    g().openZone('ngo2'); g().rentSapLot();
    const m = g().money;
    expect(g().upgradeSapLot(0)).toBe(true);
    expect(g().upgradeSapLot(0)).toBe(true);
    expect(g().upgradeSapLot(0)).toBe(false);
    expect(g().biz.sapTiers).toEqual([2]);
    expect(g().money).toBe(m - SAP_TIERS[1].cost - SAP_TIERS[2].cost);
    expect(sapRongIncome(1, 'cloudy', 1, undefined, [2])).toBe(Math.round(sapRongIncome(1, 'cloudy', 1) * SAP_TIERS[2].mul));
    expect(msgs.every((x) => [...x].length <= 90)).toBe(true);
  });
  it('không đủ tiền thì không nâng', () => {
    g().openZone('ngo2'); g().rentSapLot();
    useGame.setState({ money: 0 });
    expect(g().upgradeSapLot(0)).toBe(false);
    expect(g().biz.sapTiers).toBeUndefined();
  });
});

describe('GĐ516: xôi nhà làm', () => {
  it('đã mở tiệm xôi: chỉ lô xôi +20%', async () => {
    const { SAP_HOME_XOI_MUL } = await import('../data/sapRong');
    const base = sapRongIncome(2, 'fog', 1, ['xoi', 'banhmi']);
    const home = sapRongIncome(2, 'fog', 1, ['xoi', 'banhmi'], undefined, true);
    const xoiOnly = sapRongIncome(1, 'fog', 1, ['xoi']);
    expect(home - base).toBe(Math.round(xoiOnly * SAP_HOME_XOI_MUL) - xoiOnly);
    expect(sapRongIncome(1, 'fog', 1, ['banhmi'], undefined, true)).toBe(sapRongIncome(1, 'fog', 1, ['banhmi']));
  });
});

describe('GĐ518: ô dù món khác hẳn ô dù mặc định các lô', () => {
  it('khoảng cách màu RGB ≥ 80 với 4 màu lô Tổng hợp', async () => {
    const { SAP_KINDS } = await import('../data/sapRong');
    const LOT_UMBS = [0xd63031, 0x0984e3, 0xe84393, 0x00cec9]; // world/ngo2.ts UMBS
    const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    const dist = (a: number, b: number) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
    for (const k of SAP_KINDS.slice(1)) for (const u of LOT_UMBS) expect(dist(k.colors![1], u)).toBeGreaterThanOrEqual(80);
  });
});

describe('GĐ521: tự đứng sạp', () => {
  it('mỗi ngày một lần, mưa không được, cần có sạp; thu ×1,25 hôm đó', async () => {
    const { SAP_HAND_MUL } = await import('../data/sapRong');
    expect(g().tendSapHand()).toBe(false);
    g().openZone('ngo2'); g().rentSapLot();
    useGame.setState({ weather: 'rain' });
    expect(g().tendSapHand()).toBe(false);
    useGame.setState({ weather: 'sunny' });
    const xp = g().xp;
    expect(g().tendSapHand()).toBe(true);
    expect(g().biz.sapHandDay).toBe(g().day);
    expect(msgs.some((x) => x.includes('≈+'))).toBe(true); // GĐ526: báo số tiền thêm
    expect(g().xp).toBeGreaterThan(xp);
    expect(g().tendSapHand()).toBe(false);
    expect(sapRongIncome(2, 'sunny', 1, undefined, undefined, false, true)).toBe(Math.round(sapRongIncome(2, 'sunny', 1) * SAP_HAND_MUL));
    expect(msgs.every((x) => [...x].length <= 90)).toBe(true);
  });
});
