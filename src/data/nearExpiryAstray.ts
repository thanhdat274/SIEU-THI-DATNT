/**
 * GĐ1303 — "Bán hàng cận hạn đang âm thầm tụt sao 'Chất lượng món' của danh tiếng?"
 *
 * spoilRisk (GĐ212) đo TIỀN rủi ro nếu không bán kịp hàng cận hạn; CHƯA ai đo cái giá
 * DANH TIẾNG khi mình BÁN hàng cận hạn: itemQuality(id, nearExpiry) = 0.4 mà hàng tươi
 * = 0.8 (reputation.ts:31). Mỗi lượt khách mua phải món cận hạn thì sample `quality`
 * của lượt đó chỉ ở mức trung bình quanh 0.4 (thay vì 0.8) → kéo mặt 'Chất lượng món'
 * của danh tiếng xuống, mà người chơi giảm giá cận hạn để lấy lại vốn KHÔNG thấy.
 *
 * Helper THUẦN: đếm các lượt khách "lạc khỏi chất lượng" (bị cận hạn kéo) và so sao
 * chất lượng hiện tại với giả sử các lượt đó mua hàng tươi (cận TRÊN trung thực).
 *
 * Ngưỡng trung thực: món KHÔNG cận hạn luôn ≥ 0.6 (hàng thường 0.8; món nhà làm
 * 0.6 + 0.1×độ ngon ≥ 0.6) — nên một sample có quality ≤ 0.5 CHẮC CHẮN chứa món cận hạn.
 * Ngược lại sample > 0.5 vẫn có thể chứa cận hạn trộn với hàng tươi (không đếm được
 * chính xác) — hàm chỉ khẳng định số lượt CHẮC CHẮN bị kéo, không bịa tổng (Nguyên tắc c).
 *
 * Không import store (co-op an toàn), không đổi state / SAVE_VERSION / kinh tế / persist.
 */
import { REP_MIN_SAMPLES, type RepSample } from './reputation';

/** Ngưỡng sample không thể đạt nếu không có món cận hạn (món tươi/an toàn ≥ 0.6). */
export const NEAR_EXPIRY_GRADE = 0.4;
export const NEAR_EXPIRY_FLOOR = 0.5;
/** Điểm chất lượng món TƯƠI thường dùng để so (thay cho sample bị kéo). */
export const FRESH_GRADE = 0.8;

export interface NearExpiryAstray {
  /** Số lượt chắc chắn mua phải hàng cận hạn (quality ≤ 0.5) trong log. */
  dragged: number;
  /** Tổng lượt có mua hàng (có chấm 'quality'). */
  total: number;
  /** 1–5★ 'Chất lượng món' hiện tại; null khi chưa đủ mẫu (không bịa). */
  qualityStar: number | null;
  /** 1–5★ nếu các lượt bị kéo thay bằng hàng tươi (cận trên trung thực); null khi thiếu mẫu. */
  freshStar: number | null;
}

const stars = (v: number) => 1 + 4 * v;

/**
 * Bóc tách mức "lạc chất lượng" vì cận hạn ra sao. `log` là danh sách lượt khách gần
 * nhất (mảng RepSample, có thể có phần tử thiếu `quality` — khách không mua gì).
 * Trả qualityStar/freshStar = null khi chưa đủ 10 lượt có chấm chất lượng để nói thật.
 */
export function nearExpiryAstray(log: RepSample[] | undefined): NearExpiryAstray {
  const vals = (log ?? []).map((s) => s.quality).filter((v): v is number => v !== undefined);
  const total = vals.length;
  const dragged = vals.filter((v) => v <= NEAR_EXPIRY_FLOOR).length;
  if (total === 0) return { dragged: 0, total: 0, qualityStar: null, freshStar: null };
  const real = total < REP_MIN_SAMPLES ? null : stars(vals.reduce((a, b) => a + b, 0) / total);
  const freshMean =
    vals.reduce((a, b) => a + (b <= NEAR_EXPIRY_FLOOR ? FRESH_GRADE : b), 0) / total;
  const fresh = total < REP_MIN_SAMPLES ? null : stars(freshMean);
  return { dragged, total, qualityStar: real, freshStar: fresh };
}
