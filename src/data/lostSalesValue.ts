/**
 * Khách tìm không mua được đang bỏ lỡ bao nhiêu/ngày (GĐ228)?
 *
 * Sức khoẻ món (`itemHealthList`) đã lưu `lostShare` — phần lượt khách TÌM MÓN NHƯNG KHÔNG MUA
 * ĐƯỢC (hết/thiếu hàng, hoặc do giá/sắp xếp). analyticsAdvice chỉ dừng ở tỉ lệ "🚶 X% không mua
 * được — bày đầy kệ hơn", CHƯA đổi ra tiền. Helper này quy đổi lượng khách bỏ đi thành TIỀN mỗi
 * ngày để xếp thứ tự nhập/bày theo ĐỒNG chứ không theo %:
 *
 *   - lostDay = dailyQty × lostShare / (1 − lostShare)   (ước lượt bị mất mỗi ngày)
 *   - unitProfit = profit30 / qty30                        (lãi trung bình một món bán ra)
 *   - moneyLostDay = lostDay × unitProfit                  (tiền ROI lỡ mỗi ngày)
 *
 * Cờ `stockout` cho biết món đang CẠN (daysLeft ≤ 1.5) — khi đó thiếu hàng là thủ phạm, nên nhập;
 * nếu còn nhiều hàng mà vẫn mất nhiều khách thì do giá/xếp, xem Bảng giá (GĐ227). THUẦN ĐỌC, chỉ
 * đọc ItemHealth — không đổi kinh tế / state / SAVE_VERSION.
 */
import type { ItemHealth } from './analytics';

export interface LostUnit {
  id: string;
  name: string;
  /** Ước lượt khách bị mất mỗi ngày. */
  lostDay: number;
  /** Lãi trung bình một món. */
  unitProfit: number;
  /** Tiền lỡ mỗi ngày vì khách tìm không mua được. */
  moneyLostDay: number;
  /** Đang cạn hàng (daysLeft ≤ ngưỡng): thiếu hàng là thủ phạm → nên nhập. */
  stockout: boolean;
  /** Còn bao nhiêu ngày hết hàng (null nếu không bán). */
  daysLeft: number | null;
  lostShare: number;
}

export interface LostSalesRead {
  /** Tổng tiền/ngày đang bỏ lỡ. */
  totalPerDay: number;
  /** Số món có lượt mất đáng kể. */
  count: number;
  /** Xếp theo tiền lỡ giảm dần. */
  items: LostUnit[];
  /** Có món nào đáng xử lý không. */
  actionable: boolean;
}

/** Dưới ngưỡng này coi như không đáng nói (đồng/ngày). */
export const LOST_MIN_TOTAL = 5_000;
/** Chỉ tìm món có lượt khách mất ≥ ngưỡng này (% mới nói chuyện được). */
export const LOST_SHARE_MIN = 0.1;
/** Cạn hàng khi còn ≤ ngưỡng ngày. */
export const LOST_STOCKOUT_DAYS = 1.5;

export function lostSalesValue(list: ItemHealth[]): LostSalesRead {
  const items: LostUnit[] = [];
  for (const h of list) {
    if (h.qty30 <= 5 || h.dailyQty <= 0 || h.lostShare < LOST_SHARE_MIN) continue;
    const lostDay = (h.dailyQty * h.lostShare) / (1 - h.lostShare);
    const unitProfit = h.qty30 > 0 ? h.profit30 / h.qty30 : 0;
    items.push({
      id: h.id,
      name: h.name,
      lostDay,
      unitProfit,
      moneyLostDay: lostDay * unitProfit,
      stockout: h.daysLeft !== null && h.daysLeft <= LOST_STOCKOUT_DAYS,
      daysLeft: h.daysLeft,
      lostShare: h.lostShare,
    });
  }
  items.sort((a, b) => b.moneyLostDay - a.moneyLostDay);
  const totalPerDay = items.reduce((n, it) => n + it.moneyLostDay, 0);
  return { totalPerDay, count: items.length, items, actionable: totalPerDay >= LOST_MIN_TOTAL };
}
