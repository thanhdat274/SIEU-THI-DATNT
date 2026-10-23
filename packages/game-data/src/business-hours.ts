/**
 * Luật giờ bán hàng + pha đêm của một ngày game (OpenSpec `staff-shifts`).
 * Ngày bắt đầu 07:00 (`GameClock.advanceToNextDay`), cửa đóng 22:00, pha đêm 22:00–06:00, chốt ngày ở 06:00.
 * Chế độ sinh hoạt ngày (routine) mở cửa 08:00 theo `DAILY_SCHEDULE` và về nhà 23:30.
 */
export const BUSINESS_HOURS = { openHour: 7, closeHour: 22 } as const;

/** Giờ bắt đầu pha đêm (22:00). */
export const NIGHT_START_HOUR = 22;

/** Giờ kết thúc pha đêm / chốt ngày (06:00). 00:00–06:00 vẫn thuộc ngày N. */
export const NIGHT_END_HOUR = 6;

/**
 * Hệ số tốc độ ban đêm (đề xuất, chưa playtest): 1 giây thực ban đêm trôi nhanh gấp ×3 số phút game so với ban ngày.
 * Áp MỘT nguồn trong `GameClock` nên client và `WorldRuntime` cho cùng kết quả; không ghi vào save.
 */
export const NIGHT_TIME_SCALE_MULTIPLIER = 3;

/** Có phải giờ ban đêm (22:00–06:00) không. */
export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}
