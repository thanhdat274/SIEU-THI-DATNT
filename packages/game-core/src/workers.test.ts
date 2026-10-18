import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, WAREHOUSE_ENTRANCE } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';

function workerSave() {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.staff = [{
    id: 'refill-worker', name: 'Anh Tuấn', role: 'refill', speed: 8, accuracy: 5, stamina: 8,
    dailyWage: 30000, hiredOnDay: 1, shift: 'full_day', position: { ...WAREHOUSE_ENTRANCE },
  }];
  save.staffSchedule = { 'refill-worker': 'full_day' };
  return save;
}

function createWorkerSim() {
  const sim = new GameSimulation(workerSave(), generateStarterTileMap(), new InputManager());
  sim.setPlanogramAssignment('shelf_wooden_noodles', 'mi_hao_hao');
  return sim;
}

function advanceUntil(sim: GameSimulation, predicate: () => boolean, limit = 300): boolean {
  for (let i = 0; i < limit && !predicate(); i++) sim.update(0.1);
  return predicate();
}

export function runWorkerTests(): void {
  console.log('\n--- Test 9.2: Worker path, carried lots, shift end and reload ---');
  const sim = createWorkerSim();
  const before = sim.getInventory().find((item) => item.productId === 'mi_hao_hao')!.quantity +
    sim.getFixtures().find((fixture) => fixture.id === 'shelf_wooden_noodles')!.currentStock;
  assert.equal(sim.assignRefillJob('refill-worker', 'shelf_wooden_noodles').success, true, 'Worker nhận job khi có lối tới kho và kệ');
  assert.equal(advanceUntil(sim, () => {
    const task = sim.getStaff()[0].workerTask;
    return task?.stage === 'to_shelf' && task.carriedLots.reduce((sum, lot) => sum + lot.quantity, 0) > 0;
  }), true, 'Worker lấy một chuyến hàng và đang mang hàng tới kệ');

  const carryingSave = sim.exportSaveData();
  const resumed = new GameSimulation(carryingSave, generateStarterTileMap(), new InputManager());
  assert.equal(advanceUntil(resumed, () => !resumed.getStaff()[0].workerTask), true, 'Worker tiếp tục hoàn tất job sau reload');
  const shelf = resumed.getFixtures().find((fixture) => fixture.id === 'shelf_wooden_noodles')!;
  const after = resumed.getInventory().find((item) => item.productId === 'mi_hao_hao')!.quantity;
  assert.equal(after + shelf.currentStock, before, 'Reload khi đang mang không làm mất hoặc nhân đôi hàng');

  const shiftSim = createWorkerSim();
  const shiftBefore = shiftSim.getInventory().find((item) => item.productId === 'mi_hao_hao')!.quantity +
    shiftSim.getFixtures().find((fixture) => fixture.id === 'shelf_wooden_noodles')!.currentStock;
  shiftSim.setStaffShift('refill-worker', 'morning');
  shiftSim.assignRefillJob('refill-worker', 'shelf_wooden_noodles');
  assert.equal(advanceUntil(shiftSim, () => shiftSim.getStaff()[0].workerTask?.stage === 'to_shelf'), true);
  const endShift = shiftSim.getTime();
  endShift.hour = 14;
  shiftSim.getClock().setTime(endShift);
  shiftSim.update(0.1);
  assert.equal(shiftSim.getStaff()[0].workerTask, undefined, 'Hết ca thì job được dừng và claim nhả');
  const shiftAfter = shiftSim.getInventory().find((item) => item.productId === 'mi_hao_hao')!.quantity +
    shiftSim.getFixtures().find((fixture) => fixture.id === 'shelf_wooden_noodles')!.currentStock;
  assert.equal(shiftAfter, shiftBefore, 'Hàng đang mang được hoàn lại kho, không mất');

  const blockedMap = generateStarterTileMap();
  blockedMap.collisionLayer = new Array(blockedMap.width * blockedMap.height).fill(true);
  const blocked = new GameSimulation(workerSave(), blockedMap, new InputManager());
  blocked.setPlanogramAssignment('shelf_wooden_noodles', 'mi_hao_hao');
  const stockBeforeBlocked = blocked.getInventory().find((item) => item.productId === 'mi_hao_hao')!.quantity;
  assert.equal(blocked.assignRefillJob('refill-worker', 'shelf_wooden_noodles').success, false, 'Không có đường đi thì không khởi chạy job');
  assert.equal(blocked.getInventory().find((item) => item.productId === 'mi_hao_hao')!.quantity, stockBeforeBlocked, 'Không có đường thì không lấy hàng khỏi kho');
  console.log('  ✓ Worker path, cargo save/reload, bàn giao hết ca và chặn transfer khi không có đường');
}

