import { describe, expect, it } from 'vitest';
import { contractPortfolio } from '../data/contractPortfolio';

describe('contractPortfolio', () => {
  it('rỗng khi không có hợp đồng nào', () => {
    const r = contractPortfolio([]);
    expect(r.verdict).toBe('empty');
    expect(r.count).toBe(0);
    expect(r.netPerDayTotal).toBe(0);
  });

  it('gộp lời/ngày + vốn một kỳ của nhiều hợp đồng thật', () => {
    // Cả hai hợp đồng thật đều có lời: quan_nhau (14) + xuong_go (22)
    const r = contractPortfolio(['quan_nhau', 'xuong_go']);
    expect(r.count).toBe(2);
    expect(r.netPerDayTotal).toBeGreaterThan(0);
    expect(r.capitalPerPeriod).toBeGreaterThan(0);
    expect(r.anyLosing).toBe(false);
    expect(r.verdict).toBe('ok');
  });

  it('bỏ qua defId không tồn tại', () => {
    const r = contractPortfolio(['khong_co', 'quan_nhau']);
    expect(r.count).toBe(1);
  });

  it('tổng = Σ theo từng hợp đồng (so sánh nội bộ nhất quán)', () => {
    const one = contractPortfolio(['quan_nhau']);
    const two = contractPortfolio(['xuong_go']);
    const both = contractPortfolio(['quan_nhau', 'xuong_go']);
    expect(both.netPerDayTotal).toBeCloseTo(one.netPerDayTotal + two.netPerDayTotal, 5);
    expect(both.capitalPerPeriod).toBeCloseTo(one.capitalPerPeriod + two.capitalPerPeriod, 5);
  });

  it('giveUpPeriod ≥ 0 (nhượng lại cho khách sỉ không âm)', () => {
    const r = contractPortfolio(['quan_nhau']);
    expect(r.giveUpPeriod).toBeGreaterThanOrEqual(0);
  });
});
