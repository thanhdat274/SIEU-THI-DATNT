import type { DailyRecord } from '@game/shared';

export const GAME_YEAR_DAYS = 365;

/**
 * Chính sách thuế hộ kinh doanh bán hàng hóa dùng trong game. Mọi số liệu nằm ở đây để chỉnh/tùy biến một chỗ.
 *
 * `household_2026` theo tổng hợp tra cứu (ChatGPT Deep Research, đối chiếu NĐ 68/2026/NĐ-CP sửa bởi NĐ 141/2026/NĐ-CP, hiệu lực 01/01/2026;
 * Luật 09/2026/QH16; VBHN 25/2026/VBHN-BTC): doanh thu năm ≤ 1 tỷ không chịu GTGT/TNCN; trên 1 tỷ, nhóm phân phối/cung cấp hàng hóa
 * chịu GTGT 1% và TNCN 0,5%. Đây là nguồn thứ cấp **chưa được đối chiếu với văn bản gốc**; cách xác định doanh thu tính thuế,
 * thời điểm phát sinh và kỳ khai/nộp được **đơn giản hóa** (xem `pitBase`), nên đây là mô phỏng game, không phải tư vấn pháp lý.
 * Quy tắc trong `TaxRuleRegistry` vẫn UNVERIFIED và không được kích hoạt bởi chính sách này.
 */
export interface TaxPolicy {
  id: string;
  name: string;
  /** Doanh thu năm tối đa mà không chịu thuế (VND). Vượt mới chịu thuế. */
  threshold: number;
  vatRate: number;
  pitRate: number;
  /** TNCN tính trên toàn bộ doanh thu năm (`all`, theo ví dụ trong tổng hợp tra cứu) hay chỉ phần vượt ngưỡng (`excess`). GTGT luôn tính trên toàn bộ. */
  pitBase: 'all' | 'excess';
  note: string;
  /** Kiểm tra thuế bất ngờ (game, chuyển thể từ game tham khảo tap-hoa-dau-hem); không phải quy định pháp lý. */
  audit: TaxAuditPolicy;
}

export interface TaxAuditPolicy {
  /** Cứ mỗi chừng này ngày game (ngày chia hết) có một lần gieo xúc xắc kiểm tra. */
  intervalDays: number;
  /** Xác suất bị kiểm tra mỗi lần gieo. */
  chance: number;
  /** Cộng thêm xác suất khi đang khai bớt. */
  underDeclareExtraChance: number;
  /** Tỷ lệ thuế phải nộp bị giấu khi chọn khai bớt. */
  underDeclarePct: number;
  /** Tiền phạt = phần thuế bị giấu × hệ số này (ngoài khoản truy thu). */
  evasionFineMul: number;
  /** Chỉ bị để ý khi doanh thu năm đạt tỷ lệ này của ngưỡng miễn thuế. */
  minRevenueRatio: number;
  /** Điểm danh tiếng cộng khi sổ sách sạch, và trừ khi bị phát hiện khai bớt. */
  cleanReputation: number;
  evasionReputation: number;
}

export const DEFAULT_TAX_AUDIT: TaxAuditPolicy = {
  intervalDays: 30, chance: 0.15, underDeclareExtraChance: 0.15, underDeclarePct: 0.3, evasionFineMul: 1,
  minRevenueRatio: 0.5, cleanReputation: 3, evasionReputation: 8,
};

export const TAX_POLICIES: Record<string, TaxPolicy> = {
  household_2026: {
    id: 'household_2026', name: 'Hộ kinh doanh bán hàng hóa (theo quy định 2026, đơn giản hóa)',
    threshold: 1_000_000_000, vatRate: 0.01, pitRate: 0.005, pitBase: 'all',
    note: 'NĐ 68/2026 sửa bởi NĐ 141/2026: ≤ 1 tỷ/năm miễn; trên 1 tỷ GTGT 1% + TNCN 0,5%. Nguồn thứ cấp, chưa đối chiếu văn bản gốc.',
    audit: DEFAULT_TAX_AUDIT,
  },
  // Ngưỡng thấp để người chơi sớm gặp thuế khi chơi thử; chỉ để tùy biến, không phải quy định thật.
  game_early: {
    id: 'game_early', name: 'Thuế sớm (tùy biến trong game)',
    threshold: 100_000_000, vatRate: 0.01, pitRate: 0.005, pitBase: 'all',
    note: 'Tùy biến: ngưỡng 100 triệu để thuế xuất hiện sớm; không phải quy định hiện hành.',
    audit: DEFAULT_TAX_AUDIT,
  },
};

export const ACTIVE_TAX_POLICY_ID = 'household_2026';
export const ACTIVE_TAX_POLICY: TaxPolicy = TAX_POLICIES[ACTIVE_TAX_POLICY_ID];

