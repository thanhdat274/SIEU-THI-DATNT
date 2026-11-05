// ───── GĐ1276 — Lòng trung thành theo phân khúc: nghề nào đang bị hụt món ưa / chê ─────
// Hệ nhu cầu đã soi được SỐ khách/khung (counterDemand) và AI ghé (professionDemand GĐ1272), nhưng
// chưa nối ngược về "ai đang BỊ HỤT": sổ analytics (analytics.items[id][].lost — 30 ngày gần) ghi lượt
// tìm món mà không mua được, và reviews (60 lời gần) ghi lời chê theo `productId + reason` — đều KHÔNG
// kèm nghề. Vì khách theo nghề mua chủ yếu MÓN ƯA của nghề (professionWants), ta trung thực quy mỗi
// phân khúc về `likes` (món họ ưa, đã mở khóa + đúng mùa) rồi đo: số lượt tìm món ưa lỡ bán (lost) +
// số lời chê nhắc món ưa (theo lý do) → cho chủ biết "nhóm khách nào đang khó mua thứ họ cần, nên nuôi".
// Helper này THUẦN ĐỌC: không import store (co-op an toàn), không đổi kinh tế/save/seed (Luật 5 an toàn).
import { PROFESSIONS, type ProfessionDef } from './professions';
import { offSeason } from './calendar';
import { productById } from './products';
import type { Review, ReviewReason } from './reviews';
import type { AnalyticsState } from './analytics';

/** Lời chê theo lý do (chỉ các lý do nhắc món — 'stock'/'price'/'expired'). */
export interface SegmentHit {
  reason: ReviewReason;
  count: number;
}

export interface SegmentHurt {
  profession: ProfessionDef;
  /** Lượt tìm MÓN ƯA của nghề mà lỡ bán trong cửa sổ gần (khách nghề này không mua được). */
  lost: number;
  /** Món ưa của nghề (mở khóa + đúng mùa) đang bị lỡ bán / nhắc trong lời chê. */
  affectedLikes: string[];
  /** Lời chê nhắc món ưa của nghề (reviews có reason + productId ∈ likes), theo lý do. */
  complaints: SegmentHit[];
  /** Tổng tín hiệu hụt (lost + Σ complaints) — để xếp hạng. */
  hurtScore: number;
}

const COMPLAINT_REASONS: ReviewReason[] = ['stock', 'price', 'expired'];

/** Món ưa của nghề đang mở khóa + đúng mùa (khớp professionWants ở customers.ts). */
export function likedProducts(p: ProfessionDef, level: number, day: number): string[] {
  return p.likes.filter((id) => productById(id)?.unlock <= level && !offSeason(id, day));
}

/**
 * Gộp lượt tìm món mà lỡ bán theo MÓN trong cửa sổ `days` ngày gần (cửa sổ mặc định 7 — "tuần này"),
 * từ sổ analytics (mỗi món có chuỗi ngày với `lost`). THUẦN — chỉ cộng số có sẵn, không đổi state.
 */
export function recentLostByProduct(analytics: AnalyticsState | undefined, day: number, days = 7): Record<string, number> {
  const out: Record<string, number> = {};
  if (!analytics?.items) return out;
  const floor = day - days;
  for (const [id, recs] of Object.entries(analytics.items)) {
    let n = 0;
    for (const r of recs) if (r.day > floor && r.lost > 0) n += r.lost;
    if (n > 0) out[id] = n;
  }
  return out;
}

/**
 * Đo mức "bị hụt" của từng phân khúc khách theo nghề dựa trên dữ liệu THẬT:
 * - `lostByProduct` (thường từ recentLostByProduct — "tuần này"): lượt tìm món ưa của nghề mà lỡ bán;
 * - `reviews`: lời chê nhắc món ưa của nghề (reason + productId ∈ likes).
 * Xếp theo `hurtScore` giảm dần; trả các phân khúc có hurtScore > 0 (không ồn khi ai cũng ổn).
 * THUẦN — cùng đầu vào ⇒ cùng kết quả, không RNG/state.
 */
export function segmentHurt(opts: {
  level: number;
  day: number;
  lostByProduct?: Record<string, number>;
  reviews?: Review[];
}): SegmentHurt[] {
  const { level, day, lostByProduct, reviews } = opts;
  const out: SegmentHurt[] = [];

  for (const p of PROFESSIONS) {
    const likes = likedProducts(p, level, day);
    if (!likes.length) continue;

    // 1) Lượt tìm món ưa mà lỡ bán trong cửa sổ gần
    let lost = 0;
    const affected = new Set<string>();
    for (const id of likes) {
      const n = lostByProduct?.[id] ?? 0;
      if (n > 0) { lost += n; affected.add(id); }
    }

    // 2) Lời chê nhắc món ưa của nghề (reason có sẵn, productId ∈ likes)
    const perReason = new Map<ReviewReason, number>();
    for (const r of reviews ?? []) {
      if (r.reason && r.productId && likes.includes(r.productId)) {
        perReason.set(r.reason, (perReason.get(r.reason) ?? 0) + 1);
        affected.add(r.productId);
      }
    }
    const complaints: SegmentHit[] = [...perReason.entries()]
      .filter(([, n]) => n > 0)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const hurtScore = lost + complaints.reduce((n, c) => n + c.count, 0);
    if (hurtScore > 0) {
      out.push({ profession: p, lost, affectedLikes: [...affected], complaints, hurtScore });
    }
  }

  return out.sort((a, b) => b.hurtScore - a.hurtScore);
}

/** Nhãn lý do chê dùng trong dòng 💡 (gọn cho dòng thẻ). */
export const HIT_LABEL: Record<ReviewReason, string> = {
  stock: 'hết hàng', price: 'chê đắt', wait: 'chờ lâu', expired: 'cận hạn',
};
