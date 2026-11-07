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
