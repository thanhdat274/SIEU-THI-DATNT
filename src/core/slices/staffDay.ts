/**
 * Theo dõi thời gian LÀM vs RẢNH của nhân viên tiệm chính THEO NGÀY — TRANSIENT, chỉ trong bộ nhớ,
 * KHÔNG persist (KHÔNG đụng SAVE_VERSION). Tiền lệ: comboDay.ts (GĐ124) và askStartedWall (GĐ122).
 *
 * Vì sao: PROGRESS.md nợ mở "Thời gian nhân viên rảnh không ghi ở state nào (chỉ runtime) — muốn soi
 * phải thêm bộ đếm". Các thẻ giá trị lương (GĐ141/142/144/188) ước từ DOANH THU, không biết người đó
 * trong ca có BỊ BẬN không: xếp hàng đứng không cả sáng hay quản lý rảnh trừ giờ kiểm kho là hộp đen.
 * StaffManager (agents/staff.ts) gọi noteStaffTime() mỗi tick cho từng người đang trong ca.
 *
 * Vòng đời: agent đếm trong ngày → StaffPanel đọc snapshot ("sáng đến giờ"); khi đóng Sổ đầu ngày
 * (bắt đầu ngày mới) → resetStaffDay() cùng resetComboDay().
 */
export interface StaffDayStat {
  /** Số giây game trong ca đang LÀM VIỆC (đi làm việc, xếp hàng, trực quầy, canh bếp...). */
  workSec: number;
  /** Số giây game trong ca ĐỨNG KHÔNG chờ việc (không có job/post nào cần). */
  idleSec: number;
}

let staffDay: Record<number, StaffDayStat> = {};

/** Ghi nhận một đoạn thời gian trong ca của nhân viên: cộng vào cột làm hoặc rảnh.
 *  Được gọi mỗi tick cho mỗi người → mutate trực tiếp, KHÔNG copy object (khác comboDay vì tần suất cao). */
export function noteStaffTime(id: number, dt: number, idle: boolean) {
  if (!(dt > 0)) return;
  const st = staffDay[id] ?? (staffDay[id] = { workSec: 0, idleSec: 0 });
  if (idle) st.idleSec += dt;
  else st.workSec += dt;
}

/** Snap chụp dữ liệu hôm nay cho UI đọc (bản sao sâu, không để lộ tham chiếu nội bộ). */
export function staffDaySnapshot(): Record<number, StaffDayStat> {
  const out: Record<number, StaffDayStat> = {};
  for (const k of Object.keys(staffDay)) {
    const id = Number(k);
    out[id] = { ...staffDay[id] };
  }
  return out;
}

/** Xóa dữ liệu khi bắt đầu ngày mới (gọi lúc đóng Sổ đầu ngày). */
export function resetStaffDay() {
  staffDay = {};
}
