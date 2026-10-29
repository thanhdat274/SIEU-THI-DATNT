/**
 * GĐ219 "Tiền mặt đủ trả lương cuối ngày chưa?" — quỹ lương vs tiền mặt hiện tại. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { payrollRunway } from '../data/payrollRunway';

describe('GĐ219 payrollRunway — tiền mặt vs quỹ lương tối nay', () => {
  it('tiền mặt đủ trả lương → covered, không thiếu', () => {
    const p = payrollRunway(500_000, 162_000);
    expect(p.covered).toBe(true);
    expect(p.shortfall).toBe(0);
  });

  it('thiếu lương → covered false, shortfall đúng số thiếu, runway 0', () => {
    const p = payrollRunway(100_000, 162_000);
    expect(p.covered).toBe(false);
    expect(p.shortfall).toBe(62_000);
    expect(p.runwayDays).toBe(0);
  });

  it('runwayDays = tiền mặt đủ cho mấy ngày lương', () => {
    const p = payrollRunway(486_000, 162_000);
    expect(p.runwayDays).toBe(3);
  });

  it('không có lương (chưa thuê ai) → tự đủ, không quỹ', () => {
    const p = payrollRunway(0, 0);
    expect(p.covered).toBe(true);
    expect(p.runwayDays).toBeNull();
  });

  it('lương nhỏ hơn tiền mặt → runway ≥ 1', () => {
    const p = payrollRunway(400_000, 100_000);
    expect(p.covered).toBe(true);
    expect(p.runwayDays).toBe(4);
  });
});
