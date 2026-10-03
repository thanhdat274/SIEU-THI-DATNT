import type { SaveGameData, StaffMember, StaffShift } from '@game/shared';
import { isShiftWithinStoreHours } from '@game/data';

export function normalizeStaffSchedule(
  schedule: Record<string, StaffShift> | undefined,
  staff: StaffMember[]
): Record<string, StaffShift> {
  const staffIds = new Set(staff.map((member) => member.id));
  return Object.fromEntries(
    Object.entries(schedule ?? {}).filter(([staffId, shift]) =>
      staffIds.has(staffId) && isShiftWithinStoreHours(shift)
    )
  ) as Record<string, StaffShift>;
}

/**
 * Quản lý danh sách nhân viên, lịch ca và nợ lương.
 * Pattern: nhận dữ liệu từ constructor, không nhận `this`.
 */
export class StaffManager {
  private staff: StaffMember[] = [];
  private staffSchedule: Record<string, StaffShift> = {};
  private wageDebt = 0;
  private processedPayrollDayIds = new Set<number>();

  constructor(initialSave: SaveGameData) {
    this.load(initialSave);
  }

  public load(saveData: SaveGameData): void {
    this.staff = (saveData.staff ?? []).map((s) => ({
      ...structuredClone(s),
      shift: isShiftWithinStoreHours(s.shift) ? s.shift : 'full_day',
    }));
    this.staffSchedule = normalizeStaffSchedule(saveData.staffSchedule, this.staff);
    this.wageDebt = Math.max(0, saveData.wageDebt ?? 0);
    this.processedPayrollDayIds = new Set(saveData.processedPayrollDayIds ?? []);
  }

  // --- Export ---

  public export(): {
    staff: StaffMember[];
    staffSchedule: Record<string, StaffShift>;
    wageDebt: number;
    processedPayrollDayIds: number[];
  } {
    return {
      staff: this.staff.map((s) => structuredClone(s)),
      staffSchedule: { ...this.staffSchedule },
      wageDebt: this.wageDebt,
      processedPayrollDayIds: [...this.processedPayrollDayIds],
    };
  }

  // --- Getters ---

  public getStaff(): StaffMember[] {
    return this.staff.map((m) => ({ ...m }));
  }

  /** Tham chiếu trực tiếp đến danh sách staff (dùng để ghi). */
  public getStaffRef(): StaffMember[] {
    return this.staff;
  }

  public getStaffSchedule(): Record<string, StaffShift> {
    return { ...this.staffSchedule };
  }

  /** Tham chiếu trực tiếp đến staffSchedule (dùng để ghi). */
  public getStaffScheduleRef(): Record<string, StaffShift> {
    return this.staffSchedule;
  }

  public getWageDebt(): number {
    return this.wageDebt;
  }

  /** Tham chiếu trực tiếp đến wageDebt (dùng để ghi). */
  public getWageDebtRef(): number {
    return this.wageDebt;
  }

  public setWageDebt(val: number): void {
    this.wageDebt = Math.max(0, val);
  }

  /** Tham chiếu trực tiếp đến processedPayrollDayIds (dùng để ghi). */
  public getProcessedPayrollDayIdsRef(): Set<number> {
    return this.processedPayrollDayIds;
  }

  public getStaffCount(): number {
    return this.staff.length;
  }

  // --- Shift helpers ---

  /** Kiểm tra nhân viên có trực trong ca hiện tại không. */
  public isOnShift(member: StaffMember, getShift: (id: string) => StaffShift | undefined): boolean {
    const shift = getShift(member.id) ?? member.shift;
    return this.isShiftActive(shift);
  }

  private isShiftActive(_shift: StaffShift): boolean {
    // Đơn giản: luôn active (logic isStoreOpen được truyền từ simulation.ts)
    return true;
  }

  public getShiftForMember(member: StaffMember, getShift: (id: string) => StaffShift | undefined): StaffShift {
    return getShift(member.id) ?? member.shift;
  }

  // --- Staff operations ---

  public hireStaff(member: StaffMember): void {
    this.staff.push(member);
    this.staffSchedule[member.id] = member.shift;
  }

