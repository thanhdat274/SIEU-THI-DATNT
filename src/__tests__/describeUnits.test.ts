import { describe, expect, it } from 'vitest';
import { caseSize, casesFor, describeUnits } from '../data/products';

describe('describeUnits — mô tả số món theo "thùng + lẻ" cho nhập hàng (GĐ254)', () => {
  it('caseSize theo ghi chú: gao 4 / nuoc 24 / thit_bo_nhat (đắt quá) 1', () => {
    expect(caseSize('gao')).toBe(4);
    expect(caseSize('nuoc')).toBe(24);
    expect(caseSize('thit_bo_nhat')).toBe(1);
  });

  it('units ≤ 0 → "hết"', () => {
    expect(describeUnits('gao', 0)).toBe('hết');
    expect(describeUnits('gao', -3)).toBe('hết');
  });

  it('tròn thùng (full, không lẻ) → "N thùng"', () => {
    expect(describeUnits('gao', 4)).toBe('1 thùng'); // 4 = 1×4
    expect(describeUnits('gao', 8)).toBe('2 thùng');
    expect(describeUnits('nuoc', 48)).toBe('2 thùng'); // 48 = 2×24
  });

  it('thùng + lẻ → "N thùng + M lẻ"', () => {
    expect(describeUnits('gao', 10)).toBe('2 thùng + 2 lẻ'); // 10 = 2×4 + 2
    expect(describeUnits('nuoc', 50)).toBe('2 thùng + 2 lẻ'); // 50 = 2×24 + 2
  });

  it('chỉ lẻ (chưa đủ một thùng, size > 1) → "N lẻ"', () => {
    expect(describeUnits('gao', 2)).toBe('2 lẻ');
    expect(describeUnits('nuoc', 10)).toBe('10 lẻ');
  });

  it('thùng 1 món (size === 1) → luôn "N thùng" dù số lẻ mắt thường', () => {
    // thit_bo_nhat đắt hơn ngân sách 1 thùng → caseSize 1 → mỗi món là 1 thùng
    expect(describeUnits('thit_bo_nhat', 5)).toBe('5 thùng');
  });

  it('casesFor làm tròn lên theo số thùng (thùng khui vẫn chiếm chỗ)', () => {
    expect(casesFor('gao', 4)).toBe(1); // vừa đủ 1 thùng
    expect(casesFor('gao', 5)).toBe(2); // 4 + 1 lẻ → 2 chỗ
    expect(casesFor('nuoc', 0)).toBe(0);
    expect(casesFor('thit_bo_nhat', 3)).toBe(3); // size 1 → 3 chỗ
  });
});
