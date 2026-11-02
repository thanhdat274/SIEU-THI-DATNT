import { describe, expect, it } from 'vitest';
import * as split from '../data/bizFinance';
import * as biz from '../data/biz';

describe('GĐ982 — data/bizFinance tách khỏi data/biz', () => {
  it('biz vẫn re-export cùng tham chiếu', () => {
    for (const n of ['COUNTERS', 'ADS', 'adRoi', 'loanOptions', 'loanInterest', 'HUI_OPTIONS', 'loyaltyPayoff'] as const) {
      expect(biz[n]).toBe(split[n]);
    }
  });
  it('lãi vay và gói vay theo cấp', () => {
    expect(split.loanOptions(1)).toEqual([]);
    expect(split.loanInterest(1000000)).toBeGreaterThan(0);
  });
});
