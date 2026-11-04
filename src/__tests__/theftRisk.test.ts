import { describe, it, expect } from 'vitest';
import { theftRisk, theftCatchChance, THEFT_CAMERA_RETAIN, THEFT_DOG_RETAIN, THEFT_DOG_CATCH, THEFT_CAMERA_CATCH } from '../data/theftRisk';
import { RISK_RULES } from '../data/risks';
import { GUARD_DETECT } from '../data/staff';

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

describe('GĐ1211 — theftCatchChance: P(bắt được kẻ trộm) tách từ agents/customers.ts (sneakOut) — THUẦN QUAN SÁT, giữ nguyên công thức/hằng (Luật 3)', () => {
  // Công thức gốc: dog(0.25) + camera(0.3) + (guard ? GUARD_DETECT(0.92)
  //   : (cashier ? detectCashier(0.55) : detectNobody(0.1)) + sharpEye(0.3)?)
  it('không gì cả → chỉ quầy có người đứng: 0.55 (detectCashier)', () => {
    expect(theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: false, cashierStaffed: true, hasSharpEye: false }))
      .toBeCloseTo(RISK_RULES.theft.detectCashier, 6); // 0.55
  });

  it('không ai đứng quầy → 0.1 (detectNobody) — kẻ trộm dễ lọt nhất', () => {
    expect(theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false }))
      .toBeCloseTo(RISK_RULES.theft.detectNobody, 6); // 0.1
  });

  it('quầy có người + Mắt tinh → 0.55 + 0.3 = 0.85', () => {
    expect(theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: false, cashierStaffed: true, hasSharpEye: true }))
      .toBeCloseTo(RISK_RULES.theft.detectCashier + RISK_RULES.theft.sharpEyeBonus, 6);
  });

  it('không người + Mắt tinh → 0.1 + 0.3 = 0.4', () => {
    expect(theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: false, cashierStaffed: false, hasSharpEye: true }))
      .toBeCloseTo(RISK_RULES.theft.detectNobody + RISK_RULES.theft.sharpEyeBonus, 6);
  });

  it('bảo vệ trực → 0.92 (GUARD_DETECT), Mắt tinh KHÔNG cộng thêm (nhánh guard thay cả cashier/sharpEye)', () => {
    expect(theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: true, cashierStaffed: true, hasSharpEye: true }))
      .toBe(GUARD_DETECT); // 0.92
  });

  it('chó trông tiệm +0.25 (bắt trộm, khác hằng giảm P trộm THEFT_DOG_RETAIN 0.45)', () => {
    const base = theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: false, cashierStaffed: true, hasSharpEye: false });
    expect(theftCatchChance({ hasDog: true, hasCamera: false, guardOnDuty: false, cashierStaffed: true, hasSharpEye: false }))
      .toBeCloseTo(base + THEFT_DOG_CATCH, 6);
    expect(THEFT_DOG_CATCH).toBe(0.25);
  });

  it('camera +0.3 — bắt được kể cả không ai đứng quầy (0.1 + 0.3 = 0.4)', () => {
    expect(theftCatchChance({ hasDog: false, hasCamera: true, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false }))
      .toBeCloseTo(RISK_RULES.theft.detectNobody + THEFT_CAMERA_CATCH, 6); // 0.4
  });

  it('chó + camera (không người) → 0.25 + 0.3 + 0.1 = 0.65', () => {
    expect(theftCatchChance({ hasDog: true, hasCamera: true, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false }))
      .toBe(0.65);
  });

  it('đủ dog+camera+bảo vệ → 1.47 (vượt 1 → bắt chắc chắn, GIỮ NGUYÊN không clamp như bản gốc)', () => {
    expect(theftCatchChance({ hasDog: true, hasCamera: true, guardOnDuty: true, cashierStaffed: true, hasSharpEye: true }))
      .toBeCloseTo(GUARD_DETECT + THEFT_DOG_CATCH + THEFT_CAMERA_CATCH, 6); // 1.47
  });
});
