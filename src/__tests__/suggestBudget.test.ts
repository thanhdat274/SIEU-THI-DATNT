import { describe, it, expect } from 'vitest';
import { suggestBudget } from '../data/suggestBudget';

describe('Playtest P1 T5 — ngày đầu điền gợi ý giữ vốn', () => {
  it('ngày 1: tối đa 40% tiền mặt', () => {
    expect(suggestBudget(280_000, 0, 1)).toBe(112_000);
  });
  it('từ ngày 2: như cũ (tiền trừ lương)', () => {
    expect(suggestBudget(280_000, 30_000, 2)).toBe(250_000);
  });
  it('ngày 1 vẫn chừa lương nếu lương lớn hơn', () => {
    expect(suggestBudget(100_000, 90_000, 1)).toBe(10_000);
  });
});

import { describe as d2, expect as e2, it as i2 } from 'vitest';
import { suggestBudget as sb2 } from '../data/suggestBudget';
d2('suggestBudget sàn 1 thùng ngày 1 (GĐ1514)', () => {
  i2('trần 40% không thấp hơn thùng gợi ý rẻ nhất, vẫn không vượt tiền rảnh; ngày sau không đổi', () => {
    e2(sb2(300_000, 0, 1, 122_400)).toBe(122_400);
    e2(sb2(300_000, 0, 1, 90_000)).toBe(120_000);
    e2(sb2(100_000, 0, 1, 122_400)).toBe(100_000);
    e2(sb2(300_000, 0, 2, 122_400)).toBe(300_000);
  });
});

import { describe as d3, expect as e3, it as i3 } from 'vitest';
import { suggestBudget as sb3 } from '../data/suggestBudget';
d3('suggestBudget sàn trọn bộ 3 món hướng dẫn ngày 1 (GĐ1823 — review R1/R3)', () => {
  i3('vốn 360k ngày Tết: trần phải chứa đủ bộ 3 thùng (316.200đ) để banner "nhập 3 món" không thành lời dối', () => {
    const bo3Tet = 93_000 + 100_800 + 122_400; // mì + nước + bánh kẹo, giá nhập +3%
    e3(sb3(360_000, 0, 1, 93_000, bo3Tet)).toBe(bo3Tet);
  });
  i3('bộ 3 vượt tiền rảnh thì chận lại ở tiền rảnh (không đề xuất đơn âm tiền)', () => {
    e3(sb3(300_000, 0, 1, 93_000, 316_200)).toBe(300_000);
  });
  i3('ngày 2 không đổi: không có minTotal', () => {
    e3(sb3(360_000, 30_000, 2, 93_000, 316_200)).toBe(330_000);
  });
  i3('vẫn là 40% khi không truyền minTotal/minCase (giữ nguyên hành vi cũ)', () => {
    e3(sb3(360_000, 0, 1)).toBe(144_000);
  });
});
