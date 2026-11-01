import { festivalOn } from './calendar';

/**
 * GĐ197 — Hôm nay con hẻm có "vào dịp" không? Các lễ hội trong `calendar` (Tết, Trung thu, 20/11...)
 * vốn chỉ đổi kinh tế ngày (traffic ×, món hot). Helper thuần đọc cùng nguồn chân lý với sim: khi có
 * lễ hội đang diễn ra thì dựng dãy cờ trang trí (`day_co`) ngang qua hẻm — "con hẻm vào dịp" hiện ra
 * bằng hình, không chỉ doanh số. Không đổi SAVE_VERSION/kinh tế/persist.
 */
export const isFestivalDeco = (day: number): boolean => festivalOn(day) !== undefined;
