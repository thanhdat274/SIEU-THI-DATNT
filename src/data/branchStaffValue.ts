/**
 * Bảng giá trị nhân viên TIỆN LỢI 24/7 (GĐ142 "Chi nhánh đáng đồng lương?"): nối tiếp GĐ141 (staffValue.ts,
 * bảng giá trị ca ngày tiệm chính) sang CHI NHÁNH — nhân viên chi nhánh thuê/xếp ca/điều quân truyền-giữa-hai-tiệm
 * là quyết định tiền lặp hằng ngày (lương chi nhánh trả mỗi đêm) nhưng BranchRoster chỉ hiện lương + mệt, không
 * trả lời "người này ở chi nhánh bán được bao nhiêu vs lương, đáng xếp ca/điều sang không".
 * THUẦN QUAN SÁT — nhân bản đúng mô hình GĐ141 (chia đều doanh thu giờ cho số người trực giờ đó), đọc:
 *   - branch.hourly?  : mảng revenue-từng-giờ-trong-ngày (index = giờ-trong-ngày 0..23, branches.ts:88; ghi ở
 *     core/slices/branch.ts:203 bán quầy + :248 app giao đêm), KHÁC stats.byHour của tiệm chính (khóa là object).
 *   - branch.staff[]   : ca làm (BRANCH_SHIFTS: morning/afternoon/night) + wage + role.
 *   - dailyWage        : lương đã nhân pay ca (night ×1.5), staff.ts:95.
 * KHÔNG đổi state/save/kinh tế. Chỉ import hằng số + type + dailyWage (không cycle).
 */
import { dailyWage, SHIFTS, type Shift, type Staff } from './staff';

/** Giờ-trong-ngày (0..23) mà một ca ở CHI NHÁNH phủ. Ca đêm vắt qua nửa đêm (22h→6h sáng hôm sau). */
export function branchShiftHours(shift: Shift): number[] {
  const def = SHIFTS[shift];
  const hours: number[] = [];
  for (let m = def.from; m < def.to; m += 60) {
    hours.push(Math.floor((m % 1440) / 60));
  }
  return hours;
}

/** Số nhân viên chi nhánh đang trực giờ-trong-ngày `hour` (theo ca của từng người). */
export function onDutyBranch(staff: Staff[], hour: number): number {
  return staff.filter((st) => branchShiftHours(st.shift).includes(hour)).length;
}

/** Doanh thu chi nhánh giờ-trong-ngày `hour` (an toàn khi hourly undefined / ngoài 0..23). */
const hourRevenue = (hourly: number[] | undefined, hour: number): number =>
  hourly && hour >= 0 && hour < hourly.length ? (hourly[hour] ?? 0) : 0;

export interface BranchStaffValue {
  id: number;
  role: string;
  shift: Shift;
  wage: number;
  value: number;
  net: number;
  ratio: number;
  verdict: 'ok' | 'warn' | 'low' | 'nodata';
}

/**
 * Giá trị ước tính hôm nay của TỪNG nhân viên chi nhánh so với lương:
 * `value` = Σ qua các giờ ca mình trực của `hourly[h] ÷ onDutyBranch(h)` (chia đều cho người cùng trực giờ đó —
 * ước tính GĐ141, không phải chính xác), `wage` = dailyWage (đã gồm pay ca), `net = value − wage`,
 * `ratio = value/wage`; verdict theo ratio: ≥1 'ok', ≥0.5 'warn', còn lại 'low'. Không có giờ dữ liệu (chưa mở
 * cửa/bán hay hourly rỗng) → 'nodata' (UI ẩn dòng).
 */
export function branchStaffValueToday(staff: Staff[], hourly: number[] | undefined): BranchStaffValue[] {
  const hasData = hourly !== undefined && hourly.some((v) => v > 0);
  return staff.map((st) => {
    const wage = dailyWage(st);
    if (!hasData) return { id: st.id, role: st.role, shift: st.shift, wage, value: 0, net: 0, ratio: 0, verdict: 'nodata' };
    let value = 0;
    for (const h of branchShiftHours(st.shift)) {
      const k = onDutyBranch(staff, h);
      if (k > 0) value += hourRevenue(hourly, h) / k;
    }
    const net = Math.round(value) - wage;
    const ratio = wage > 0 ? Math.round(value) / wage : 0;
    const verdict: BranchStaffValue['verdict'] = ratio >= 1 ? 'ok' : ratio >= 0.5 ? 'warn' : 'low';
    return { id: st.id, role: st.role, shift: st.shift, wage, value: Math.round(value), net, ratio, verdict };
  });
}

export interface BranchShiftSum {
  revenue: number;
  wages: number;
  net: number;
  count: number;
}

/**
 * Tóm tắt theo từng ca chi nhánh (morning/afternoon/night): doanh thu = Σ hourly trong giờ ca đó; lương = Σ
 * dailyWage của người xếp ca; net = revenue − wages; count = số người xếp ca. Giúp thấy ca nào đang nguồn lợi,
 * ca nào lỗ cả tiền lương (đặc biệt ca đêm ×1.5).
 */
export function branchShiftSummary(hourly: number[] | undefined, staff: Staff[]): Record<string, BranchShiftSum> {
  const out: Record<string, BranchShiftSum> = {};
  for (const sh of ['morning', 'afternoon', 'night'] as const) {
    const members = staff.filter((st) => st.shift === sh);
    const revenue = branchShiftHours(sh).reduce((sum, h) => sum + hourRevenue(hourly, h), 0);
    const wages = members.reduce((sum, st) => sum + dailyWage(st), 0);
    out[sh] = { revenue, wages, net: revenue - wages, count: members.length };
  }
  return out;
}