/** OpenSpec `open-world-building-types` 4.1: kệ cách kho > 30 ô → chuyến giao nội bộ có thời gian, đang chuyển không bán được. */
export function runInternalDeliveryTests(): void {
  console.log('\n--- Test 4.1: internal_delivery cho kệ xa ---');
  const sim = createWorkerSim();
  const shelfOf = (s: GameSimulation) => s.getFixtures().find((f) => f.id === 'shelf_wooden_noodles')!;
  const total = (s: GameSimulation) => s.getInventory().find((i) => i.productId === 'mi_hao_hao')!.quantity + shelfOf(s).currentStock;
  const before = total(sim);
  const stockBefore = shelfOf(sim).currentStock;
  assert.equal(sim.assignRefillJob('refill-worker', 'shelf_wooden_noodles').success, true);
  // Giả lập kệ ở chi nhánh xa: dời tọa độ kệ ra 50 ô (route không dùng vì nhân viên không đi bộ tới kệ xa).
  const raw = (sim as unknown as { fixtures: Array<{ id: string; tileX: number }> }).fixtures.find((f) => f.id === 'shelf_wooden_noodles')!;
  raw.tileX += 50;
  assert.equal(advanceUntil(sim, () => sim.getInternalDeliveries().length > 0), true, 'tạo chuyến giao nội bộ');
  const d = sim.getInternalDeliveries()[0];
  assert.ok(d.totalQty > 0 && (d.lots ?? []).every((l) => typeof l.expiresOnDay === 'number'), 'lô đang chuyển giữ hạn dùng');
  assert.equal(sim.getStaff()[0].workerTask, undefined, 'nhân viên xong việc ngay, không đi bộ tới kệ xa');
  assert.equal(shelfOf(sim).currentStock, stockBefore, 'đang chuyển: chưa lên kệ (không bán được)');
  assert.equal(total(sim) + d.totalQty, before, 'hàng rời kho ngay, không mất');
  // Lưu khi đang chuyển (schema 12): chuyến giao giữ nguyên, không mất hàng.
  const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.deepEqual(reloaded.getInternalDeliveries(), sim.getInternalDeliveries(), 'lưu/nạp giữ chuyến đang chuyển');
  assert.equal(total(reloaded) + d.totalQty, before, 'lưu/nạp khi đang chuyển không mất hàng');
  // Tới giờ: hàng lên kệ.
  const t = sim.getTime();
  const arrive = d.arriveAtMinute! - t.day * 1440;
  sim.getClock().setTime({ ...t, hour: Math.floor(arrive / 60), minute: arrive % 60 });
  sim.update(0.1);
  assert.equal(sim.getInternalDeliveries().length, 0, 'chuyến giao đã tới nơi');
  assert.equal(total(sim), before, 'tới nơi: tổng hàng giữ nguyên');
  assert.ok(shelfOf(sim).currentStock > stockBefore, 'tới nơi: hàng lên kệ');
  console.log('  ✓ internal_delivery: rời kho ngay, đang chuyển không bán được, tới kệ theo quãng đường, lưu không mất hàng');
}
