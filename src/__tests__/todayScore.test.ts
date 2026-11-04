import { describe, expect, it } from 'vitest';
import { formatMoney } from '../data/products';
import { todayLine } from '../data/todayScore';

describe('todayLine — bề mặt "hôm nay bán được chưa?" (GĐ1226)', () => {
  it('chưa có gì (mới mở cửa) → chuỗi rỗng (đừng ồn đầu ngày)', () => {
    expect(todayLine({ customers: 0, itemsSold: 0, revenue: 0 })).toBe('');
  });
  it('có khách lẻ → gom đủ 3 số: khách · món · doanh thu cộng dồn', () => {
    const out = todayLine({ customers: 3, itemsSold: 2, revenue: 15000 });
    expect(out).toContain('3 khách');
    expect(out).toContain('2 món');
    expect(out).toContain(`thu ${formatMoney(15000)}`);
  });
  it('chỉ bán online (khách 0, món >0, thu >0) vẫn báo — doanh thu là tổng kênh', () => {
    const out = todayLine({ customers: 0, itemsSold: 5, revenue: 80000 });
    expect(out).toContain('0 khách'); // khách quầy 0, nhưng món/doanh thu đã có
    expect(out).toContain('5 món');
    expect(out).toContain('thu');
  });
  it('helper thuần: cùng input ra cùng chuỗi (không đổi theo state)', () => {
    const a = todayLine({ customers: 7, itemsSold: 4, revenue: 42000 });
    const b = todayLine({ customers: 7, itemsSold: 4, revenue: 42000 });
    expect(a).toBe(b);
  });
});
