import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { furnitureDef } from '../data/furniture';
import { PRODUCTS } from '../data/products';

/**
 * inventory.ts (slice) — bày hàng lên kệ / dọn về kho / khách lấy hàng / tự thay ô trống.
 * Khoá: tổng hàng kho + kệ không đổi khi bày/dọn (không sinh hay mất hàng), đổi loại trả hàng cũ về kho,
 * kệ hỏng bị bỏ qua, khách lấy từ kệ ưu tiên, lời kệ ghi nhận.
 */

const g = () => useGame.getState();
const A = PRODUCTS[0].id;
const B = PRODUCTS[1].id;
const CAP = furnitureDef('shelf').capacity;
const onShelf = (pid: string) => g().furniture.reduce((n, f) => n + f.tiers.filter((t) => t.productId === pid).reduce((m, t) => m + t.count, 0), 0);
const total = (pid: string) => (g().storage[pid] ?? 0) + onShelf(pid);

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 1_000_000, level: 50, furniture: [], storage: { [A]: 20, [B]: 20 }, deliveries: [] });
  g().placeFurniture('shelf', 0, 0, 0);
});
const uid = () => g().furniture[0].uid;

describe('stockTier / unstockTier', () => {
  it('bày hàng: lấy từ kho tối đa sức chứa ô, tổng hàng không đổi', () => {
    g().stockTier(uid(), 0, A);
    expect(g().furniture[0].tiers[0]).toMatchObject({ productId: A, count: CAP });
    expect(g().storage[A]).toBe(20 - CAP);
    expect(total(A)).toBe(20);
  });

  it('kho ít hơn sức chứa: chỉ bày được số kho có', () => {
    useGame.setState({ storage: { [A]: 2 } });
    g().stockTier(uid(), 0, A);
    expect(g().furniture[0].tiers[0].count).toBe(2);
    expect(g().storage[A] ?? 0).toBe(0);
  });

  it('đổi loại hàng: trả hàng cũ về kho rồi bày hàng mới', () => {
    g().stockTier(uid(), 0, A);
    g().stockTier(uid(), 0, B);
    expect(g().furniture[0].tiers[0]).toMatchObject({ productId: B, count: CAP });
    expect(total(A)).toBe(20);
    expect(g().storage[A]).toBe(20);
    expect(total(B)).toBe(20);
  });

  it('dọn ô: hàng về kho, ô trống, tổng không đổi', () => {
    g().stockTier(uid(), 0, A);
    g().unstockTier(uid(), 0);
    expect(g().furniture[0].tiers[0].count).toBe(0);
    expect(g().storage[A]).toBe(20);
  });
});

describe('takeFromShelf', () => {
  it('khách lấy 1 món: trừ 1 trên kệ, trả giá > 0, tăng heat và lời của kệ', () => {
    g().stockTier(uid(), 0, A);
    const price = g().takeFromShelf(A, uid());
    expect(price).toBeGreaterThan(0);
    expect(g().furniture[0].tiers[0].count).toBe(CAP - 1);
    expect(g().shelfHeat[uid()]).toBe(1);
    expect(g().shelfProfit[uid()].profit).toBe(price! - PRODUCTS[0].buy);
  });

  it('không có hàng trên kệ: trả null, không đổi gì', () => {
    expect(g().takeFromShelf(A, uid())).toBeNull();
    expect(g().shelfHeat).toEqual({});
  });

  it('kệ hỏng bị bỏ qua dù còn hàng', () => {
    g().stockTier(uid(), 0, A);
    useGame.setState({ furniture: g().furniture.map((f) => ({ ...f, broken: true })) });
    expect(g().takeFromShelf(A, uid())).toBeNull();
    expect(g().furniture[0].tiers[0].count).toBe(CAP);
  });
});

describe('replaceEmptySlots / consumeStock', () => {
  it('ô hết hàng + kho hết món cũ: thay bằng món khác kho đang có', () => {
    g().stockTier(uid(), 0, A);
    useGame.setState({
      furniture: g().furniture.map((f) => ({ ...f, tiers: f.tiers.map((t, i) => (i === 0 ? { ...t, count: 0, lots: [] } : t)) })),
      storage: { [B]: 10 },
    });
    const done = g().replaceEmptySlots();
    expect(done.length).toBeGreaterThan(0);
    expect(g().furniture[0].tiers[0].productId).not.toBe(A);
    expect(g().furniture[0].tiers[0].count).toBeGreaterThan(0);
  });

  it('còn món cũ trong kho: KHÔNG thay (để tự nhập kệ lại)', () => {
    g().stockTier(uid(), 0, A);
    useGame.setState({ furniture: g().furniture.map((f) => ({ ...f, tiers: f.tiers.map((t, i) => (i === 0 ? { ...t, count: 0, lots: [] } : t)) })) });
    expect(g().replaceEmptySlots()).toEqual([]);
  });

  it('consumeStock: trừ kho, không âm', () => {
    g().consumeStock(A, 5);
    expect(g().storage[A]).toBe(15);
    g().consumeStock(A, 999);
    expect(g().storage[A] ?? 0).toBe(0);
  });
});
