/**
 * GĐ224 "Mỗi ngày gầm bao nhiêu tiền cố định?" — chi phí cố định/ngày vs doanh thu bình quân. Thuần đọc.
 */
import { describe, expect, it } from 'vitest';
import { dailyBurn } from '../data/dailyBurn';
import { rentOf } from '../data/shopTiers';
import type { Staff } from '../data/staff';

// dailyWage morning=1× → 50000; full=1.6× → 112000.
const staff: Staff[] = [
  { id: 1, name: 'A', role: 'cleaner', skill: 1, wage: 50000, shift: 'morning' },
  { id: 2, name: 'B', role: 'cashier', skill: 2, wage: 70000, shift: 'full' },
];

describe('GĐ224 dailyBurn — gánh nặng chi phí cố định/ngày', () => {
  it('tổng = lương + thuê + lãi vay + góp hụi', () => {
    const b = dailyBurn(staff, [], 0, { principal: 1_000_000, takenDay: 1, dueDay: 10 }, { daily: 30000, members: 10, startDay: 1, turnDay: 5, received: false, paidDays: 2 }, 1_000_000);
    // lương 162.000 · thuê tier0 = 20000 · lãi 8.000 · hụi 30.000 = 220.000
    expect(b.wages).toBe(162000);
    expect(b.rent).toBe(20000);
    expect(b.loanInterest).toBe(8000);
    expect(b.huiDue).toBe(30000);
    expect(b.total).toBe(220000);
  });

  it('doanh thu bình quân đủ trùm chi phí → covered, burnShare thấp', () => {
    const b = dailyBurn(staff, [], 0, null, null, 500000);
    expect(b.total).toBe(182000);
    expect(b.burnShare).toBeCloseTo(182000 / 500000, 5);
    expect(b.covered).toBe(true);
    expect(b.margin).toBe(500000 - 182000);
  });

  it('chi phí ăn gần hết doanh thu → không covered (thiếu đệm)', () => {
    const b = dailyBurn(staff, [], 0, null, null, 180000);
    expect(b.covered).toBe(false);
    expect(b.burnShare).toBeGreaterThan(0.95);
  });

  it('không nhân viên/vay/hụi → chỉ còn thuê', () => {
    const b = dailyBurn([], [], 2, null, null, 500000);
    expect(b.total).toBe(rentOf(2));
    expect(b.covered).toBe(true);
  });

  it('chưa có doanh thu bình quân → không tính burnShare', () => {
    const b = dailyBurn(staff, [], 0, null, null, 0);
    expect(b.burnShare).toBeNull();
    expect(b.covered).toBe(false);
  });
});
