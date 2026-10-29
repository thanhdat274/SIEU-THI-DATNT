import { isWeekend } from './calendar';
import { WEEKEND_SNACKS } from './products';

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
