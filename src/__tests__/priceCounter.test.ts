import { describe, expect, it } from 'vitest';
import { priceCounterViability } from '../data/priceCounter';

/** GĐ1270 — soi ĐIỀU KIỆN "Đối đầu giá" (đòn phản công cần bán ≥30 món hôm nay mới kích hoạt).
 *  Helper THUẦN — chỉ ghép số từ caller (soldNow + avgItemsPerDay), không đổi state/kinh tế. */

describe('priceCounterViability — điều kiện 30 món của đòn Đối đầu giá', () => {
  it('hôm nay đã bán ≥ 30 món → đòn chắc kích hoạt (sự thật)', () => {
    const p = priceCounterViability(33, 25);
    expect(p.reached).toBe(true);
    expect(p.line).toContain('kích hoạt');
    expect(p.line).toContain('30');
  });

  it('đúng mốc 30 món → coi là đạt', () => {
    expect(priceCounterViability(30, 25).reached).toBe(true);
  });

  it('chưa đạt nhưng ngày thường ≥ 30 món → nhịp tự nhiên dễ tới mốc ("dễ đạt")', () => {
    const p = priceCounterViability(12, 48);
    expect(p.reached).toBe(false);
    expect(p.line).toContain('dễ đạt');
  });

  it('ngày thường đúng 30 món → vẫn "dễ đạt"', () => {
    expect(priceCounterViability(12, 30).line).toContain('dễ đạt');
  });

  it('ngày thường < 30 món → mốc khó, gợi cân nhắc đòn khác ("khó kích hoạt")', () => {
    const p = priceCounterViability(12, 20);
    expect(p.reached).toBe(false);
    expect(p.line).toContain('khó kích hoạt');
  });

  it('thuần — cùng đầu vào cho ra cùng kết quả (không RNG)', () => {
    expect(priceCounterViability(5, 40)).toEqual(priceCounterViability(5, 40));
  });
});
