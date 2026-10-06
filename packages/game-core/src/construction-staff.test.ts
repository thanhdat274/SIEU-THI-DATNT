import assert from 'node:assert/strict';
import type { BuildingPlacementRecord, SaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, SNACK_PLOT_ID, WAREHOUSE_ENTRANCE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { buildingSpawnsCustomers } from './customers';
import { applyStoreLayoutActions } from './store-layout';

const mapFor = (ids: readonly string[], placements?: readonly BuildingPlacementRecord[]) => generateStarterTileMap(ids, [], placements);
const lot = (quantity: number) => ({ quantity, expiresOnDay: 400, unitCost: 5_000, provenance: 'known' as const });
const WAITING_MESSAGE = 'Tòa đang thi công — tạm đứng chờ ở kho.';

/**
 * Tòa dời xong đang thi công: không sinh khách và nhân viên được gán vào tòa đó đứng chờ ở kho
 * (OpenSpec `open-world-building-relocation`, L3-C5 + L3-C6).
 */
export function runConstructionStaffTests(): void {
  console.log('\n--- Tòa đang thi công: khách và nhân viên ---');
  const base = (): SaveGameData => {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.worldTime.isStoreOpen = false;
    save.worldTime.hour = 10;
    save.player = { ...save.player, level: 60, money: 5_000_000 };
    save.customer = undefined;
    save.customers = [];
    return save;
  };

  // Quán ăn vặt ở lô mặc định (đông 1) có hàng trên kệ và một nhân viên châm kệ được gán vào kệ đó.
  const bought = applyStoreLayoutActions(base(), [{ type: 'buy_plot', plotId: SNACK_PLOT_ID }], mapFor).save!;
  assert.ok(bought, 'mua quán ăn vặt ở lô đông 1');
  const shelfBefore = bought.storeLayout.fixtures.find(f => f.id === 'snack_shelf')!;
  shelfBefore.assignedProductId = 'banh_mi_que';
  shelfBefore.currentStock = 2;
  shelfBefore.stockLots = [lot(2)];
  bought.inventory = [{ productId: 'banh_mi_que', quantity: 12, lots: [lot(12)] }];
  bought.planogram = { snack_shelf: 'banh_mi_que' };
  bought.staff = [
    { id: 'refill-1', name: 'Chị Hai', role: 'refill', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day', assignedFixtureId: 'snack_shelf' },
    { id: 'cashier-1', name: 'Bé Lan', role: 'cashier', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' },
    // Thu ngân thứ hai đứng quầy của quán ăn vặt (quầy thứ hai trong danh sách) → quầy nằm trong tòa đang thi công.
    { id: 'cashier-2', name: 'Bé Tí', role: 'cashier', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' },
  ];

  // Dời tòa sang lô tây: tòa vào trạng thái thi công tới sáng hôm sau.
  const moved = applyStoreLayoutActions(bought, [{ type: 'relocate_building', buildingId: 'snack', placement: { parcelId: 'lot-west', originX: 1 } }], mapFor).save!;
  assert.ok(moved, 'dời quán ăn vặt sang lô tây');
  const constructionDay = moved.worldTime.day;
  const sim = new GameSimulation(moved, mapFor(moved.storeLayout.unlockedPlotIds ?? [], moved.storeLayout.buildingPlacements), new InputManager(), {});
  sim.getClock().toggleStoreStatus();
  assert.equal(sim.getTileMap().buildings!.find(b => b.id === 'snack')!.open, false, 'ngày thi công: tòa đóng cửa');
  assert.equal(buildingSpawnsCustomers(sim.getTileMap().buildings, 'snack'), false, 'L3-C5: tòa thi công không sinh khách');
  assert.equal(buildingSpawnsCustomers(sim.getTileMap().buildings, 'main'), true, 'tiệm chính vẫn có khách');

  // Nhân viên: bỏ gán kệ, không nhận việc châm kệ trong tòa thi công, đứng chờ ở kho.
  for (let i = 0; i < 5; i++) sim.update(1);
  const worker = sim.getStaff().find(s => s.id === 'refill-1')!;
  assert.equal(worker.assignedFixtureId, undefined, 'L3-C6: bỏ gán kệ trong tòa thi công');
  assert.equal(worker.workerTask, undefined, 'L3-C6: không nhận việc châm kệ');
  assert.deepEqual(worker.position, WAREHOUSE_ENTRANCE, 'L3-C6: nhân viên đứng chờ ở kho');
  assert.equal(worker.lastWorkerError, WAITING_MESSAGE, 'báo trạng thái đứng chờ ở kho');
  assert.ok(!sim.getRestockJobTargets().some(target => target.fixtureId === 'snack_shelf'), 'kệ trong tòa thi công không có việc châm');
  assert.equal(sim.getFixtures().find(f => f.id === 'snack_shelf')!.currentStock, 2, 'kệ trong tòa thi công không được châm thêm');
  assert.deepEqual(sim.getStaff().find(s => s.id === 'cashier-2')!.position, WAREHOUSE_ENTRANCE, 'thu ngân của tòa thi công đứng chờ ở kho');

  // Sang ngày mới: tòa mở lại, nhân viên trở về nếp thường và kệ có việc châm lại.
  sim.getClock().advanceToNextDay();
  if (!sim.getTime().isStoreOpen) sim.getClock().toggleStoreStatus();
  sim.update(1);
  assert.equal(sim.getTileMap().buildings!.find(b => b.id === 'snack')!.open, true, 'hết thi công: tòa mở lại');
  assert.equal(buildingSpawnsCustomers(sim.getTileMap().buildings, 'snack'), true, 'L3-C5: hôm sau tòa mở sinh khách trở lại');
  assert.ok(sim.getRestockJobTargets().some(target => target.fixtureId === 'snack_shelf'), 'hết thi công: kệ ăn vặt có việc châm lại');
  assert.notEqual(sim.getStaff().find(s => s.id === 'refill-1')!.lastWorkerError, WAITING_MESSAGE, 'hết thi công: không còn trạng thái đứng chờ');
  assert.ok(sim.getTime().day > constructionDay, 'đã sang ngày mới');
  console.log('Tòa đang thi công: khách và nhân viên: PASS');
}
