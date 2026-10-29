import type { Staff, StaffRole, Shift } from './staff';
import { ROLES, SHIFTS } from './staff';
import type { StaffDayStat } from '../core/slices/staffDay';

// ───── GĐ246: soi nhân viên rảnh bao nhiêu (THUẦN ĐỌC, dữ liệu transient từ staffDay) ─────
// Các thẻ giá trị lương (GĐ141/142/144/188) ước từ DOANH THU. Bản này bổ sung mảnh thiếu: trong ca,
// người đó BẬN bao nhiêu, RẢNH bao nhiêu — đóng nợ mở "thời gian rảnh chỉ có ở runtime". Rảnh nhiều
// = vai đó dư người (cân nhắc bớt ca/vai); bận liền tay = cân nhắc thêm người. Thu ngân/bảo vệ/chăm
// khách là vai HIỆN DIỆN (trực quầy/đứng cửa/đi hỏi thăm chính là việc — %rảnh ~0 luôn, không có ý
// nghĩa quyết định) → loại khỏi bảng như phụ trại; giá trị của họ xem GĐ141/144/237.

export type IdleVerdict = 'busy' | 'balanced' | 'idle_heavy';

/** Vai hiện diện: %rảnh cấu trúc ~0, không đưa vào bảng rảnh (QA mắt 30/10: dòng "bận liền tay —
 *  cân nhắc thêm người" cho thu ngân gây hiểu lầm). */
const PRESENCE_ROLES: ReadonlySet<StaffRole> = new Set(['cashier', 'guard', 'customer_care']);

export interface StaffIdleRow {
  id: number;
  name: string;
  role: StaffRole;
  icon: string;
  /** Phút game đã làm trong ca hôm nay. */
  workMin: number;
  /** Phút game đứng không trong ca hôm nay. */
  idleMin: number;
  /** 0–100: % thời gian trong ca đứng không. */
  idlePct: number;
  verdict: IdleVerdict;
}

export interface StaffIdleSummary {
  rows: StaffIdleRow[];
  mostIdle: StaffIdleRow | null;
  /** % rảnh bình quân cả đội có dữ liệu, null khi chưa có ai. */
  teamIdlePct: number | null;
}

/** Ngưỡng % rảnh: ≥65 = rảnh phần lớn ca (nên xử lý), <35 = bận liền tay, giữa = vừa sức. */
export const IDLE_HEAVY_PCT = 65;
export const IDLE_BUSY_PCT = 35;

export const idleVerdict = (idlePct: number): IdleVerdict =>
  idlePct >= IDLE_HEAVY_PCT ? 'idle_heavy' : idlePct < IDLE_BUSY_PCT ? 'busy' : 'balanced';

export function staffIdleStats(snapshot: Record<number, StaffDayStat>, staff: Staff[]): StaffIdleSummary {
  const rows: StaffIdleRow[] = [];
  for (const st of staff) {
    if (st.role === 'farmhand') continue; // việc phụ trại chạy ở endDay, trong tiệm đứng nghỉ là đúng
    if (PRESENCE_ROLES.has(st.role)) continue; // vai hiện diện: trực quầy/đứng cửa là việc, %rảnh ~0
    const stat = snapshot[st.id];
    if (!stat) continue;
    const total = stat.workSec + stat.idleSec;
    if (!(total > 0)) continue;
    const idlePct = Math.round((stat.idleSec / total) * 100);
    rows.push({
      id: st.id,
      name: st.name,
      role: st.role,
      icon: ROLES[st.role].icon,
      workMin: Math.round(stat.workSec / 60),
      idleMin: Math.round(stat.idleSec / 60),
      idlePct,
      verdict: idleVerdict(idlePct),
    });
  }
  const mostIdle = rows.length ? rows.reduce((a, b) => (b.idlePct > a.idlePct ? b : a)) : null;
  const teamIdlePct = rows.length
    ? Math.round(rows.reduce((a, r) => a + (r.workMin + r.idleMin > 0 ? r.idlePct : 0), 0) / rows.length)
    : null;
  return { rows, mostIdle, teamIdlePct };
}

// ───── GĐ248: tổng kết đội cuối ngày — phân biệt "dư người" với "lệch ca" ─────
// Chỉ soi % rảnh chưa đủ để quyết: đội rảnh nhiều NHƯNG vẫn mất khách vì chờ quầy (GĐ120) là bài toán
// XẾP CA (dồn người vào giờ đông), không phải bài toán BỚT NGƯỜI. Recap gộp hai tín hiệu để tổng kết
// cuối ngày nói đúng việc cần làm. THUẦN ĐỌC — dữ liệu staffDay (transient) + waitLoss có sẵn.

export type StaffDayRecapVerdict = 'nodata' | 'ok' | 'idle_heavy' | 'shift_mismatch';

