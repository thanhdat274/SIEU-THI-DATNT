import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { STAFF_SHIFTS, StaffShift } from '@game/shared';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { generateCandidatesForDay, validateHireStaff } from './staff';
import { isShiftWithinStoreHours } from '@game/data';

export function runStaffTests(): void {
  const first = generateCandidatesForDay(4);
  const replay = generateCandidatesForDay(4);
  assert.deepEqual(replay, first, 'Ứng viên trong cùng ngày phải seed ổn định');
  assert.ok(first.some((candidate) => candidate.role === 'cashier'));
  assert.ok(first.some((candidate) => candidate.role === 'refill'));
  assert.ok(first.every((candidate) => candidate.dailyWage > 0 && candidate.hiringFee > 0));
  assert.notDeepEqual(generateCandidatesForDay(5), first, 'Ngày khác phải có danh sách ứng viên khác');

  for (const shift of Object.keys(STAFF_SHIFTS) as StaffShift[]) {
    assert.equal(isShiftWithinStoreHours(shift), true, `${shift} phải nằm trong khung 06–22`);
  }

  const candidate = first[0];
  assert.deepEqual(validateHireStaff({
    playerLevel: 1, playerMoney: 100_000, currentStaffCount: 0, candidate, existingStaffIds: [],
  }), { valid: false, reason: 'level_locked' });
  assert.deepEqual(validateHireStaff({
    playerLevel: 3, playerMoney: 100_000, currentStaffCount: 2, candidate, existingStaffIds: [],
  }), { valid: false, reason: 'slots_full' });
  assert.deepEqual(validateHireStaff({
    playerLevel: 2, playerMoney: candidate.hiringFee - 1, currentStaffCount: 0, candidate, existingStaffIds: [],
  }), { valid: false, reason: 'insufficient_funds' });
  assert.equal(validateHireStaff({
    playerLevel: 2, playerMoney: candidate.hiringFee, currentStaffCount: 0, candidate, existingStaffIds: [],
  }).valid, true);

  const legacySave = structuredClone(DEFAULT_INITIAL_SAVE);
  delete legacySave.staff;
  delete legacySave.staffSchedule;
  delete legacySave.wageDebt;
  delete legacySave.processedPayrollDayIds;
  const legacySim = new GameSimulation(legacySave, generateStarterTileMap(), new InputManager());
  const legacyRoundTrip = legacySim.exportSaveData();
  assert.deepEqual(legacyRoundTrip.staff, [], 'Save cũ không tự sinh nhân viên miễn phí');
  assert.deepEqual(legacyRoundTrip.staffSchedule, {});
  assert.equal(legacyRoundTrip.wageDebt, 0);
  assert.deepEqual(legacyRoundTrip.processedPayrollDayIds, []);

  const saveWithStaff = structuredClone(DEFAULT_INITIAL_SAVE);
  saveWithStaff.staff = [{
    id: 'staff-test', name: 'Cô Hằng', role: 'cashier', speed: 5, accuracy: 7, stamina: 6,
    dailyWage: 30000, hiredOnDay: 2, shift: 'morning',
  }];
  saveWithStaff.staffSchedule = { 'staff-test': 'morning' };
  saveWithStaff.wageDebt = 12000;
  saveWithStaff.processedPayrollDayIds = [1];
  const simWithStaff = new GameSimulation(saveWithStaff, generateStarterTileMap(), new InputManager());
  const staffRoundTrip = simWithStaff.exportSaveData();
  assert.deepEqual(staffRoundTrip.staff, saveWithStaff.staff);
  assert.deepEqual(staffRoundTrip.staffSchedule, saveWithStaff.staffSchedule);
  assert.equal(staffRoundTrip.wageDebt, 12000);
  assert.deepEqual(staffRoundTrip.processedPayrollDayIds, [1]);

  const malformedScheduleSave = structuredClone(saveWithStaff);
  malformedScheduleSave.staffSchedule = {
    'staff-test': 'morning',
    'missing-staff': 'afternoon',
  } as typeof malformedScheduleSave.staffSchedule;
  const normalized = new GameSimulation(
    malformedScheduleSave,
    generateStarterTileMap(),
    new InputManager()
  ).exportSaveData();
  assert.deepEqual(normalized.staffSchedule, { 'staff-test': 'morning' }, 'Lịch bỏ staff lạ và chỉ giữ ca hợp lệ');

  const payrollSave = structuredClone(DEFAULT_INITIAL_SAVE);
  payrollSave.player.money = 10_000;
  payrollSave.staff = [{
    id: 'payroll-staff', name: 'Anh Tuấn', role: 'cashier', speed: 5, accuracy: 7, stamina: 6,
    dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day',
  }];
  const payrollSim = new GameSimulation(payrollSave, generateStarterTileMap(), new InputManager());
  const payrollResult = payrollSim.processPayroll(1);
  assert.equal(payrollResult.totalGrossWage, 30_000);
  assert.equal(payrollResult.paidAmount, 10_000);
  assert.equal(payrollResult.remainingDebt, 20_000);
  assert.equal(payrollSim.getPlayerData().money, 0, 'Payroll không được làm tiền âm');
  assert.equal(payrollSim.getCurrentDayRecord().wagesPaid, 10_000);
  assert.equal(payrollSim.getLedger().filter((entry) => entry.type === 'wage').length, 1);

  payrollSim.processPayroll(1);
  assert.equal(payrollSim.getPlayerData().money, 0, 'Gọi lại ngày payroll không trừ tiền lần hai');
  assert.equal(payrollSim.getWageDebt(), 20_000);
  assert.equal(payrollSim.getLedger().filter((entry) => entry.type === 'wage').length, 1);
  const payrollReload = new GameSimulation(
    payrollSim.exportSaveData(),
    generateStarterTileMap(),
    new InputManager()
  );
  payrollReload.processPayroll(1);
  assert.equal(payrollReload.getWageDebt(), 20_000, 'Save/reload không trả lương ngày cũ lần hai');
  assert.equal(payrollReload.getLedger().filter((entry) => entry.type === 'wage').length, 1);

  const hiringSave = structuredClone(DEFAULT_INITIAL_SAVE);
  hiringSave.player.level = 2;
  hiringSave.player.money = 100_000;
  const hiringSim = new GameSimulation(hiringSave, generateStarterTileMap(), new InputManager());
  const dailyCandidate = hiringSim.getStaffCandidates()[0];
  assert.equal(hiringSim.hireStaff(dailyCandidate.id).success, true);
  assert.equal(hiringSim.getPlayerData().money, 50_000, 'Phí tuyển dụng bị trừ đúng một lần');
  assert.equal(hiringSim.getStaff().length, 1);
  assert.equal(hiringSim.hireStaff(dailyCandidate.id).success, false, 'Không tuyển trùng ứng viên');
  assert.equal(hiringSim.getPlayerData().money, 50_000, 'Từ chối tuyển trùng không mất tiền');
  assert.equal(hiringSim.setStaffShift(dailyCandidate.id, 'afternoon'), true);
  assert.equal(hiringSim.exportSaveData().staff?.[0].shift, 'afternoon', 'Đổi ca được lưu vào nhân viên');

  console.log('  ✓ Nhân viên: seed ứng viên ổn định, vai trò/ca hợp lệ và điều kiện tuyển');
  console.log('  ✓ Nhân viên: migration save cũ rỗng và save/reload giữ staff, lịch, nợ lương, payroll IDs');
  console.log('  ✓ Nhân viên: payroll theo ca, nợ khi thiếu tiền và idempotency qua reload');
  console.log('  ✓ Nhân viên: tuyển ứng viên trừ phí một lần, từ chối tuyển trùng và lưu ca');
}
