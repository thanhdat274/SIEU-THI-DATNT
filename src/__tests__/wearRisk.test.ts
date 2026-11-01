import { describe, expect, it } from 'vitest';
import { wearRisk, WEAR_WATCH_FROM, WEAR_DANGER_CHANCE } from '../data/wearRisk';
import { repairCost, RISK_RULES } from '../data/risks';

// Dùng loại kệ thật (shelf) — repairCost tính 25% giá mua mới.
const SHELF: 'shelf' = 'shelf';

describe('wearRisk', () => {
  it('mòn dưới mốc hỏng → breakChance 0, verdict ok (hoặc watch khi đủ điều kiện bảo trì)', () => {
    const r = wearRisk(SHELF, 30, false); // < serviceFrom 40 → chưa bảo trì được → ok
    expect(r.breakChance).toBe(0);
    expect(r.verdict).toBe('ok');
    expect(r.serviceable).toBe(false);
  });

  it('từ mòn ≥ breakFrom mới có nguy cơ, đúng công thức (wear−60)×0.008', () => {
    const r = wearRisk(SHELF, 80, false);
    expect(r.breakChance).toBeCloseTo((80 - RISK_RULES.wear.breakFrom) * RISK_RULES.wear.perPoint, 5);
    expect(r.verdict).toBe('danger');
  });

  it('mòn ≥ serviceFrom → serviceable, verdict watch khi nguy cơ còn thấp', () => {
    const r = wearRisk(SHELF, 50, false); // 50 ≥ 40 → bảo trì được; (50−60)<0 → chance 0 → watch
    expect(r.serviceable).toBe(true);
    expect(r.breakChance).toBe(0);
    expect(r.verdict).toBe('watch');
  });

  it('hỏng → broken, chance 1, expectedRepairExposure = repairCost', () => {
    const r = wearRisk(SHELF, 90, true);
    expect(r.broken).toBe(true);
    expect(r.breakChance).toBe(1);
    expect(r.verdict).toBe('broken');
    expect(r.expectedRepairExposure).toBe(repairCost(SHELF));
    expect(r.repairCost).toBe(repairCost(SHELF));
  });

  it('expectedRepairExposure = chance × repairCost, kẹp mòn 0–100', () => {
    const r = wearRisk(SHELF, 120, false); // bị kẹp về 100 → chance = (100−60)*0.008 = 0.32
    expect(r.wear).toBe(100);
    expect(r.breakChance).toBeCloseTo(0.32, 5);
    expect(r.expectedRepairExposure).toBeCloseTo(0.32 * repairCost(SHELF), 5);
  });

  it('hằng số ngưỡng có giá trị dùng được', () => {
    expect(WEAR_WATCH_FROM).toBe(40);
    expect(WEAR_DANGER_CHANCE).toBe(0.1);
  });
});
