/**
 * GĐ141 "Người này đáng đồng lương không?" — Bảng giá trị HÔM NAY của từng nhân viên tiệm chính
 * so với lương họ phải trả mỗi ngày. Quyết định nhân sự (thuê ai, xếp ca sáng/chiều/full, có nên
 * đào tạo/thăng chức — mỗi lần đều tăng lương) là quyết định tiền LẶP HẰNG NGÀY nhưng trước GĐ141
 * StaffPanel chỉ chìa "lương + sao + tốc độ", KHÔNG có con số "nhân viên này làm ra ~bao nhiêu so
 * với lương" — người chơi không biết thu ngân 4★ hay lao công có đáng đồng lương hay không.
 *
 * Helper này đọc HAI thứ đã sẵn, THUẦN QUAN SÁT (không đổi state/save/kinh tế/SAVE_VERSION):
 *   1. `stats.byHour` — sổ theo giờ (doanh thu + số khách mỗi giờ trong ngày, khoá là giờ 6–22).
 *   2. `staff[]` — ca làm (`SHIFTS[].from/to`) + `dailyWage` (lương đã nhân pay ca, khớp đúng cách
 *      mọi nơi khác tính lương cuối ngày).
 * Mô hình: doanh thu của một giờ được "chia đều" cho số nhân viên đang trực trong ca phủ giờ đó
 * (`onDutyCount`), mỗi nhân viên nhận tổng phần của các giờ ca mình phủ → đó là "giá trị ước tính"
 * của họ trong ngày. Ca đêm KHÔNG tính ở đây (đã có nightReport.nightPnl riêng).
 * Chỉ import hằng số + dailyWage → không có vòng lặp import.
 */
import { dailyWage, type Shift, type Staff, type StaffRole } from './staff';

/** Một giờ (theo giờ trong ngày) có thuộc ca ngày nào không; ca đêm trả null (đã có nightReport). */
export type DayShift = 'morning' | 'afternoon' | 'full';

/** Cửa sổ giờ [startH, endH) mỗi ca NGÀY; ca đêm → null (dữ liệu đêm qua midnight do nightReport xử lý). */
export function shiftHourWindow(shift: Shift): { start: number; end: number } | null {
  switch (shift) {
    case 'morning': return { start: 6, end: 14 };
    case 'afternoon': return { start: 14, end: 22 };
    case 'full': return { start: 6, end: 22 };
    default: return null; // night
  }
}

/** Doanh thu tổng (và số khách) trong cửa sổ giờ của một ca ngày — đọc from `byHour`. */
export function shiftRevenue(
  byHour: Record<number, { customers: number; revenue: number }> | undefined,
  shift: Shift,
): { revenue: number; customers: number; window: { start: number; end: number } | null } {
  const w = shiftHourWindow(shift);
  if (!w) return { revenue: 0, customers: 0, window: null };
  let revenue = 0;
  let customers = 0;
  for (let h = w.start; h < w.end; h++) {
    const line = byHour?.[h];
    if (line) {
      revenue += line.revenue;
      customers += line.customers;
    }
  }
  return { revenue, customers, window: w };
}

export type StaffVerdict = 'ok' | 'warn' | 'low' | 'nodata';

export interface StaffValue {
  id: number;
  role: StaffRole;
  shift: Shift;
  /** Lương phải trả mỗi ngày (đã nhân hệ số ca). */
  wage: number;
  /** Giá trị ước tính hôm nay (đã trừ chưa? — chưa, là doanh thu "phần" của họ). */
  value: number;
  /** value − wage. */
  net: number;
  /** value / wage (tỷ lệ thu hồi lương); NaN/Inf khi wage 0 → 0. */
  ratio: number;
  verdict: StaffVerdict;
}

/** Số nhân viên (ca ngày) đang trực trong một giờ — dùng để chia doanh thu giờ đó. */
export function onDutyCount(staff: Pick<Staff, 'shift'>[], hour: number): number {
  let n = 0;
  for (const st of staff) {
    const w = shiftHourWindow(st.shift);
    if (w && hour >= w.start && hour < w.end) n++;
  }
  return n;
}

/** Bảng giá trị từng nhân viên ca NGÀY hôm nay. Ca đêm → verdict 'nodata' (ẩn; đã có nightPnl). */
export function staffValueToday(
  byHour: Record<number, { customers: number; revenue: number }> | undefined,
  staff: Staff[],
): StaffValue[] {
  const hasData = byHour && Object.keys(byHour).length > 0;
  return staff.map((st) => {
    const w = shiftHourWindow(st.shift);
    if (!w) {
      return { id: st.id, role: st.role, shift: st.shift, wage: dailyWage(st), value: 0, net: 0, ratio: 0, verdict: 'nodata' };
    }
    const wage = dailyWage(st);
    if (!hasData) {
      return { id: st.id, role: st.role, shift: st.shift, wage, value: 0, net: -wage, ratio: 0, verdict: 'nodata' };
    }
    // Tổng phần doanh thu các giờ ca mình phủ, chia đều cho số người cùng trực giờ đó.
    let value = 0;
    for (let h = w.start; h < w.end; h++) {
      const line = byHour?.[h];
      if (!line) continue;
      const n = onDutyCount(staff, h);
      if (n > 0) value += line.revenue / n;
    }
    const net = value - wage;
    const ratio = wage > 0 ? value / wage : 0;
    const verdict: StaffVerdict = ratio >= 1 ? 'ok' : ratio >= 0.5 ? 'warn' : 'low';
    return { id: st.id, role: st.role, shift: st.shift, wage, value: Math.round(value), net: Math.round(net), ratio, verdict };
  });
}

/** Tổng hợp theo ca NGÀY (morning/afternoon/full): doanh thu ca, lương đội ca, net — để vẽ tiêu đề nhỏ. */
export function staffShiftSummary(
  byHour: Record<number, { customers: number; revenue: number }> | undefined,
  staff: Staff[],
): Record<DayShift, { revenue: number; wages: number; net: number; count: number }> {
  const out = {} as Record<DayShift, { revenue: number; wages: number; net: number; count: number }>;
  (['morning', 'afternoon', 'full'] as DayShift[]).forEach((sh) => {
    const members = staff.filter((st) => st.shift === sh);
    const rev = shiftRevenue(byHour, sh).revenue;
    const wages = members.reduce((n, st) => n + dailyWage(st), 0);
    out[sh] = { revenue: rev, wages, net: rev - wages, count: members.length };
  });
  return out;
}
