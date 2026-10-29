import { isWeekend } from './calendar';
import { WEEKEND_SNACKS } from './products';
import type { DayStats } from '../core/store';

// ───── GĐ266: gợi ý nhập hàng biết CUỐI TUẦN (thuần đọc) ─────
// GĐ255 cho khách thèm ăn vặt thật vào Thứ 7/CN, nhưng "✨ nên nhập" (suggestQty) chỉ nhìn
// doanh thu TRUYỀN — chiều thứ Sáu người chơi chưa thấy gợi ý cao hơn cho nhóm này. Helper
// này trả hệ số kéo cầu cho món ăn vặt khi khung bán của lô hàng rơi vào cuối tuần, để
// suggestQty nhân thêm (ước lượng — đúng tính chất "gợi ý" của con số, không đổi kinh tế).

/** Hệ số kéo cầu cuối tuần cho nhóm ăn vặt (khớp bậc với xác suất 0.2 của nhánh chooseWants GĐ255). */
export const WEEKEND_PULL = 1.25;

/** Khung bán của lô hàng có rơi vào Thứ 7/CN không? Không giao chậm → bán hôm nay; giao sáng mai
 * (delayDays > 0) → bán ngày mai + ngày kia (khớp forecastTraffic — OrderPanel). */
export const weekendSellingDays = (today: number, delayDays: number): boolean =>
  delayDays > 0 ? isWeekend(today + 1) || isWeekend(today + 2) : isWeekend(today);

/** Hệ số nhân mục tiêu nhập: chỉ khi (1) lô bán vào cuối tuần, (2) món có cầu thật (đã có người
 * mua/hỏi — món mới nhập thử thì khỏi nhân), (3) món thuộc nhóm ăn vặt GĐ255. */
export const weekendPullOf = (productId: string, demand: number, sellingWeekend: boolean): number =>
  sellingWeekend && demand > 0 && WEEKEND_SNACKS.includes(productId) ? WEEKEND_PULL : 1;

// ───── GĐ268: phản hồi cuối ngày CUỐI TUẦN ─────
// Nhịp cuối tuần GĐ254–267 đã khép từ kế hoạch (teaser tối thứ Sáu) đến hành động (quest + khách
// thèm + gợi ý nhập) — còn thiếu PHẢN HỒI: tối CN/Thứ 7 người chơi chưa thấy nhóm ăn vặt gộp lại
// ra bao nhiêu so với mục tiêu. Helper đọc sổ bán của ngày vừa kết thúc, đối chiếu đúng mục tiêu
// quest (weekendQuestTarget). Thuần đọc, không đổi kinh tế.

export interface WeekendRecap {
  /** Số món ăn vặt bán được hôm nay. */
  sold: number;
  /** Doanh thu nhóm ăn vặt hôm nay (đ). */
  value: number;
  /** % doanh thu hôm nay đến từ nhóm ăn vặt (0–100). */
  sharePct: number;
  /** Mục tiêu quest "Cuối tuần ăn vặt" theo cấp. */
  target: number;
  /** Đủ mục tiêu chưa. */
  met: boolean;
}

export function weekendRecap(stats: DayStats, level: number, questTarget: number): WeekendRecap {
  let sold = 0;
  let value = 0;
  for (const id of WEEKEND_SNACKS) {
    const line = stats.byItem?.[id];
    if (!line) continue;
    sold += line.qty;
    value += line.revenue;
  }
  const revenue = stats.revenue ?? 0;
  return {
    sold,
    value,
    sharePct: revenue > 0 ? Math.round((value / revenue) * 100) : 0,
    target: questTarget,
    met: sold >= questTarget,
  };
}
