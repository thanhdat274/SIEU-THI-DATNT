// ───── Việc hôm nay: một bảng, đúng thứ tự (GĐ76) ─────
// Sổ đầu ngày chồng ~12 thẻ phẳng + nhiệm vụ ngày ở panel riêng + gợi ý sản xuất ở OrderPanel → mọi
// nhắc chuẩn bị ngày bị PHÂN MẢNH 3 bề mặt, không xếp thứ tự, không khử trùng (cùng hàng thiếu bị nhắc
// 2-3 lần ở Đón lễ + hot + Nên hôm nay + chi nhánh). Helper này gộp mọi "ứng viên việc sáng" thành một
// danh sách THUẦN ĐỌC, ưu tiên + khử trùng + cap — cho người mới một mục tiêu rõ, cho kỳ cựu mồi
// "vào sáng dứt trọn". Không import store/không đụng kinh tế/save/coopGuard.

export interface DayAction {
  icon: string;
  text: string;
  panel: string;
  /** Việc bức thiết (mất tiền/ca đêm/hợp đồng hạn) → xếp đầu. */
  danger: boolean;
  /** Độ ưu tiên trong tầng: càng nhỏ xếp trước. */
  priority: number;
}

export const DAYPLAN_CAP = 7;

/**
 * Gộp các ứng viên việc sáng thành danh sách ưu tiên, khử trùng, giới hạn `cap`.
 * Sắp: danger trước (giữ thứ tự priority), rồi non-danger theo priority. Cùng text chính xác thì giữ bản đầu.
 */
export function planDay(candidates: DayAction[], cap = DAYPLAN_CAP): DayAction[] {
  const seen = new Set<string>();
  const out: DayAction[] = [];
  for (const c of candidates) {
    const key = `${c.icon}${c.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out
    .sort((a, b) => (a.danger === b.danger ? a.priority - b.priority : a.danger ? -1 : 1))
    .slice(0, cap);
}

/** Số việc được coi là "đã dứt" (hoàn thành xong/không còn bức thiết) — do panel truyền count đã xong. */
export const planDoneRatio = (actions: DayAction[], done: number): string =>
  `${done}/${actions.length}`;
