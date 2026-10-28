/**
 * GĐ152 "Chi nhánh 24/7 hôm nay lời hay lỗ sau điện?" — đóng nốt hộp đen "chưa trừ điện".
 *
 * BranchPanel đã cho "Lãi thô hôm nay (thu − lương)" nhưng CHÍNH nó ghi chú "(chưa trừ điện giảm vào cuối
 * ngày)" — người chơi quyết định mở/đóng/gắn máy bán hàng cho tiệm 24/7 (đầu tư 5M) mà không thấy con số
 * LỜI RÒNG sau chi phí cố định điện mỗi ngày. Helper THUẦN đọc `branch.revenueToday` + `vendingRevenueToday`
 * + `staff` (lương) + `branchPowerBill` (điện) — không đổi state/save/kinh tế/SAVE_VERSION. Đồng bộ với
 * "Lãi thô" đang hiện (cùng `wages = Σ dailyWage`, KHÔNG áp good_boss −10% — hơi bảo thủ, chỉ ra lời thấp
 * hơn một chút, đúng nguyên tắc trung thực).
 */
import { branchPowerBill, type BranchState } from './branches';
import { dailyWage } from './staff';

export interface BranchNet {
  /** Tổng thu hôm nay = doanh thu quầy + doanh thu máy bán hàng tự động. */
  income: number;
  /** Tổng lương chi nhánh hôm nay (Σ dailyWage — chưa trừ good_boss, khớp màn "Lãi thô"). */
  wages: number;
  /** Hóa đơn điện mỗi ngày (branchPowerBill). */
  power: number;
  /** Lời ròng = income − wages − power (sau mọi chi phí vận hành). */
  net: number;
  /** Tỉ lệ lãi trên doanh thu (net/income; 0 khi chưa có thu). */
  marginPct: number;
  /** 'profit' lời · 'loss' lỗ · 'nodata' chưa có doanh thu hôm nay (chưa vội kết luận lỗ). */
  verdict: 'profit' | 'loss' | 'nodata';
}

/** Ngân sách lời ròng hôm nay của tiện lợi 24/7 — thuần đọc, không đổi state. */
export function branchNetToday(b: BranchState): BranchNet {
  const wages = b.staff.reduce((n, s) => n + dailyWage(s), 0);
  const power = branchPowerBill(b);
  const income = b.revenueToday + (b.vendingRevenueToday ?? 0);
  const net = income - wages - power;
  const marginPct = income > 0 ? net / income : 0;
  const verdict: BranchNet['verdict'] = income <= 0 ? 'nodata' : net >= 0 ? 'profit' : 'loss';
  return { income, wages, power, net, marginPct, verdict };
}
