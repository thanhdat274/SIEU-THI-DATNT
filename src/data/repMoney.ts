/**
 * Danh tiếng đáng/đang mất bao nhiêu đồng mỗi ngày (GĐ229)?
 *
 * repPayoff (GĐ148) đã quy danh tiếng ra khách/ngày (extraKhach, nextStarKhach) nhưng dừng ở
 * "khách" — chưa đổi ra TIỀN. Helper này nhân với phí chi tiêu bình quân mỗi khách ghé
 * (avgPerVisit = doanh thu / số khách) để ra: danh tiếng hiện tại đang kéo thêm / làm mất
 * ~Xđ/ngày, và mỗi nấc 0.5★ tới đáng ~Yđ/ngày. Cùng mô-típ rivalDrag (GĐ225) đổi đơn vị khách
 * → đồng. THUẦN ĐỌC: chỉ nhân số từ repPayoff với avgPerVisit — không đổi state/kinh tế.
 */
import type { RepPayoff } from './repPayoff';

export interface RepMoney {
  /** Doanh thu thêm/mất mỗi ngày ở danh tiếng hiện tại (dương = thêm, âm = mất). */
  moneyPerDay: number;
  /** Doanh thu thêm mỗi ngày nếu lên thêm 0.5★. */
  nextStarMoney: number;
}

/** Phí chi tiêu bình quân = doanh thu / khách; 0 khi chưa có khách. */
export const avgPerVisit = (revenue: number, customers: number) => (customers > 0 ? revenue / customers : 0);

export function repMoney(p: RepPayoff, avg: number): RepMoney {
  return {
    moneyPerDay: Math.round(p.extraKhach * avg),
    nextStarMoney: Math.round(p.nextStarKhach * avg),
  };
}
