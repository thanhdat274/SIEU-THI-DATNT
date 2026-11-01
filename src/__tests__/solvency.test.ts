/**
 * GĐ214 "Tối nay có đáy không?" — cân đối thanh khoản vs nợ. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { solvency } from '../data/solvency';
import type { Loan, Hui } from '../data/biz';

const priceOf = (id: string) => (id === 'nuoc' ? 6000 : 25000);
const loan = (principal: number): Loan => ({ principal, takenDay: 1, dueDay: 31 });
const hui = (daily: number): Hui => ({ daily, members: 10, startDay: 1, turnDay: 10, received: false, paidDays: 2 });

describe('GĐ214 solvency — cân đối thanh khoản', () => {
  it('không nợ → cover, không lãi, margin = tài sản lỏng', () => {
    const s = solvency({ money: 500000, storage: { nuoc: 4 }, priceOf, loan: null, hui: null, day: 10 });
    expect(s.loanPrincipal).toBe(0);
    expect(s.loanInterestToday).toBe(0);
    expect(s.huiDueToday).toBe(0);
    expect(s.stockRetail).toBe(4 * 6000);
    expect(s.liquid).toBe(500000 + 24000);
    expect(s.cover).toBe(true);
    expect(s.margin).toBe(s.liquid);
    expect(s.daysToLoanDue).toBeNull();
  });

  it('đủ trang trải nợ gốc bằng bán hết kho + tiền mặt → cover', () => {
    // nợ 3tr, tiền 1tr, kho lẻ nuoc 4×6000=24000 + vo 2×25000=50000 → liquid 1.074.000 < 3tr → false
    const s = solvency({ money: 1000000, storage: { nuoc: 4, vo: 2 }, priceOf, loan: loan(3000000), hui: null, day: 10 });
    expect(s.liabilities).toBe(3000000);
    expect(s.liquid).toBe(1000000 + 24000 + 50000);
    expect(s.cover).toBe(false);
    expect(s.margin).toBe(s.liquid - 3000000);
    // lãi: 3tr × 0.008 = 24000
    expect(s.loanInterestToday).toBe(24000);
    expect(s.daysToLoanDue).toBe(21);
  });

  it('lãi vay làm tròn trăm đúng loanInterest', () => {
    const s = solvency({ money: 0, storage: {}, priceOf, loan: loan(10000000), hui: null, day: 1 });
    expect(s.loanInterestToday).toBe(Math.round((10000000 * 0.008) / 100) * 100); // 80000
    expect(s.cover).toBe(false);
  });

  it('góp hụi tính vào dòng tiền ra hằng ngày (đang góp chưa hốt)', () => {
    const s = solvency({ money: 50000, storage: {}, priceOf, loan: null, hui: hui(30000), day: 5 });
    expect(s.huiDueToday).toBe(30000);
    expect(s.loanPrincipal).toBe(0); // hụi không phải nợ gốc
    expect(s.cover).toBe(true);
  });

  it('đã hốt hụi thì không còn góp hằng ngày', () => {
    const h: Hui = { ...hui(100000), received: true };
    const s = solvency({ money: 100000, storage: {}, priceOf, loan: null, hui: h, day: 12 });
    expect(s.huiDueToday).toBe(0);
  });
});
