import { describe, it, expect } from 'vitest';
import { franchisePayoff } from '../data/franchisePayoff';
import { BRAND_FRANCHISE_CLOSE_WEEKS, BRAND_FRANCHISE_SLOTS, franchiseIncome, type BrandState, type FranchiseState } from '../data/brand';

const base: BrandState = {
  rep: 80, franchises: [], franchiseDue: {}, repLog: [], lines: [], workshop: { bought: 0, staff: 0 },
} as unknown as BrandState;

const fr = (id: string, health: number, missedWeeks = 0): FranchiseState => {
  const slots = BRAND_FRANCHISE_SLOTS;
  const def = slots.find((x) => x.id === id)!;
  return { id: def.id, openedDay: 1, health, missedWeeks };
};

describe('franchisePayoff — góc nhìn tuần + độ an toàn từng điểm', () => {
  it('không có điểm: rỗng, headline báo chưa mở', () => {
    const p = franchisePayoff(base);
    expect(p.rows).toHaveLength(0);
    expect(p.totalWeek).toBe(0);
    expect(p.headline).toContain('Chưa mở');
  });

  it('một điểm khoẻ: thu nhập tuần = phí/đêm × 7, weeksToClose = 3', () => {
    const b: BrandState = { ...base, franchises: [fr('pho_co', 100)] };
    const p = franchisePayoff(b);
    const f = p.rows[0];
    expect(f.incomeWeek).toBe(franchiseIncome(100, 80, 1, 1) * 7);
    expect(f.weeksToClose).toBe(3);
    expect(f.line).not.toContain('ĐÓNG'); // chưa thiếu tuần nào
  });

  it('điểm thiếu hàng: đếm đúng số tuần còn trước khi đóng', () => {
    const b: BrandState = { ...base, franchises: [fr('pho_co', 40, 2)] };
    const p = franchisePayoff(b);
    expect(p.rows[0].weeksToClose).toBe(BRAND_FRANCHISE_CLOSE_WEEKS - 2); // 1
    expect(p.rows[0].line).toContain('còn 1 tuần nữa là ĐÓNG');
  });

  it('nhiều điểm: tổng tuần cộng dồn, tỉ lệ thuận sức khoẻ', () => {
    const b: BrandState = {
      ...base,
      franchises: [fr('pho_co', 100), fr('thanh_pho', 100)],
    };
    const p = franchisePayoff(b);
    expect(p.rows).toHaveLength(2);
    expect(p.totalWeek).toBe(p.rows[0].incomeWeek + p.rows[1].incomeWeek);
    // size 2.4 (thành phố) thu nhiều hơn size 1 (phố cổ) cùng sức khoẻ
    expect(p.rows[1].incomeWeek).toBeGreaterThan(p.rows[0].incomeWeek);
  });

  it('tất định: cùng state → cùng kết quả', () => {
    const b: BrandState = { ...base, franchises: [fr('pho_huyen', 60, 1)] };
    expect(franchisePayoff(b)).toEqual(franchisePayoff(b));
  });
});
