/**
 * GĐ216 "Đội lương cần bao nhiêu khách tự nuôi" — lương đội vs lưu lượng. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { wageCoverage } from '../data/wageCoverage';
import type { Staff } from '../data/staff';

// dailyWage = wage × pay(ca). morning pay=1, full pay=1.6.
const staff: Staff[] = [
  { id: 1, name: 'A', role: 'cleaner', skill: 1, wage: 50000, shift: 'morning' }, // 50000
  { id: 2, name: 'B', role: 'cashier', skill: 2, wage: 70000, shift: 'full' },    // 112000
];

describe('GĐ216 wageCoverage — lương đội vs khách hôm nay', () => {
  it('lương cả đội = Σ dailyWage (đã nhân hệ số ca)', () => {
    const w = wageCoverage({ revenue: 162000, customers: 100 }, staff);
    expect(w.wageBill).toBe(50000 + 112000);
  });

  it('đủ khách/doanh thu để nuôi lương → coverNow', () => {
    // 100 lượt, trung bình 4860đ/lượt → doanh thu 486000 ≥ 162000
    const w = wageCoverage({ revenue: 486000, customers: 100 }, staff);
    expect(w.avgPerVisit).toBe(4860);
    expect(w.breakEvenVisits).toBe(34); // ceil(162000/4860)
    expect(w.coverNow).toBe(true);
  });

  it('doanh thu dưới mức lương → coverNow false, margin âm', () => {
    const w = wageCoverage({ revenue: 97200, customers: 20 }, staff);
    expect(w.avgPerVisit).toBe(4860);
    expect(w.breakEvenVisits).toBe(34);
    expect(w.coverNow).toBe(false);
    expect(w.marginPerVisit).toBeLessThan(0);
  });

  it('chưa có dữ liệu hôm nay → không tính được điểm hòa vốn', () => {
    const w = wageCoverage(undefined, staff);
    expect(w.avgPerVisit).toBe(0);
    expect(w.breakEvenVisits).toBeNull();
    expect(w.coverNow).toBe(false);
  });

  it('không đội nhân viên → lương 0, tự đủ', () => {
    const w = wageCoverage({ revenue: 0, customers: 0 }, []);
    expect(w.wageBill).toBe(0);
    expect(w.coverNow).toBe(true);
  });
});
