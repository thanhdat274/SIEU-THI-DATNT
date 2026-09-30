import type { DailyRecord } from '@game/shared';
import { TAX_RESEARCH_2026 } from './research';

export const GAME_YEAR_DAYS = 365;

export interface AnnualRevenueSummary {
  year: number;
  revenue: number;
  /** Ngưỡng tham khảo (đồng); null nếu không có. Chưa được xác minh nên không dùng để trừ thuế. */
  referenceThreshold: number | null;
  /** 0..1, phần đã đạt của ngưỡng tham khảo. */
  progress: number;
  verified: false;
  note: string;
}

/** Tổng doanh thu trong năm game chứa `day`. Chỉ báo cáo, tuyệt đối không tạo khoản nợ thuế. */
export function summarizeAnnualRevenue(records: Record<number, DailyRecord>, day: number, currentRecord?: DailyRecord): AnnualRevenueSummary {
  const year = Math.floor((Math.max(1, day) - 1) / GAME_YEAR_DAYS) + 1;
  const first = (year - 1) * GAME_YEAR_DAYS + 1;
  const last = year * GAME_YEAR_DAYS;
  const merged: Record<number, DailyRecord> = { ...records };
  if (currentRecord) merged[currentRecord.day] = currentRecord;
  let revenue = 0;
  for (const record of Object.values(merged)) if (record.day >= first && record.day <= last) revenue += record.revenue;
  const threshold = TAX_RESEARCH_2026.rules.find(rule => rule.taxType === 'VAT')?.threshold ?? null;
  return {
    year, revenue, referenceThreshold: threshold,
    progress: threshold ? Math.min(1, revenue / threshold) : 0,
    verified: false,
    note: 'Chưa đủ căn cứ tính thuế: chỉ theo dõi doanh thu năm so với ngưỡng tham khảo, không trừ tiền.',
  };
}
