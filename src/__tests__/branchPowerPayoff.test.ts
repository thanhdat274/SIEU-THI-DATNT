/**
 * GĐ1310 — test THUẦN cho `branchPowerPayoff` (hoàn vốn bậc 'efficient' — tủ tiết kiệm điện 2,5tr,
 * giảm 35% hóa đơn điện mỗi ngày). Không đổi state/kinh tế/save; co-op an toàn (không import store).
 * Chỉ soi bậc DETERMINISTIC; generator (mất điện ngẫu nhiên) không bịa hoàn vốn.
 */
import { describe, expect, it } from 'vitest';
import { EFFICIENT_MUL, branchPowerBill, newBranch } from '../data/branches';
import { branchPowerPayoff } from '../data/branchPowerPayoff';

describe('branchPowerPayoff (GĐ1310) — hoàn vốn tủ tiết kiệm điện 2,5tr', () => {
  it('chưa lắp, không máy bán hàng → bill 164k, tiết kiệm 57.4k/ngày, hoàn 44 ngày', () => {
    const b = newBranch(); // vendingEnabled false, power undefined
    expect(branchPowerBill(b)).toBe(164_000); // 6 fridge×12k + 2 freezer×18k + 2 đồ nóng×8k + base 40k
    const r = branchPowerPayoff(b);
    expect(r.efficient).not.toBeNull();
    expect(r.efficient!.price).toBe(2_500_000);
    expect(r.efficient!.savingPerDay).toBe(Math.round(164_000 * 0.35)); // 57400
    expect(r.efficient!.payback).toBe(44); // ceil(2.5e6/57400)
    expect(r.line).toContain('35%');
    expect(r.line).toContain('hoàn 44 ngày');
  });

  it('chưa lắp + máy bán hàng bật → bill 174k, tiết kiệm 60.9k/ngày, hoàn 42 ngày', () => {
    const b = newBranch();
    b.vendingEnabled = true;
    expect(branchPowerBill(b)).toBe(174_000);
    const r = branchPowerPayoff(b);
    expect(r.efficient!.savingPerDay).toBe(60_900);
    expect(r.efficient!.payback).toBe(42); // ceil(2.5e6/60900)
  });

  it('đã lắp efficient → không lải nhải (efficient null, line null)', () => {
    const b = newBranch();
    b.power = ['efficient'];
    const r = branchPowerPayoff(b);
    expect(r.efficient).toBeNull();
    expect(r.line).toBeNull();
  });

  it('KHÔNG bịa số — saving khớp branchPowerBill × (1 − EFFICIENT_MUL)', () => {
    const b = newBranch();
    b.vendingEnabled = true;
    const r = branchPowerPayoff(b);
    expect(r.efficient!.savingPerDay).toBe(Math.round(branchPowerBill(b) * (1 - EFFICIENT_MUL)));
  });

  it('bậc generator KHÔNG được soi hoàn vốn (mất điện ngẫu nhiên — không bịa)', () => {
    // branch chỉ có generator (không efficient): helper chỉ trả efficient, không bịa generator.
    const b = newBranch();
    b.power = ['generator'];
    const r = branchPowerPayoff(b);
    expect(r.efficient).not.toBeNull(); // vẫn soi efficient (chưa lắp)
    expect(r.line).not.toContain('Máy phát');
  });

  it('dòng ≤90 code point', () => {
    const r = branchPowerPayoff(newBranch());
    expect([...(r.line ?? '')].length).toBeLessThanOrEqual(90);
  });

  it('THUẦN deterministic — cùng input cho cùng kết quả', () => {
    const a = branchPowerPayoff(newBranch());
    const bb = branchPowerPayoff(newBranch());
    expect(a).toEqual(bb);
  });
});
