export type CustomerFeedbackReason = 'out_of_stock' | 'price' | 'wait' | 'store_closed' | 'unreachable';

export interface VisitRatingInput {
  waitSeconds: number;
  gotAll: boolean;
  averagePriceRatio: number;
  reason?: CustomerFeedbackReason;
}

/** Rating 1–5 is explained by stock, queue time and actual price at pickup. */
export function ratingForVisit(input: VisitRatingInput): number {
  let stars = 5;
  if (!input.gotAll) stars -= 2;
  if (input.waitSeconds >= 12) stars -= 1;
  if (input.waitSeconds >= 28) stars -= 1;
  if (input.averagePriceRatio > 1.1) stars -= 1;
  if (input.averagePriceRatio > 1.2) stars -= 1;
  if (input.reason === 'out_of_stock' || input.reason === 'wait' || input.reason === 'unreachable') stars = Math.min(stars, 2);
  if (input.reason === 'price') stars = Math.min(stars, 2);
  if (input.reason === 'store_closed') stars = Math.min(stars, 3);
  return Math.max(1, Math.min(5, stars));
}

export function appendRating(previous: readonly number[] | undefined, stars: number, capacity = 30): number[] {
  return [...(previous ?? []).filter(value => Number.isInteger(value) && value >= 1 && value <= 5), Math.max(1, Math.min(5, Math.round(stars)))].slice(-capacity);
}

/** An empty history starts neutral at four stars. */
export function averageRating(ratings: readonly number[] | undefined): number {
  const valid = (ratings ?? []).filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 4;
}

export function reputationTrafficMultiplier(ratings: readonly number[] | undefined): number {
  const average = averageRating(ratings);
  return Math.max(0.8, Math.min(1.2, 0.8 + (average - 1) * 0.1));
}

export function reputationDeltaFromRating(stars: number): number {
  return stars >= 5 ? 1 : stars <= 2 ? -1 : 0;
}

export function feedbackReasonLabel(reason: CustomerFeedbackReason): string {
  switch (reason) {
    case 'out_of_stock': return 'hết hàng';
    case 'price': return 'giá cao';
    case 'wait': return 'đợi lâu';
    case 'store_closed': return 'tiệm đóng cửa';
    case 'unreachable': return 'không tới được kệ';
  }
}
