import { describe, expect, it } from 'vitest';
import { newBranch, branchPowerBill, type BranchState } from '../data/branches';
import { dailyWage, type Staff } from '../data/staff';
import { branchNetToday } from '../data/branchNet';

/** GĐ152 "Chi nhánh 24/7 hôm nay lời hay lỗ sau điện?" — đóng nốt (chưa trừ điện) của màn Lãi thô.
 *  Helper thuần đọc: net = (doanh thu quầy + máy bán hàng) − lương − hóa đơn điện. */

const staff = (role: Staff['role'], shift: Staff['shift'], skill = 3, id = 1): Staff =>
  ({ id, name: `nv${id}_${role}`, role, shift, skill, wage: Math.round(((8000 + skill * 8000)) / 1000) * 1000 }) as Staff;

const wages = (b: BranchState) => b.staff.reduce((n, s) => n + dailyWage(s), 0);

describe('branchNetToday — lời ròng chi nhánh sau điện', () => {
  it('default power bill và cửa hàng trống (chưa thu, chưa thuê) → net = −bill, verdict nodata', () => {
    const b = newBranch();
    const n = branchNetToday(b);
    expect(branchPowerBill(b)).toBe(164000); // nền + tủ lạnh/tủ đông bố trí sẵn
    expect(n.income).toBe(0);
    expect(n.wages).toBe(0);
    expect(n.power).toBe(164000);
    expect(n.net).toBe(-164000);
    expect(n.verdict).toBe('nodata'); // chưa có doanh thu hôm nay — chưa vội kết luận lỗ
  });

  it('có doanh thu đủ bù lương + điện → profit, margin = net/income', () => {
    const b = newBranch();
    b.revenueToday = 500000;
    b.staff = [staff('cashier', 'morning'), staff('stocker', 'morning')];
    const n = branchNetToday(b);
    const w = wages(b);
    expect(n.income).toBe(500000);
    expect(n.wages).toBe(w);
    expect(n.power).toBe(164000);
    expect(n.net).toBe(500000 - w - 164000);
    expect(n.net).toBeGreaterThan(0);
    expect(n.verdict).toBe('profit');
    expect(n.marginPct).toBeCloseTo((500000 - w - 164000) / 500000, 6);
  });

  it('doanh thu thấp < lương + điện → loss', () => {
    const b = newBranch();
    b.revenueToday = 100000;
    b.staff = [staff('cashier', 'morning'), staff('cashier', 'afternoon'), staff('stocker', 'morning'), staff('guard', 'night')];
    const n = branchNetToday(b);
    expect(n.net).toBe(100000 - wages(b) - 164000);
    expect(n.net).toBeLessThan(0);
    expect(n.verdict).toBe('loss');
  });

  it('máy bán hàng tự động cộng thêm thu nhập + hóa đơn điện +10k', () => {
    const b = newBranch();
    b.vendingEnabled = true;
    b.revenueToday = 400000;
    b.vendingRevenueToday = 50000;
    b.staff = [staff('cashier', 'morning', 3)];
    const n = branchNetToday(b);
    expect(n.income).toBe(450000); // quầy + máy
    expect(n.power).toBe(174000);  // bật vending → +10k
    expect(n.net).toBe(450000 - wages(b) - 174000);
    expect(n.verdict).toBe('profit');
  });

  it('hòa vốn đúng (net = 0) → profit (không phạt)', () => {
    const b = newBranch();
    b.staff = [staff('cashier', 'morning', 3)];
    const w = wages(b);
    b.revenueToday = w + 164000; // vừa đủ bù lương + điện
    const n = branchNetToday(b);
    expect(n.net).toBe(0);
    expect(n.verdict).toBe('profit');
  });

  it('chưa thu nhưng có lương/điện → vẫn nodata (không réo lỗ sớm ngày)', () => {
    const b = newBranch();
    b.staff = [staff('cashier', 'morning')];
    const n = branchNetToday(b);
    expect(n.income).toBe(0);
    expect(n.net).toBe(0 - wages(b) - 164000);
    expect(n.verdict).toBe('nodata');
  });
});
