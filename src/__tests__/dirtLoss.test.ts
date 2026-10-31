import { describe, it, expect } from 'vitest';
import { dirtLoss } from '../data/dirtLoss';
import { DIRT_VISIT_PENALTY } from '../data/staff';

describe('dirtLoss — định lượng tổn thất khách/tiền do sàn bẩn', () => {
  // customersPerDay(20) = 20 + 20*4 = 100
  it('bẩn 50% ở cấp 20 → mất 20 khách/ngày, danger', () => {
    const r = dirtLoss({ dirt: 50, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.dirtFactor).toBeCloseTo(1 - 0.5 * DIRT_VISIT_PENALTY, 6); // 0.8
    expect(r.lostFraction).toBeCloseTo(0.5 * DIRT_VISIT_PENALTY, 6); // 0.2
    expect(r.lostKhachPerDay).toBeCloseTo(20, 6); // 100 × 0.2
    expect(r.avgPerVisit).toBe(20_000);
    expect(r.moneyLostPerDay).toBe(400_000);
    expect(r.verdict).toBe('danger');
  });

  it('bẩn 25% → mất 10 khách/ngày, warn', () => {
    const r = dirtLoss({ dirt: 25, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.lostKhachPerDay).toBeCloseTo(100 * (0.25 * DIRT_VISIT_PENALTY), 6); // 10
    expect(r.verdict).toBe('warn');
  });

  it('bẩn nhẹ 5% → mất 2 khách, clean', () => {
    const r = dirtLoss({ dirt: 5, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.lostKhachPerDay).toBeCloseTo(2, 6);
    expect(r.verdict).toBe('clean');
  });

  it('sàn sạch → không mất khách', () => {
    const r = dirtLoss({ dirt: 0, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.dirtFactor).toBe(1);
    expect(r.lostFraction).toBe(0);
    expect(r.moneyLostPerDay).toBe(0);
    expect(r.verdict).toBe('clean');
  });

  it('bẩn tối đa 100% → mất tối đa 40% lượt, vẫn không vượt attendance', () => {
    const r = dirtLoss({ dirt: 100, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.lostFraction).toBeCloseTo(DIRT_VISIT_PENALTY, 6);
    expect(r.lostKhachPerDay).toBeCloseTo(40, 6);
    expect(r.dirtFactor).toBeCloseTo(0.6, 6);
  });
});
