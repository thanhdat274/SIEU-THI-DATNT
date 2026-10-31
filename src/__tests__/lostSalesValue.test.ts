import { describe, expect, it } from 'vitest';
import { lostSalesValue, LOST_MIN_TOTAL, LOST_SHARE_MIN, LOST_STOCKOUT_DAYS } from '../data/lostSalesValue';
import type { ItemHealth } from '../data/analytics';

const h = (id: string, o: Partial<ItemHealth>): ItemHealth => ({
  id, name: id, qty30: 0, profit30: 0, revenue30: 0, profit21: 0, margin: 0,
  dailyQty: 0, daysLeft: null, spoilShare: 0, lostShare: 0, abc: 'C', ...o,
});

describe('lostSalesValue', () => {
  it('rỗng và không actionable khi không có món nào', () => {
    const r = lostSalesValue([]);
    expect(r.items).toHaveLength(0);
    expect(r.actionable).toBe(false);
    expect(r.totalPerDay).toBe(0);
  });

  it('bỏ qua món bán ít / ít lượt khách mất (lọc nhiễu)', () => {
    const r = lostSalesValue([h('mia', { qty30: 3, dailyQty: 1, lostShare: 0.9, profit30: 1000 })]);
    expect(r.items).toHaveLength(0);
  });

  it('tính tiền lỡ/ngày = lostDay × unitProfit', () => {
    // qty30=300, profit30=30000 → unitProfit=100; dailyQty=9; lostShare=0.25
    // lostDay = 9*0.25/0.75 = 3 → moneyLostDay = 3*100 = 300
    const r = lostSalesValue([h('gao', { qty30: 300, profit30: 30000, dailyQty: 9, lostShare: 0.25 })]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].lostDay).toBeCloseTo(3, 5);
    expect(r.items[0].unitProfit).toBe(100);
    expect(r.items[0].moneyLostDay).toBeCloseTo(300, 5);
  });

  it('gắn cờ stockout khi món đang cạn hàng (daysLeft ≤ ngưỡng)', () => {
    const r = lostSalesValue([h('gao', { qty30: 100, profit30: 10000, dailyQty: 5, lostShare: 0.4, daysLeft: 1 })]);
    expect(r.items[0].stockout).toBe(true);
    const ok = lostSalesValue([h('gao', { qty30: 100, profit30: 10000, dailyQty: 5, lostShare: 0.4, daysLeft: 8 })]);
    expect(ok.items[0].stockout).toBe(false);
  });

  it('gộp tiền lỡ thành tổng, xếp món mất nhiều nhất lên đầu', () => {
    const r = lostSalesValue([
      h('gao', { qty30: 300, profit30: 30000, dailyQty: 9, lostShare: 0.25 }),   // 300/ngày
      h('nuoc', { qty30: 200, profit30: 10000, dailyQty: 15, lostShare: 0.5 }),  // lostDay=15, unit=50 → 750/ngày
    ]);
    expect(r.items[0].id).toBe('nuoc');
    const sum = r.items.reduce((n, it) => n + it.moneyLostDay, 0);
    expect(r.totalPerDay).toBeCloseTo(sum, 5);
  });

  it('hằng số ngưỡng có giá trị dùng được', () => {
    expect(LOST_MIN_TOTAL).toBeGreaterThan(0);
    expect(LOST_SHARE_MIN).toBeGreaterThan(0);
    expect(LOST_STOCKOUT_DAYS).toBeGreaterThan(0);
  });
});
