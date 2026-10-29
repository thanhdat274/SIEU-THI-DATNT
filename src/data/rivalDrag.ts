/**
 * GĐ225 "Đối thủ đang hút mất bao nhiêu khách/ngày của tôi?" — sức hút khách của rival thành TIỀN.
 * BusinessPanel vốn chỉ chìa "% khách đang bị rival hút" (`rivalTrafficFactor`); chưa cho biết con
 * số đó là bao nhiêu TIỀN/NGÀY theo doanh thu bình quân. Helper này THUẦN ĐỌC: lấy hệ số khách
 * có-rival vs không-rival → phần khách mất, nhân doanh thu bình quân 7 ngày → ước tiền mất/ngày.
 * Nối GĐ159 (phản công: bớt N sức mạnh ra khách & tiền). Không đổi state/kinh tế.
 */

import { rivalTrafficFactor, type Rival } from './biz';

export interface RivalDrag {
  /** Hệ số khách hiện tại (0.5–1; 1 = không rival / không hút). */
  factor: number;
  /** Phần trăm khách đang bị rival hút (0–50). */
  lostPct: number;
  /** Ước tiền mất/ngày theo doanh thu bình quân (~). */
  moneyPerDay: number;
  /** Rival đang giảm giá (hút gấp đôi). */
  onSale: boolean;
}

export function rivalDrag(rival: Rival | null, day: number, avgRevenue: number): RivalDrag {
  const factor = rivalTrafficFactor(rival, day);
  const lostFrac = Math.max(0, 1 - factor);
  return {
    factor,
    lostPct: lostFrac * 100,
    moneyPerDay: Math.round(avgRevenue * lostFrac),
    onSale: !!rival && rival.saleUntil !== undefined && rival.saleUntil >= day,
  };
}
