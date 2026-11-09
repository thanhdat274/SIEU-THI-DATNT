import { productById } from './products';

/**
 * GĐ1829 — OpenSpec `khach-thay-mon-het-hang` (review người chơi R2): khi món khách muốn hết hàng,
 * khách có thể lấy một món khác TRÊN CÙNG KỆ, giá không vượt dung sai so với món muốn, với xác suất
 * cố định. Cổng xác suất giữ một phần bài học "châm kệ" — không phải mọi lượt hết hàng đều được cứu.
 */
export const SUBSTITUTE_CHANCE = 0.6;
/** Món thay được chấp nhận khi giá chuẩn ≤ giá món muốn × dung sai (mì 5k vẫn nhận nước 6k). */
export const SUBSTITUTE_PRICE_TOLERANCE = 1.5;

/** Cấu trúc tối thiểu của một kệ — thuần, không import store để tránh vòng phụ thuộc. */
export interface ShelfLike {
  tiers: ReadonlyArray<{ productId: string | null; count: number }>;
}

/**
 * Chọn món thay thế trên kệ khách đang đứng. Tất định: cùng seed → cùng kết quả.
 * - Ứng viên: món khác `want`, còn hàng, giá chuẩn ≤ giá của `want` × SUBSTITUTE_PRICE_TOLERANCE
 *   (cùng kệ nên cùng priceBonus — so giá chuẩn là so tương đối đúng).
 * - Cổng xác suất: `rng() >= SUBSTITUTE_CHANCE` → không thay.
 * - Thứ tự ưu tiên: cùng phân loại → món hot/dịp lễ → món đầu tiên còn hàng theo tầng kệ.
 * - `shelf` undefined (khách không đứng trước kệ nào) → null, không tốn lượt rng.
 */
export function chooseSubstitute(
  want: string,
  shelf: ShelfLike | undefined,
  priceOf: (id: string) => number,
  hotIds: ReadonlySet<string>,
  rng: () => number,
): string | null {
  if (!shelf) return null;
  const wantPrice = priceOf(want);
  const cands = shelf.tiers.filter(
    (t): t is { productId: string; count: number } =>
      !!t.productId && t.productId !== want && t.count > 0 && priceOf(t.productId) <= wantPrice * SUBSTITUTE_PRICE_TOLERANCE,
  );
  if (!cands.length) return null;
  if (rng() >= SUBSTITUTE_CHANCE) return null;
  const wantCat = productById(want).category;
  const same = cands.find((t) => productById(t.productId).category === wantCat);
  if (same) return same.productId;
  const hot = cands.find((t) => hotIds.has(t.productId));
  if (hot) return hot.productId;
  return cands[0].productId;
}
