import assert from 'node:assert/strict';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  STAFF_SHIFTS,
  validateSaveGameData,
  type BuildingPlacementRecord,
  type SaveGameData,
  type StaffMember,
  type StaffShift,
} from '@game/shared';
import {
  BUILDING_MAP,
  DEFAULT_INITIAL_SAVE,
  DEFAULT_PLACEMENTS,
  XOI_PLOT_ID,
  generateStarterTileMap,
  isKnownShift,
  isShiftWithinStoreHours,
  placementGeometry,
} from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { isShiftActiveAt, isStaffActiveAt, normalizeStaffAssignments, shiftConfigOf, shiftLabel, shiftWage, staffBuildingIds, validateStaffBuilding } from './staff-shifts';

const time = (day: number, hour: number, minute = 0) => ({ day, hour, minute });

function staffMember(over: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 'staff-1', name: 'Chị Hằng', role: 'cashier', speed: 5, accuracy: 7, stamina: 6,
    dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day', ...over,
  };
}

/** Save đã mua tòa xôi + fixture riêng trong tòa để thử lọc việc theo tòa. */
function saveWithXoi(): SaveGameData {
  const save = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  save.player.level = 40;
  save.player.money = 10_000_000;
  save.storeLayout.unlockedPlotIds = [...(save.storeLayout.unlockedPlotIds ?? []), XOI_PLOT_ID];
  save.storeLayout.buildingPlacements = structuredClone(DEFAULT_PLACEMENTS) as BuildingPlacementRecord[];
  const xoi = placementGeometry(DEFAULT_PLACEMENTS.find((placement) => placement.buildingId === 'xoi')!);
  const tileX = xoi.bounds.left + 1;
  const tileY = Math.max(xoi.bounds.top + 1, xoi.entranceTile.y - 2);
  save.storeLayout.fixtures = [
    ...save.storeLayout.fixtures,
    { id: 'xoi-shelf', type: 'shelf_wooden', tileX, tileY, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 24, label: 'Kệ xôi' },
  ];
  return save;
}

function simWith(save: SaveGameData): GameSimulation {
  return new GameSimulation(save, generateStarterTileMap(), new InputManager());
}

