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

export function leaveBlock(st: Pick<Staff, 'leaveDay'>, day: number): LeaveBlock {
  if (onLeave(st, day)) return 'already';
  return leaveWait(st, day) > 0 ? 'cooldown' : null;
}
