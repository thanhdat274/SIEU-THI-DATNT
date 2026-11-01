import { describe, expect, it } from 'vitest';
import { staffEff } from '../data/staffEff';
import { workSpeed } from '../data/staffTraits';
import type { Staff, StaffRole } from '../data/staff';

/** Hiệu quả đào tạo nhân viên: soi sáng số tốc độ/lợi ích vai — thuần đọc. */

const mk = (role: StaffRole, skill: number, extra: Partial<Staff> = {}): Staff => ({
  id: 1, name: 'A', role, skill, wage: 100000, shift: 'full', trait: 'steady', ...extra,
});

describe('staffEff — hiệu quả nhân viên thấy được', () => {
  it('tốc độ khớp workSpeed (tính cách steady → thần tốc sao)', () => {
    const st = mk('cashier', 2);
    const e = staffEff(st);
    expect(e.speed).toBe(workSpeed(st));
    expect(e.speed).toBeCloseTo(1.0); // skillSpeed(2)=0.6+0.4
  });

  it('tính cách chăm chỉ nhân tốc độ 1.15', () => {
    const st = mk('cashier', 2, { trait: 'diligent' });
    expect(staffEff(st).speed).toBeCloseTo(1.15);
  });

  it('+1★ đúng phần trăm tốc độ (steady, cashier)', () => {
    const e = staffEff(mk('cashier', 2));
    expect(e.nextDeltaPct).toBe(20); // 1.0 → 1.2
  });

  it('pha chế: lợi ích theo số sao (khớp comment 5★ +50%)', () => {
    const e = staffEff(mk('bartender', 5));
    expect(e.roleBonus).toContain('50%');
  });

  it('quản lý kho & chăm sóc khách có vai), cashier không có bonus vai', () => {
    expect(staffEff(mk('warehouse_mgr', 5)).roleBonus).toContain('30%');
    expect(staffEff(mk('customer_care', 1)).roleBonus).toContain('6%');
    expect(staffEff(mk('cashier', 3)).roleBonus).toBeNull();
  });

  it('kinh nghiệm cần / giá đào tạo theo sao (expToNext=t*4, trainCost=t*60000)', () => {
    const e = staffEff(mk('cashier', 3, { exp: 5 }));
    expect(e.exp).toBe(5);
    expect(e.expNeeded).toBe(12);
    expect(e.trainCost).toBe(180000);
  });

  it('5★ = maxed, không còn +1★', () => {
    const e = staffEff(mk('cashier', 5));
    expect(e.maxed).toBe(true);
    expect(e.nextDeltaPct).toBe(0);
  });

  it('helper thuần: hai lần cùng đầu vào cho kết quả giống hệt', () => {
    const st = mk('stocker', 4, { trait: 'lazy', exp: 6 });
    expect(staffEff(st)).toEqual(staffEff(st));
  });
});
