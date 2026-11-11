import type { ReactNode } from 'react';

/**
 * Ngân sách Sổ đầu ngày (SPEC-TOI-UU §T6-L5): tối đa MORNING_CARD_CAP thẻ hiện thẳng,
 * thẻ thứ 7 trở đi gập vào "Xem thêm N mục". Thứ tự theo `prio` (nhỏ = gấp hơn, hiện trước),
 * không theo thứ tự viết code. Thẻ không có việc thì đã không được đưa vào danh sách ở
 * MorningPanel (mỗi mục chỉ xuất hiện khi điều kiện của nó đúng).
 */

/** Số thẻ tối đa hiện thẳng trên Sổ đầu ngày. */
export const MORNING_CARD_CAP = 6;

export interface MorningCardEntry {
  /** Ổn định — dùng làm key React. */
  id: string;
  /** Mức gấp: nhỏ hơn = hiện trước (thang 0 gấp nhất → 100 rảnh nhất). */
  prio: number;
  node: ReactNode;
}

export interface MorningBudget {
  visible: MorningCardEntry[];
  rest: MorningCardEntry[];
}

/** Xếp thẻ theo mức gấp rồi chia 6 hiện thẳng / còn lại "Xem thêm". Đưa lên đây để test được. */
export function budgetMorning(cards: MorningCardEntry[]): MorningBudget {
  const sorted = [...cards].sort((a, b) => a.prio - b.prio || a.id.localeCompare(b.id));
  return { visible: sorted.slice(0, MORNING_CARD_CAP), rest: sorted.slice(MORNING_CARD_CAP) };
}
