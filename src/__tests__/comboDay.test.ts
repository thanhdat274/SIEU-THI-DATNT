import { beforeEach, describe, expect, it } from 'vitest';
import { comboById, comboDiscount, COMBOS, liveWeakCombo } from '../data/combos';
import { productById } from '../data/products';
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

describe('liveWeakCombo — combo hôm nay "chết slot" (GĐ1242)', () => {
  it('có sự phân hoá: combo yếu nhất 0 lượt, combo khác đã bán → báo kẻ yếu', () => {
    const r = liveWeakCombo(['mi_nuoc', 'banh_ngot'], { mi_nuoc: { count: 3, discount: 3000 }, banh_ngot: { count: 0, discount: 0 } });
    expect(r).toEqual({ id: 'banh_ngot', count: 0 });
  });

  it('chỉ 1 combo đang chạy → null (không có kẻ yếu để so)', () => {
    expect(liveWeakCombo(['mi_nuoc'], { mi_nuoc: { count: 0, discount: 0 } })).toBeNull();
  });

  it('chưa combo nào bán (đầu ngày) → null (không ồn)', () => {
    const r = liveWeakCombo(['mi_nuoc', 'banh_ngot'], { mi_nuoc: { count: 0, discount: 0 }, banh_ngot: { count: 0, discount: 0 } });
    expect(r).toBeNull();
  });

  it('mọi combo cùng bán → null (không có kẻ thật yếu)', () => {
    const r = liveWeakCombo(['mi_nuoc', 'banh_ngot'], { mi_nuoc: { count: 2, discount: 1 }, banh_ngot: { count: 1, discount: 1 } });
    expect(r).toBeNull();
  });

  it('bỏ qua id lạ (combo không tồn tại nhưng nằm trong active)', () => {
    const r = liveWeakCombo(['mi_nuoc', 'khong_co_combo'], { mi_nuoc: { count: 2, discount: 1 } });
    expect(r).toBeNull(); // sau lọc còn 1 combo hợp lệ → không đủ 2 để so
  });

  it('thuần: cùng đầu vào ra cùng kết quả (không đổi theo state)', () => {
    const today = { mi_nuoc: { count: 3, discount: 3 }, banh_ngot: { count: 0, discount: 0 } };
    expect(liveWeakCombo(['banh_ngot', 'mi_nuoc'], today)).toEqual(liveWeakCombo(['banh_ngot', 'mi_nuoc'], today));
  });
});

describe('combo Bữa sáng cà phê + bánh mì (GĐ1243)', () => {
  it('combo mới tồn tại với đúng cặp món + giảm giá hợp lý', () => {
    const c = comboById('caphe_banhmi');
    expect(c).toBeTruthy();
    expect(c!.items).toEqual(['caphe', 'banhmi']);
    expect(c!.name).toContain('cà phê');
    expect(c!.discount).toBeGreaterThanOrEqual(0.05);
    expect(c!.discount).toBeLessThanOrEqual(0.2);
    expect(c!.cook).toBeFalsy(); // món bánh mì/cà phê thô, không cần bếp
  });

  it('mỗi combo trong COMBOS đều ghép 2 món HỢP LỆ (id có trong sản phẩm)', () => {
    for (const c of COMBOS) {
      expect(c.items).toHaveLength(2);
      for (const id of c.items) {
        const p = productById(id);
        expect(p, `combo ${c.id} tham chiếu món ${id} không tồn tại`).toBeTruthy();
      }
      expect(c.discount).toBeGreaterThan(0);
      expect(c.discount).toBeLessThan(1);
    }
  });

  it('id combo là duy nhất', () => {
    const ids = COMBOS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