export interface StaffDayRecap {
  verdict: StaffDayRecapVerdict;
  mostIdle: StaffIdleRow | null;
  teamIdlePct: number | null;
}

/** Tổng kết đội của ngày vừa kết thúc: nodata (không ai vào ca) · ok (không ai rảnh bất thường) ·
 *  idle_heavy (có người rảnh phần lớn ca, không mất khách vì chờ → dư người/vai) ·
 *  shift_mismatch (rảnh nhiều mà vẫn mất khách vì chờ → lệch ca, dồn ca vào giờ đông). */
export function staffDayRecap(
  snapshot: Record<number, StaffDayStat>,
  staff: Staff[],
  waitLostCustomers: number,
): StaffDayRecap {
  const s = staffIdleStats(snapshot, staff);
  if (!s.rows.length || !s.mostIdle) return { verdict: 'nodata', mostIdle: null, teamIdlePct: null };
  if (s.mostIdle.verdict !== 'idle_heavy') {
    return { verdict: 'ok', mostIdle: s.mostIdle, teamIdlePct: s.teamIdlePct };
  }
  return {
    verdict: waitLostCustomers > 0 ? 'shift_mismatch' : 'idle_heavy',
    mostIdle: s.mostIdle,
    teamIdlePct: s.teamIdlePct,
  };
}

// ───── GĐ253: từ tổng kết đội → xếp lại ca mai MỘT CHẠM ─────
// Recap GĐ248 nói đúng việc nhưng người chơi phải tự mở bảng nhân viên sửa từng người. Helper
// này biến tín hiệu rảnh thành gợi ý bằng HÀNH ĐỘNG có sẵn (setShift): ai ca 'full' mà rảnh ≥65%
// thì bớt còn nửa ca đông khách hơn (tiết kiệm lương); ai nửa ca mà rảnh khi tiệm vẫn mất khách
// vì chờ thì dồn sang nửa ca có giờ đông (không đổi lương). Không tự tuyển/bớt người, không đụng
// kinh tế — nút bấm chỉ chạy setShift, người chơi bấm mới đổi; vai hiện diện (GĐ252) và ca đêm
// là quyết định riêng nên không tự dời.

export interface ShiftFixSuggestion {
  id: number;
  name: string;
  icon: string;
  /** Ca đề xuất cho mai. */
  to: Shift;
  /** Lương/ngày thay đổi (âm = tiết kiệm). */
  wageDelta: number;
  /** Nhãn nút, vd "bớt còn ca sáng" / "dồn sang ca chiều". */
  label: string;
}

const halfName = (s: Shift) => (s === 'morning' ? 'sáng' : 'chiều');

const sumHalf = (
  byHour: Record<number, { customers: number }> | undefined,
  from: number,
  to: number,
): number => {
  let n = 0;
  if (byHour) for (let h = from; h <= to; h++) n += byHour[h]?.customers ?? 0;
  return n;
};

/** Gợi ý xếp lại ca cho người rảnh nặng nhất còn cách sửa rõ ràng; null khi đội vừa sức hoặc
 *  không có chuyển ca nào đáng. `byHour`/`peakHour` của ngày VỪA KẾT THÚC (từ SummaryPanel). */
export function staffShiftFix(
  snapshot: Record<number, StaffDayStat>,
  staff: Staff[],
  waitLostCustomers: number,
  peakHour: number | null,
  byHour: Record<number, { customers: number; revenue: number }> | undefined,
): ShiftFixSuggestion | null {
  const s = staffIdleStats(snapshot, staff);
  if (!s.rows.length) return null;
  const morning = sumHalf(byHour, 6, 13);
  const afternoon = sumHalf(byHour, 14, 22);
  const busyHalf: Shift = afternoon > morning
    ? 'afternoon'
    : morning > afternoon
      ? 'morning'
      : peakHour !== null && peakHour >= 14 ? 'afternoon' : 'morning';
  const cands = [...s.rows].filter((r) => r.verdict === 'idle_heavy').sort((a, b) => b.idlePct - a.idlePct);
  for (const row of cands) {
    const st = staff.find((x) => x.id === row.id);
    if (!st || st.shift === 'night') continue; // ca đêm là quyết định riêng (GĐ65), không tự dời
    if (st.shift === 'full') {
      return {
        id: st.id,
        name: st.name,
        icon: row.icon,
        to: busyHalf,
        wageDelta: Math.round(st.wage * (SHIFTS[busyHalf].pay - SHIFTS.full.pay)),
        label: `bớt còn ca ${halfName(busyHalf)}`,
      };
    }
    if (waitLostCustomers > 0 && st.shift !== busyHalf) {
      return {
        id: st.id,
        name: st.name,
        icon: row.icon,
        to: busyHalf,
        wageDelta: 0,
        label: `dồn sang ca ${halfName(busyHalf)}`,
      };
    }
  }
  return null;
}
