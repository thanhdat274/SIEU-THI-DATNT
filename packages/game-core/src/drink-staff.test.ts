import assert from 'node:assert/strict';
import type { CustomerState, SaveGameData } from '@game/shared';
import { BUILDING_MAP, DEFAULT_INITIAL_SAVE, DRINK_PLOT_ID, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions } from './store-layout';

const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
const lot = (quantity: number) => ({ quantity, expiresOnDay: 400, unitCost: 3_000, provenance: 'known' as const });

/** Quán nước đã mua (kèm các mảnh mở rộng nếu có), mở cửa, hai nhân viên: bổ sung hàng và thu ngân. */
const baseSave = (extraPlots: string[] = []): SaveGameData => {
  const base = structuredClone(DEFAULT_INITIAL_SAVE);
  base.player.level = 60;
  base.player.money = 10_000_000;
  base.worldTime.isStoreOpen = false;
  const bought = applyStoreLayoutActions(base, [DRINK_PLOT_ID, ...extraPlots].map(plotId => ({ type: 'buy_plot' as const, plotId })), mapFor).save!;
  assert.ok(bought, 'mua quán nước và mảnh mở rộng hợp lệ');
  bought.worldTime.isStoreOpen = true;
  bought.worldTime.hour = 10;
  bought.customer = undefined;
  bought.customers = [];
  bought.staff = [
    { id: 'refill-1', name: 'Chị Hai', role: 'refill', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' },
    { id: 'cashier-1', name: 'Bé Lan', role: 'cashier', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' },
  ];
  return bought;
};

const newSim = (save: SaveGameData) => new GameSimulation(save, mapFor(save.storeLayout.unlockedPlotIds ?? []), new InputManager(), {});
const live = (sim: GameSimulation): CustomerState[] => (sim as never as { customerManager: { customers: CustomerState[] } }).customerManager.customers;

/** Giao việc châm kệ và chạy tới khi xong; trả về quãng đường tới điểm xa nhất theo y (để kiểm nhân viên thật sự vào vùng sâu). */
function runRefill(sim: GameSimulation, shelfId: string): { minY: number; sawStreet: boolean; reachedDoor: boolean } {
  const door = BUILDING_MAP.drink.doorTiles[0];
  let minY = Infinity, sawStreet = false, reachedDoor = false;
  for (let i = 0; i < 900; i++) {
    sim.update(1);
    const member = sim.getStaff().find(s => s.id === 'refill-1')!;
    if (member.position) {
      minY = Math.min(minY, member.position.y / 32);
      if (member.position.y / 32 >= 11) sawStreet = true;
      if (Math.abs(member.position.x / 32 - (door.x + 0.5)) < 2 && Math.abs(member.position.y / 32 - door.y) < 1) reachedDoor = true;
    }
    if (!member.workerTask && i > 5) break;
  }
  assert.equal(sim.getStaff().find(s => s.id === 'refill-1')!.workerTask, undefined, `việc châm ${shelfId} đã xong`);
  return { minY, sawStreet, reachedDoor };
}

export function runDrinkStaffTests(): void {
  console.log('\n--- Nhân viên và quán nước ---');

  // Nhân viên bổ sung hàng đi từ kho, qua cửa tiệm chính, vỉa hè, cửa quán nước rồi châm kệ nước.
  {
    const save = baseSave();
    const shelf = save.storeLayout.fixtures.find(f => f.id === 'drink_shelf')!;
    shelf.assignedProductId = 'nuoc_suoi';
    shelf.currentStock = 2;
    shelf.stockLots = [lot(2)];
    save.inventory = [{ productId: 'nuoc_suoi', quantity: 30, lots: [lot(30)] }];
    save.planogram = { drink_shelf: 'nuoc_suoi' };
    const sim = newSim(save);
    const result = sim.assignRefillJob('refill-1', 'drink_shelf');
    assert.equal(result.success, true, `giao việc châm kệ nước (${result.reason ?? ''})`);
    assert.ok(sim.getStaff().find(s => s.id === 'refill-1')!.workerTask!.route.length > 0, 'có lộ trình tới kho');
    const run = runRefill(sim, 'drink_shelf');
    assert.ok(sim.getFixtures().find(f => f.id === 'drink_shelf')!.currentStock > 2, 'kệ nước được châm thêm');
    assert.ok(run.sawStreet, 'nhân viên đi ra vỉa hè giữa các tòa nhà');
    assert.ok(run.reachedDoor, 'nhân viên đi qua cửa quán nước');
  }

  // Việc "tự động bày kệ" phải giữ chỗ kệ nó chọn, nếu không revalidate báo claim_lost và hàng không bao giờ lên kệ.
  {
    const save = baseSave();
    const shelf = save.storeLayout.fixtures.find(f => f.id === 'drink_shelf')!;
    shelf.assignedProductId = 'nuoc_suoi';
    shelf.currentStock = 2;
    shelf.stockLots = [lot(2)];
    save.inventory = [{ productId: 'nuoc_suoi', quantity: 30, lots: [lot(30)] }];
    save.planogram = { drink_shelf: 'nuoc_suoi' };
    const sim = newSim(save);
    assert.equal(sim.assignAutoRestockJob('refill-1').success, true, 'giao việc tự động bày kệ');
    let peak = 2;
    for (let i = 0; i < 600 && peak <= 2; i++) {
      sim.update(1);
      peak = Math.max(peak, sim.getFixtures().find(f => f.id === 'drink_shelf')!.currentStock);
    }
    assert.ok(peak > 2, 'tự động bày kệ thật sự đưa hàng lên kệ nước');
    assert.notEqual(sim.getStaff().find(s => s.id === 'refill-1')!.lastWorkerError, 'Kệ đã có người khác nhận hoặc không còn cần châm.', 'không mất claim giữa chừng');
  }

  // Nhiều nhân viên bổ sung kệ: mỗi người nhắm một kệ khác nhau và được giao việc lệch nhịp, không đi dính cục.
  {
    const save = baseSave();
    save.staff = ['a', 'b', 'c'].map(id => ({ id: `refill-${id}`, name: id, role: 'refill' as const, speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' as const }));
    save.inventory = [{ productId: 'nuoc_suoi', quantity: 90, lots: [lot(90)] }];
    const sim = newSim(save);
    sim.update(3.1);
    const busy = sim.getStaff().filter(s => s.workerTask);
    assert.equal(busy.length, 1, 'mỗi nhịp chỉ giao việc cho một nhân viên');
    for (let i = 0; i < 40; i++) sim.update(1);
    const targets = sim.getStaff().filter(s => s.workerTask).map(s => s.workerTask!.fixtureId);
    assert.equal(new Set(targets).size, targets.length, `các nhân viên nhắm kệ khác nhau (${targets.join(',')})`);
    assert.ok(targets.length >= 2, 'các nhân viên lần lượt nhận việc');
  }

  // Vùng mở rộng phía bắc: nhân viên đi vào được sâu hơn hàng y=3 (trước đây bị coi là hậu trường) và châm kệ ở đó.
  {
    const save = baseSave(['drink-north-a', 'drink-north-b']);
    save.storeLayout.fixtures.push({ id: 'north_shelf', type: 'shelf_wooden', tileX: 28, tileY: -2, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 1, maxCapacity: 20, label: 'Kệ phía bắc', shopId: 'shelf', slotCount: 12, assignedProductId: 'nuoc_suoi', stockLots: [lot(1)] });
    save.inventory = [{ productId: 'nuoc_suoi', quantity: 30, lots: [lot(30)] }];
    save.planogram = { north_shelf: 'nuoc_suoi' };
    const sim = newSim(save);
    const result = sim.assignRefillJob('refill-1', 'north_shelf');
    assert.equal(result.success, true, `giao việc châm kệ ở vùng mở rộng (${result.reason ?? ''})`);
    const run = runRefill(sim, 'north_shelf');
    assert.ok(sim.getFixtures().find(f => f.id === 'north_shelf')!.currentStock > 1, 'kệ ở vùng mở rộng được châm thêm');
    assert.ok(run.minY < 0, `nhân viên đi vào vùng mở rộng (y nhỏ nhất ${run.minY.toFixed(1)})`);
  }

  // Thu ngân (không gắn vị trí) thanh toán cho khách ở quầy riêng của quán nước; ghi sổ cái chung.
  {
    const save = baseSave();
    const shelf = save.storeLayout.fixtures.find(f => f.id === 'drink_shelf')!;
    shelf.assignedProductId = 'nuoc_suoi';
    shelf.currentStock = 10;
    shelf.stockLots = [lot(10)];
    const customer: CustomerState = {
      id: 'd1', position: { x: 29.5 * 32, y: 9.5 * 32 }, stage: 'checkout', targetFixtureId: 'drink_cashier_counter', checkoutId: 'checkout-d1', patience: 600, checkoutWait: 600,
      buildingId: 'drink', cashierFixtureId: 'drink_cashier_counter', basket: [{ productId: 'nuoc_suoi', quantity: 1, unitPrice: 5_000, lots: [lot(1)] }],
    };
    save.customers = [customer];
    save.worldTime.hour = 11;
    const sim = newSim(save);
    const money = sim.getPlayerData().money;
    for (let i = 0; i < 30 && live(sim).some(c => c.id === 'd1' && c.stage === 'checkout'); i++) sim.update(1);
    assert.ok(sim.getPlayerData().money >= money + 5_000, 'thu ngân thanh toán cho khách quán nước');
    assert.ok(sim.getStatistics().totalCustomersServed >= 1);
    assert.ok(sim.getLedger().some(entry => entry.type === 'sale'), 'ghi sổ cái chung');
  }

  // Dọn bàn: bàn bẩn của quán nước được nhân viên bổ sung hàng đi tới dọn; bàn tòa khác không bị đụng tới.
  {
    const save = baseSave();
    const sim = newSim(save);
    const dirty = (sim as never as { diningDirtyTableIds: Set<string> }).diningDirtyTableIds;
    dirty.add('drink_table_a');
    assert.equal(sim.getDiningTableState('drink_table_a').dirty, true);
    assert.equal(sim.assignDiningCleanup('refill-1', 'drink_table_a'), true, 'giao việc dọn bàn quán nước (có đường tới bàn)');
    assert.equal(sim.assignDiningCleanup('refill-1', 'drink_table_b'), false, 'bàn sạch thì không giao việc');
    for (let i = 0; i < 400 && sim.getDiningTableState('drink_table_a').dirty; i++) sim.update(1);
    assert.equal(sim.getDiningTableState('drink_table_a').dirty, false, 'bàn được dọn sạch');
  }

  // Việc châm kệ cho kệ không tồn tại (quán chưa mua) thất bại gọn, kho không bị trừ.
  {
    const save = baseSave();
    save.storeLayout.unlockedPlotIds = [];
    save.storeLayout.fixtures = save.storeLayout.fixtures.filter(f => !f.id.startsWith('drink_'));
    save.inventory = [{ productId: 'nuoc_suoi', quantity: 4, lots: [lot(4)] }];
    const sim = newSim(save);
    assert.equal(sim.assignRefillJob('refill-1', 'drink_shelf').success, false);
    assert.equal(sim.getInventory().find(i => i.productId === 'nuoc_suoi')?.quantity, 4, 'kho không bị trừ khi giao việc thất bại');
  }
  console.log('Nhân viên quán nước: PASS');
}
