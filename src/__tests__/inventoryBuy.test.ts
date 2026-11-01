import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { PRODUCTS } from '../data/products';
import { SUPPLIERS, orderTotal } from '../data/suppliers';
import { WAREHOUSE_TIERS } from '../data/warehouse';

/**
 * inventory.ts (slice) — nhập hàng: buy (tay), placeOrder (theo mối), upgradeWarehouse. Toàn bộ tiền ra két mỗi ngày.
 * Khoá: trừ đúng tiền + ghi sổ chi, món nhà làm không nhập được, kho tràn/thiếu tiền/dưới mức tối thiểu bị chặn không mất gì,
 * mối giao ngay vào kho còn mối giao trễ vào hàng chờ, mối quen tích doanh mua.
 */

const g = () => useGame.getState();
const P = PRODUCTS.find((p) => !COOKED_PRODUCT_IDS.has(p.id))!;
const daily = SUPPLIERS.find((s) => s.delayDays === 0)!;
const slow = SUPPLIERS.find((s) => s.delayDays > 0 && s.minOrder > 0)!;

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 5_000_000, level: 50, storage: {}, storageLots: {}, deliveries: [], warehouseTier: 0 });
});

describe('buy', () => {
  it('nhập tay: trừ giá × số lượng, kho tăng, ghi sổ chi', () => {
    const s0 = g().stats.spent;
    expect(g().buy(P.id, 3)).toBe(true);
    expect(g().money).toBe(5_000_000 - P.buy * 3);
    expect(g().storage[P.id]).toBe(3);
    expect(g().stats.spent).toBe(s0 + P.buy * 3);
    expect(g().totals.spent).toBeGreaterThanOrEqual(P.buy * 3);
  });

  it('món nhà làm không nhập được', () => {
    const cooked = [...COOKED_PRODUCT_IDS][0];
    expect(g().buy(cooked, 1)).toBe(false);
    expect(g().money).toBe(5_000_000);
  });

  it('thiếu tiền hoặc kho tràn: trả false, không trừ, không đổi kho', () => {
    useGame.setState({ money: P.buy * 2 - 1 });
    expect(g().buy(P.id, 2)).toBe(false);
    expect(g().storage[P.id] ?? 0).toBe(0);
    useGame.setState({ money: 999_999_999 });
    expect(g().buy(P.id, 100_000)).toBe(false);
    expect(g().money).toBe(999_999_999);
    expect(g().storage[P.id] ?? 0).toBe(0);
  });
});

describe('placeOrder', () => {
  it('mối giao ngay: hàng vào kho luôn, trừ đúng tổng đơn, mối quen tích doanh mua', () => {
    const lines = { [P.id]: 4 };
    const cost = orderTotal(daily, lines, g().day);
    expect(g().placeOrder(daily.id, lines)).toBe(true);
    expect(g().money).toBe(5_000_000 - cost);
    expect(g().storage[P.id]).toBe(4);
    expect(g().deliveries).toEqual([]);
    expect(g().biz.supplierRelMonth![daily.id]).toBe(cost);
  });

  it('mối giao trễ: trừ tiền ngay, hàng vào hàng chờ (chưa vào kho)', () => {
    let qty = 1;
    while (orderTotal(slow, { [P.id]: qty }, g().day) < slow.minOrder) qty++;
    const lines = { [P.id]: qty };
    const cost = orderTotal(slow, lines, g().day);
    expect(cost).toBeGreaterThanOrEqual(slow.minOrder);
    expect(g().placeOrder(slow.id, lines)).toBe(true);
    expect(g().money).toBe(5_000_000 - cost);
    expect(g().storage[P.id] ?? 0).toBe(0);
    expect(g().deliveries).toEqual([{ supplierId: slow.id, items: lines }]);
  });

  it('dưới mức tối thiểu của mối / đơn rỗng / thiếu tiền: bị chặn, không mất gì', () => {
    expect(g().placeOrder(slow.id, { [P.id]: 1 })).toBe(false);
    expect(g().placeOrder(daily.id, { [P.id]: 0 })).toBe(false);
    useGame.setState({ money: 1 });
    expect(g().placeOrder(daily.id, { [P.id]: 3 })).toBe(false);
    expect(g().money).toBe(1);
    expect(g().deliveries).toEqual([]);
    expect(g().storage[P.id] ?? 0).toBe(0);
  });

  it('kho không đủ chỗ cho cả hàng đang chờ giao: chặn', () => {
    useGame.setState({ money: 999_999_999, deliveries: [{ supplierId: slow.id, items: { [P.id]: 100_000 } }] as never });
    expect(g().placeOrder(daily.id, { [P.id]: 10 })).toBe(false);
    expect(g().money).toBe(999_999_999);
  });
});

describe('upgradeWarehouse', () => {
  it('đủ cấp + tiền: lên bậc kế, trừ giá, ghi sổ chi', () => {
    const next = WAREHOUSE_TIERS[1];
    useGame.setState({ level: next.unlock, money: next.price });
    expect(g().upgradeWarehouse()).toBe(true);
    expect(g().warehouseTier).toBe(1);
    expect(g().money).toBe(0);
  });

  it('thiếu cấp / thiếu tiền / hết bậc: không nâng', () => {
    const next = WAREHOUSE_TIERS[1];
    useGame.setState({ level: next.unlock - 1, money: next.price * 2 });
    expect(g().upgradeWarehouse()).toBe(false);
    useGame.setState({ level: 50, money: next.price - 1 });
    expect(g().upgradeWarehouse()).toBe(false);
    expect(g().warehouseTier).toBe(0);
    useGame.setState({ warehouseTier: WAREHOUSE_TIERS.length - 1, money: 99_999_999 });
    expect(g().upgradeWarehouse()).toBe(false);
    expect(g().money).toBe(99_999_999);
  });
});
