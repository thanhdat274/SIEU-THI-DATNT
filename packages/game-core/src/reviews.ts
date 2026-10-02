import type { CustomerReview } from '@game/shared';
import { REVIEW_AUTHORS, REVIEW_BY_REASON, REVIEW_BY_STARS, REVIEW_DETAILS, REVIEW_HISTORY_CAP } from '@game/data';
import { Mulberry32Rng, daySeed } from './staff';
import { hashSeed } from './weather';

export interface ReviewContext {
  day: number;
  hour: number;
  minute: number;
  stars: number;
  /** Thứ tự đánh giá trong ngày, để id và lựa chọn câu xác định. */
  sequence: number;
  reason?: CustomerReview['reason'];
  /** Tên món liên quan: món hết hàng/giá cao, hoặc món đắt nhất trong giỏ. */
  productId?: string;
  productName?: string;
  waitSeconds: number;
  /** Tỷ lệ giá bán so với giá gợi ý trung bình của giỏ. */
  averagePriceRatio: number;
  rainIntensity: number;
  isWeekend: boolean;
  guardHelped: boolean;
  regularId?: string;
  regularName?: string;
}

const fill = (template: string, ctx: ReviewContext) =>
  template.replace('{product}', ctx.productName ?? 'món cần mua').replace('{wait}', String(Math.max(10, Math.round(ctx.waitSeconds))));

/** Soạn lời đánh giá: một câu chính theo lý do hoặc số sao, cộng tối đa một câu ngữ cảnh. Hàm thuần, xác định. */
export function composeReview(ctx: ReviewContext): CustomerReview {
  const rng = new Mulberry32Rng(daySeed(ctx.day, hashSeed(`review:${ctx.sequence}:${ctx.stars}:${ctx.reason ?? ''}`)));
  const pool = (ctx.reason && REVIEW_BY_REASON[ctx.reason]) || REVIEW_BY_STARS[Math.max(1, Math.min(5, Math.round(ctx.stars)))];
  const main = fill(pool[Math.floor(rng.next() * pool.length)], ctx);
  const positive = ctx.stars >= 4 && !ctx.reason;
  const negative = ctx.stars <= 2 || !!ctx.reason;
  const applicable = new Set<string>();
  if (ctx.rainIntensity > 0.25) applicable.add('rain');
  if (ctx.guardHelped) applicable.add('guard');
  if (ctx.productName && positive) applicable.add('product');
  if (ctx.averagePriceRatio < 0.97) applicable.add('cheap');
  if (ctx.averagePriceRatio > 1.1) applicable.add('pricey');
  if (ctx.isWeekend) applicable.add('weekend');
  if (ctx.regularId) applicable.add('regular');
  const details = REVIEW_DETAILS.filter(d => applicable.has(d.id) && (d.tone === 'any' || (d.tone === 'positive' ? positive : negative)));
  // Câu chính đã nói về giá thì không thêm câu "giá nhỉnh" nữa.
  const usable = details.filter(d => !(ctx.reason === 'price' && d.id === 'pricey'));
  const extra = usable.length && rng.next() < 0.7 ? usable[Math.floor(rng.next() * usable.length)] : undefined;
  const author = ctx.regularName ?? REVIEW_AUTHORS[Math.floor(rng.next() * REVIEW_AUTHORS.length)];
  return {
    id: `rev-${ctx.day}-${ctx.sequence}`,
    day: ctx.day,
    hour: ctx.hour,
    minute: ctx.minute,
    stars: ctx.stars,
    author,
    text: extra ? `${main} ${fill(extra.text, ctx)}` : main,
    ...(ctx.reason ? { reason: ctx.reason } : {}),
    ...(ctx.productId ? { productId: ctx.productId } : {}),
    ...(ctx.regularId ? { regularId: ctx.regularId } : {}),
  };
}

export function appendReview(previous: readonly CustomerReview[] | undefined, review: CustomerReview, capacity = REVIEW_HISTORY_CAP): CustomerReview[] {
  return [...(previous ?? []), review].slice(-capacity);
}

/** Lọc bỏ mục hỏng khi tải save (thiếu trường, sao ngoài 1..5, chữ rỗng). */
export function sanitizeReviews(value: unknown, capacity = REVIEW_HISTORY_CAP): CustomerReview[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is CustomerReview => !!r && typeof r === 'object'
      && typeof (r as CustomerReview).id === 'string' && Number.isInteger((r as CustomerReview).stars)
      && (r as CustomerReview).stars >= 1 && (r as CustomerReview).stars <= 5
      && typeof (r as CustomerReview).text === 'string' && (r as CustomerReview).text.length > 0 && (r as CustomerReview).text.length <= 400
      && typeof (r as CustomerReview).author === 'string' && Number.isFinite((r as CustomerReview).day))
    .map(r => ({ ...r }))
    .slice(-capacity);
}

export interface ReviewSummary {
  count: number;
  average: number;
  /** Số lượt theo sao, chỉ số 0 = 1 sao ... 4 = 5 sao. */
  byStars: [number, number, number, number, number];
  /** Lý do bỏ về nhiều nhất trong các lời đánh giá đang giữ. */
  topReason?: { reason: NonNullable<CustomerReview['reason']>; count: number };
}

export function summarizeReviews(reviews: readonly CustomerReview[]): ReviewSummary {
  const byStars: ReviewSummary['byStars'] = [0, 0, 0, 0, 0];
  const reasons = new Map<NonNullable<CustomerReview['reason']>, number>();
  let total = 0;
  for (const r of reviews) {
    byStars[r.stars - 1]++;
    total += r.stars;
    if (r.reason) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
  }
  const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
  return { count: reviews.length, average: reviews.length ? total / reviews.length : 0, byStars, ...(top ? { topReason: { reason: top[0], count: top[1] } } : {}) };
}

/** Quản lý danh sách đánh giá khách hàng. Tuân theo pattern của CustomerManager: nhận dữ liệu qua constructor, không nhận `this`. */
export class ReviewsManager {
  private reviews: CustomerReview[] = [];

  constructor(initialReviews: CustomerReview[] | undefined) {
    this.reviews = sanitizeReviews(initialReviews);
  }

  public addReview(review: CustomerReview): void {
    this.reviews = appendReview(this.reviews, review);
  }

  public getReviews(): CustomerReview[] {
    return this.reviews.map(r => ({ ...r }));
  }

  public getReviewSummary(): ReviewSummary {
    return summarizeReviews(this.reviews);
  }

  /** Ghi lại reviews từ dữ liệu save (dùng trong importSaveData). */
  public importReviews(initialReviews: CustomerReview[] | undefined): void {
    this.reviews = sanitizeReviews(initialReviews);
  }

  /** Trả về bản sao sâu để serialize. */
  public exportReviews(): CustomerReview[] {
    return this.reviews.map(r => ({ ...r }));
  }
}
