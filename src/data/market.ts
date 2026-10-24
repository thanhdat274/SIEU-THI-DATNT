/**
 * Giá tham chiếu thị trường: mỗi món có một hệ số (so với giá gợi ý gốc) nhích nhẹ mỗi ngày
 * theo khan hiếm hàng trong tiệm và mức cầu, luôn trong biên [0.8, 1.4].
 * Hàng khan (kệ + kho cạn) thì thị trường trả cao hơn; tồn nhiều thì giá tham chiếu hạ dần.
 * Số trôi tối đa 3%/ngày nên không nhảy loạn; dựa trên cầu/kho trung bình nên hai máy chơi chung khớp nhau.
 */

/** Trần dưới/trên của hệ số giá tham chiếu (nhân giá gợi ý gốc). */
export const MARKET_MIN = 0.8;
export const MARKET_MAX = 1.4;
/** Hệ số trôi tối đa mỗi ngày. */
export const MARKET_MAX_STEP = 0.03;

/** Hệ số khan hiếm: tổng hàng (kệ + kho, kể cả đang về) quyết định thị trường trả nhiều hay ít. */
export function scarcityMul(onHand: number, incoming = 0): number {
  const total = onHand + incoming;
  if (total <= 0) return 1.08;
  if (total <= 10) return 1.04;
  if (total >= 60) return 0.96;
  return 1;
}

/** Hệ số cầu: khách hỏi mua càng nhiều/ngày thì giá tham chiếu càng hướng lên (≥5 lượt/ngày là đỉnh). */
export function demandMul(demandPerDay: number): number {
  return 0.95 + Math.min(1, Math.max(0, demandPerDay) / 5) * 0.15;
}

/** Hệ số giá tham chiếu mới: kéo chậm về phía mục tiêu (khan hiếm × cầu), tối đa 3% mỗi ngày. */
export function nextMarketIndex(prev: number, onHand: number, incoming: number, demandPerDay: number): number {
  const target = Math.min(MARKET_MAX, Math.max(MARKET_MIN, scarcityMul(onHand, incoming) * demandMul(demandPerDay)));
  const drift = Math.max(-MARKET_MAX_STEP, Math.min(MARKET_MAX_STEP, target - prev));
  return Math.round((prev + drift) * 1000) / 1000;
}
