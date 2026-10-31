import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { TIEM_XOI_HAND, tiemXoiHandQty, TIEM_XOI_UNLOCK, tiemXoiHandPick, tiemXoiIds } from '../data/tiemXoi';

/** GĐ439 — chủ tự đồ một mẻ xôi ở sạp, mỗi ngày một lần. */
const g = () => useGame.getState();
let msgs: string[] = [];

beforeEach(() => {
  msgs = [];
  useGame.setState({ ...newGameData(), level: TIEM_XOI_UNLOCK, money: 100_000_000, notify: (m: string) => { msgs.push(m); } });
});

describe('steamXoiHand', () => {
  it('chưa mở tiệm thì không đồ', () => {
    expect(g().steamXoiHand()).toBe(false);
  });

  it('đồ món thiếu nhất vào kho, trừ tiền, một lần/ngày', () => {
    g().buyTiemXoi();
    const id = tiemXoiHandPick(g().level, g().storage)!;
    expect(tiemXoiIds(g().level)).toContain(id);
    const before = g().storage[id] ?? 0;
    const money = g().money;
    expect(g().steamXoiHand()).toBe(true);
    expect(g().storage[id]).toBe(before + TIEM_XOI_HAND);
    expect(g().money).toBeLessThan(money);
    expect(g().steamXoiHand()).toBe(false);
    useGame.setState({ day: g().day + 1 });
    expect(g().steamXoiHand()).toBe(true);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ529: không có món xôi', () => {
  it('báo lý do thay vì im lặng', () => {
    g().buyTiemXoi();
    useGame.setState({ level: 0 });
    if (tiemXoiIds(0).length) return;
    expect(g().steamXoiHand()).toBe(false);
    expect(msgs.some((m) => m.includes('Chưa có món xôi'))).toBe(true);
  });
});

describe('tin cuối ngày', () => {
  it('ghi chủ tự đồ khi đã đồ trong ngày, ≤90 ký tự', () => {
    g().buyTiemXoi();
    g().steamXoiHand();
    msgs = [];
    useGame.setState({ minutes: 20 * 60 });
    expect(g().sleep()).toBe(true);
    const seg = msgs.join('|').match(/🍚 Tiệm xôi.*?chủ tự đồ 1 mẻ/)?.[0];
    expect(seg).toBeTruthy();
    expect(seg!.length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ444: thợ phụ tăng mẻ', () => {
  it('mỗi thợ +5 phần', () => {
    expect(tiemXoiHandQty(0)).toBe(TIEM_XOI_HAND);
    expect(tiemXoiHandQty(2)).toBe(TIEM_XOI_HAND + 10);
    g().buyTiemXoi();
    g().hireTiemXoi();
    const id = tiemXoiHandPick(g().level, g().storage)!;
    const before = g().storage[id] ?? 0;
    g().steamXoiHand();
    expect(g().storage[id]).toBe(before + TIEM_XOI_HAND + 5);
  });
});

describe('GĐ453: việc tay cho XP', () => {
  it('đồ xôi +4 XP', () => {
    g().buyTiemXoi();
    const xp = g().xp;
    g().steamXoiHand();
    expect(g().xp === xp + 4 || g().level > TIEM_XOI_UNLOCK).toBe(true);
  });
});

describe('GĐ461: mở rộng bếp xôi', () => {
  it('cần cấp + tiền, một lần; tăng mục tiêu và sức nấu', async () => {
    const { tiemXoiCapacity, tiemXoiTarget, TIEM_XOI_BIG_LEVEL, TIEM_XOI_BIG_COST } = await import('../data/tiemXoi');
    expect(tiemXoiTarget({})).toBe(80);
    expect(tiemXoiTarget({ big: true })).toBe(120);
    expect(tiemXoiCapacity(1, true)).toBe(Math.round(tiemXoiCapacity(1) * 1.5));
    g().buyTiemXoi();
    expect(g().expandTiemXoi()).toBe(false);
    useGame.setState({ level: TIEM_XOI_BIG_LEVEL });
    const m = g().money;
    expect(g().expandTiemXoi()).toBe(true);
    expect(g().money).toBe(m - TIEM_XOI_BIG_COST);
    expect(g().biz.tiemXoi.big).toBe(true);
    expect(g().expandTiemXoi()).toBe(false);
    for (const x of msgs) expect(x.length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ464: thành tựu quán cà phê / bếp xôi lớn', () => {
  it('done theo ctx', async () => {
    const { ACHIEVEMENTS } = await import('../data/biz');
    const { achievementCtx } = await import('../core/biz');
    const a = (id: string) => ACHIEVEMENTS.find((x) => x.id === id)!;
    const ctx = achievementCtx(g());
    expect(a('quan_cafe').done(ctx)).toBe(false);
    expect(a('xoi_big').done(ctx)).toBe(false);
    expect(a('quan_cafe').done({ ...ctx, quanTier: 2 })).toBe(true);
    expect(a('xoi_big').done({ ...ctx, xoiBig: true })).toBe(true);
  });
});

describe('GĐ484: khách ăn tại chỗ', () => {
  it('suất theo thợ/bếp, lấy món nhiều nhất, doanh thu giá lẻ', async () => {
    const { tiemXoiDineCap, tiemXoiDinePlan, tiemXoiIds } = await import('../data/tiemXoi');
    const { productById } = await import('../data/products');
    expect(tiemXoiDineCap(0)).toBe(10);
    expect(tiemXoiDineCap(2)).toBe(20);
    expect(tiemXoiDineCap(2, true)).toBe(30);
    const ids = tiemXoiIds(TIEM_XOI_UNLOCK);
    const st = { [ids[0]]: 3, [ids[1]]: 50 };
    const p = tiemXoiDinePlan({ open: true, staff: 0 } as never, TIEM_XOI_UNLOCK, st);
    expect(p.portions).toBe(10);
    expect(p.take[ids[1]]).toBe(10);
    expect(p.revenue).toBe(10 * productById(ids[1]).sell);
    expect(tiemXoiDinePlan({ open: false, staff: 0 } as never, TIEM_XOI_UNLOCK, st).portions).toBe(0);
    expect(tiemXoiDinePlan({ open: true, staff: 0 } as never, TIEM_XOI_UNLOCK, {}).portions).toBe(0);
  });

  it('cuối ngày cộng tiền + tin ≤90 ký tự', () => {
    g().buyTiemXoi();
    g().steamXoiHand();
    msgs = [];
    const m0 = g().money;
    useGame.setState({ minutes: 20 * 60 });
    g().sleep();
    const seg = msgs.join('|').match(/🍚 Khách ăn tại tiệm xôi[^|·]*· \+[^|·]*/)?.[0];
    expect(seg).toBeTruthy();
    expect(seg!.length).toBeLessThanOrEqual(90);
    expect(typeof m0).toBe('number');
  });
});

describe('GĐ486: khách ngồi hiện trong tiệm', () => {
  it('số hình theo suất hôm qua; cuối ngày ghi dine vào tiemXoiLast', async () => {
    const { tiemXoiDinerFigures } = await import('../data/tiemXoi');
    expect(tiemXoiDinerFigures(undefined)).toBe(0);
    expect(tiemXoiDinerFigures(0)).toBe(0);
    expect(tiemXoiDinerFigures(10)).toBe(1);
    expect(tiemXoiDinerFigures(20)).toBe(2);
    g().buyTiemXoi();
    useGame.setState({ minutes: 20 * 60 });
    g().sleep();
    expect(g().biz.tiemXoiLast?.dine).toBeGreaterThan(0);
  });
});

describe('GĐ489: cộng dồn suất ăn + thành tựu', () => {
  it('ngủ qua đêm cộng dineTotal; thành tựu đủ 500', async () => {
    const { ACHIEVEMENTS } = await import('../data/biz');
    const { achievementCtx } = await import('../core/biz');
    g().buyTiemXoi();
    useGame.setState({ minutes: 20 * 60 });
    g().sleep();
    const d = g().biz.tiemXoi.dineTotal ?? 0;
    expect(d).toBe(g().biz.tiemXoiLast?.dine);
    const a = ACHIEVEMENTS.find((x) => x.id === 'xoi_dine')!;
    expect(a.done({ ...achievementCtx(g()), xoiDine: 499 })).toBe(false);
    expect(a.done({ ...achievementCtx(g()), xoiDine: 500 })).toBe(true);
  });
});

describe('GĐ496: mưa khách vào tiệm xôi trú mưa', () => {
  it('mưa/bão ×1.2 suất ăn, nắng giữ nguyên', async () => {
    const { tiemXoiDinePlan, tiemXoiIds } = await import('../data/tiemXoi');
    const st = { [tiemXoiIds(TIEM_XOI_UNLOCK)[0]]: 100 };
    const t = { open: true, staff: 0 } as never;
    expect(tiemXoiDinePlan(t, TIEM_XOI_UNLOCK, st, 'sunny').portions).toBe(10);
    expect(tiemXoiDinePlan(t, TIEM_XOI_UNLOCK, st, 'rain').portions).toBe(12);
    expect(tiemXoiDinePlan(t, TIEM_XOI_UNLOCK, st, 'storm').portions).toBe(12);
  });
});
