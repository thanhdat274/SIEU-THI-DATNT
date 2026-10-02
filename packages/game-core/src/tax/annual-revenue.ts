import type { DailyRecord } from '@game/shared';

export const GAME_YEAR_DAYS = 365;

/** Hộ cá thể/tạp hóa đầu hẻm: ngưỡng miễn thuế (100M VND doanh thu/năm). */
export const HOUSEHOLD_TAX_EXEMPT_THRESHOLD = 100_000_000;

/** Thuế suất gộp VAT + TNCN cho hộ cá thể dưới 1 tỷ VND/năm.
 * Nghị quyết 95/2024/QH15 — mức khoán 1% đơn giản, game-friendly. */
export const HOUSEHOLD_TAX_RATE = 0.01; // 1%

export interface AnnualRevenueSummary {
  year: number;
  revenue: number;
  /** Ngưỡng miễn thuế (100M VND). */
  threshold: number;
  progress: number;
  /** true nếu doanh thu vượt ngưỡng → cần áp dụng thuế. */
  taxActive: boolean;
  /** Số thuế ước tính cho năm (1% phần trên 100M, hoặc 1% toàn bộ nếu khoán). */
  estimatedTax: number;
  /** Tổng thuế đã thực tế khấu trừ từ đầu năm. */
  taxPaidYear: number;
}

/** Tính tổng doanh thu trong năm game chứa `day`.
 * Trả về summary + số thuế ước tính theo Nghị quyết 95/2024/QH15:
 * ≤ 100M VND/năm: miễn thuế
 * > 100M VND/năm: 1% khoán trên doanh thu (VAT + TNCN gộp).
 *
 * Lưu ý: đây là tính game-friendly, không phải tư vấn pháp lý.
 */
export function summarizeAnnualRevenue(records: Record<number, DailyRecord>, day: number, currentRecord?: DailyRecord): AnnualRevenueSummary {
  const year = Math.floor((Math.max(1, day) - 1) / GAME_YEAR_DAYS) + 1;
  const first = (year - 1) * GAME_YEAR_DAYS + 1;
  const last = year * GAME_YEAR_DAYS;
  const merged: Record<number, DailyRecord> = { ...records };
  if (currentRecord) merged[currentRecord.day] = currentRecord;

  let revenue = 0;
  let taxPaidYear = 0;
  for (const record of Object.values(merged)) {
    if (record.day < first || record.day > last) continue;
    revenue += record.revenue;
    taxPaidYear += record.taxPaid ?? 0;
  }

  const crossed = revenue > HOUSEHOLD_TAX_EXEMPT_THRESHOLD;
  // Khoán 1% trên toàn bộ doanh thu khi vượt ngưỡng (đơn giản hóa cho game)
  const estimatedTax = crossed ? Math.round(revenue * HOUSEHOLD_TAX_RATE) : 0;
  const progress = revenue > 0 ? Math.min(1, revenue / HOUSEHOLD_TAX_EXEMPT_THRESHOLD) : 0;

  return {
    year,
    revenue,
    threshold: HOUSEHOLD_TAX_EXEMPT_THRESHOLD,
    progress,
    taxActive: crossed,
    estimatedTax,
    taxPaidYear,
  };
}

/** Tính thuế 1% cho một ngày cụ thể khi đã vượt ngưỡng miễn thuế.
 * Trả về số thuế cần trừ trong ngày đó (1% của doanh thu ngày).
 * Dùng khi đóng ngày để cập nhật DailyRecord. */
export function calculateDailyTax(dailyRevenue: number, taxActive: boolean): number {
  if (!taxActive) return 0;
  return Math.round(dailyRevenue * HOUSEHOLD_TAX_RATE);
}