export function runStaffShiftTests(): void {
  console.log('\n--- OpenSpec staff-shifts: ca đêm, lương theo ca, gán tòa, migration 13 ---');

  // 1. Khung ca, kể cả ca đêm vắt qua nửa đêm.
  assert.equal(isKnownShift('night'), true);
  assert.equal(isKnownShift('bogus'), false);
  assert.equal(isShiftActiveAt('morning', 7 * 60), true, 'Ca sáng bắt đầu 07:00');
  assert.equal(isShiftActiveAt('morning', 6 * 60 + 59), false, '06:59 chưa vào ca sáng');
  assert.equal(isShiftActiveAt('morning', 14 * 60), false);
  assert.equal(isShiftActiveAt('afternoon', 14 * 60), true);
  assert.equal(isShiftActiveAt('afternoon', 22 * 60), false);
  for (const minute of [22 * 60, 23 * 60 + 30, 30, 5 * 60 + 59]) {
    assert.equal(isShiftActiveAt('night', minute), true, `Ca đêm phải hoạt động ở phút ${minute}`);
  }
  for (const minute of [6 * 60, 21 * 60 + 59]) {
    assert.equal(isShiftActiveAt('night', minute), false, `Ca đêm không hoạt động ở phút ${minute}`);
  }
  assert.equal(isShiftActiveAt('full_day', 7 * 60), true);
  assert.equal(isShiftActiveAt('full_day', 22 * 60), false);
  assert.ok(isShiftWithinStoreHours('morning') && isShiftWithinStoreHours('full_day'));
  assert.equal(isShiftWithinStoreHours('night'), false, 'Ca đêm không nằm trọn trong giờ bán');
  assert.equal(Object.keys(STAFF_SHIFTS).length, 4, 'Có đúng bốn ca');

  // 2. Lương theo ca.
  assert.equal(shiftWage(30_000, 'morning'), 15_000);
  assert.equal(shiftWage(30_000, 'afternoon'), 15_000);
  assert.equal(shiftWage(30_000, 'night'), 18_000, 'Ca đêm có phụ cấp 20%');
  assert.equal(shiftWage(30_000, 'full_day'), 30_000);
  assert.ok(shiftWage(30_000, 'night') > shiftWage(30_000, 'morning'));
  assert.equal(shiftConfigOf('bogus' as StaffShift).id, 'full_day', 'Ca lạ rơi về cả ngày');
  assert.match(shiftLabel('night'), /22:00/);

  // 3. Trong ca + hiredOnDay (quy ước 00:00–06:00 vẫn thuộc ngày N).
  const member = staffMember({ shift: 'night', hiredOnDay: 3 });
  assert.equal(isStaffActiveAt(member, undefined, time(3, 23, 30)), true);
  assert.equal(isStaffActiveAt(member, undefined, time(3, 2, 0)), true, '00:00–06:00 ngày N vẫn là ngày N');
  assert.equal(isStaffActiveAt(member, undefined, time(2, 23, 30)), false, 'Chưa tới ngày tuyển');
  assert.equal(isStaffActiveAt(member, { 'staff-1': 'morning' }, time(3, 9)), true, 'Lịch ca ghi đè member.shift');
  assert.equal(isStaffActiveAt(member, { 'staff-1': 'morning' }, time(3, 23)), false);

  // 4. Chỉ nhân viên đang trong ca được vẽ (renderer dùng peekVisibleStaff).
  const visibleSave = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  visibleSave.staff = [
    staffMember({ id: 'day-staff', shift: 'full_day' }),
    staffMember({ id: 'night-staff', role: 'security', shift: 'night' }),
  ];
  visibleSave.staffSchedule = { 'day-staff': 'full_day', 'night-staff': 'night' };
  const visibleSim = simWith(visibleSave);
  visibleSim.getClock().setTime({ ...visibleSim.getTime(), hour: 12, minute: 0 });
  assert.deepEqual(visibleSim.peekVisibleStaff().map((item) => item.id), ['day-staff'], '12:00 chỉ vẽ nhân viên ca ngày');
  visibleSim.getClock().setTime({ ...visibleSim.getTime(), hour: 23, minute: 0 });
  assert.deepEqual(visibleSim.peekVisibleStaff().map((item) => item.id), ['night-staff'], '23:00 chỉ vẽ bảo vệ ca đêm');

  // 5. Đổi ca đêm sống qua lưu/tải và tính lương theo ca.
  const shiftSave = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  shiftSave.staff = [staffMember({ shift: 'morning' })];
  shiftSave.staffSchedule = { 'staff-1': 'morning' };
  const shiftSim = simWith(shiftSave);
  assert.equal(shiftSim.setStaffShift('staff-1', 'night'), true);
  assert.equal(shiftSim.setStaffShift('staff-1', 'bogus' as StaffShift), false, 'Ca lạ bị từ chối');
  const shiftReload = simWith(shiftSim.exportSaveData());
  assert.equal(shiftReload.getStaff()[0].shift, 'night', 'Ca đêm sống qua lưu/tải');
  assert.equal(shiftReload.getStaffBuildingIds().includes('main'), true);
  const payroll = shiftReload.processPayroll(1);
  assert.equal(payroll.totalGrossWage, 18_000, 'Payroll dùng hệ số ca đêm');

  // 6. Gán tòa: hợp lệ/không tồn tại/xoá; lưu/tải giữ; chuẩn hoá bỏ tòa mồ côi khi nạp.
  const buildingSave = saveWithXoi();
  buildingSave.staff = [staffMember({ role: 'refill', shift: 'full_day' })];
  const buildingSim = simWith(buildingSave);
  assert.deepEqual(buildingSim.getStaffBuildingIds(), ['main', 'xoi'], 'Tòa đang có: tiệm chính + xôi');
  assert.ok(buildingSim.getStaffBuildingOptions().some((option) => option.id === 'xoi' && option.label.length > 0));
  assert.equal(buildingSim.setStaffBuilding('staff-1', 'xoi').success, true);
  assert.equal(buildingSim.getStaff()[0].assignedBuilding, 'xoi');
  assert.equal(buildingSim.setStaffBuilding('staff-1', 'drink').success, false, 'Tòa chưa mua bị từ chối');
  assert.equal(buildingSim.getStaff()[0].assignedBuilding, 'xoi', 'Từ chối không đổi gán');
  const buildingReload = simWith(buildingSim.exportSaveData());
  assert.equal(buildingReload.getStaff()[0].assignedBuilding, 'xoi', 'Gán tòa sống qua lưu/tải');
  assert.equal(buildingReload.setStaffBuilding('staff-1', null).success, true);
  assert.equal(buildingReload.getStaff()[0].assignedBuilding, undefined, 'Chọn toàn tiệm xoá gán');
  const orphan = structuredClone(buildingSave);
  orphan.staff = [staffMember({ role: 'refill', assignedBuilding: 'drink' })];
  const normalizedOrphan = structuredClone(orphan);
  normalizeStaffAssignments(normalizedOrphan);
  assert.equal(normalizedOrphan.staff?.[0].assignedBuilding, undefined, 'Gán tới tòa không có bị xoá khi nạp');
  assert.equal(simWith(orphan).getStaff()[0].assignedBuilding, undefined, 'Nạp sim cũng xoá gán mồ côi');
  assert.equal(validateStaffBuilding('xoi', ['main', 'xoi']), true);
  assert.equal(validateStaffBuilding(null, ['main']), true);

  // 7. Lọc việc châm hàng theo tòa: nhân viên tòa xôi không nhận kệ tiệm chính.
  const scopeSave = saveWithXoi();
  scopeSave.staff = [staffMember({ id: 'refill-staff', role: 'refill', shift: 'full_day', assignedBuilding: 'xoi' })];
  scopeSave.staffSchedule = { 'refill-staff': 'full_day' };
  const scopeSim = simWith(scopeSave);
  scopeSim.getClock().setTime({ ...scopeSim.getTime(), hour: 10, minute: 0 });
  scopeSim.setPlanogramAssignment('shelf_wooden_noodles', 'mi_hao_hao');
  scopeSim.setPlanogramAssignment('xoi-shelf', 'mi_hao_hao');
  assert.ok(scopeSim.getRestockJobTargets().length >= 2, 'Có việc ở cả hai tòa');
  const mainTargetInPublicList = scopeSim.getRestockJobTargets().some((target) => target.fixtureId === 'shelf_wooden_noodles');
  assert.equal(mainTargetInPublicList, true, 'Danh sách công khai (cho người chơi) vẫn có kệ tiệm chính');
  assert.equal(scopeSim.claimRestockJob('refill-staff', 'shelf_wooden_noodles').claimed, false, 'Nhân viên tòa xôi không nhận kệ tiệm chính');
  assert.equal(scopeSim.claimRestockJob('refill-staff', 'xoi-shelf').claimed, true, 'Nhận kệ trong tòa xôi');
  scopeSim.releaseRestockJob('refill-staff', 'xoi-shelf');
  const unassigned = simWith({ ...structuredClone(scopeSave), staff: [staffMember({ id: 'refill-staff', role: 'refill', shift: 'full_day' })] });
  unassigned.getClock().setTime({ ...unassigned.getTime(), hour: 10, minute: 0 });
  unassigned.setPlanogramAssignment('shelf_wooden_noodles', 'mi_hao_hao');
  assert.equal(unassigned.claimRestockJob('refill-staff', 'shelf_wooden_noodles').claimed, true, 'Không gán tòa = nhận mọi kệ như cũ');

  // 8. Lọc thu ngân/dọn bàn/bảo vệ theo tòa.
  const cashierSave = saveWithXoi();
  cashierSave.staff = [
    staffMember({ id: 'cashier-xoi', role: 'cashier', shift: 'full_day', assignedBuilding: 'xoi' }),
    staffMember({ id: 'cleaner-main', role: 'refill', shift: 'full_day' }),
  ];
  cashierSave.staffSchedule = { 'cashier-xoi': 'full_day', 'cleaner-main': 'full_day' };
  const cashierSim = simWith(cashierSave);
  cashierSim.getClock().setTime({ ...cashierSim.getTime(), hour: 10, minute: 0 });
  const mainCounter = cashierSim.getFixtures().find((fixture) => fixture.type === 'cashier_counter' && fixture.shopId !== 'self_checkout')!;
  const queueCustomer = {
    id: 'c-scope', position: { x: 0, y: 0 }, stage: 'checkout' as const, targetFixtureId: mainCounter.id,
    checkoutId: 'checkout-scope', cashierFixtureId: mainCounter.id, patience: 100, checkoutWait: 0,
    basket: [{ productId: 'mi_hao_hao', quantity: 1 }],
  };
  (cashierSim as unknown as { customerManager: { customers: unknown[] } }).customerManager.customers.push(queueCustomer);
  assert.equal(cashierSim.assignNextCashierCustomer('cashier-xoi'), false, 'Thu ngân tòa xôi không nhận khách quầy tiệm chính');
  assert.equal(cashierSim.setStaffBuilding('cashier-xoi', null).success, true);
  assert.equal(cashierSim.assignNextCashierCustomer('cashier-xoi'), true, 'Không gán tòa thì nhận khách quầy tiệm chính như cũ');

  const mainTable = cashierSim.getFixtures().find((fixture) => fixture.type === 'dining_table');
  if (mainTable) {
    (cashierSim as unknown as { diningDirtyTableIds: Set<string> }).diningDirtyTableIds.add(mainTable.id);
    cashierSim.setStaffBuilding('cleaner-main', 'xoi');
    assert.equal(cashierSim.assignDiningCleanup('cleaner-main', mainTable.id), false, 'Nhân viên tòa xôi không dọn bàn tiệm chính');
    cashierSim.setStaffBuilding('cleaner-main', null);
    assert.equal(cashierSim.assignDiningCleanup('cleaner-main', mainTable.id), true, 'Không gán tòa thì dọn bàn như cũ');
  }

  const guardSave = saveWithXoi();
  guardSave.staff = [staffMember({ id: 'guard-xoi', role: 'security', shift: 'full_day', assignedBuilding: 'xoi' })];
  guardSave.staffSchedule = { 'guard-xoi': 'full_day' };
  const guardSim = simWith(guardSave);
  guardSim.getClock().setTime({ ...guardSim.getTime(), hour: 10, minute: 0 });
  for (let i = 0; i < 600; i++) guardSim.update(0.1);
  const guard = guardSim.getStaff().find((item) => item.id === 'guard-xoi')!;
  const xoiGeometry = placementGeometry(DEFAULT_PLACEMENTS.find((placement) => placement.buildingId === 'xoi')!);
  const xoiDoor = xoiGeometry.entranceTile;
  const mainDoor = BUILDING_MAP.main.entranceTile;
  assert.ok(guard.position, 'Bảo vệ có vị trí sau khi tuần tra');
  assert.ok(
    Math.hypot(guard.position!.x - xoiDoor.x * 32, guard.position!.y - xoiDoor.y * 32) < 6 * 32,
    'Bảo vệ gán tòa xôi tuần tra quanh tòa xôi, không về lộ trình tiệm chính',
  );
  assert.ok(Math.hypot(guard.position!.x - mainDoor.x * 32, guard.position!.y - mainDoor.y * 32) > 2 * 32, 'Không đứng ở cửa tiệm chính');

  // 9. Migration schema 12 → 13: ca lạ → cả ngày, ca đêm hợp lệ, lịch mồ côi bị bỏ, tiền/lương giữ nguyên.
  const legacy = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  legacy.schemaVersion = 12;
  legacy.player.money = 777_000;
  legacy.staff = [
    staffMember({ id: 'keep-morning', shift: 'morning', dailyWage: 31_000 }),
    staffMember({ id: 'keep-night', shift: 'night' }),
    staffMember({ id: 'bad-shift', shift: 'bogus' as StaffShift }),
  ];
  legacy.staffSchedule = { 'keep-morning': 'morning', 'keep-night': 'night', 'bad-shift': 'night', 'missing-id': 'morning' } as Record<string, StaffShift>;
  const migrated = validateSaveGameData(legacy);
  assert.equal(migrated.valid, true);
  assert.equal(migrated.versionStatus, 'legacy_migrate');
  assert.equal(migrated.data?.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(CURRENT_SAVE_SCHEMA_VERSION, 17);
  const byId = new Map((migrated.data?.staff ?? []).map((item) => [item.id, item]));
  assert.equal(byId.get('keep-morning')?.shift, 'morning', 'Ca ngày giữ nguyên');
  assert.equal(byId.get('keep-night')?.shift, 'night', 'Ca đêm hợp lệ khi migrate');
  assert.equal(byId.get('bad-shift')?.shift, 'full_day', 'Ca lạ về cả ngày');
  assert.equal(byId.get('keep-morning')?.dailyWage, 31_000, 'Lương đã lưu giữ nguyên');
  assert.equal(migrated.data?.player.money, 777_000, 'Tiền giữ nguyên');
  assert.deepEqual(migrated.data?.staffSchedule, { 'keep-morning': 'morning', 'keep-night': 'night', 'bad-shift': 'night' }, 'Chỉ bỏ lịch mồ côi, giữ ca đêm');
  const future = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  future.schemaVersion = CURRENT_SAVE_SCHEMA_VERSION + 1;
  assert.equal(validateSaveGameData(future).versionStatus, 'unsupported_future');

  // 9. Tương thích hành vi cũ: hết ca giữa việc thì dừng + trả hàng (workers.test) và
  //    bảo trì qua đêm vẫn đếm mọi nhân viên refill bất kể ca (maintenance.test) — hai bộ test đó chạy riêng.

  console.log('  ✓ Bốn ca (ca đêm vắt nửa đêm), lương theo ca, hiredOnDay theo quy ước ngày');
  console.log('  ✓ Ẩn/hiện nhân viên theo ca và gán tòa (hợp lệ/từ chối/xoá/lưu-tải/mồ côi)');
  console.log('  ✓ Lọc châm hàng theo tòa; không gán giữ hành vi cũ');
  console.log('  ✓ Migration save 12→13: ca lạ, ca đêm, lịch mồ côi, giữ tiền/lương');
}
