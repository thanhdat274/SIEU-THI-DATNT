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
  if ((prog?.visits ?? 0) <= 0) return { error: 'Chưa quen — chờ khách ghé lần đầu' }; // GĐ1574
  if (prog?.lastGiftDay === day) return { error: 'Hôm nay đã tặng rồi' };
  const id = def.favorites.find((f) => productById(f).unlock <= level && (storage[f] ?? 0) > 0);
  if (id) return { productId: id };
  // GĐ1598 — đã biết món khách thích thì gọi tên để nhập đúng hàng
  const known = def.favorites.find((f) => productById(f).unlock <= level && prog?.discovered?.includes(f));
  return { error: known ? 'Kho hết ' + productById(known).name + ' — nhập thêm để tặng' : 'Kho không có món khách thích' };
}

// GĐ1558 — tặng đúng ngày sinh nhật khách: thân thiết gấp đôi (+6).
export const giftFriendship = (birthday: boolean): number => REGULAR_GIFT_FRIENDSHIP * (birthday ? 2 : 1);

// GĐ1559 — đếm khách quen (đã gặp) còn tặng được hôm nay, hiện ở đầu sổ khách quen.
export function giftableCount(
  defs: RegularDef[], regulars: Record<string, RegularProgress>, level: number, day: number, storage: Record<string, number>,
): number {
  return defs.filter((d) => 'productId' in regularGiftPlan(d, regulars[d.id], level, day, storage)).length;
}

// GĐ1563 — xếp sổ khách quen (cấp ≥38): sinh nhật hôm nay trước, rồi khách còn tặng được; giữ thứ tự gốc trong nhóm.
export function sortForGift(
  defs: RegularDef[], regulars: Record<string, RegularProgress>, level: number, day: number,
  storage: Record<string, number>, birthday: (d: RegularDef) => boolean,
): RegularDef[] {
  if (level < REGULAR_GIFT_LEVEL) return defs;
  const rank = (d: RegularDef) => (birthday(d) ? 0 : 'productId' in regularGiftPlan(d, regulars[d.id], level, day, storage) ? 1 : 2);
  return defs.map((d, i) => ({ d, i, r: rank(d) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.d);
}

/** GĐ1586 — dòng báo cáo cuối ngày: số quà đã tặng khách quen (null nếu chưa tặng). */
export function giftReportLine(gifts: number | undefined): string | null {
  return gifts && gifts > 0 ? gifts + ' món' : null;
}

/** GĐ1587 — dòng đầu bảng Khách quen: còn tặng được bao nhiêu, đã tặng bao nhiêu hôm nay. */
export function giftPanelLine(left: number, gifts: number | undefined): string {
  const done = gifts ?? 0;
  return '🎁 Hôm nay còn tặng quà được ' + left + ' khách quen' + (done > 0 ? ' · đã tặng ' + done : '');
}

/** GĐ1588 — tặng quà đúng sinh nhật khách quen được thêm 30 XP (ngày thường 0). */
export function giftXp(birthday: boolean): number {
  return birthday ? 30 : 0;
}

/** GĐ1595 — đuôi thông báo sau khi tặng: còn tặng được bao nhiêu khách hôm nay. */
export function giftRemainNote(left: number): string {
  return left > 0 ? ' · còn tặng được ' + left + ' khách' : ' · hôm nay đã tặng hết';
}
