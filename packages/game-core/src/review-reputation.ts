import type { CustomerReview } from '@game/shared';

/**
 * Lời đánh giá bằng chữ → ảnh hưởng uy tín (Mục 2 GĐ4).
 *
 * Đảo non-goal của change `written-customer-reviews` cũ: lời chữ không chỉ trình bày mà còn
 * đóng góp vào `playerData.reputation` (0..100). Đây là delta "vượt ngoài số sao" — phần theo
 * sao đã được `reputationDeltaFromRating` cộng ở `recordCustomerRating`; contribution ở đây thưởng
 * thêm tín hiệu nội dung (lý do bỏ về / lời khen) để chê có lý do trừ sâu hơn, khen cộng nhẹ.
 *
 * Hoàn toàn thuần, xác định theo trường có sẵn của lời đánh giá (không RNG) nên chơi lẻ = chơi chung.
 */

/** Delta uy tín (0.1 đơn vị) của từng loại lý do bỏ về. */
export const REVIEW_REASON_DELTA: Record<NonNullable<CustomerReview['reason']>, number> = {
  out_of_stock: -0.6,
  unreachable: -0.6,
  wait: -0.5,
  price: -0.5,
  store_closed: -0.5,
};

/** Delta khen khi sao >= 4 và không có lý do. */
export const REVIEW_PRAISE_DELTA = 0.2;
/** Delta chê sao thấp (<=2) không rõ lý do — nhẹ hơn lý do để không "phạt đúp" quá mạnh. */
export const REVIEW_LOWSTAR_NO_REASON_DELTA = -0.2;
/** Sao trung tính (3) không ảnh hưởng. */
export const REVIEW_NEUTRAL_DELTA = 0;

/** Cửa sổ ngày mặc định cho `reviewReputationDrift`. */
export const REVIEW_DRIFT_WINDOW_DAYS = 7;
/** Kẹp tổng delta tích lũy mô tả trong bản tin (tránh phóng đại). */
export const REVIEW_DRIFT_CAP = 10;
/** Kẹp delta một ngày mô tả (danh nghĩa, tính trước khi cộng dồn). */
export const REVIEW_DRIFT_DAY_CAP = 3;

/** Đóng góp uy tín của một lời đánh giá, theo nội dung vượt ngoài số sao. */
export function reviewReputationContribution(review: Pick<CustomerReview, 'reason' | 'stars'>): number {
  if (review.reason) return REVIEW_REASON_DELTA[review.reason];
  if (review.stars >= 4) return REVIEW_PRAISE_DELTA;
  if (review.stars <= 2) return REVIEW_LOWSTAR_NO_REASON_DELTA;
  return REVIEW_NEUTRAL_DELTA;
}

/** Tổng đóng góp uy tín của các lời đánh giá trong cửa sổ ngày, kẹp ngưỡng. */
export function reviewReputationDrift(
  reviews: readonly CustomerReview[],
  day: number,
  windowDays = REVIEW_DRIFT_WINDOW_DAYS,
): number {
  let total = 0;
  for (const r of reviews) {
    if (day - r.day >= windowDays || r.day > day) continue;
    total += reviewReputationContribution(r);
  }
  return Math.max(-REVIEW_DRIFT_CAP, Math.min(REVIEW_DRIFT_CAP, total));
}

export interface ReviewSentimentSummary {
  count: number;
  praise: number;
  complaints: number;
  /** Tổng delta tích lũy (không kẹp—chỉ mô tả). */
  totalDelta: number;
  topReason?: { reason: NonNullable<CustomerReview['reason']>; count: number };
}

/** Tóm tắt sentiment cho màn lời đánh giá / bản tin sáng. */
export function reviewSentimentSummary(reviews: readonly CustomerReview[]): ReviewSentimentSummary {
  let praise = 0;
  let complaints = 0;
  let totalDelta = 0;
  const reasons = new Map<NonNullable<CustomerReview['reason']>, number>();
  for (const r of reviews) {
    totalDelta += reviewReputationContribution(r);
    if (r.reason) {
      complaints++;
      reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
    } else if (r.stars >= 4) {
      praise++;
    } else if (r.stars <= 2) {
      complaints++;
    }
  }
  const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    count: reviews.length,
    praise,
    complaints,
    totalDelta,
    ...(top ? { topReason: { reason: top[0], count: top[1] } } : {}),
  };
}
