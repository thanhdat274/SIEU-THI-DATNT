import { describe, expect, it } from 'vitest';
import { commitTry, COMMIT_DEPOSIT_CASH_RATIO, COMMIT_RESERVED_CASH_RATIO } from '../data/commitTry';
import type { SupplyContract } from '../data/contracts';

/** Contract nhỏ: các trường commitTry đọc — items dùng món có buy biết sẵn (gao buy 80000). */
const def: SupplyContract = {
  id: 'x', icon: '', title: 'x', from: '', description: '', unlock: 1, periodDays: 3,
  items: { gao: 2 }, // committedBonus/Deposit tính theo contractValue; dùng items có 1 SP cho dễ đoán
  pricePerUnit: 0.9, xp: 0,
};

// commitDeposit = round(contractValue*0.1), commitBonus = round(contractValue*0.06)
// contractValue = pricePerUnit * Σ(sell*q); gao sell=100000 → 0.9*200000=180000
// deposit=18000, bonus=10800, reservedValue = gao buy 80000*2 = 160000
describe('commitTry', () => {
  it('không đủ cọc → skip', () => {
    const r = commitTry(def, 5000);
    expect(r.verdict).toBe('skip');
    expect(r.deposit).toBeGreaterThan(0);
  });

  it('cọc chiếm ≥25% tiền mặt → tight (chật dòng tiền)', () => {
    // money=50000, deposit=18000 → share 0.36 ≥ 0.25 → tight
    const r = commitTry(def, 50000);
    expect(r.verdict).toBe('tight');
  });

  it('tiền dư giả → worth (cọc hoàn, thưởng thuần lợi)', () => {
    const r = commitTry(def, 500000);
    expect(r.verdict).toBe('worth');
  });

  it('vốn khóa ≥50% tiền mặt → tight kể cả khi cọc nhỏ', () => {
    // money=300000, reserved=160000 → 0.53 ≥ 0.5 → tight (dù share cọc 0.06)
    const r = commitTry(def, 300000);
    expect(r.verdict).toBe('tight');
  });

  it('gộp đúng cọc / thưởng / vốn khóa', () => {
    const r = commitTry(def, 999999);
    expect(r.bonus).toBeGreaterThan(0);
    expect(r.deposit).toBeLessThan(r.bonus * 2.1); // cọc ~10% > thưởng ~6% giá trị kỳ
    expect(r.reservedValue).toBe(160000);
  });

  it('hằng số ngưỡng có giá trị dùng được', () => {
    expect(COMMIT_DEPOSIT_CASH_RATIO).toBeGreaterThan(0);
    expect(COMMIT_RESERVED_CASH_RATIO).toBeGreaterThan(0);
  });
});
