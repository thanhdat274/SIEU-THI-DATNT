import { describe, expect, it } from 'vitest';
import { isWeekend } from '../data/calendar';
import { BRANCH_WEEKEND_NIGHT_MUL, branchWeekendMul } from '../data/branches';

/** GĐ532 — đêm cuối tuần tiện lợi đông khách hơn. */
describe('branchWeekendMul', () => {
  const we = Array.from({ length: 14 }, (_, i) => i + 1).find(isWeekend)!;
  const wd = Array.from({ length: 14 }, (_, i) => i + 1).find((d) => !isWeekend(d))!;
  it('chỉ đêm (22h–6h) cuối tuần mới ×1,3', () => {
    expect(branchWeekendMul(we, 23 * 60)).toBe(BRANCH_WEEKEND_NIGHT_MUL);
    expect(branchWeekendMul(we, 2 * 60)).toBe(BRANCH_WEEKEND_NIGHT_MUL);
    expect(branchWeekendMul(we, 12 * 60)).toBe(1);
    expect(branchWeekendMul(wd, 23 * 60)).toBe(1);
  });
});
