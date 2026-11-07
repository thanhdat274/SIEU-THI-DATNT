import { FESTIVALS, festivalOn } from './calendar';
import type { FurnitureDef } from './furniture';

/** GĐ1513 — món chỉ bán theo dịp: hôm nay có mua được không (món thường luôn true). */
export const festivalShopOpen = (def: Pick<FurnitureDef, 'festival'>, day: number): boolean =>
  !def.festival || festivalOn(day)?.id === def.festival;
/** Tên dịp bán của món (để hiện "Chỉ bán dịp …"), undefined nếu món thường. */
export const festivalShopName = (def: Pick<FurnitureDef, 'festival'>): string | undefined =>
  def.festival ? FESTIVALS.find((f) => f.id === def.festival)?.name ?? def.festival : undefined;

/**
 * GĐ197 — Hôm nay con hẻm có "vào dịp" không? Các lễ hội trong `calendar` (Tết, Trung thu, 20/11...)
 * vốn chỉ đổi kinh tế ngày (traffic ×, món hot). Helper thuần đọc cùng nguồn chân lý với sim: khi có
 * lễ hội đang diễn ra thì dựng dãy cờ trang trí (`day_co`) ngang qua hẻm — "con hẻm vào dịp" hiện ra
 * bằng hình, không chỉ doanh số. Không đổi SAVE_VERSION/kinh tế/persist.
 */
export const isFestivalDeco = (day: number): boolean => festivalOn(day) !== undefined;
