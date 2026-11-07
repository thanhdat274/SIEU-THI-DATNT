import { productById } from './products';
import type { RegularDef, RegularProgress } from './regulars';

// GĐ1557 — Tặng quà khách quen (tham khảo cẩm nang HappyTown "mỗi cư dân nhận quà 1 lần/ngày"):
// lấy 1 món khách thích (đã mở ở cấp hiện tại) từ kho tặng → +3 thân thiết. Mỗi khách 1 lần/ngày,
// từ cấp 38. Ngày tặng ghi trong RegularProgress (trường tuỳ chọn — save cũ an toàn).
export const REGULAR_GIFT_LEVEL = 38;
export const REGULAR_GIFT_FRIENDSHIP = 3;

export type GiftPlan = { productId: string } | { error: string };

export function regularGiftPlan(
  def: RegularDef, prog: RegularProgress | undefined, level: number, day: number, storage: Record<string, number>,
): GiftPlan {
  if (level < REGULAR_GIFT_LEVEL) return { error: `Mở ở cấp ${REGULAR_GIFT_LEVEL}` };
  if (prog?.lastGiftDay === day) return { error: 'Hôm nay đã tặng rồi' };
  const id = def.favorites.find((f) => productById(f).unlock <= level && (storage[f] ?? 0) > 0);
  return id ? { productId: id } : { error: 'Kho không có món khách thích' };
}

// GĐ1558 — tặng đúng ngày sinh nhật khách: thân thiết gấp đôi (+6).
export const giftFriendship = (birthday: boolean): number => REGULAR_GIFT_FRIENDSHIP * (birthday ? 2 : 1);

// GĐ1559 — đếm khách quen (đã gặp) còn tặng được hôm nay, hiện ở đầu sổ khách quen.
export function giftableCount(
  defs: RegularDef[], regulars: Record<string, RegularProgress>, level: number, day: number, storage: Record<string, number>,
): number {
  return defs.filter((d) => 'productId' in regularGiftPlan(d, regulars[d.id], level, day, storage)).length;
}
