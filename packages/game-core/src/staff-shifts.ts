import { STAFF_SHIFTS, type BuildingPlacementRecord, type SaveGameData, type StaffMember, type StaffSchedule, type StaffShift } from '@game/shared';
import { BUILDING_MAP, buildingTypeOfInstance, isKnownShift, resolvePlacements } from '@game/data';

/** Số phút trong ngày (0..1439) từ giờ/phút game. */
export function minuteOfDay(hour: number, minute: number): number {
  return ((Math.floor(hour) * 60 + Math.floor(minute)) % 1440 + 1440) % 1440;
}

/** Cấu hình ca; ca lạ/mất dữ liệu coi như ca cả ngày (không làm sập chỗ đọc). */
export function shiftConfigOf(shift: StaffShift | undefined) {
  return isKnownShift(shift) ? STAFF_SHIFTS[shift] : STAFF_SHIFTS.full_day;
}

/**
 * Ca `shift` có đang hoạt động ở phút game `minute` không. Ca đêm khai báo startHour > endHour nên vắt qua nửa đêm.
 * Dùng chung cho mô phỏng, lưu/tải và renderer (một luật duy nhất).
 */
export function isShiftActiveAt(shift: StaffShift, minute: number): boolean {
  if (!isKnownShift(shift)) return false;
  const cfg = STAFF_SHIFTS[shift];
  const m = minuteOfDay(0, minute);
  if (cfg.startHour === cfg.endHour) return false;
  if (cfg.startHour < cfg.endHour) return m >= cfg.startHour * 60 && m < cfg.endHour * 60;
  return m >= cfg.startHour * 60 || m < cfg.endHour * 60;
}

/** Ca thực tế của nhân viên: lịch ca ghi đè `member.shift`; ca lạ rơi về cả ngày. */
export function activeShiftOf(member: Pick<StaffMember, 'id' | 'shift'>, schedule: StaffSchedule | undefined): StaffShift {
  const shift = schedule?.[member.id] ?? member.shift;
  return isKnownShift(shift) ? shift : 'full_day';
}

/** Nhân viên có đang trong ca ở thời điểm game `time` không (chưa xét ngày tuyển). */
export function isStaffActiveAt(
  member: Pick<StaffMember, 'id' | 'shift' | 'hiredOnDay'>,
  schedule: StaffSchedule | undefined,
  time: { day: number; hour: number; minute: number },
  /** Bỏ qua `hiredOnDay` (dùng cho test/UI xem trước ca). */
  ignoreHireDay = false,
): boolean {
  if (!ignoreHireDay && member.hiredOnDay > time.day) return false;
  return isShiftActiveAt(activeShiftOf(member, schedule), minuteOfDay(time.hour, time.minute));
}

/** Lương một ngày theo ca (đồng); khớp `calculatePayroll`. */
export function shiftWage(dailyWage: number, shift: StaffShift): number {
  return Math.round(dailyWage * shiftConfigOf(shift).wageMultiplier);
}

/** Tên hiển thị của ca. */
export function shiftLabel(shift: StaffShift): string {
  return shiftConfigOf(shift).name;
}

/** Id các tòa đang có (đã mua, gồm tòa mở thêm) từ dữ liệu bản đồ của save. */
export function staffBuildingIdsFrom(
  placements: readonly BuildingPlacementRecord[] | undefined,
  unlockedPlotIds: Iterable<string> = [],
): string[] {
  return resolvePlacements(placements, unlockedPlotIds).map((placement) => placement.buildingId);
}

/** Id các tòa đang có (đã mua, gồm tòa mở thêm) để gán nhân viên. */
export function staffBuildingIds(save: Pick<SaveGameData, 'storeLayout'>): string[] {
  return staffBuildingIdsFrom(save.storeLayout.buildingPlacements, save.storeLayout.unlockedPlotIds ?? []);
}

/** Nhãn hiển thị một tòa: tên loại nếu biết, không thì chính id. */
export function staffBuildingLabel(buildingId: string): string {
  return BUILDING_MAP[buildingId]?.name ?? buildingTypeOfInstance(buildingId)?.name ?? buildingId;
}

/** Lựa chọn tòa cho UI từ danh sách id: `null` (toàn tiệm) + các tòa đang có. */
export function staffBuildingOptionsFrom(placementIds: readonly string[]): Array<{ id: string | null; label: string }> {
  const options: Array<{ id: string | null; label: string }> = [{ id: null, label: 'Toàn tiệm' }];
  for (const id of placementIds) options.push({ id, label: staffBuildingLabel(id) });
  return options;
}

/** Lựa chọn tòa cho UI: `null` (toàn tiệm) + các tòa đang có. */
export function staffBuildingOptions(save: Pick<SaveGameData, 'storeLayout'>): Array<{ id: string | null; label: string }> {
  return staffBuildingOptionsFrom(staffBuildingIds(save));
}

/** Có phải id tòa hợp lệ trong save hiện tại không. */
export function validateStaffBuilding(buildingId: string | null | undefined, validIds: readonly string[]): boolean {
  return buildingId === null || buildingId === undefined || validIds.includes(buildingId);
}

/** Bỏ `assignedBuilding` trỏ tới tòa không còn tồn tại (chạy khi nạp save, cùng đường migration 13). */
export function normalizeStaffAssignments(save: SaveGameData): void {
  const validIds = new Set(staffBuildingIds(save));
  for (const member of save.staff ?? []) {
    if (member.assignedBuilding !== undefined && !validIds.has(member.assignedBuilding)) delete member.assignedBuilding;
  }
}
