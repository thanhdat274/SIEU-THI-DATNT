import { beforeEach, describe, expect, it } from 'vitest';
import { comboDiscount } from '../data/combos';
import { comboDaySnapshot, noteComboDay, resetComboDay } from '../core/slices/comboDay';

const mi = { id: 'mi', price: 5000 };
const nuoc = { id: 'nuoc', price: 6000 };

// GĐ124: combo THEO NGÀY — transient, chỉ trong bộ nhớ, KHÔNG persist (KHÔNG đụng SAVE_VERSION).
// Mỗi file test chạy sandbox riêng nên reset trước mỗi case để không nhiễu nhau.
describe('comboDay — theo dõi combo theo ngày', () => {
  beforeEach(() => {
    resetComboDay();
  });

  it('chưa ghi gì → snapshot rỗng', () => {
    expect(comboDaySnapshot()).toEqual({});
  });

  it('không/thiếu byCombo → không đụng gì', () => {
    noteComboDay({}, {});
    noteComboDay({ mi_nuoc: 0 }, { mi_nuoc: 0 });
    expect(comboDaySnapshot()).toEqual({});
  });

  it('ghi 1 combo → đếm đúng số lần + tiền giảm', () => {
    // byDiscount lấy từ comboDiscount thật để khớp sum
    const r = comboDiscount(['mi_nuoc'], [mi, nuoc]);
    noteComboDay(r.byCombo, r.byDiscount);
    const s = comboDaySnapshot();
    expect(s.mi_nuoc.count).toBe(1);
    expect(s.mi_nuoc.discount).toBe(r.discount);
  });

  it('cộng dồn nhiều lần trong ngày cùng một combo', () => {
    const r = comboDiscount(['mi_nuoc'], [mi, nuoc]);
    noteComboDay(r.byCombo, r.byDiscount);
    noteComboDay(r.byCombo, r.byDiscount);
    const s = comboDaySnapshot();
    expect(s.mi_nuoc.count).toBe(2);
    expect(s.mi_nuoc.discount).toBe(r.discount * 2);
  });

  it('reset → sạch (bắt đầu ngày mới)', () => {
    const r = comboDiscount(['mi_nuoc'], [mi, nuoc]);
    noteComboDay(r.byCombo, r.byDiscount);
    expect(comboDaySnapshot().mi_nuoc).toBeTruthy();
    resetComboDay();
    expect(comboDaySnapshot()).toEqual({});
  });

  it('snapshot là bản SAO, không để lộ tham chiếu nội bộ', () => {
    const r = comboDiscount(['mi_nuoc'], [mi, nuoc]);
    noteComboDay(r.byCombo, r.byDiscount);
    const s = comboDaySnapshot();
    s.mi_nuoc.count = 999;
    const again = comboDaySnapshot();
    expect(again.mi_nuoc.count).toBe(1);
  });
});
