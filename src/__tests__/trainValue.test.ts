/**
 * GĐ223 "Đào tạo nhân viên có đáng không?" — đổi hiệu quả đào tạo thành tiền/ngày + ngày hoà vốn. Thuần đọc.
 */
import { describe, expect, it } from 'vitest';
import { trainValue, TRAIN_EXP_PER_SESSION } from '../data/trainValue';
import type { StaffEff } from '../data/staffEff';

// eff giả: nextDeltaPct=10%, expNeeded=20 (→ 5 buổi), trainCost=60000 → cost 300.000.
const eff = (over: Partial<StaffEff>): StaffEff => ({
  speed: 1, nextDeltaPct: 10, roleBonus: null, exp: 0, expNeeded: 20,
  trainCost: 60000, maxed: false, ...over,
});

describe('GĐ223 trainValue — đào tạo đáng không theo tiền', () => {
  it('số buổi = ceil(expNeeded/4), costToNext = số buổi × giá buổi', () => {
    const t = trainValue(200000, eff({}));
    expect(t.sessions).toBe(Math.ceil(20 / TRAIN_EXP_PER_SESSION));
    expect(t.costToNext).toBe(t.sessions * 60000);
  });

  it('mức tăng/ngày = giá trị ngày × % tăng tốc → hoà vốn ≤14 ngày → worth', () => {
    // value 200.000, +10% → +20.000/ngày; cost 300.000 → 15 ngày (>14 → worth=false)
    const t = trainValue(200000, eff({}));
    expect(t.valueGainPerDay).toBe(20000);
    expect(t.paybackDays).toBe(15);
    expect(t.worth).toBe(false);
  });

  it('giá trị ngày cao / chi phí nhỏ → hoà vốn nhanh, worth', () => {
    // value 500.000, +10% → +50.000/ngày; cost còn 120.000 (2 buổi) → 3 ngày
    const t = trainValue(500000, eff({ expNeeded: 8, trainCost: 60000 }));
    expect(t.valueGainPerDay).toBe(50000);
    expect(t.costToNext).toBe(120000);
    expect(t.paybackDays).toBe(3);
    expect(t.worth).toBe(true);
  });

  it('chưa có dữ liệu ngày (value=0) → không ước được hoà vốn', () => {
    const t = trainValue(0, eff({}));
    expect(t.valueGainPerDay).toBe(0);
    expect(t.paybackDays).toBeNull();
    expect(t.worth).toBe(false);
  });

  it('đã 5★ tối đa → không có mục để đào tạo', () => {
    const t = trainValue(200000, eff({ maxed: true }));
    expect(t.maxed).toBe(true);
    expect(t.paybackDays).toBeNull();
  });
});
