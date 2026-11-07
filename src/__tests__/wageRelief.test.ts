import { describe, it, expect } from 'vitest';
import { wageRelief } from '../data/wageRelief';
import { dailyWage, type Staff } from '../data/staff';

const mk = (id: number, wage: number) => ({ id, wage, shift: 'full' } as unknown as Staff);

describe('GĐ1525 lưới an toàn lương', () => {
  const a = mk(3, 100000), b = mk(1, 80000);
  it('đủ tiền thì không miễn', () => {
    expect(wageRelief(1e9, 500000, [a, b])).toBe(0);
    expect(wageRelief(0, 0, [])).toBe(0);
  });
  it('thiếu tiền: người làm lâu nhất bỏ qua phần thiếu, không quá lương họ', () => {
    const w = dailyWage(a) + dailyWage(b);
    expect(wageRelief(w - 10000, w, [a, b])).toBe(10000);
    expect(wageRelief(-50000, w, [a, b])).toBe(dailyWage(b));
  });
});
