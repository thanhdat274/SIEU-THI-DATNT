import { describe, it, expect } from 'vitest';
import { maintenancePayoff, MAINT_PRICE, MAINT_UNLOCK } from '../data/maintenancePayoff';
import { repairCost, RISK_RULES } from '../data/risks';

const w = RISK_RULES.wear; // breakFrom 60, perPoint 0.008
// breakChance tại mức mòn = (wear − 60) × 0.008
const breakChance = (wear: number) => Math.max(0, Math.min(1, (wear - w.breakFrom) * w.perPoint));

describe('maintenancePayoff (GĐ1190) — rủi ro tiền sửa kệ/đêm + hoàn vốn hợp đồng bảo trì', () => {
  it('locked khi chưa đủ cấp mở khóa hợp đồng', () => {
    const r = maintenancePayoff({
      level: MAINT_UNLOCK - 1,
      furniture: [{ type: 'shelf', wear: 100, broken: false }],
      hasContract: false,
    });
    expect(r.verdict).toBe('locked');
    expect(r.nightlyRepairSpend).toBe(0);
    expect(r.paybackDays).toBeNull();
  });

  it('tính đúng Σ breakChance × repairCost và hoàn vốn hợp đồng (bộ số tròn)', () => {
    const rcShelf = repairCost('shelf');   // 150k ×25% = 37.500 → làm tròn 38.000
    const rcFridge = repairCost('fridge'); // 400k ×25% = 100.000
    // kệ mòn 60 → breakChance 0; tủ mát mòn 100 → 0.32; chậu cây không hao mòn → bỏ qua
    const r = maintenancePayoff({
      level: 18,
      furniture: [
        { type: 'shelf', wear: 60, broken: false },
        { type: 'fridge', wear: 100, broken: false },
        { type: 'plant', wear: 100, broken: false },
      ],
      hasContract: false,
    });
    expect(r.nbWearing).toBe(2); // plant không hao mòn
    expect(r.expectedBreaksPerNight).toBeCloseTo(0 + breakChance(100), 6);
    expect(r.nightlyRepairSpend).toBeCloseTo(0 * rcShelf + breakChance(100) * rcFridge, 2);
    expect(r.savingPerDay).toBeCloseTo(r.nightlyRepairSpend, 2);
    expect(r.paybackDays).toBe(Math.ceil(MAINT_PRICE / r.nightlyRepairSpend));
    expect(r.hasContract).toBe(false);
  });

  it('đã ký hợp đồng → không còn đề xuất tiết kiệm, payback null', () => {
    const r = maintenancePayoff({
      level: 18,
      furniture: [{ type: 'fridge', wear: 100, broken: false }],
      hasContract: true,
    });
    expect(r.savingPerDay).toBe(0);
    expect(r.paybackDays).toBeNull();
    expect(r.hasContract).toBe(true);
  });

  it('bỏ qua đồ đang hỏng (tiền đã chìm, không phải rủi ro qua đêm)', () => {
    const rcShelf = repairCost('shelf');
    const r = maintenancePayoff({
      level: 18,
      furniture: [{ type: 'shelf', wear: 100, broken: true }, { type: 'shelf', wear: 100, broken: false }],
      hasContract: false,
    });
    expect(r.nbWearing).toBe(1);
    expect(r.nightlyRepairSpend).toBeCloseTo(breakChance(100) * rcShelf, 2);
  });

  it('giữ nguyên hằng số giá hợp đồng 1.8tr', () => {
    expect(MAINT_PRICE).toBe(1800000);
  });
});
