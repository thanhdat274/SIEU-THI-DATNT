import { describe, it, expect } from 'vitest';
import { weekParts, WEEK_CAPS } from '../data/socialWeek';

describe('Hệ 6 — điểm thi đua tuần (socialWeek.ts)', () => {
  it('kẹp từng thành phần về trần và tổng không quá 100', () => {
    const { parts, total } = weekParts({ cleanBest: 99, happy: 100, customers: 100, ordersRecent: 999, lifeDone: 99 });
    expect(parts.clean).toBe(WEEK_CAPS.clean);
    expect(parts.satisfaction).toBe(WEEK_CAPS.satisfaction);
    expect(parts.challenge).toBe(WEEK_CAPS.challenge);
    expect(parts.life).toBe(WEEK_CAPS.life);
    expect(parts.fair).toBe(0);
    expect(total).toBeLessThanOrEqual(100);
  });

  it('không có thành tích → toàn 0', () => {
    const { parts, total } = weekParts({ cleanBest: 0, happy: 0, customers: 0, ordersRecent: 0, lifeDone: 0 });
    expect(total).toBe(0);
    expect(parts).toEqual({ clean: 0, satisfaction: 0, challenge: 0, life: 0, fair: 0 });
  });

  it('tỉ lệ khách hài lòng × 20', () => {
    const { parts } = weekParts({ cleanBest: 0, happy: 8, customers: 10, ordersRecent: 0, lifeDone: 0 });
    expect(parts.satisfaction).toBe(Math.round(0.8 * 20)); // 16
  });

  it('mỗi ngày sạch = 2 điểm, mỗi việc nhà = 3 điểm', () => {
    const { parts } = weekParts({ cleanBest: 10, happy: 0, customers: 0, ordersRecent: 0, lifeDone: 3 });
    expect(parts.clean).toBe(20);
    expect(parts.life).toBe(9);
  });
});
