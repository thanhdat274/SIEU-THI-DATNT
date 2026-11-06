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
