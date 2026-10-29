import type { Staff, StaffRole } from './staff';
import { ROLES } from './staff';
import type { StaffDayStat } from '../core/slices/staffDay';

// ───── GĐ246: soi nhân viên rảnh bao nhiêu (THUẦN ĐỌC, dữ liệu transient từ staffDay) ─────
// Các thẻ giá trị lương (GĐ141/142/144/188) ước từ DOANH THU. Bản này bổ sung mảnh thiếu: trong ca,
// người đó BẬN bao nhiêu, RẢNH bao nhiêu — đóng nợ mở "thời gian rảnh chỉ có ở runtime". Rảnh nhiều
// = vai đó dư người (cân nhắc bớt ca/vai); bận liền tay = cân nhắc thêm người. Thu ngân/bảo vệ trực
// quầy tính là ĐANG LÀM (có mặt mới có dịch vụ); phụ trại bị loại (việc ở trại chạy cuối ngày).

export type IdleVerdict = 'busy' | 'balanced' | 'idle_heavy';

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
