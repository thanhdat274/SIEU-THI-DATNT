/**
 * Chỉ số tiến độ thành phố — City Progress Metrics (OpenSpec `civic-city-goals`, mục 1.5).
 *
 * Tách việc TRÍCH metrics thuần từ dữ liệu simulation hiện tại (DailyRecord, placements,
 * openedWaves, dân số, QoL) ra khỏi `simulation.ts`. `simulation.ts` chỉ giữ wrapper mỏng
 * (không phình thêm), và mỗi thành phần được test độc lập.
 *
 * ĐỊNH NGHĨA từng metric (ghi rõ để không bịa số):
 *  - `daily_customers`: số khách phục vụ của NGÀY VỪA KẾT THÚC. Khi gọi ở đầu ngày mới, đó là
 *    `dailyRecords[day - 1]?.customersServed` (không lấy ngày đang dở).
 *  - `building_types_open`: số LOẠI hình tòa THỰC SỰ đã mở = tiệm chính `grocery_main` + từng
 *    `typeId` có trong `buildingPlacements`. KHÔNG đếm loại mặc định chưa xây (xoi_shop,
 *    drink_shop, snack_shop, civic...) nếu chưa đặt.
 *  - `waves_opened`: số đợt khai hoang đã mở = `openedWaves.length`.
 *  - `infrastructure`: số KHU có hạ tầng = số đợt đã mở + W0. W0 (hem_dan_cu) có hạ tầng ngay từ
 *    đầu; mỗi đợt khai hoang mở đúng 1 khu mới → hạ tầng khớp với catalog mục tiêu
 *    (`cg_l3_infrastructure` = 2 = W0 + W1, ...). Định nghĩa này được ghi rõ (không phải số bịa).
 *  - `weekly_revenue`: tổng doanh thu 7 ngày gần nhất. `dailyRecords` lập chỉ mục đúng theo ngày,
 *    nên tổng `revenue` của `dailyRecords[day-6..day]`.
 *  - `total_buildings`: tổng số tòa đã đặt = `buildingPlacements.length`.
 */

import type { DailyRecord, CityGoalKind } from '@game/shared';

/** Dữ liệu thô cần thiết để tính metrics — do simulation cung cấp (trích từ state, không đổi). */
export interface CityProgressMetricsInput {
  /** Ngày vừa kết thúc (day - 1 nếu gọi ở đầu ngày mới). */
  day: number;
  /** Bản ghi ngày, chỉ mục theo đúng ngày. */
  dailyRecords: Record<number, DailyRecord>;
  /** Các loại hình tòa thực sự đang mở (gồm `grocery_main` của tiệm chính + typeId từng tòa đã đặt). */
  openedTypeIds: readonly string[];
  /** Các đợt khai hoang đã mở. */
  openedWaves: readonly string[];
  /** Tổng số tòa đã đặt. */
  totalBuildings: number;
}

/** Tính metrics tiến độ thành phố từ dữ liệu simulation hiện tại (thuần, có thể test). */
export function computeCityProgressMetrics(input: CityProgressMetricsInput): Partial<Record<CityGoalKind, number>> {
  const { day, dailyRecords, openedTypeIds, openedWaves, totalBuildings } = input;

  // daily_customers: khách của ngày vừa kết thúc (không phải ngày đang dở).
  const customersServed = dailyRecords[day]?.customersServed ?? 0;

  // building_types_open: số loại hình tòa thực sự đã mở (set để bỏ trùng).
  const buildingTypesOpen = new Set(openedTypeIds).size;

  // waves_opened.
  const wavesOpened = openedWaves.length;

  // infrastructure: số khu có hạ tầng = W0 + số đợt đã mở (mỗi đợt = 1 khu mới có hạ tầng).
  const infrastructure = wavesOpened + 1;

  // weekly_revenue: doanh thu 7 ngày gần nhất (chỉ mục theo ngày — đã đúng).
  let weeklyRevenue = 0;
  for (let d = Math.max(0, day - 6); d <= day; d++) {
    const rec = dailyRecords[d];
    if (rec) weeklyRevenue += rec.revenue ?? 0;
  }

  return {
    daily_customers: customersServed,
    building_types_open: buildingTypesOpen,
    waves_opened: wavesOpened,
    infrastructure,
    weekly_revenue: weeklyRevenue,
    total_buildings: totalBuildings,
  };
}