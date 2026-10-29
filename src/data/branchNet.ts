/**
 * GĐ153: số dư vận hành của chi nhánh sau lương và điện, chưa phân bổ giá vốn hàng bán.
 *
 * BranchPanel đã cho "Lãi thô hôm nay (thu − lương)" nhưng CHÍNH nó ghi chú "(chưa trừ điện giảm vào cuối
 * ngày)" — người chơi quyết định mở/đóng/gắn máy bán hàng cho tiệm 24/7 (đầu tư 5M) mà không thấy con số
 * LỜI RÒNG sau chi phí cố định điện mỗi ngày. Helper THUẦN đọc `branch.revenueToday` + `vendingRevenueToday`
 * + `staff` (lương) + `branchPowerBill` (điện) — không đổi state/save/kinh tế/SAVE_VERSION. Đồng bộ với
 * "Lãi thô" đang hiện (cùng `wages = Σ dailyWage`, KHÔNG áp good_boss −10% — hơi bảo thủ, chỉ ra lời thấp
 * hơn một chút, đúng nguyên tắc trung thực).
 */
import { branchPowerBill, CONVENIENCE, type BranchState } from './branches';
import { dailyWage } from './staff';

export interface BranchOperatingBalance {
  /** Tổng thu hôm nay = doanh thu quầy + doanh thu máy bán hàng tự động. */
  income: number;
  /** Tổng lương chi nhánh hôm nay (Σ dailyWage — chưa trừ good_boss, khớp màn "Lãi thô"). */
  wages: number;
  /** Hóa đơn điện mỗi ngày (branchPowerBill). */
  power: number;
  /** Còn lại sau lương + điện; chưa trừ giá vốn hàng hóa. */
  balance: number;
  /** Tỉ lệ số dư vận hành trên doanh thu (0 khi chưa có thu). */
  afterOperatingCostsPct: number;
  /** 'surplus' dư vận hành · 'deficit' âm · 'nodata' chưa có doanh thu hôm nay. */
  verdict: 'surplus' | 'deficit' | 'nodata';
}

/** Số dư vận hành hôm nay — thuần đọc, không đổi state. Không gọi là lợi nhuận vì chưa trừ giá vốn hàng. */
export function branchOperatingBalanceToday(b: BranchState): BranchOperatingBalance {
  const wages = b.staff.reduce((n, s) => n + dailyWage(s), 0);
  const power = branchPowerBill(b);
  const income = b.revenueToday + (b.vendingRevenueToday ?? 0);
  const balance = income - wages - power;
  const afterOperatingCostsPct = income > 0 ? balance / income : 0;
  const verdict: BranchOperatingBalance['verdict'] = income <= 0 ? 'nodata' : balance >= 0 ? 'surplus' : 'deficit';
  return { income, wages, power, balance, afterOperatingCostsPct, verdict };
}

/* —————————————————————————————————————————————————————————————————————
 * GĐ194: "Mở chi nhánh 5tr hồi vốn sau bao lâu?" — màn mua chi nhánh (BranchPanel)
 * chỉ cho giá + cấp yêu cầu, không nói kiếm về được bao nhiêu. Chi nhánh chạy SIM
 * (không công thức deterministic như quán nước) nhưng theo QUAN SÁT được: số dư vận
 * hành từ `branchOperatingBalanceToday` (thu − lương − điện) làm lời ròng MỘT NGÀY,
 * chia vốn xây = số ngày hồi (mẫu GĐ192). THUẦN — đọc quan sát + CONVENIENCE.openCost,
 * không đổi kinh tế/save. UI nói rõ là ước theo hôm nay & chưa trừ giá vốn hàng.
 * ————————————————————————————————————————————————————————————————————— */

export type BranchBuildPaybackVerdict = 'worth' | 'slow' | 'notworth' | 'nodata';

export interface BranchBuildPayback {
  cost: number;
  /** Lời ròng ước MỘT NGÀY (= số dư vận hành hôm nay, chưa trừ giá vốn hàng). */
  netPerDay: number;
  /** Số ngày cần hồi vốn (làm tròn lên); null khi lỗ / chưa có số liệu. */
  paybackDays: number | null;
  verdict: BranchBuildPaybackVerdict;
}

/**
 * Ước hồi vốn xây chi nhánh theo ngày quan sát hôm nay.
 *  - 'worth':    lời và hồi ≤60 ngày.
 *  - 'slow':     lời nhưng hồi chậm (>60).
 *  - 'notworth': số dư vận hành âm (lỗ sau lương+điện) — chưa hồi vốn.
 *  - 'nodata':   hôm nay chi nhánh chưa có doanh thu → chờ số liệu.
 */
export function branchBuildPayback(
  b: BranchState,
  cost: number = CONVENIENCE.openCost,
): BranchBuildPayback {
  const ob = branchOperatingBalanceToday(b);
  if (ob.verdict === 'nodata') return { cost, netPerDay: 0, paybackDays: null, verdict: 'nodata' };
  if (ob.balance <= 0) return { cost, netPerDay: ob.balance, paybackDays: null, verdict: 'notworth' };
  const paybackDays = Math.ceil(cost / ob.balance);
  return { cost, netPerDay: ob.balance, paybackDays, verdict: paybackDays <= 60 ? 'worth' : 'slow' };
}
