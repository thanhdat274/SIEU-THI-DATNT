import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import { newBiz } from '../data/biz';

/** bizEndOfDay — lời chào bán mặt bằng rival: còn hạn thì giữ, hết hạn thì mất kèm tin, không rival mới. */

const stats = { revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 };
const rand = Math.random;
const night = (until: number) => {
  const s = useGame.getState();
  return bizEndOfDay({ ...s, biz: { ...newBiz(), rivalForSale: { name: 'Tiệm Cũ', price: 1000, until } } }, stats);
};

beforeEach(() => {
  useGame.setState({ ...newGameData(), day: 10, level: 1 });
  Math.random = () => 0.99;
});
afterEach(() => { Math.random = rand; });

describe('rivalForSale qua đêm', () => {
  it('còn hạn (until ≥ ngày mai): giữ lời chào, không tin', () => {
    const out = night(11);
    expect(out.biz.rivalForSale).toBeDefined();
    expect(out.news.some((n) => n.includes('Tiệm Cũ'))).toBe(false);
  });

  it('hết hạn (until < ngày mai): xoá và báo bị thuê mất', () => {
    const out = night(10);
    expect(out.biz.rivalForSale).toBeUndefined();
    expect(out.news.some((n) => n.includes('Tiệm Cũ'))).toBe(true);
  });
});
