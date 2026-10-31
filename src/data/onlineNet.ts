/**
 * Bán online hôm nay thực lời bao nhiêu sau phí giao (GĐ232)?
 *
 * OnlinePanel vốn hiện riêng revenueToday ("💵 Hôm nay") và grabFeesToday (dòng nhỏ "-Xđ Grab"),
 * nhưng chưa ghép ra LỜI RÒNG và chưa nói phí giao ăn bao nhiêu phần doanh thu — quyết định "tự
 * chở / tuyển người giao có đáng" chưa có con số. Helper này gộp: net = revenueToday − grabFeesToday,
 * grabShare = phí Grab / doanh thu (phần bị phí giao ăn), kèm framing "nếu tự chở bằng người giao rảnh
 * sẽ giữ lại ~grabFees đ/ngày" (cận trên — đúng khi mỗi đơn Grab có một người rảnh chạy). THUẦN ĐỌC:
 * chỉ đọc OnlineState, không đổi state/kinh tế.
 */
import type { OnlineState } from './online';

export type OnlineNetVerdict = 'good' | 'warn' | 'low';

export interface OnlineNet {
  /** Doanh thu online hôm nay (sau hoa hồng app, TRƯỚC phí giao). */
  revenue: number;
  /** Tổng phí Grab hôm nay. */
  grabFees: number;
  /** Lời ròng hôm nay = revenue − grabFees. */
  net: number;
  /** Phần doanh thu bị phí Grab ăn (0 nếu không có doanh thu). */
  grabShare: number;
  /** Cận trên tiền giữ lại nếu tự chở bằng người giao rảnh. */
  savingsIfOwn: number;
  verdict: OnlineNetVerdict;
}

/** Phí Grab ăn ≥ 15% doanh thu online → cân nhắc tự chở / tuyển người giao. */
export const ONLINE_GRAB_SHARE_WARN = 0.15;

export function onlineNet(o: OnlineState): OnlineNet {
  const revenue = o.revenueToday;
  const grabFees = o.grabFeesToday;
  const net = revenue - grabFees;
  const grabShare = revenue > 0 ? grabFees / revenue : 0;
  let verdict: OnlineNetVerdict = 'good';
  if (net <= 0) verdict = 'low';      // lời âm: đơn app đang lỗ sau phí giao
  else if (grabShare >= ONLINE_GRAB_SHARE_WARN) verdict = 'warn';
  return { revenue, grabFees, net, grabShare, savingsIfOwn: grabFees, verdict };
}
