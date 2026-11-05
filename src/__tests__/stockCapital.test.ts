/**
 * GĐ213 "Kho chôn bao nhiêu vốn" — vốn đóng băng trong tồn kho. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { stockCapital, pendingCapital } from '../data/stockCapital';

// nuoc: buy 4000. vo: buy 15000.
const priceOf = (id: string) => (id === 'nuoc' ? 6000 : 25000);

describe('GĐ213 stockCapital — vốn chôn trong kho', () => {
  it('kho rỗng → null', () => {
    expect(stockCapital({}, priceOf)).toBeNull();
  });

  it('tính tổng vốn chôn theo giá nhập + trị giá bán lẻ', () => {
    const c = stockCapital({ nuoc: 4, vo: 2 }, priceOf)!;
    expect(c).not.toBeNull();
    expect(c.kinds).toBe(2);
    // vốn: nuoc 4×4000=16000 + vo 2×15000=30000 = 46000
    expect(c.totalCost).toBe(46000);
    // bán lẻ: nuoc 4×6000=24000 + vo 2×25000=50000 = 74000
    expect(c.totalRetail).toBe(74000);
    // xếp theo vốn chôn giảm dần: vo (30000) trước
    expect(c.lines[0].id).toBe('vo');
    expect(c.lines[0].costTotal).toBe(30000);
    expect(c.lines[1].id).toBe('nuoc');
  });

  it('topN giới hạn dòng chi tiết nhưng tổng vẫn đủ', () => {
    const c = stockCapital({ nuoc: 4, vo: 2 }, priceOf, 1)!;
    expect(c.lines.length).toBe(1);
    expect(c.totalCost).toBe(46000);
    expect(c.lines[0].id).toBe('vo');
  });

  it('bỏ qua món có số lượng 0', () => {
    const c = stockCapital({ nuoc: 0, vo: 3 }, priceOf)!;
    expect(c.kinds).toBe(1);
    expect(c.totalCost).toBe(3 * 15000);
  });
});

describe('GĐ1179 pendingCapital — vốn đã chốt nhưng hàng trên đường', () => {
  const d = (items: Record<string, number>) => ({ items });

  it('không có đơn → order 0, cost/retail 0', () => {
    const p = pendingCapital([], priceOf);
    expect(p.orders).toBe(0);
    expect(p.cost).toBe(0);
    expect(p.retail).toBe(0);
    expect(p.kinds).toBe(0);
  });

  it('tính vốn giá nhập + trị giá bán lẻ theo từng đơn, đếm đơn riêng', () => {
    const p = pendingCapital([d({ nuoc: 10 }), d({ vo: 2, nuoc: 5 })], priceOf);
    expect(p.orders).toBe(2);
    expect(p.kinds).toBe(2);
    // vốn: nuoc 15×4000=60000 + vo 2×15000=30000 = 90000
    expect(p.cost).toBe(90000);
    // bán lẻ: nuoc 15×6000=90000 + vo 2×25000=50000 = 140000
    expect(p.retail).toBe(140000);
  });

  it('bỏ qua món có số lượng ≤ 0 trong đơn', () => {
    const p = pendingCapital([d({ nuoc: 4, vo: 0 })], priceOf);
    expect(p.cost).toBe(16000);
    expect(p.kinds).toBe(1);
  });

  it('khớp tổng vốn chôn = stockCapital + pendingCapital (cùng giá nhập)', () => {
    const cap = stockCapital({ nuoc: 20 }, priceOf)!;
    const p = pendingCapital([d({ vo: 5 })], priceOf);
    expect(cap.totalCost + p.cost).toBe(20 * 4000 + 5 * 15000);
  });
});
