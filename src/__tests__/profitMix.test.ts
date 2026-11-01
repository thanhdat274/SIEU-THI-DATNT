/**
 * GĐ218 "Tháng này lời bao nhiêu, món nào gánh gần hết?" — gộp sổ lời danh mục. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { profitMix } from '../data/profitMix';
import type { ItemHealth } from '../data/analytics';

// ItemHealth chỉ dùng id/name/profit30/qty30 — lấp phần còn lại với giá trị mặc định hợp lệ.
const h = (id: string, name: string, profit30: number, qty30: number): ItemHealth => ({
  id, name, profit30, qty30,
  revenue30: profit30, profit21: profit30, margin: 0.2, dailyQty: 1,
  daysLeft: null, spoilShare: 0, lostShare: 0, abc: 'C',
});

describe('GĐ218 profitMix — gộp sổ lời danh mục', () => {
  it('tổng lời 30 ngày = Σ profit30, top xếp theo lời giảm dần (chỉ món dương)', () => {
    const list = [h('a', 'A', 30000, 30), h('b', 'B', 10000, 5), h('c', 'C', -5000, 2)];
    const m = profitMix(list);
    expect(m.totalProfit30).toBe(35000);
    expect(m.top.map((t) => t.id)).toEqual(['a', 'b']);
    expect(m.top[0].share).toBeCloseTo(30000 / 35000, 5);
  });

  it('phần lời nằm trong top — vài món gánh gần hết → topShare cao', () => {
    const list = [h('a', 'A', 40000, 40), h('b', 'B', 5000, 5), h('c', 'C', 1000, 1)];
    const m = profitMix(list, 2);
    expect(m.topShare).toBeCloseTo(45000 / 46000, 5);
  });

  it('fragile khi ≤2 món chiếm ≥60% lời (rủi ro tập trung)', () => {
    const list = [h('a', 'A', 80000, 80), h('b', 'B', 10000, 10), h('c', 'C', 5000, 5)];
    const m = profitMix(list, 2);
    expect(m.fragile).toBe(true);
  });

  it('không fragile khi lời dàn đều nhiều món', () => {
    const m = profitMix([h('a', 'A', 20, 2), h('b', 'B', 20, 2), h('c', 'C', 20, 2), h('d', 'D', 20, 2)], 2);
    expect(m.fragile).toBe(false);
  });

  it('liệt kê món đang âm và tổng lỗ', () => {
    const m = profitMix([h('a', 'A', 30000, 30), h('b', 'B', -8000, 3), h('c', 'C', -2000, 1)]);
    expect(m.negativeCount).toBe(2);
    expect(m.negativeLoss30).toBe(10000);
  });

  it('không có món lời → top rỗng, không chia 0', () => {
    const m = profitMix([h('a', 'A', -5000, 1)]);
    expect(m.totalProfit30).toBe(-5000);
    expect(m.top).toEqual([]);
    expect(m.topShare).toBe(0);
    expect(m.fragile).toBe(false);
  });
});
