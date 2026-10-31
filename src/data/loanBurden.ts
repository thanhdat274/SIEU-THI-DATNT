/**
 * GĐ217 "Lãi vay đang ngốn bao nhiêu phần doanh thu hôm nay?" — chi phí nợ vs dòng tiền.
 * Solvency (GĐ214) cho biết lãi vay mỗi đêm là BAO NHIÊU; chưa cho biết nó NGỐN bao nhiêu
 * phần doanh thu hôm nay (nặng/nhẹ so với tiền đang vào) và trả bớt gốc thì đỡ được bao nhiêu.
 * Helper này THUẦN ĐỌC: lãi hôm nay (`loanInterest`) chia doanh thu hôm nay → % bị ăn + lãi
 * tiết kiệm được mỗi lần trả bớt gốc (đúng công thức 0.8%/ngày của game). Không đổi state/kinh tế.
 */

import { loanInterest } from './biz';

export interface LoanBurden {
  /** Lãi phải trả tối nay (─ từ `loanInterest`). */
  interest: number;
  /** Doanh thu tiệm chính hôm nay (0 nếu chưa bán/chưa có dữ liệu). */
  revenue: number;
  /** Lãi ăn bao nhiêu % doanh thu hôm nay (null khi chưa có doanh thu — không chia được). */
  pctOfRevenue: number | null;
  /** Mỗi 1.000.000đ trả bớt gốc tiết kiệm được bao nhiêu lãi MỖI NGÀY (0.8%/ngày). */
  interestSavedPerMillion: number;
}

/** Tỉ lệ lãi 0.8%/ngày của game, quy ra "cứ 1 triệu trả bớt tiết kiệm ~Xđ/ngày". */
function savedPerMillion(): number {
  return loanInterest(1_000_000);
}

export function loanBurden(principal: number, revenueToday: number): LoanBurden {
  const interest = loanInterest(principal);
  const pctOfRevenue = revenueToday > 0 ? (interest / revenueToday) * 100 : null;
  return {
    interest,
    revenue: revenueToday,
    pctOfRevenue,
    interestSavedPerMillion: savedPerMillion(),
  };
}
