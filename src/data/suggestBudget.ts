/** Playtest P1 T5: ngày đầu "Điền theo gợi ý" chỉ tiêu tối đa ~40% tiền mặt — giữ vốn để không vỡ mộng ngày 1. */
export const DAY1_SUGGEST_SHARE = 0.4;

/**
 * GĐ1514 — `minCase` = giá 1 thùng món gợi ý rẻ nhất. Trần 40% ngày 1 không được thấp hơn mức đó,
 * nếu không ngày lễ đẩy giá (Tết dương lịch +3%: thùng bánh 122.400đ > trần 120.000đ) làm nút điền ra 0đ
 * và người mới kẹt ngay bước đầu (QA save trắng audit GĐ1514).
 *
 * GĐ1823 (review người chơi R1/R3) — `minTotal` = giá trọn bộ 3 món hướng dẫn ngày đầu (mỗi món 1 thùng,
 * ví dụ Tết: 316.200đ). Banner bảo "nhập 3 món trước" thì nút gợi ý phải điền được đủ bộ đó — vốn đầu
 * (360k, store.ts) đã nâng lên đủ; trần 40% chỉ còn là sàn, không được chặn bộ hướng dẫn nữa.
 */
export function suggestBudget(money: number, wages: number, day: number, minCase = 0, minTotal = 0): number {
  const free = Math.max(0, money - wages);
  return day <= 1 ? Math.min(free, Math.max(Math.floor(money * DAY1_SUGGEST_SHARE), minCase, minTotal)) : free;
}
