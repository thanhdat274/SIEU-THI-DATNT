import { describe, expect, it } from 'vitest';
import { aheadOf, compareProgress, losesMuch } from '../core/saveCompare';

const p = (level: number, day: number, money = 0) => ({ level, day, money });

describe('so tiến độ hai bản lưu', () => {
  it('compareProgress: cấp trước, rồi ngày, rồi tiền', () => {
    expect(compareProgress(p(24, 25), p(1, 1))).toBeGreaterThan(0);
    expect(compareProgress(p(5, 9), p(5, 3))).toBeGreaterThan(0);
    expect(compareProgress(p(5, 3, 10), p(5, 3, 20))).toBeLessThan(0);
    expect(compareProgress(p(5, 3, 10), p(5, 3, 10))).toBe(0);
  });

  it('aheadOf: chỉ gắn nhãn khi cấp/ngày khác nhau', () => {
    expect(aheadOf(p(24, 25), p(1, 1))).toBe('a');
    expect(aheadOf(p(1, 1), p(24, 25))).toBe('b');
    expect(aheadOf(p(5, 3, 1), p(5, 3, 999))).toBeNull();
  });

  it('losesMuch: bỏ bản tiến xa để chọn bản mới tinh thì cảnh báo, chênh nhỏ thì không', () => {
    expect(losesMuch(p(1, 1), p(24, 25))).toBe(true);
    expect(losesMuch(p(5, 10), p(5, 12))).toBe(false); // chỉ kém 2 ngày
    expect(losesMuch(p(5, 10), p(5, 13))).toBe(true); // kém 3 ngày
    expect(losesMuch(p(5, 10), p(7, 10))).toBe(true); // kém 2 cấp
    expect(losesMuch(p(24, 25), p(1, 1))).toBe(false); // chọn bản tiến xa hơn: không cảnh báo
    expect(losesMuch(p(6, 2), p(5, 20))).toBe(false); // hơn ở một mặt (cấp) thì không coi là mất nhiều
  });
});
