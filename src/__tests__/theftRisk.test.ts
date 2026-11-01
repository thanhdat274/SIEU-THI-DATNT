import { describe, it, expect } from 'vitest';
import { theftRisk, THEFT_CAMERA_RETAIN, THEFT_DOG_RETAIN } from '../data/theftRisk';
import { RISK_RULES } from '../data/risks';

const CAM = RISK_RULES.theft.chance;
const PRICE = 800000;

describe('theftRisk — soi thất thoát do trộm vặt + hoàn vốn camera', () => {
  it('locked khi chưa đủ cấp mở khóa màn trộm', () => {
    const r = theftRisk({ level: 14, customers: 1000, revenue: 10_000_000, hasCamera: false, hasDog: false });
    expect(r.verdict).toBe('locked');
    expect(r.leakExposureToday).toBe(0);
    expect(r.cameraPaybackDays).toBeNull();
  });

  it('tính đúng số trộm kỳ vọng, lộ hàng/ngày và tiết kiệm của camera (bộ số tròn)', () => {
    // 1000 khách, doanh thu 10tr → giỏ trung bình 10.000đ
    const r = theftRisk({ level: 15, customers: 1000, revenue: 10_000_000, hasCamera: false, hasDog: false });
    expect(r.avgBasketRetail).toBe(10000);
    expect(r.chance).toBeCloseTo(CAM, 6);
    expect(r.expectedThievesToday).toBeCloseTo(1000 * CAM, 6); // 15
    expect(r.leakExposureToday).toBeCloseTo(15 * 10000, 2); // 150k
    expect(r.verdict).toBe('high');
    // Camera kìm còn 70% → tiết kiệm 30% mức lộ ra
    expect(r.cameraSavesPerDay).toBeCloseTo(150000 * (1 - THEFT_CAMERA_RETAIN), 2); // 45k
    expect(r.cameraPaybackDays).toBe(18); // ceil(800000/45000)
    expect(r.hasCamera).toBe(false);
  });

  it('đã lắp camera thì giảm P(trộm) và không cho hoàn vốn nữa', () => {
    const r = theftRisk({ level: 15, customers: 1000, revenue: 10_000_000, hasCamera: true, hasDog: false });
    expect(r.chance).toBeCloseTo(CAM * THEFT_CAMERA_RETAIN, 6);
    expect(r.leakExposureToday).toBeCloseTo(1000 * CAM * THEFT_CAMERA_RETAIN * 10000, 2); // 105k
    expect(r.hasCamera).toBe(true);
    expect(r.cameraSavesPerDay).toBe(0);
    expect(r.cameraPaybackDays).toBeNull();
  });

  it('chó trông tiệm giảm P(trộm) còn 45%', () => {
    const r = theftRisk({ level: 15, customers: 1000, revenue: 10_000_000, hasCamera: false, hasDog: true });
    expect(r.chance).toBeCloseTo(CAM * THEFT_DOG_RETAIN, 6);
    expect(r.cameraPaybackDays).toBeGreaterThan(30); // rò ít hơn → hoàn vốn chậm hơn
  });

  it('verdict thấp khi rò ít', () => {
    const low = theftRisk({ level: 15, customers: 200, revenue: 1_000_000, hasCamera: false, hasDog: false });
    // giỏ 5k × trộm 3 = 15k lộ/ngày
    expect(low.leakExposureToday).toBeCloseTo(200 * CAM * 5000, 2);
    expect(low.verdict).toBe('low');
    expect(low.cameraPaybackDays).toBe(Math.ceil(PRICE / (low.leakExposureToday * (1 - THEFT_CAMERA_RETAIN))));
  });

  it('giữ nguyên hằng số camera giá 800k', () => {
    expect(PRICE).toBe(800000);
  });
});
