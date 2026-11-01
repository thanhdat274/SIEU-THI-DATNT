import { describe, expect, it } from 'vitest';
import { stockTurn, STOCK_STALE_DAYS } from '../data/stockTurn';
import type { ItemHealth } from '../data/analytics';

const h = (id: string, o: Partial<ItemHealth>): ItemHealth => ({
  id, name: id, qty30: 0, profit30: 0, revenue30: 0, profit21: 0, margin: 0,
  dailyQty: 0, daysLeft: null, spoilShare: 0, lostShare: 0, abc: 'C', ...o,
});

describe('stockTurn', () => {
  it('rỗng khi không có hàng', () => {
    const r = stockTurn([], {}, {});
    expect(r.totalValue).toBe(0);
    expect(r.avgDays).toBeNull();
    expect(r.actionable).toBe(false);
  });

  it('avgDays = trung bình weighted theo giá trị (dùng gao buy 80000)', () => {
    // giá trị = have × buy; gao have 10 (buy 80000) → value 800000, daysLeft 5
    // → avgDays = 5
    const r = stockTurn([h('gao', { daysLeft: 5 })], { gao: 10 }, {});
    expect(r.avgDays).toBeCloseTo(5, 5);
    expect(r.totalValue).toBe(800000);
  });

  it('món không bán (daysLeft null) được coi là chôn → topStale', () => {
    const r = stockTurn([h('kem', { daysLeft: null })], { kem: 20 }, {});
    expect(r.topStale[0].id).toBe('kem');
    expect(r.topStale[0].daysLeft).toBeNull();
    expect(r.actionable).toBe(true);
  });

  it('món bán chậm (daysLeft ≥ ngưỡng) cộng vào topStale, xếp theo vốn', () => {
    const r = stockTurn(
      [h('gao', { daysLeft: 30 }), h('nuoc', { daysLeft: 2 })],
      { gao: 5, nuoc: 100 }, // gao: 5*80000=400k (chậm 30 ngày); nuoc: 100*4000=400k (nhanh)
      {},
    );
    expect(r.topStale.map((s) => s.id)).toContain('gao');
    expect(r.topStale.some((s) => s.id === 'nuoc')).toBe(false);
  });

  it('bỏ qua món không có hàng (have 0)', () => {
    const r = stockTurn([h('gao', { daysLeft: 5 })], {}, {});
    expect(r.totalValue).toBe(0);
    expect(r.avgDays).toBeNull();
  });

  it('hằng số ngưỡng có giá trị dùng được', () => {
    expect(STOCK_STALE_DAYS).toBeGreaterThan(0);
  });
});
