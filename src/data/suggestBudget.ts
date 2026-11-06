/** Playtest P1 T5: ngày đầu "Điền theo gợi ý" chỉ tiêu tối đa ~40% tiền mặt — giữ vốn để không vỡ mộng ngày 1. */
export const DAY1_SUGGEST_SHARE = 0.4;

export function suggestBudget(money: number, wages: number, day: number): number {
  const free = Math.max(0, money - wages);
  return day <= 1 ? Math.min(free, Math.floor(money * DAY1_SUGGEST_SHARE)) : free;
}
