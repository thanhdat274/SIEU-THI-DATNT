import { describe, it, expect } from 'vitest';
import { counterfeitRisk, COINFAKE_UNLOCK } from '../data/counterfeitRisk';
import { RISK_RULES } from '../data/risks';

const CF = RISK_RULES.counterfeit; // chance 0.01, notes [10k,20k,50k,100k], detect 0.55, bonus 0.35

describe('counterfeitRisk (GĐ1189) — soi thất thoát vì tiền giả + giá trị Mắt tinh', () => {
  it('locked khi chưa đủ cấp mở cửa màn tiền giả', () => {
    const r = counterfeitRisk({ level: COINFAKE_UNLOCK - 1, customers: 1000, revenue: 10_000_000, hasSharpEye: false, fakeCash: 0 });
    expect(r.verdict).toBe('locked');
    expect(r.leakPerDay).toBe(0);
    expect(r.sharpEyeSavesPerDay).toBe(0);
  });

  it('ước lượng đúng số lần tiền giả + mệnh giá kỳ vọng (đủ 4 mệnh giá ≤ giỏ trung bình)', () => {
    // 1000 khách, doanh thu 100tr → giỏ trung bình 100.000 ≥ mệnh giá lớn nhất → mean(10k,20k,50k,100k)=45k
    const r = counterfeitRisk({ level: 20, customers: 1000, revenue: 100_000_000, hasSharpEye: false, fakeCash: 0 });
    expect(r.avgBasketRetail).toBe(100000);
    expect(r.avgNote).toBe(45000);
    expect(r.attemptsPerDay).toBeCloseTo(1000 * CF.chance, 6); // 10 lần
    // leak không Mắt tinh = 10 × 45k × (1 − 0.55) = 202.500
    expect(r.leakPerDay).toBeCloseTo(10 * 45000 * (1 - CF.detect), 2);
    // Mắt tinh chặn thêm = 10 × 45k × 0.35 = 157.500
    expect(r.sharpEyeSavesPerDay).toBeCloseTo(10 * 45000 * CF.sharpEyeBonus, 2);
    expect(r.verdict).toBe('high');
  });

  it('Mắt tinh đã học → detect cao hơn, rò thực tế thấp và không còn đề xuất tiết kiệm', () => {
    const r = counterfeitRisk({ level: 25, customers: 1000, revenue: 100_000_000, hasSharpEye: true, fakeCash: 50000 });
    expect(r.detect).toBeCloseTo(CF.detect + CF.sharpEyeBonus, 6); // 0.90
    expect(r.leakPerDay).toBeCloseTo(10 * 45000 * (1 - (CF.detect + CF.sharpEyeBonus)), 2); // 45k
    expect(r.sharpEyeSavesPerDay).toBe(0);
    expect(r.hasSharpEye).toBe(true);
    expect(r.fakeCashToday).toBe(50000);
    // có Mắt tinh → rò ít hơn mức không có (202k)
    expect(r.leakPerDay).toBeLessThan(202500);
  });

  it('giỏ nhỏ hơn mệnh giá — lọc bớt mệnh giá không khớp', () => {
    // giỏ trung bình 20k → 2 mệnh giá 10k,20k khớp → mean 15k
    const r = counterfeitRisk({ level: 20, customers: 1000, revenue: 20_000_000, hasSharpEye: false, fakeCash: 0 });
    expect(r.avgBasketRetail).toBe(20000);
    expect(r.avgNote).toBe(15000);
  });
});
