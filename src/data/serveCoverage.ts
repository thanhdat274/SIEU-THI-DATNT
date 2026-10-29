/**
 * GĐ237 "Giờ nào đông mà vắng người bán?" — soi độ phủ nhân sự theo giờ so với lượng khách thật.
 *
 * staffValue (GĐ141) trả lời "NHÂN VIÊN này đáng lương không" (gán doanh thu/giờ cho từng người);
 * chưa ai trả lời "GIỜ nào quá tải / vắng người kịp" — quyết định xếp ca sáng/chiều/nguyên ngày.
 * Helper này đọc THUẦN state sẵn có:
 *   - `stats.byHour` — số khách mỗi giờ (6–22).
 *   - `staff[].shift` — ca làm (a.morning 6–14, a.afternoon 14–22:30, a.full 6–22:30).
 * Với mỗi giờ: onDuty = số nhân viên đang trực (dùng `shiftHourWindow` — trùng cách staffValue), load =
 * customers / onDuty. Không RNG, không đổi state/save/kinh tế — con số quan sát.
 */
import { shiftHourWindow } from './staffValue';
import type { Shift } from './staff';

/** Một giờ được coi là "đông khách" khi ≥ mức này — để đáng cảnh báo khi vắng người trực. */
export const SERVE_CROWD_MIN = 25;

/** Số giờ đông nhất được liệt kê trong bảng (top khách). */
export const SERVE_TOP_HOURS = 3;

export interface ServeHour {
  hour: number;
  customers: number;
  onDuty: number;
  /** customers / onDuty (null khi không ai trực). */
  load: number | null;
  /** Giờ đông (customers ≥ SERVE_CROWD_MIN) nhưng không ai đứng quầy → rủi ro bỏ về vì chờ. */
  crowdedVacant: boolean;
}

export interface ServeCoverage {
  /** Các giờ 6–22, kể cả giờ 0 khách. */
  rows: ServeHour[];
  /** Giờ đông khách nhất (khách nhiều nhất) — null nếu không có khách. */
  peak: ServeHour | null;
  /** Những giờ đông nhất có người trực (top SERVE_TOP_HOURS, để xem giờ nào tải cao nhất). */
  busiestStaffed: ServeHour[];
  /** Giờ đông mà KHÔNG ai trực → kê khai vắng người. */
  vacantBusy: ServeHour[];
  verdict: 'empty' | 'warn' | 'ok';
}

export function serveCoverage(opts: {
  staff: { shift: Shift }[];
  byHour: Record<number, { customers: number }> | undefined;
}): ServeCoverage {
  const { staff, byHour } = opts;

  const rows: ServeHour[] = [];
  for (let h = 6; h <= 22; h++) {
    const customers = byHour?.[h]?.customers ?? 0;
    let onDuty = 0;
    for (const s of staff) {
      const w = shiftHourWindow(s.shift);
      if (w && h >= w.start && h < w.end) onDuty++;
    }
    const crowdedVacant = customers >= SERVE_CROWD_MIN && onDuty === 0;
    rows.push({
      hour: h,
      customers,
      onDuty,
      load: onDuty > 0 ? customers / onDuty : null,
      crowdedVacant,
    });
  }

  const withCustomers = rows.filter((r) => r.customers > 0);
  if (withCustomers.length === 0) return { rows, peak: null, busiestStaffed: [], vacantBusy: [], verdict: 'empty' };

  const byCustomers = [...withCustomers].sort((a, b) => b.customers - a.customers);
  const peak = byCustomers[0];
  const busiestStaffed = byCustomers.filter((r) => r.onDuty > 0).slice(0, SERVE_TOP_HOURS);
  const vacantBusy = byCustomers.filter((r) => r.crowdedVacant);
  const verdict = vacantBusy.length > 0 ? 'warn' : 'ok';

  return { rows, peak, busiestStaffed, vacantBusy, verdict };
}
