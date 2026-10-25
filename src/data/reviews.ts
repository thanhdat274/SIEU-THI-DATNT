/** Lời khách nhận xét sau mỗi lượt ghé tiệm. */
export type ReviewReason = 'stock' | 'price' | 'wait' | 'expired';

export interface Review {
  id: number;
  day: number;
  /** Phút trong ngày lúc khách để lại lời. */
  minute: number;
  stars: number;
  author: string;
  text: string;
  /** Lý do chê chính (không có = khách hài lòng). */
  reason?: ReviewReason;
  /** Món liên quan: món hết hàng / giá cao, hoặc món đắt nhất trong giỏ. */
  productId?: string;
}

/** Giữ bao nhiêu lời gần nhất. */
export const REVIEW_CAP = 60;
/** Tỉ lệ khách chịu để lại lời. */
export const REVIEW_CHANCE = 0.45;

export const REASON_LABEL: Record<ReviewReason, string> = {
  stock: 'hết hàng',
  price: 'giá cao',
  wait: 'chờ lâu',
  expired: 'hàng cận hạn',
};

const AUTHORS = [
  'Cô Hoa', 'Chú Ba', 'Anh Tư xe ôm', 'Bà Năm', 'Chị Lan', 'Bé Na', 'Anh Khoa', 'Cô giáo Mai',
  'Chú bảo vệ', 'Chị bán xôi', 'Ông Sáu', 'Em Vy', 'Anh shipper', 'Dì Bảy', 'Cậu Tí', 'Chị Thảo',
];

const BY_STARS: Record<number, string[]> = {
  5: ['Tiệm sạch, đủ món, tính tiền lẹ. Sẽ quay lại!', 'Mua gì cũng có, chủ tiệm vui vẻ.', 'Ghé cái là mua được liền, quá tiện.', 'Tiệm đầu ngõ mà bày hàng gọn như siêu thị.'],
  4: ['Mua được đủ đồ, chỉ hơi đông chút.', 'Ổn áp, lần sau ghé tiếp.', 'Hàng ngon, giá được.', 'Tiệm dễ thương, tìm hàng hơi lâu tí.'],
  3: ['Cũng tạm, thiếu vài món.', 'Bình thường, không có gì đặc biệt.', 'Mua được nửa danh sách thôi.'],
  2: ['Lần này về tay không mấy món, hơi buồn.', 'Không như mong đợi.'],
  1: ['Đi một vòng không mua được gì.', 'Thất vọng thật sự.'],
};

const BY_REASON: Record<ReviewReason, string[]> = {
  stock: ['Tìm {product} mãi không thấy, kệ trống trơn.', 'Hết {product} rồi, phải chạy qua tiệm khác.', 'Kệ {product} trống, nhập thêm đi chủ ơi.'],
  price: ['{product} bán đắt quá, chợ rẻ hơn nhiều.', 'Giá {product} chát quá, thôi không mua.', 'Định mua {product} mà nhìn giá phải bỏ xuống.'],
  wait: ['Đứng chờ tính tiền cả buổi không ai ra quầy.', 'Xếp hàng lâu quá, bỏ giỏ về luôn.', 'Quầy không có người, chờ mỏi chân.'],
  expired: ['Lô {product} nhìn cận hạn quá, ngại mua.', '{product} mai hết hạn rồi, nhập ít thôi chủ ơi.', 'Hạn {product} ngắn quá mà không giảm nhiều, thôi bỏ.'],
};

const EXTRA_GOOD = ['Có {product} ngon lắm.', 'Mua được {product} đúng loại cần.'];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Soạn lời nhận xét. Không có lý do chê thì chọn câu theo số sao,
 * có lý do thì câu chính nói đúng lý do đó (nhắc tên món).
 */
export function composeReview(input: {
  id: number; day: number; minute: number; stars: number;
  reason?: ReviewReason; productId?: string; productName?: string;
}): Review {
  const fill = (t: string) => t.replace('{product}', input.productName ?? 'món cần mua');
  let text = fill(pick(input.reason ? BY_REASON[input.reason] : BY_STARS[input.stars]));
  if (!input.reason && input.stars >= 4 && input.productName && Math.random() < 0.4) text += ' ' + fill(pick(EXTRA_GOOD));
  return {
    id: input.id, day: input.day, minute: input.minute, stars: input.stars, author: pick(AUTHORS), text,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.productId ? { productId: input.productId } : {}),
  };
}

/** Điểm trung bình và số lời theo từng mức sao (chỉ số 0 = 1 sao). */
export function summarizeReviews(reviews: Review[]) {
  const byStars = [0, 0, 0, 0, 0];
  for (const r of reviews) byStars[r.stars - 1]++;
  const average = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;
  const reasons = new Map<ReviewReason, number>();
  for (const r of reviews) if (r.reason) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
  const top = [...reasons].sort((a, b) => b[1] - a[1])[0];
  return { average, byStars, count: reviews.length, topReason: top ? { reason: top[0], count: top[1] } : null };
}

/** Một món được khen/bị chê bao nhiêu lần trong các lời gần nhất. */
export interface ProductReviews {
  productId: string;
  /** Lời khen: 4–5★ không kèm lý do chê. */
  praise: number;
  /** Lời chê nhắc món này kèm lý do (hết hàng, giá cao...). */
  complaint: number;
}

/** Tổng hợp theo từng món: món bị chê nhiều nhất (nhập/bày/điều giá liền) và món được khen nhiều nhất (giữ chất lượng). */
export function productSummary(reviews: Review[], top = 3): { worst: ProductReviews[]; best: ProductReviews[] } {
  const map = new Map<string, ProductReviews>();
  for (const r of reviews) {
    if (!r.productId) continue;
    const line = map.get(r.productId) ?? { productId: r.productId, praise: 0, complaint: 0 };
    if (r.reason) line.complaint++;
    else if (r.stars >= 4) line.praise++;
    map.set(r.productId, line);
  }
  const all = [...map.values()];
  const worst = all.filter((p) => p.complaint > 0).sort((a, b) => b.complaint - a.complaint || b.praise - a.praise).slice(0, top);
  const best = all.filter((p) => p.praise > 0).sort((a, b) => b.praise - a.praise || a.complaint - b.complaint).slice(0, top);
  return { worst, best };
}
