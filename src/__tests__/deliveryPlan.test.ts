import { describe, expect, it } from 'vitest';
import { commitBonusValue, commitDeposit, reservedMissing, missingForContract, contractValue, supplyContractById } from '../data/contracts';

/** Kế hoạch giao kỳ (GĐ56): logic trạng thái hiện trên Sổ đầu ngày — thuần đọc helper dùng ở MorningPanel. */

const def = () => supplyContractById('quan_nhau')!;

describe('kế hoạch giao kỳ (MorningPanel)', () => {
  it('cam kết đủ → reservedMissing rỗng; thiếu → liệt kê đúng', () => {
    const full = { bia: 12, ngot: 10, nuoc: 8, snack: 10 };
    expect(reservedMissing(def(), full)).toEqual([]);
    expect(reservedMissing(def(), { bia: 12 })).toContainEqual({ id: 'ngot', need: 10 });
  });

  it('thưởng tin cậy / cọc khớp theo giá kỳ (cho nudge cam kết ở đầu ngày)', () => {
    const d = def();
    const v = contractValue(d);
    expect(commitBonusValue(d)).toBe(Math.round((v * 0.06) / 1000) * 1000);
    expect(commitDeposit(d)).toBe(Math.round((v * 0.1) / 1000) * 1000);
    expect(commitBonusValue(d)).toBeLessThan(commitDeposit(d));
  });

  it('missingForContract (chưa cam kết — nhắc thiếu từ kho chung)', () => {
    expect(missingForContract(def(), { bia: 12, ngot: 5, nuoc: 8, snack: 10 })).toContainEqual({ id: 'ngot', need: 5 });
    expect(missingForContract(def(), { bia: 12, ngot: 10, nuoc: 8, snack: 10 })).toEqual([]);
  });
});
