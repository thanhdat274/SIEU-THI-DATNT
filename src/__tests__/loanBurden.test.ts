/**
 * GĐ217 "Lãi vay ngốn bao nhiêu doanh thu hôm nay" — chi phí nợ vs dòng tiền. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { loanBurden } from '../data/loanBurden';

// loanInterest(p) = round(p × 0.008, hàng trăm) → p=10.000.000: 80.000đ/ngày.
describe('GĐ217 loanBurden — lãi vay ngốn bao nhiêu doanh thu', () => {
  it('lãi hôm nay = loanInterest theo gốc', () => {
    const b = loanBurden(10_000_000, 1_000_000);
    expect(b.interest).toBe(80_000);
  });

  it('% doanh thu bị lãi ăn khi có doanh thu hôm nay', () => {
    const b = loanBurden(10_000_000, 1_000_000);
    expect(b.pctOfRevenue).toBeCloseTo(8, 5);
  });

  it('lãi thấp/doanh thu cao → phần trăm nhỏ (nợ nhẹ)', () => {
    const b = loanBurden(2_000_000, 1_600_000); // lãi 16.000 / 1.600.000 = 1%
    expect(b.interest).toBe(16_000);
    expect(b.pctOfRevenue).toBeCloseTo(1, 5);
  });

  it('chưa có doanh thu → không tính được phần trăm', () => {
    const b = loanBurden(10_000_000, 0);
    expect(b.pctOfRevenue).toBeNull();
  });

  it('mỗi 1 triệu trả bớt gốc tiết kiệm ~8.000đ lãi mỗi ngày', () => {
    const b = loanBurden(10_000_000, 1_000_000);
    expect(b.interestSavedPerMillion).toBe(8_000);
  });
});
