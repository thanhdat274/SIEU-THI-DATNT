import { isWeekend } from './calendar';

// GĐ1555 — "Cuối tuần thưởng nhiều hơn" (tham khảo cẩm nang HappyTown): quà điểm danh rơi vào
// thứ 7/CN được thêm 25% tiền (XP giữ nguyên). Từ cấp 37 (> golden 30).
export const WEEKEND_GIFT_LEVEL = 37;
export const WEEKEND_GIFT_MUL = 1.25;

export function weekendGift<T extends { money?: number; label: string }>(gift: T, level: number, day: number): T {
  if (level < WEEKEND_GIFT_LEVEL || !isWeekend(day) || !gift.money) return gift;
  return { ...gift, money: Math.round((gift.money * WEEKEND_GIFT_MUL) / 1000) * 1000, label: `${gift.label} (cuối tuần +25%)` };
}
