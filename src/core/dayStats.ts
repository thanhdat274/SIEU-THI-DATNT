/** Sổ thống kê trong ngày (DayStats), dòng lịch sử và hàm nhỏ đi kèm; tách từ gameTypes.ts (GĐ983). */
import type { MissLog } from '../data/advice';
import type { PaymentMethod } from '../data/payments';
import type { ReviewReason } from '../data/reviews';

export interface DayStats {
  revenue: number;
  spent: number;
  wages: number;
  /** Hàng hết hạn phải bỏ đi đêm qua: số món và tiền vốn (đã tính trong chi tiêu lúc nhập). */
  spoiledItems?: number;
  spoiledCost?: number;
  itemsSold: number;
  customers: number;
  unhappy: number;
  xp: number;
  /** Sổ bán theo món: số lượng, tiền thu, vốn (theo giá nhập chuẩn). */
  byItem?: Record<string, ItemLine>;
  /** Số lần khách không mua được một món, theo lý do; `wait` là bỏ về vì chờ quầy lâu. */
  missed?: Partial<Record<ReviewReason, number>>;
  /** Lỡ bán theo từng món ("lý do:mã món"), để gợi ý việc cần làm. */
  missLog?: MissLog;
  /** Tiền khách quen ghi sổ hôm nay (đã tính vào doanh thu, chưa vào két) và tiền nợ thu về. */
  credited?: number;
  repaid?: number;
  /** Tiền lời dịch vụ ở quầy (nạp tiền, thu hộ) hôm nay. */
  services?: number;
  /** Tiền lời dịch vụ hôm nay theo từng dịch vụ (GĐ66 — để xem dịch vụ nào đáng). */
  byService?: Record<string, number>;
  /** Số combo bán ra và tiền đã giảm cho combo. */
  combos?: number;
  comboDiscount?: number;
  /** Tiền nhà/chi phí cố định trả cuối ngày theo bậc tiệm. */
  rent?: number;
  /** Số lời hẹn giữ món được giữ đúng hôm nay (để đo nhiệm vụ ngày). */
  reservationsFilled?: number;
  /** Sổ theo giờ (khoá là giờ trong ngày, 6–22): số khách ghé và tiền thu. */
  byHour?: Record<number, HourLine>;
  /** Tiền vào theo từng hình thức thanh toán: doanh thu và số lượt (kể cả ghi sổ). */
  byMethod?: Partial<Record<PaymentMethod, { revenue: number; count: number }>>;
  /** Phí giao dịch ví điện tử / máy POS trừ đi hôm nay. */
  fees?: number;
  /** Thất thoát không rõ nguyên nhân (nhân viên gian lận chưa bị bắt): tiền két và số món. */
  shrinkCash?: number;
  shrinkItems?: number;
  /** Bán online hôm nay: tiền về (sau hoa hồng) và phí Grab. */
  online?: number;
  grabFees?: number;
  /** Doanh thu đơn ĐIỆN THOẠI hôm nay (tiền + boa đã thu) — nhờ có 🛵 người giao mới mở kênh này (GĐ1181). */
  phone?: number;
  /** Số đơn app giao tới tay khách hôm nay (đo nhiệm vụ ngày). */
  onlineDone?: number;
  /** Số nông sản thu hoạch được hôm nay (đo nhiệm vụ ngày). */
  farmHarvest?: number;
  /** Số bài chủ tiệm đăng lên mạng xã hội hôm nay (đo nhiệm vụ ngày). */
  socialPosts?: number;
  /** Số đơn nấu món nhà làm đã giao hôm nay (đo nhiệm vụ ngày). */
  cookOrders?: number;
  /** Số lời khen 5★ nhận hôm nay (đo thử thách tuần). */
  fiveStars?: number;
  /** Thưởng nhiệm vụ (nhiệm vụ ngày + chuyện) đã nhận hôm nay — tích lũy lúc claim, reset theo ngày.
   *  GĐ1178 "soi sáng": giúp tổng kết so "lãi bán hàng thật" với thưởng nhiệm vụ + kèo (Luật 10).
   *  Field tuỳ chọn — bản save cũ tự bù undefined qua `?? 0`, không lên SAVE_VERSION. */
  questIncome?: number;
}

/** Lãi gộp trong ngày: (tiền thu − vốn) theo sổ bán từng món + lời dịch vụ quầy. */
export const daySalesProfit = (stats: DayStats) =>
  Object.values(stats.byItem ?? {}).reduce((n, l) => n + l.revenue - l.cost, 0) + (stats.services ?? 0);

export interface HourLine { customers: number; revenue: number }

export const addHour = (byHour: DayStats['byHour'], minutes: number, customers: number, revenue: number) => {
  const h = Math.floor(minutes / 60);
  const line = byHour?.[h] ?? { customers: 0, revenue: 0 };
  return { ...byHour, [h]: { customers: line.customers + customers, revenue: line.revenue + revenue } };
};

export interface ItemLine {
  qty: number;
  revenue: number;
  cost: number;
}

/** Một dòng lịch sử để vẽ biểu đồ mấy ngày gần đây. */
/** Việc sáng 🧍 đã tính sẵn (GĐ300) — hình dạng khớp `DayAction` nhưng khai báo ở đây để
 *  `gameTypes` không phải import `data/staffIdle` (staffIdle đã import DayStats từ file này). */
export interface MorningShiftNote {
  icon: string;
  text: string;
  panel: string;
  danger: boolean;
  priority: number;
}

export interface DayRecord {  day: number;
  revenue: number;
  profit: number;
  /** Lãi bán hàng: lãi gộp sổ bán + lời dịch vụ − lương − tiền nhà (không trừ tiền nhập kho/đầu tư).
   *  `profit` trừ cả tiền nhập hàng nên hầu như ngày nào cũng âm — không dùng làm thước đo sức bán. */
  salesProfit?: number;
  customers: number;
  unhappy: number;
  /** Sao trung bình của các đánh giá trong ngày; không ai chấm thì bỏ trống. */
  rating?: number;
}

/** Số ngày giữ trong lịch sử. */
export const HISTORY_DAYS = 30;

export const emptyStats = (): DayStats => ({ revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 });
