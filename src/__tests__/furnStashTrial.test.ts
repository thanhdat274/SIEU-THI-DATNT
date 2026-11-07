import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { furnitureDef } from '../data/furniture';
import { snapshot } from '../core/save';
import { PRODUCTS } from '../data/products';

/** Kho đồ nội thất (cất/lấy ra miễn phí) và dùng thử đồ trước khi mua. */
const g = () => useGame.getState();
const PID = PRODUCTS[0].id;
const price = furnitureDef('shelf').price;

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 1_000_000, furniture: [], furnStash: {}, level: 50, buildMode: true });
});

describe('cất kho đồ', () => {
  it('cất: không hoàn tiền, đồ vào kho đồ, hàng trên kệ về kho hàng', () => {
    g().placeFurniture('shelf', 0, 0, 0);
    const uid = g().furniture[0].uid;
    useGame.setState({ furniture: g().furniture.map((f) => ({ ...f, tiers: f.tiers.map((t, i) => (i === 0 ? { productId: PID, count: 3 } : t)) })) });
    const money = g().money;
    const before = g().storage[PID] ?? 0;
    g().stashFurniture(uid);
    expect(g().money).toBe(money);
    expect(g().furniture).toHaveLength(0);
    expect(g().furnStash.shelf).toBe(1);
    expect(g().storage[PID]).toBe(before + 3);
  });

  it('lấy ra đặt: miễn phí, trừ kho đồ; hết thì không đặt được', () => {
    useGame.setState({ furnStash: { shelf: 1 } });
    const money = g().money;
    expect(g().placeFromStash('shelf', 1, 1, 0)).toBe(true);
    expect(g().money).toBe(money);
    expect(g().furnStash.shelf).toBeUndefined();
    expect(g().placeFromStash('shelf', 2, 1, 0)).toBe(false);
    expect(g().furniture).toHaveLength(1);
  });

  it('kho đồ được lưu vào save', () => {
    useGame.setState({ furnStash: { shelf: 2 } });
    expect(snapshot().furnStash).toEqual({ shelf: 2 });
  });
});

describe('dùng thử', () => {
  it('đặt thử không trừ tiền, không lưu vào save', () => {
    const money = g().money;
    g().placeTrial('shelf', 0, 0, 0);
    expect(g().money).toBe(money);
    expect(g().furniture[0].trial).toBe(true);
    expect(snapshot().furniture).toHaveLength(0);
  });

  it('mua hết: trừ đúng tổng giá, bỏ cờ thử', () => {
    g().placeTrial('shelf', 0, 0, 0);
    g().placeTrial('shelf', 2, 0, 0);
    expect(g().buyTrials()).toBe(true);
    expect(g().money).toBe(1_000_000 - 2 * price);
    expect(g().furniture.every((f) => !f.trial)).toBe(true);
  });

  it('thiếu tiền: không mua, đồ vẫn đang thử', () => {
    useGame.setState({ money: price - 1 });
    g().placeTrial('shelf', 0, 0, 0);
    expect(g().buyTrials()).toBe(false);
    expect(g().furniture[0].trial).toBe(true);
  });

  it('thoát chế độ xây: dỡ đồ thử, giữ đồ đã mua', () => {
    g().placeFurniture('shelf', 0, 0, 0);
    g().placeTrial('shelf', 2, 0, 0);
    g().setBuildMode(false);
    expect(g().furniture).toHaveLength(1);
    expect(g().furniture[0].trial).toBeUndefined();
  });

  it('bán đồ đang thử không được hoàn tiền', () => {
    g().placeTrial('shelf', 0, 0, 0);
    const money = g().money;
    g().sellFurniture(g().furniture[0].uid);
    expect(g().money).toBe(money);
  });
});
