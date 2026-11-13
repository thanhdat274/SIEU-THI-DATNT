/**
 * Sổ thông báo (GĐ2347): NHẬT KÝ mọi tin đã hiện lên HUD (toast gộp, cảnh báo qua notify) —
 * tin cũ trôi khỏi màn hình nhưng vẫn xem lại được ở bảng 🔔 Sổ thông báo (panel type 'log').
 * Module-level vòng ghi, KHÔNG lưu save (giữ ngân sách SAVE_VERSION) — đóng trang là mất, đủ dùng
 * vì thông báo có giá trị đọc là trong phiên. Giới hạn vòng để vô hạn tin gộp không phình bộ nhớ.
 */

export interface NotifEntry {
  /** Ngày game và phút trong ngày lúc tin hiện — ghi nhãn "Ngày 24 · 21:02". */
  day: number;
  minutes: number;
  text: string;
}

const CAP = 80;
let log: NotifEntry[] = [];

/** Ghi một tin (theo thứ tự thời gian). Tin trùng lập tức liền trước thì bỏ qua (tick dồn). */
export function pushNotif(day: number, minutes: number, text: string): void {
  const last = log[log.length - 1];
  if (last && last.text === text && last.day === day) return;
  log.push({ day, minutes, text });
  if (log.length > CAP) log = log.slice(log.length - CAP);
}

/** Bản ghi mới nhất đứng đầu (cho bảng xem lại). */
export function notifLog(): readonly NotifEntry[] {
  return [...log].reverse();
}

/** Sang ngày mới không xoá — tin hôm qua vẫn đáng đọc lại; vòng tự cắt ở CAP. */
export const clearNotifLog = (): void => { log = []; };
