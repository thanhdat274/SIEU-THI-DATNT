/**
 * GĐ224 "Mỗi ngày gầm bao nhiêu tiền cố định?" — gánh nặng chi phí cố định/ngày vs doanh thu bình quân.
 * Đã soi NHỮNG khoản lẻ: lương (GĐ216), nợ gốc (GĐ214), lãi vay (GĐ217); chưa có con số GỘP cho
 * "mỗi ngày phải trả Xđ dù bán hay không" — lương + thuê (`rentOf`) + lãi vay (`loanInterest`) +
 * góp hụi (`hui.daily`) — so với doanh thu bình quân tuần → ăn bao nhiêu % và còn đệm không.
 * Helper này THUẦN ĐỌC từ state/hằng số; không đổi state/kinh tế. Nhịp: nếu chi phí cố định ăn gần
 * hết doanh thu, phải tăng doanh thu hoặc cắt bớt lương/nợ.
 */

import { rentOf } from './shopTiers';
import { loanInterest, type Hui, type Loan } from './biz';
import { dailyWage, type Staff } from './staff';

export interface DailyBurn {
  /** Tổng lương cả hai tiệm/ngày (đã nhân hệ số ca). */
  wages: number;
  /** Thuê tiệm chính/ngày. */
  rent: number;
  /** Lãi vay hôm nay (0 nếu không vay). */
  loanInterest: number;
  /** Góp hụi hôm nay (0 nếu không góp). */
  huiDue: number;
  /** Tổng chi phí cố định/ngày. */
  total: number;
  /** Doanh thu bình quân/ngày (cửa sổ truyền vào). */
  avgRevenue: number;
  /** Chi phí cố định ăn bao nhiêu % doanh thu bình quân (null khi chưa có doanh thu). */
  burnShare: number | null;
  /** Doanh thu bình quân ≥ chi phí cố định chưa. */
  covered: boolean;
  /** Còn thừa/thiếu sau khi trừ chi phí cố định (âm = thiếu). */
  margin: number;
}

export function dailyBurn(
  staff: Staff[],
  branchStaff: Staff[],
  shopTier: number,
  loan: Loan | null | undefined,
  hui: Hui | null | undefined,
  avgRevenue: number,
): DailyBurn {
  const wages = [...staff, ...branchStaff].reduce((n, st) => n + dailyWage(st), 0);
  const rent = rentOf(shopTier);
  const loanInt = loan ? loanInterest(loan.principal) : 0;
  const huiDue = hui ? hui.daily : 0;
  const total = wages + rent + loanInt + huiDue;
  const burnShare = avgRevenue > 0 ? total / avgRevenue : null;
  return {
    wages, rent, loanInterest: loanInt, huiDue, total,
    avgRevenue,
    burnShare,
    covered: avgRevenue >= total,
    margin: avgRevenue - total,
  };
}
