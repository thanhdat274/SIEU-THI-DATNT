import type { Staff } from './staff';
import { TRAIN_EXP } from './staffTraits';

/**
 * Nghỉ phép nhân viên (tiệm chính). Người chơi chủ động cho nghỉ MỘT ngày: người đó không đến làm
 * nhưng vẫn được trả lương ngày đó (nghỉ phép có lương), đổi lại nghỉ ngơi xong "hăng hái" —
 * cộng một ít kinh nghiệm (nửa buổi đào tạo). Mỗi người nghỉ cách nhau ít nhất LEAVE_COOLDOWN ngày.
 * Chỉ người chơi bấm mới có → mô phỏng/golden không bao giờ chạm tới.
 */
export const LEAVE_EXP = Math.max(1, Math.floor(TRAIN_EXP / 2));
export const LEAVE_COOLDOWN = 7;

/** Đang nghỉ phép trong ngày `day`? */
export const onLeave = (st: Pick<Staff, 'leaveDay'>, day: number) => st.leaveDay === day;

/** Còn mấy ngày nữa mới được cho nghỉ lại (0 = được). */
export const leaveWait = (st: Pick<Staff, 'leaveDay'>, day: number) =>
  st.leaveDay === undefined ? 0 : Math.max(0, st.leaveDay + LEAVE_COOLDOWN - day);

export type LeaveBlock = 'already' | 'cooldown' | null;

// ── Đơn xin nghỉ phép: nhân viên tự xin, người chơi duyệt/từ chối ────────────────────────────
// Băm tất định theo (seed, ngày, id) — KHÔNG đụng simRng, chỉ hiển thị; mô phỏng/golden không đổi.
export const LEAVE_REQUEST_CHANCE = 0.12;
/** Từ chối đơn: trừ chút kinh nghiệm (người buồn, làm kém hăng). */
export const LEAVE_DENY_EXP = 1;

function leaveRoll(seed: number, day: number, id: number): number {
  let h = Math.imul((seed >>> 0) ^ Math.imul(day, 2654435761), 2246822519) ^ Math.imul(id + 1, 374761393);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type LeaveStaff = Pick<Staff, 'id' | 'role' | 'leaveDay' | 'leaveDenied'>;

export function leaveBlock(st: Pick<Staff, 'leaveDay'>, day: number): LeaveBlock {
  if (onLeave(st, day)) return 'already';
  return leaveWait(st, day) > 0 ? 'cooldown' : null;
}

/** Ai đang xin nghỉ hôm nay: chưa nghỉ, hết cooldown, chưa bị từ chối hôm nay, không phải thợ làm vườn. */
export function leaveRequests<T extends LeaveStaff>(staff: T[], seed: number, day: number): T[] {
  return staff.filter((st) =>
    st.role !== 'farmhand' && leaveBlock(st, day) === null && st.leaveDenied !== day
    && leaveRoll(seed, day, st.id) < LEAVE_REQUEST_CHANCE);
}

/** Ai đang nghỉ phép hôm nay. */
export const onLeaveToday = <T extends LeaveStaff>(staff: T[], day: number): T[] => staff.filter((st) => onLeave(st, day));
