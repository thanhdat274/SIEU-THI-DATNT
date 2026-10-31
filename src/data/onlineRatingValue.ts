/**
 * GĐ238 "Lên 4,5⭐ app được thêm bao nhiêu?" — soi giá trị điểm đánh giá online ra tiền.
 *
 * Giao đúng hẹn để điểm app lên 4,5⭐ là lời khuyên lặp đi lặp lại (OnlinePanel/online.ts), nhưng
 * chưa ai cho con số "được THÊM bao nhiêu đơn/ngày ≈ bao nhiêu tiền" — quyết định bỏ công giao đúng
 * hạn so với nghỉ sớm. Helper này đọc THUẦN state sẵn có + hằng số cơ chế:
 *   - `onlineOrderCap(rating, level)` = số đơn/ngày ở một mức điểm (span / orderGap).
 *   - `revenueToday`/`done` → số tiền trung bình một đơn đã giao; `grabFeesToday` → phần trăm phí
 *     giao rút đi (ước lời ròng/đơn) — dùng số THẬT hôm nay.
 * So sánh cap hiện tại với cap 4,5⭐ (và với cap 3⭐ nếu rớt) → đơn/ngày thêm/mất × lời ròng/đơn.
 * Không RNG/seed, không đổi state/save/kinh tế — ước lượng trung bình từ số quan sát.
 */
import { onlineOrderCap } from './online';

/** Mốc điểm đáng phấn đấu — đơn dày nhất từ đây (khớp orderGap). */
export const RATING_TARGET = 4.5;
/** Mốc điểm cảnh báo nếu rớt xuống — đơn thưa hẳn (khớp orderGap). */
export const RATING_FLOOR = 3;

/** Dưới mức này thì chênh lệch đơn chưa đáng kể → không nhấn mạnh "lên 4,5 ngay". */
export const RATING_GAIN_MIN_ORDERS = 2;

export const onlineRatingValue = (o: {
  rating: number;
  level: number;
  revenueToday: number;
  done: number;
  grabFeesToday: number;
}): {
  capNow: number;
  capBest: number;
  capFloor: number;
  avgRevenuePerOrder: number;
  avgNetPerOrder: number;
  ordersToBest: number;
  ordersToFloor: number;
  moneyBestPerDay: number;
  moneyFloorPerDay: number;
  verdict: 'best' | 'nice' | 'upside' | 'noData';
} => {
  const { rating, level, revenueToday, done, grabFeesToday } = o;

  const capNow = onlineOrderCap(rating, level);
  const capBest = onlineOrderCap(RATING_TARGET, level);
  const capFloor = onlineOrderCap(RATING_FLOOR, level);

  const avgRevenuePerOrder = done > 0 ? revenueToday / done : 0;
  const feeRate = revenueToday > 0 ? Math.min(1, grabFeesToday / revenueToday) : 0;
  const avgNetPerOrder = avgRevenuePerOrder * (1 - feeRate);

  const ordersToBest = Math.max(0, capBest - capNow);
  const ordersToFloor = Math.max(0, capNow - capFloor);
  const moneyBestPerDay = ordersToBest * avgNetPerOrder;
  const moneyFloorPerDay = ordersToFloor * avgNetPerOrder;

  let verdict: 'best' | 'nice' | 'upside' | 'noData';
  if (avgRevenuePerOrder <= 0 || done === 0) verdict = 'noData';
  else if (rating >= RATING_TARGET) verdict = 'best';
  else if (ordersToBest < RATING_GAIN_MIN_ORDERS) verdict = 'nice';
  else verdict = 'upside';

  return { capNow, capBest, capFloor, avgRevenuePerOrder, avgNetPerOrder, ordersToBest, ordersToFloor, moneyBestPerDay, moneyFloorPerDay, verdict };
};
