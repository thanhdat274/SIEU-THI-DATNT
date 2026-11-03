import { describe, expect, it } from 'vitest';
import * as split from '../core/bizLoan';
import * as biz from '../core/biz';

describe('GĐ978 — core/bizLoan tách khỏi core/biz', () => {
  it('biz vẫn re-export đúng hàm vay vốn và hụi', () => {
    expect(biz.takeLoan).toBe(split.takeLoan);
    expect(biz.repayLoan).toBe(split.repayLoan);
    expect(biz.joinHui).toBe(split.joinHui);
  });
});
