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
