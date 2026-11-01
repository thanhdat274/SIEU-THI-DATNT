/**
 * GĐ144 "🌙 Ca đêm ai xứng đồng lương?" — Bảng giá trị HÔM NAY của TỪNG nhân viên CA ĐÊM tiệm chính
 * so với lương họ phải trả (lương ca đêm ×1.5 + giảm good_boss). Nối tiếp GĐ141 (staffValue.ts — bảng ca
 * NGÀY tiệm chính) và GĐ142 (branchStaffValue.ts — chi nhánh gồm cả ca đêm); riêng ca đêm TIỆM CHÍNH
 * GĐ141 cố ý bỏ trống ("đã có nightPnl riêng") — nhưng nightPnl chỉ cho verdict GỘP cả đêm, không tách
 * từng người. Người chơi đầu tư 15M mở ca đêm (upgrades, cấp 55) trả lương ×1.5 (khoản nhân lực đắt
 * nhất game) mà KHÔNG biết ai thực sự kiếm lại đồng lương đó, ai là gánh nặng → góc "nhân sự lạnh"
 * cuối cùng còn lại của trục giá trị-vs-lương.
 *
 * THUẦN QUAN SÁT — nhân bản đúng mô hình GĐ141 (chia đều doanh thu giờ cho số người trực giờ đó), đọc:
 *   1. `stats.byHour` — sổ theo giờ tiệm chính (khóa = giờ TRONG NGÀY KÉO DÀI; ngày bắt đầu 6h (DAY_START),
 *      nối tiếp qua nửa đêm tới 30h = 0h–6h hôm sau; nên mọi giờ đêm ghi trong sổ đều là giờ ≥22 — khớp
 *      `isNightHour` của nightReport.ts).
 *   2. `staff[]` ca đêm (shift 'night') — `dailyWage` đã nhân pay 1.5.
 *   3. `skills` — good_boss giảm lương đêm ×0.9 (khớp `nightWageOf` để "lương" phản ánh TIỀN NGƯỜI CHƠI
 *      THỰC SỰ TRẢ, không phải mức niêm yết).
 * KHÔNG đổi state/save/kinh tế/SAVE_VERSION. Chỉ import hằng số + type + dailyWage + hasSkill + isNightHour
 * (không import module kinh doanh → không vòng lặp import).
 */
import { dailyWage, type Shift, type Staff, type StaffRole } from './staff';
import { hasSkill } from './titles';
import { isNightHour } from './nightReport';

/** Cửa sổ giờ KÉO DÀI ca đêm tiệm chính: [22, 31) — mọi giờ ≥22 cho tới hết ngày kéo dài (30h). */
export const NIGHT_START = 22;
export const NIGHT_END = 31;

/** Giờ kéo dài `hour` có thuộc ca đêm tiệm chính không (ủy thác isNightHour: ≥22). */
export const inNightWindow = (hour: number) => isNightHour(hour);

/** Số nhân viên CA ĐÊM tiệm chính đang trực trong một giờ đêm — dùng để chia đều doanh thu giờ đó. */
export function onDutyNight(staff: Pick<Staff, 'shift'>[], hour: number): number {
  if (!isNightHour(hour)) return 0;
  let n = 0;
  for (const st of staff) if (st.shift === 'night') n++;
  return n;
}

/** Lương THỰC TRẢ của một nhân viên ca đêm (dailyWage đã nhân pay 1.5; good_boss giảm ×0.9 khớp nightWageOf). */
export function nightWagePaying(st: Staff, skills: readonly string[] | undefined): number {
  return Math.round(dailyWage(st) * (hasSkill(skills ?? [], 'good_boss') ? 0.9 : 1));
}

export interface NightStaffValue {
  id: number;
  role: StaffRole;
  shift: Shift;
  /** Lương thực trả ngày (đã nhân pay 1.5 + giảm good_boss). */
  wage: number;
  /** Giá trị ước tính đêm qua (doanh thu "phần" của họ sau chia đều). */
  value: number;
  /** value − wage. */
  net: number;
  /** value / wage; 0 khi wage 0. */
  ratio: number;
  verdict: 'ok' | 'warn' | 'low' | 'nodata';
}

/**
 * Bảng giá trị từng nhân viên CA ĐÊM tiệm chính so với lương: `value` = Σ qua các giờ đêm (22..30) của
 * `byHour[h].revenue ÷ onDutyNight(h)`; `wage` = nightWagePaying (thực trả); `net`/`ratio`/`verdict` theo
 * GĐ141. Không có giờ dữ liệu đêm (chưa mở ca đêm / chưa bán đêm / byHour trống) → 'nodata' (UI ẩn dòng).
 */
export function nightStaffValueToday(
  byHour: Record<number, { customers?: number; revenue: number }> | undefined,
  staff: Staff[],
  skills?: readonly string[],
): NightStaffValue[] {
  const hasNightData = byHour && Object.keys(byHour).some((h) => isNightHour(Number(h)) && (byHour[Number(h)]?.revenue ?? 0) > 0);
  return staff
    .filter((st) => st.shift === 'night')
    .map((st) => {
      const wage = nightWagePaying(st, skills);
      if (!hasNightData) {
        return { id: st.id, role: st.role, shift: st.shift, wage, value: 0, net: 0, ratio: 0, verdict: 'nodata' };
      }
      let value = 0;
      for (let h = NIGHT_START; h < NIGHT_END; h++) {
        const line = byHour?.[h];
        if (!line || !line.revenue) continue;
        const n = onDutyNight(staff, h);
        if (n > 0) value += line.revenue / n;
      }
      const net = Math.round(value) - wage;
      const ratio = wage > 0 ? Math.round(value) / wage : 0;
      const verdict: NightStaffValue['verdict'] = ratio >= 1 ? 'ok' : ratio >= 0.5 ? 'warn' : 'low';
      return { id: st.id, role: st.role, shift: st.shift, wage, value: Math.round(value), net, ratio, verdict };
    });
}
