import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { SELL_BACK } from '../core/gameTypes';
import { furnitureDef } from '../data/furniture';
import { repairCost } from '../data/risks';
import { PAINT_PRICE, SHOP_TIERS } from '../data/shopTiers';
import { PRODUCTS } from '../data/products';

/**
 * build.ts — đặt/bán/dọn nội thất, nâng bậc tiệm, sửa kệ, sơn: toàn bộ là chỗ TIÊU và HOÀN tiền
 * (chiếm ~38% dòng chưa có test). Khoá: trừ/hoàn đúng, chặn khi thiếu tiền/cấp, hàng trên kệ về kho, sổ chi cập nhật.
 */

const g = () => useGame.getState();
const PID = PRODUCTS[0].id;

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 1_000_000, furniture: [], level: 50 });
});

describe('placeFurniture', () => {
  it('đủ tiền: trừ giá, cộng sổ chi (stats + totals), uid tăng dần', () => {
    const price = furnitureDef('shelf').price;
    const spent0 = g().stats.spent;
    expect(g().placeFurniture('shelf', 1, 1, 0)).toBe(true);
    expect(g().placeFurniture('shelf', 2, 1, 0)).toBe(true);
    expect(g().money).toBe(1_000_000 - 2 * price);
    expect(g().stats.spent).toBe(spent0 + 2 * price);
    expect(g().furniture.map((f) => f.uid)).toEqual([1, 2]);
    expect(g().furniture[0].tiers.length).toBe(furnitureDef('shelf').tiers * furnitureDef('shelf').slots);
  });

  it('thiếu tiền: không đặt, không trừ, trả false', () => {
    useGame.setState({ money: furnitureDef('shelf').price - 1 });
    expect(g().placeFurniture('shelf', 0, 0, 0)).toBe(false);
    expect(g().furniture).toHaveLength(0);
    expect(g().money).toBe(furnitureDef('shelf').price - 1);
  });
});

describe('sellFurniture / demolishAll', () => {
  const stocked = () => {
    g().placeFurniture('shelf', 0, 0, 0);
    const f = g().furniture[0];
    useGame.setState({
      furniture: [{ ...f, tiers: f.tiers.map((t, i) => (i === 0 ? { ...t, productId: PID, count: 3 } : t)) }],
      shelfHeat: { [f.uid]: 5, 99: 1 } as never,
      shelfProfit: { [f.uid]: 7, 99: 2 } as never,
    });
    return f.uid;
  };

  it('bán 1 món: hoàn SELL_BACK × giá, hàng trên kệ về kho, bỏ heat/lợi nhuận kệ đó', () => {
    const uid = stocked();
    const money0 = g().money;
    const stock0 = g().storage[PID] ?? 0;
    g().sellFurniture(uid);
    expect(g().money).toBe(money0 + Math.round(furnitureDef('shelf').price * SELL_BACK));
    expect(g().storage[PID]).toBe(stock0 + 3);
    expect(g().furniture).toHaveLength(0);
    expect(g().shelfHeat).toEqual({ 99: 1 });
    expect(g().shelfProfit).toEqual({ 99: 2 });
  });

  it('bán uid không tồn tại: không đổi gì', () => {
    stocked();
    const before = g().money;
    g().sellFurniture(12345);
    expect(g().money).toBe(before);
    expect(g().furniture).toHaveLength(1);
  });

  it('dọn sạch: hoàn mọi món theo SELL_BACK, hàng về kho, xoá heat/lợi nhuận', () => {
    stocked();
    g().placeFurniture('plant', 3, 3, 0);
    const money0 = g().money;
    const stock0 = g().storage[PID] ?? 0;
    const expectRefund = Math.round(furnitureDef('shelf').price * SELL_BACK) + Math.round(furnitureDef('plant').price * SELL_BACK);
    g().demolishAll();
    expect(g().money).toBe(money0 + expectRefund);
    expect(g().furniture).toEqual([]);
    expect(g().storage[PID]).toBe(stock0 + 3);
    expect(g().shelfHeat).toEqual({});
    expect(g().shelfProfit).toEqual({});
  });
});

describe('buyUpgrade', () => {
  it('đủ cấp + tiền: trừ giá bậc kế, đặt pendingUpgrade (tiệm đổi sáng mai), ghi sổ chi', () => {
    const next = SHOP_TIERS[g().shopTier + 1];
    useGame.setState({ level: next.unlock, money: next.price });
    const spent0 = g().totals.spent;
    g().buyUpgrade();
    expect(g().money).toBe(0);
    expect(g().pendingUpgrade).toBe(true);
    expect(g().totals.spent).toBe(spent0 + next.price);
  });

  it('thiếu cấp hoặc thiếu tiền: không trừ, không pending', () => {
    const next = SHOP_TIERS[g().shopTier + 1];
    useGame.setState({ level: next.unlock - 1, money: next.price * 2 });
    g().buyUpgrade();
    expect(g().pendingUpgrade).toBe(false);
    expect(g().money).toBe(next.price * 2);
    useGame.setState({ level: next.unlock, money: next.price - 1 });
    g().buyUpgrade();
    expect(g().pendingUpgrade).toBe(false);
    expect(g().money).toBe(next.price - 1);
  });

  it('đang chờ nâng bậc thì không mua lần hai (không trừ tiền kép)', () => {
    const next = SHOP_TIERS[g().shopTier + 1];
    useGame.setState({ level: next.unlock, money: next.price * 3 });
    g().buyUpgrade();
    const after = g().money;
    g().buyUpgrade();
    expect(g().money).toBe(after);
  });
});

describe('repairFurniture / paint', () => {
  it('sửa: trừ repairCost, về wear 10, hết hỏng; thiếu tiền thì giữ nguyên', () => {
    g().placeFurniture('shelf', 0, 0, 0);
    const uid = g().furniture[0].uid;
    useGame.setState({ furniture: g().furniture.map((f) => ({ ...f, wear: 90, broken: true })) });
    const cost = repairCost('shelf');
    useGame.setState({ money: cost - 1 });
    g().repairFurniture(uid);
    expect(g().furniture[0].broken).toBe(true);
    expect(g().money).toBe(cost - 1);
    useGame.setState({ money: cost + 500 });
    g().repairFurniture(uid);
    expect(g().money).toBe(500);
    expect(g().furniture[0]).toMatchObject({ wear: 10, broken: false });
  });

  it('sơn: đổi màu và trừ PAINT_PRICE; cùng màu hoặc thiếu tiền thì không trừ', () => {
    const old = g().style.wall;
    g().paint('wall', old);
    expect(g().money).toBe(1_000_000); // cùng màu: miễn phí, không đổi
    g().paint('wall', old + 1);
    expect(g().style.wall).toBe(old + 1);
    expect(g().money).toBe(1_000_000 - PAINT_PRICE);
    useGame.setState({ money: PAINT_PRICE - 1 });
    g().paint('roof', g().style.roof + 1);
    expect(g().money).toBe(PAINT_PRICE - 1);
  });
});
