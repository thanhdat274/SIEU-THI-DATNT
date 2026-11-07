import { metaRng } from '../core/rand';

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1498 — Nhà phê bình ẩm thực: thỉnh thoảng một vị sành ăn ghé khu ăn tại chỗ,
// gọi MỘT món bất kỳ trong sổ món. Phục vụ được trong khung thời gian → thưởng lớn;
// hụt hẹn → tiếng xấu đồn (mấy đánh giá 1★). "Rủi ro mở sau":
//   · từ CRITIC_UNLOCK (có khu ăn tại chỗ): ghé nhẹ nhàng — gọi món đã mở, chỉ thưởng;
//   · từ CRITIC_HARD_UNLOCK (siêu thị lớn): gọi BẤT KỲ món đã mở (kể cả món mới) + có phạt.
// ─────────────────────────────────────────────────────────────────────────────

export const CRITIC_UNLOCK = 30;
export const CRITIC_HARD_UNLOCK = 45;
/** Xác suất có nhà phê bình ghé mỗi ngày (tối đa 1 lần/ngày). */
export const CRITIC_CHANCE = 0.5;
/** Khung thời gian phục vụ (phút game) kể từ khi gọi món. */
export const CRITIC_WINDOW_MINUTES = 30;
/** GĐ1608 — chừa phút để bày món lên kệ: chỉ gọi món nấu xong trong (khung − ngần này) phút. */
export const CRITIC_SHELVE_MARGIN = 5;
export const criticCookFits = (durationMin: number | undefined) => (durationMin ?? 0) <= CRITIC_WINDOW_MINUTES - CRITIC_SHELVE_MARGIN;

export const CRITIC_REWARD_SOFT = 200_000;
export const CRITIC_REWARD_HARD = 500_000;
/** Số đánh giá 1★ khi hụt hẹn ở giai đoạn nghiêm ngặt. */
export const CRITIC_PENALTY_REVIEWS = 3;
/** GĐ1545 — phục vụ kịp ở giai đoạn nghiêm ngặt: đoàn phim lên sóng, khán giả để lại mấy đánh giá 5★ (đối xứng với phạt). */
export const CRITIC_PRAISE_REVIEWS = 3;
export const criticPraiseReviews = (hard: boolean) => (hard ? CRITIC_PRAISE_REVIEWS : 0);

/** Thưởng khi phục vụ đúng món trong khung: mức nhẹ trước cấp nghiêm ngặt, mức lớn sau đó. */
export const criticReward = (hard: boolean) => (hard ? CRITIC_REWARD_HARD : CRITIC_REWARD_SOFT);

/** GĐ1604 — giai đoạn nhẹ chỉ gọi món đã mở từ ít nhất ngần này cấp (quen tay, dễ có nguyên liệu). */
export const CRITIC_SOFT_LAG = 10;

/**
 * Chọn món nhà phê bình gọi. GĐ1604: KHÔNG bao giờ gọi món chưa mở ở cấp hiện tại —
 * trước đây giai đoạn nghiêm ngặt gọi cả món khóa cấp 100 (không thể nấu ⇒ phạt chắc chắn).
 *  · nhẹ: món đã mở từ ≥ CRITIC_SOFT_LAG cấp (rỗng thì lùi về mọi món đã mở);
 *  · nghiêm ngặt: BẤT KỲ món nào đã mở, kể cả món mới mở chưa từng nấu (đòn bẩy học món).
 */
export function pickCriticDish<R extends { outputId: string; unlock: number; station?: string }>(
  recipes: readonly R[], level: number, hard: boolean,
  /** GĐ1605 — lọc thêm như đơn điện thoại: chỉ trạm đang có trong tiệm + không trái mùa (bỏ trống = không lọc). */
  canCook: (r: R) => boolean = () => true,
): string {
  const cookable = recipes.filter((r) => r.unlock <= level && canCook(r));
  const open = cookable.length ? cookable : recipes.filter((r) => r.unlock <= level);
  const soft = open.filter((r) => r.unlock <= level - CRITIC_SOFT_LAG);
  const pool = hard ? open : soft.length ? soft : open;
  const list = pool.length ? pool : recipes;
  return list[Math.floor(metaRng() * list.length)].outputId;
}

/** GĐ1606 — câu gọi món kèm bếp đang có để nấu (người chơi biết ngay ra trạm nào); không có bếp thì giữ câu cũ. */
export const criticCallText = (dish: string, station: string | null, minutes: number) =>
  `🎩 Nhà phê bình gọi ${dish}${station ? ` (${station})` : ''} — phục vụ trong ${minutes} phút!`;
