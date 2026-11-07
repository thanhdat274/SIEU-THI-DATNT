import { dailyWage, type Staff } from './staff';

/** GĐ1525 — lưới an toàn lương (Việt hoá "nhân viên mặc định miễn lương khi cháy túi", Midnight C3):
 *  cuối ngày nếu tiền trong két (sau tiền nhà) không đủ trả lương, người làm lâu nhất (id nhỏ nhất)
 *  thông cảm bỏ qua lương hôm nay — chỉ phần thiếu, không quá lương của họ. Thuần, tất định. */
export function wageRelief(cash: number, wages: number, staff: Staff[]): number {
  if (!staff.length || cash >= wages) return 0;
  const first = staff.reduce((a, b) => (b.id < a.id ? b : a));
  return Math.max(0, Math.min(dailyWage(first), wages - Math.max(0, cash)));
}
