import { isWeekend } from './calendar';
import type { Weather } from './weather';

/**
 * Sạp hàng rong ở Ngõ 2 (GĐ501, bước 3 mở rộng bản đồ): thuê lô trống, mỗi lô một sạp bán ngoài trời.
 * Trời mưa/bão sạp nghỉ (ngoài trời không bán được — lý do tiệm xôi thành nhà ở GĐ483); cuối tuần đông hơn.
 */
export const SAP_LOTS = 4;
export const SAP_LOT_COST = 5_000_000;
export const SAP_BASE_INCOME = 300_000;

/** Lãi ròng một ngày của các sạp đã thuê (0 khi mưa/bão). */
export function sapRongIncome(lots: number | undefined, weather?: Weather, day?: number): number {
  const n = Math.max(0, Math.min(SAP_LOTS, lots ?? 0));
  if (!n || weather === 'rain' || weather === 'storm') return 0;
  return Math.round(n * SAP_BASE_INCOME * (day !== undefined && isWeekend(day) ? 1.3 : 1));
}
