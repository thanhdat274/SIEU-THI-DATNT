import { BRANCH_ROLES, BRANCH_SHIFTS } from './branches';
import { ROLES, type Shift, type Staff } from './staff';

/** Điều quân giữa tiệm chính và cửa hàng tiện lợi 24/7. */
export type Site = 'main' | 'branch';
export const SITE_NAME: Record<Site, string> = { main: 'tiệm chính', branch: 'tiện lợi 24/7' };

export type MoveResult = { ok: true; staff: Staff } | { ok: false; why: string };

/**
 * Chuyển nhân viên `st` sang `to`: giữ nguyên tay nghề, kinh nghiệm, chức vụ, lương; chỉ chỉnh ca cho hợp nơi mới.
 * Mỗi người chỉ điều một lần mỗi ngày; chi nhánh chỉ nhận các vai trong BRANCH_ROLES.
 */
export function moveStaff(st: Staff, to: Site, day: number, canNightMain: boolean): MoveResult {
  if (st.movedDay === day) return { ok: false, why: `${st.name} hôm nay đã được điều rồi, mai điều tiếp nhé` };
  let shift: Shift = st.shift;
  if (to === 'branch') {
    if (!BRANCH_ROLES.includes(st.role)) return { ok: false, why: `${ROLES[st.role].name} chỉ làm được ở tiệm chính (tiện lợi chỉ cần thu ngân, xếp hàng, giao hàng, bảo vệ, quản lý)` };
    if (!BRANCH_SHIFTS.includes(shift)) shift = 'morning';
  } else if (shift === 'night' && !canNightMain) {
    shift = 'afternoon';
  }
  return { ok: true, staff: { ...st, shift, movedDay: day } };
}

/** Số người trực mỗi ca theo vai, để so hai tiệm trong bảng điều quân. */
export function coverage(staff: Staff[], role: Staff['role'], shift: Shift) {
  return staff.filter((s) => s.role === role && (s.shift === shift || (shift !== 'night' && s.shift === 'full'))).length;
}

/** Ghi chú thiếu người của một tiệm (thu ngân từng ca, bảo vệ ca đêm với chi nhánh). */
export function gapsOf(staff: Staff[], site: Site, hasNightMain: boolean): string[] {
  const out: string[] = [];
  const shifts: Shift[] = site === 'branch' ? BRANCH_SHIFTS : hasNightMain ? ['morning', 'afternoon', 'night'] : ['morning', 'afternoon'];
  const name: Record<string, string> = { morning: 'ca sáng', afternoon: 'ca chiều', night: 'ca đêm' };
  for (const sh of shifts) if (!coverage(staff, 'cashier', sh)) out.push(`thiếu thu ngân ${name[sh]}`);
  if (site === 'branch' && !coverage(staff, 'guard', 'night')) out.push('thiếu bảo vệ ca đêm');
  return out;
}

