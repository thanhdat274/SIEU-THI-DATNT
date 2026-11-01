import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { onlineDayEnd, updateOnline } from '../core/slices/online';
import { appCommission, appPay, appTier, APP_TIERS, newOnline, orderNet } from '../data/online';
import { productById } from '../data/products';
import { runBranch } from '../core/slices/branch';
import { newBranch, type BranchState } from '../data/branches';
import type { Staff } from '../data/staff';

/**
 * GĐ716 — bậc gian hàng app: số đơn đã giao trọn đời (tiệm + chi nhánh đêm, cùng hồ sơ `online.done`)
 * mở hạng; hạng cao hơn = hoa hồng app thấp hơn (12% → 11% → 10% → 9%). Chỉ là giảm phí — không đổi
 * giá bán, không in tiền mới. Tiền giao thực tế ở slices/online + slices/branch phải theo bậc hiện có.
 */

const g = () => useGame.getState();
const crew = (role: Staff['role'], shift: Staff['shift'], id: number): Staff =>
  ({ id, name: `nv${id}`, role, shift, skill: 3, wage: 1_000_000 }) as Staff;

describe('appTier — ranh giới bậc theo số đơn đã giao', () => {
  it('0–49 gian hàng mới 12%, 50–149 quán quen 11%, 150–399 bạc 10%, 400+ vàng 9%', () => {
    expect(appTier(0).name).toBe('Gian hàng mới');
    expect(appTier(49).name).toBe('Gian hàng mới');
    expect(appTier(50).name).toBe('Quán quen app');
    expect(appTier(149).name).toBe('Quán quen app');
    expect(appTier(150).name).toBe('Gian hạng bạc');
    expect(appTier(399).name).toBe('Gian hạng bạc');
    expect(appTier(400).name).toBe('Gian hạng vàng');
    expect(appTier(1000).name).toBe('Gian hạng vàng');
    expect(appCommission(0)).toBe(0.12);
    expect(appCommission(50)).toBe(0.11);
    expect(appCommission(150)).toBe(0.1);
    expect(appCommission(400)).toBe(0.09);
    // Bậc tăng dần, hoa hồng giảm dần — bảng bậc không được tụt
    for (let i = 1; i < APP_TIERS.length; i++) {
      expect(APP_TIERS[i].at).toBeGreaterThan(APP_TIERS[i - 1].at);
      expect(APP_TIERS[i].commission).toBeLessThan(APP_TIERS[i - 1].commission);
    }
  });
  it('appPay = trị giá × (1 − hoa hồng bậc)', () => {
    expect(appPay(100_000, 0)).toBe(88_000);
    expect(appPay(100_000, 50)).toBe(89_000);
    expect(appPay(100_000, 400)).toBe(91_000);
  });
});

describe('giao đơn ở slices/online trả tiền theo bậc', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), level: 20, money: 5_000_000, shopOpen: true, minutes: 600, notify: () => {} }));
  afterEach(() => vi.restoreAllMocks());

  const shippingOrder = (id: number) => ({
    id, customer: 'QA', items: { nuoc: 2 }, km: 2, placedAt: 560, dueAt: 640, status: 'shipping' as const, via: 'grab' as const, arriveAt: 599,
  });

  it('done 0: giữ đúng hoà hồng cũ 12% (hành vi trước GĐ716 không đổi)', () => {
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 9999, orders: [shippingOrder(1)] } });
    const price = g().priceOf('nuoc');
    updateOnline(useGame.setState, useGame.getState);
    expect(g().money).toBe(5_000_000 + Math.round(2 * price * 0.88));
  });
  it('done 150: hoa hồng bậc bạc 10% — nhận nhiều hơn 2% trị giá đơn', () => {
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 9999, orders: [shippingOrder(1)], done: 150 } });
    const price = g().priceOf('nuoc');
    updateOnline(useGame.setState, useGame.getState);
    expect(g().money).toBe(5_000_000 + Math.round(2 * price * 0.9));
    expect(g().online.done).toBe(151);
  });
  it('onlineDayEnd: đơn đang chở coi như tới trễ, tiền vẫn theo bậc hiện có', () => {
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 9999, orders: [shippingOrder(1)], done: 400 } });
    const price = g().priceOf('nuoc');
    const res = onlineDayEnd(g());
    expect(res.money).toBe(Math.round(2 * price * 0.91));
    expect(res.online.done).toBe(401);
  });
  it('orderNet nhận hoa hồng theo tham số (panel truyền bậc để khớp số thật)', () => {
    useGame.setState({ ...newGameData(), level: 20 });
    const o = { id: 1, customer: 'QA', items: { nuoc: 10 }, km: 2, placedAt: 600, dueAt: 700, status: 'new' as const };
    const price = g().priceOf('nuoc');
    const value = 10 * price;
    const cost = 10 * productById('nuoc').buy;
    expect(orderNet(o, g().priceOf)).toBe(Math.round(value * 0.88) - cost); // mặc định bậc 0
    expect(orderNet(o, g().priceOf, 0.09)).toBe(Math.round(value * 0.91) - cost);
  });
});

describe('chi nhánh đêm cùng hồ sơ app — hoa hồng theo bậc', () => {
  afterEach(() => vi.restoreAllMocks());
  const nightBranch = (): BranchState => {
    const b = newBranch();
    b.open = true;
    b.nightDelivery = true;
    b.shelf = { mi: 200, nuoc: 200 };
    b.staff = [crew('cashier', 'night', 1), crew('courier', 'night', 2)];
    return b;
  };
  function simBranch(onlineDone: number) {
    vi.spyOn(Math, 'random').mockReturnValue(0.2); // có đơn mỗi bước, không sự cố — như convenienceNight
    const base = useGame.getState();
    const b = { ...nightBranch(), simAt: 22 * 60 };
    const s: any = {
      ...base, branch: b, money: 10_000_000, level: 20, day: 5, licenses: { alcohol: 99 }, atBranch: false,
      stats: { ...base.stats }, garden: { ...base.garden, homegrown: {} }, notify: () => {},
      online: { ...base.online, open: true, done: onlineDone },
    };
    return runBranch(() => s, 26 * 60);
  }
  it('cùng một đêm, cùng seed: bậc vàng (done 400) thu nhiều hơn bậc mới (done 0)', () => {
    const a = simBranch(0);
    const b = simBranch(400);
    expect(a.branch!.deliveryRevenueToday ?? 0).toBeGreaterThan(0);
    expect(b.branch!.deliveryRevenueToday ?? 0).toBeGreaterThan(a.branch!.deliveryRevenueToday ?? 0);
  });
});