  public removeStaff(staffId: string): void {
    const idx = this.staff.findIndex((m) => m.id === staffId);
    if (idx >= 0) {
      this.staff.splice(idx, 1);
      delete this.staffSchedule[staffId];
    }
  }

  public setStaffShift(staffId: string, shift: StaffShift): boolean {
    const member = this.staff.find((m) => m.id === staffId);
    if (!member) return false;
    if (!isShiftWithinStoreHours(shift)) return false;
    this.staffSchedule[staffId] = shift;
    return true;
  }

  // --- Role queries ---

  public findRefillMember(): StaffMember | undefined {
    return this.staff.find((m) => m.role === 'refill');
  }

  public findCashierMember(staffId: string): StaffMember | undefined {
    return this.staff.find((m) => m.id === staffId && m.role === 'cashier');
  }

  public hasSecurityOnShift(getShift: (id: string) => StaffShift | undefined): boolean {
    return this.staff.some(
      (s) => (s.role === 'security' || s.role === 'drink_security') && this.isOnShift(s, getShift)
    );
  }

  /** Kiểm tra bảo vệ cho tòa nhà cụ thể (hoặc bảo vệ chung). */
  public hasSecurityForBuilding(building: 'main' | 'xoi' | 'drink' | undefined, getShift: (id: string) => StaffShift | undefined): boolean {
    return this.staff.some(
      (s) =>
        ((s.role === 'security' && !s.assignedBuilding) || // Bảo vệ chung
        (s.role === 'drink_security' && s.assignedBuilding === 'drink') || // Bảo vệ quán nước
        (s.role === 'security' && s.assignedBuilding === building)) // Bảo vệ tòa cụ thể
        && this.isOnShift(s, getShift)
    );
  }

  public findSecurityMember(): StaffMember | undefined {
    return this.staff.find((s) => s.role === 'security');
  }

  /** Tìm bảo vệ quán nước. */
  public findDrinkSecurityMember(): StaffMember | undefined {
    return this.staff.find((s) => s.role === 'drink_security');
  }

  /** Tìm nhân viên quán nước (drink_staff). */
  public findDrinkStaffMember(): StaffMember | undefined {
    return this.staff.find((s) => s.role === 'drink_staff');
  }

  /** Tìm tất cả nhân viên cho tòa nhà cụ thể. */
  public getStaffForBuilding(building: 'main' | 'xoi' | 'drink' | undefined): StaffMember[] {
    return this.staff.filter(
      (s) => !s.assignedBuilding || s.assignedBuilding === building
    );
  }

  public getActiveRefillCount(): number {
    return this.staff.filter((s) => s.role === 'refill').length;
  }

  public getActiveCashierCount(): number {
    return this.staff.filter((s) => s.role === 'cashier').length;
  }

  /** Tìm tất cả nhân viên cashier. */
  public getAllCashiers(): StaffMember[] {
    return this.staff.filter((m) => m.role === 'cashier');
  }

  /** Tìm tất cả nhân viên bảo trì (refill + drink_staff). */
  public getAllMaintenanceStaff(): StaffMember[] {
    return this.staff.filter((m) => m.role === 'refill' || m.role === 'drink_staff');
  }

  /** Tìm tất cả nhân viên bảo vệ (security + drink_security). */
  public getAllSecurityStaff(): StaffMember[] {
    return this.staff.filter((m) => m.role === 'security' || m.role === 'drink_security');
  }

  /** Kiểm tra nhân viên có task đang chạy (refill hoặc dining). */
  public hasActiveTask(member: StaffMember): boolean {
    return !!member.workerTask || !!member.diningTask;
  }

  /** Reset task của nhân viên (dùng khi qua ngày). */
  public finishStaffJob(member: StaffMember, clearDining = false): void {
    if (clearDining) {
      member.diningTask = undefined;
    }
    member.workerTask = undefined;
  }

  /** Cập nhật building assignment cho nhân viên. */
  public updateStaffBuilding(staffId: string, building: 'main' | 'xoi' | 'drink' | undefined): boolean {
    const member = this.staff.find((m) => m.id === staffId);
    if (!member) return false;
    member.assignedBuilding = building;
    return true;
  }
}
