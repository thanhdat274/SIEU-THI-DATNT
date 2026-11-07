import { metaRng } from '../core/rand';

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1498 — Nhà phê bình ẩm thực: thỉnh thoảng một vị sành ăn ghé khu ăn tại chỗ,
// gọi MỘT món bất kỳ trong sổ món. Phục vụ được trong khung thời gian → thưởng lớn;
// hụt hẹn → tiếng xấu đồn (mấy đánh giá 1★). "Rủi ro mở sau":
//   · từ CRITIC_UNLOCK (có khu ăn tại chỗ): ghé nhẹ nhàng — gọi món đã mở, chỉ thưởng;
//   · từ CRITIC_HARD_UNLOCK (siêu thị lớn): gọi BẤT KỲ món nào trong game + có phạt.
// ─────────────────────────────────────────────────────────────────────────────

export const CRITIC_UNLOCK = 30;
export const CRITIC_HARD_UNLOCK = 45;
/** Xác suất có nhà phê bình ghé mỗi ngày (tối đa 1 lần/ngày). */
export const CRITIC_CHANCE = 0.5;
/** Khung thời gian phục vụ (phút game) kể từ khi gọi món. */
export const CRITIC_WINDOW_MINUTES = 30;

export const CRITIC_REWARD_SOFT = 200_000;
export const CRITIC_REWARD_HARD = 500_000;
/** Số đánh giá 1★ khi hụt hẹn ở giai đoạn nghiêm ngặt. */
export const CRITIC_PENALTY_REVIEWS = 3;
/** GĐ1545 — phục vụ kịp ở giai đoạn nghiêm ngặt: đoàn phim lên sóng, khán giả để lại mấy đánh giá 5★ (đối xứng với phạt). */
export const CRITIC_PRAISE_REVIEWS = 3;
export const criticPraiseReviews = (hard: boolean) => (hard ? CRITIC_PRAISE_REVIEWS : 0);

/** Thưởng khi phục vụ đúng món trong khung: mức nhẹ trước cấp nghiêm ngặt, mức lớn sau đó. */
export const criticReward = (hard: boolean) => (hard ? CRITIC_REWARD_HARD : CRITIC_REWARD_SOFT);

/**
 * Chọn món nhà phê bình gọi: giai đoạn nhẹ chỉ gọi món đã mở ở cấp hiện tại;
 * giai đoạn nghiêm ngặt gọi BẤT KỲ món nào trong toàn bộ sổ món (đòn bẩy học món).
 */
export function pickCriticDish(recipes: readonly { outputId: string; unlock: number }[], level: number, hard: boolean): string {
  const pool = recipes.filter((r) => hard || r.unlock <= level);
  const list = pool.length ? pool : recipes;
  return list[Math.floor(metaRng() * list.length)].outputId;
}
