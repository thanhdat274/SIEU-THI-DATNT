import { describe, expect, it } from 'vitest';
import { branchBuildPayback, branchOperatingBalanceToday } from '../data/branchNet';
import { CONVENIENCE, type BranchState } from '../data/branches';

/**
 * GĐ194 — "Mở chi nhánh 5tr hồi vốn sau bao lâu?": màn mua chi nhánh chỉ cho giá + cấp yêu cầu, không nói
 * kiếm về được bao nhiêu. Chi nhánh chạy sim nhưng theo QUAN SÁT được: số dư vận hành hôm nay
 * (`branchOperatingBalanceToday` = thu − lương − điện) làm lời ròng, chia vốn xây = số ngày hồi (mẫu GĐ192).
 * THUẦN — đối chiếu ground-truth branchOperatingBalanceToday, không hardcode số.
 */
const mk = (revenueToday: number): BranchState => ({
  open: true, shelf: {}, simAt: 0, lastTrip: -999,
  revenueToday, customersToday: 0, lostToday: 0, missedToday: 0, vendingRevenueToday: 0, groupToday: {}, vendingStock: {},
  staff: [
    { id: 1, role: 'cashier', shift: 'morning', wage: 150000, energy: 100 },
    { id: 2, role: 'cashier', shift: 'afternoon', wage: 150000, energy: 100 },
    { id: 3, role: 'cashier', shift: 'night', wage: 150000, energy: 100 },
  ],
} as unknown as BranchState);

describe('GĐ194 — hồi vốn xây chi nhánh', () => {
  it('chưa có doanh thu hôm nay (nodata) → không hồi, không nhiễu UI', () => {
    const p = branchBuildPayback(mk(0));
    expect(p.verdict).toBe('nodata');
    expect(p.paybackDays).toBeNull();
    expect(p.cost).toBe(CONVENIENCE.openCost);
  });

  it('paybackDays khớp ground-truth (số dư vận hành chia vốn, làm tròn lên)', () => {
    const b = mk(3_000_000);
    const ob = branchOperatingBalanceToday(b);
    const p = branchBuildPayback(b);
    expect(p.netPerDay).toBe(ob.balance);
    if (ob.balance > 0) {
      expect(p.paybackDays).toBe(Math.ceil(CONVENIENCE.openCost / ob.balance));
      expect(p.verdict === 'worth' || p.verdict === 'slow').toBe(true);
    } else {
      expect(p.verdict).toBe('notworth');
      expect(p.paybackDays).toBeNull();
    }
  });

  it('số dư âm (thu < lương+điện) → notworth, chưa hồi vốn', () => {
    const b = mk(60_000);
    const ob = branchOperatingBalanceToday(b);
    if (ob.balance <= 0) {
      const p = branchBuildPayback(b);
      expect(p.verdict).toBe('notworth');
      expect(p.paybackDays).toBeNull();
      expect(p.netPerDay).toBe(ob.balance);
    } else {
      // nếu chi phí thấp đến mức vẫn dương → helper vẫn nhất quán
      expect(branchBuildPayback(b).netPerDay).toBe(ob.balance);
    }
  });

  it('consistency: netPerDay = balance và payback = ceil(cost/balance) tại nhiều mức thu', () => {
    for (const rev of [0, 300_000, 800_000, 1_500_000, 3_000_000]) {
      const b = mk(rev);
      const ob = branchOperatingBalanceToday(b);
      const p = branchBuildPayback(b, CONVENIENCE.openCost);
      if (ob.verdict === 'nodata') {
        expect(p.verdict).toBe('nodata');
        expect(p.netPerDay).toBe(0); // helper không ước lời khi chưa có thu
        expect(p.paybackDays).toBeNull();
      } else {
        expect(p.netPerDay).toBe(ob.balance);
        if (ob.balance <= 0) expect(p.verdict).toBe('notworth');
        else expect(p.paybackDays).toBe(Math.ceil(CONVENIENCE.openCost / ob.balance));
      }
    }
  });

  it('tôn trọng cost truyền vào (nhạy với giá mở mặt bằng)', () => {
    const b = mk(3_000_000);
    const ob = branchOperatingBalanceToday(b);
    const p = branchBuildPayback(b, 20_000_000);
    expect(p.netPerDay).toBe(ob.balance);
    expect(p.paybackDays).toBe(ob.balance > 0 ? Math.ceil(20_000_000 / ob.balance) : null);
  });
});