/** Ngưỡng và thuế suất của chính sách đang dùng (giữ tên cũ cho giao diện). */
export const HOUSEHOLD_TAX_EXEMPT_THRESHOLD = ACTIVE_TAX_POLICY.threshold;
export const HOUSEHOLD_TAX_RATE = ACTIVE_TAX_POLICY.vatRate + ACTIVE_TAX_POLICY.pitRate;

export interface AnnualRevenueSummary {
  year: number;
  revenue: number;
  /** Ngưỡng miễn thuế của chính sách (VND/năm). */
  threshold: number;
  progress: number;
  /** true nếu doanh thu vượt ngưỡng → cần áp dụng thuế. */
  taxActive: boolean;
  /** Tổng thuế ước tính cho cả năm = GTGT + TNCN. */
  estimatedTax: number;
  vat: number;
  pit: number;
  /** Tổng thuế đã thực tế khấu trừ từ đầu năm. */
  taxPaidYear: number;
  /** Thuế đã khai bớt trong năm mà chưa bị truy thu. */
  taxHiddenYear: number;
  policy: TaxPolicy;
}

/** Số thuế năm theo chính sách cho một mức doanh thu năm; 0 nếu chưa vượt ngưỡng (bằng ngưỡng vẫn miễn). */
export function annualTaxFor(revenue: number, policy: TaxPolicy = ACTIVE_TAX_POLICY): { vat: number; pit: number; total: number } {
  if (revenue <= policy.threshold) return { vat: 0, pit: 0, total: 0 };
  const vat = Math.round(revenue * policy.vatRate);
  const pit = Math.round((policy.pitBase === 'all' ? revenue : revenue - policy.threshold) * policy.pitRate);
  return { vat, pit, total: vat + pit };
}

/** Tổng doanh thu và thuế đã nộp trong năm game chứa `day`, kèm thuế ước tính theo `policy`. Mô phỏng game, không phải tư vấn pháp lý. */
export function summarizeAnnualRevenue(records: Record<number, DailyRecord>, day: number, currentRecord?: DailyRecord, policy: TaxPolicy = ACTIVE_TAX_POLICY): AnnualRevenueSummary {
  const year = Math.floor((Math.max(1, day) - 1) / GAME_YEAR_DAYS) + 1;
  const first = (year - 1) * GAME_YEAR_DAYS + 1;
  const last = year * GAME_YEAR_DAYS;
  const merged: Record<number, DailyRecord> = { ...records };
  if (currentRecord) merged[currentRecord.day] = currentRecord;

  let revenue = 0;
  let taxPaidYear = 0;
  let hidden = 0;
  let backPaid = 0;
  for (const record of Object.values(merged)) {
    if (record.day < first || record.day > last) continue;
    revenue += record.revenue;
    taxPaidYear += record.taxPaid ?? 0;
    hidden += record.taxHidden ?? 0;
    backPaid += record.taxBackPaid ?? 0;
  }

  const tax = annualTaxFor(revenue, policy);
  return {
    year,
    revenue,
    threshold: policy.threshold,
    progress: revenue > 0 ? Math.min(1, revenue / policy.threshold) : 0,
    taxActive: revenue > policy.threshold,
    estimatedTax: tax.total,
    vat: tax.vat,
    pit: tax.pit,
    taxPaidYear,
    taxHiddenYear: Math.max(0, hidden - backPaid),
    policy,
  };
}

/**
 * Thuế phải trừ khi đóng `day`: thuế năm theo chính sách tính trên doanh thu năm đến hết ngày này, trừ phần các ngày khác đã nộp.
 * Ngày vượt ngưỡng nộp bù phần các ngày trước; các ngày sau chỉ nộp phần tăng thêm. Không phụ thuộc `taxPaid` của chính ngày đang đóng
 * nên đóng lại cùng ngày không nộp trùng; sang năm mới đếm lại từ đầu.
 */
export function taxDueOnClose(records: Record<number, DailyRecord>, day: number, currentRecord: DailyRecord, policy: TaxPolicy = ACTIVE_TAX_POLICY): number {
  const annual = summarizeAnnualRevenue(records, day, currentRecord, policy);
  if (!annual.taxActive) return 0;
  const first = (annual.year - 1) * GAME_YEAR_DAYS + 1;
  const last = annual.year * GAME_YEAR_DAYS;
  let paidOtherDays = 0;
  for (const record of Object.values(records)) {
    // Phần khai bớt vẫn tính là đã được xác định; không để nó dồn sang ngày sau như chưa nộp.
    if (record.day >= first && record.day <= last && record.day !== day) paidOtherDays += (record.taxPaid ?? 0) + (record.taxHidden ?? 0);
  }
  return Math.max(0, annual.estimatedTax - paidOtherDays);
}
