/**
 * GĐ219 "Tiền mặt hiện có đủ trả lương cuối ngày không?" — quỹ lương theo tiền mặt hiện tại.
 * Giờ "đi ngủ" trừ lương cả đội (Σ dailyWage, cả hai tiệm). StaffPanel đã cho biết quỹ lương là
 * NẰM TRONG ngân sách doanh thu (GĐ216); chưa cho biết TIỀN MẶT ĐANG CẦM có đủ trả ngay tối nay
 * hay không. Helper này THUẦN ĐỌC: đối chiếu tiền mặt hiện có vs quỹ lương → đủ/thiếu bao nhiêu +
 * quỹ lương đang cầm đủ mấy ngày. Không đổi state/kinh tế. Nhịp: kịp bớt nhập hàng/vay lót trước
 * khi ngủ nếu sắp thiếu lương.
 */

export interface PayrollRunway {
  /** Tổng lương phải trả cuối ngày (Σ dailyWage, đã nhân hệ số ca). */
  wageBill: number;
  /** Tiền mặt đang có. */
  cash: number;
  /** Đủ trả lương tối nay chưa (cash ≥ wageBill). */
  covered: boolean;
  /** Thiếu bao nhiêu so với lương (số dương; 0 nếu đủ). */
  shortfall: number;
  /** Quỹ lương đang cầm đủ mấy ngày lương (sàn 0; null khi không có lương). */
  runwayDays: number | null;
}

export function payrollRunway(cash: number, wageBill: number): PayrollRunway {
  if (wageBill <= 0) {
    return { wageBill, cash, covered: true, shortfall: 0, runwayDays: null };
  }
  const covered = cash >= wageBill;
  return {
    wageBill,
    cash,
    covered,
    shortfall: Math.max(0, wageBill - cash),
    runwayDays: Math.floor(cash / wageBill),
  };
}
