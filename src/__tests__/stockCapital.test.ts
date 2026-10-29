/**
 * GĐ213 "Kho chôn bao nhiêu vốn" — vốn đóng băng trong tồn kho. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { stockCapital } from '../data/stockCapital';

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
