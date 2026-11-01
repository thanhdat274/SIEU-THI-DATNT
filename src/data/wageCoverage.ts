/**
 * GĐ216 "Đội lương hôm nay cần bao nhiêu khách để tự nuôi?" — chi phí nhân sự vs lưu lượng khách.
 * StaffPanel vốn chỉ chìa tổng lương + giá trị từng người (GĐ141); chưa có con số "đội này cần
 * ~N lượt khách mỗi ngày mới vừa đủ trả lương". Helper này THUẦN ĐỌC: lương cả đội (dailyWage)
 * chia cho doanh thu bình quân mỗi lượt khách hôm nay (stats.revenue / stats.customers) → số lượt
 * HOÀ VỐN lương + so với lượt thật hôm nay → đủ/thiếu. Không đổi state/kinh tế/SAVE_VERSION.
 */

import { dailyWage, type Staff } from './staff';

export interface WageCoverage {
  /** Tổng lương một ngày của cả đội (đã nhân hệ số ca). */
  wageBill: number;
  /** Doanh thu bình quân mỗi lượt khách hôm nay (0 nếu chưa có khách/doanh thu). */
  avgPerVisit: number;
  /** Số lượt khách hôm nay. */
  customers: number;
  /** Số lượt cần để vừa đủ trả lương (null nếu chưa tính được). */
  breakEvenVisits: number | null;
  /** Lượt thật hôm nay đã ≥ mức hòa vốn chưa. */
  coverNow: boolean;
  /** Bình quân mỗi lượt còn thiếu/đủ bao nhiêu so với mức nuôi lương (âm = thiếu). */
  marginPerVisit: number;
}

/** Trả bảng so sánh lương đội vs lưu lượng khách. `stats` có thể rỗng (đầu ngày chưa có doanh thu). */
export function wageCoverage(
  stats: { revenue: number; customers: number } | undefined,
  staff: Staff[],
): WageCoverage {
  const wageBill = staff.reduce((n, st) => n + dailyWage(st), 0);
  const customers = stats?.customers ?? 0;
  const revenue = stats?.revenue ?? 0;
  const avgPerVisit = customers > 0 ? revenue / customers : 0;
  const perVisitTarget = customers > 0 && wageBill > 0 ? wageBill / customers : 0;
  const coverNow = avgPerVisit > 0 ? avgPerVisit >= perVisitTarget : wageBill === 0;
  return {
    wageBill,
    avgPerVisit,
    customers,
    breakEvenVisits: avgPerVisit > 0 ? Math.ceil(wageBill / avgPerVisit) : null,
    coverNow,
    marginPerVisit: avgPerVisit > 0 ? avgPerVisit - perVisitTarget : 0,
  };
}
