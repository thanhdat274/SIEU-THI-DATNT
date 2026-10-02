import assert from 'node:assert/strict';
import type { CustomerState, SaveGameData } from '@game/shared';
import { BUILDING_MAP, DEFAULT_INITIAL_SAVE, XOI_PLOT_ID, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions } from './store-layout';

const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
const lot = (quantity: number) => ({ quantity, expiresOnDay: 400, unitCost: 5_000, provenance: 'known' as const });

const baseSave = (): SaveGameData => {
  const base = structuredClone(DEFAULT_INITIAL_SAVE);
  base.player.level = 30;
  base.player.money = 5_000_000;
  base.worldTime.isStoreOpen = false;
  const bought = applyStoreLayoutActions(base, [{ type: 'buy_plot', plotId: XOI_PLOT_ID }], mapFor).save!;
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

export function runXoiStaffTests(): void {
  console.log('\n--- Nhân viên và người chơi giữa hai tòa nhà ---');

  // Nhân viên bổ sung hàng đi từ kho, qua cửa tiệm chính, vỉa hè, cửa tiệm xôi rồi châm kệ xôi.
  {
    const save = baseSave();
    const shelf = save.storeLayout.fixtures.find(f => f.id === 'xoi_shelf')!;
    shelf.assignedProductId = 'xoi_man_tp';
    shelf.currentStock = 2;
    shelf.stockLots = [lot(2)];
    save.inventory = [{ productId: 'xoi_man_tp', quantity: 12, lots: [lot(12)] }];
    save.planogram = { xoi_shelf: 'xoi_man_tp' };
    const sim = newSim(save);
    const result = sim.assignRefillJob('refill-1', 'xoi_shelf');
    assert.equal(result.success, true, `giao việc châm kệ xôi (${result.reason ?? ''})`);
    const route = sim.getStaff().find(s => s.id === 'refill-1')!.workerTask!.route;
    assert.ok(route.length > 0, 'có lộ trình tới kho');
    let sawStreet = false;
    let reachedXoiDoor = false;
    const door = BUILDING_MAP.xoi.doorTiles[0];
    for (let i = 0; i < 600; i++) {
      sim.update(1);
      const member = sim.getStaff().find(s => s.id === 'refill-1')!;
      if (member.position && member.position.y / 32 >= 11) sawStreet = true;
      if (member.position && Math.abs(member.position.x / 32 - (door.x + 0.5)) < 2 && Math.abs(member.position.y / 32 - door.y) < 1) reachedXoiDoor = true;
      if (!member.workerTask && i > 5) break;
    }
    const after = sim.getFixtures().find(f => f.id === 'xoi_shelf')!;
    assert.ok(after.currentStock > 2, `kệ xôi được châm thêm (còn ${after.currentStock})`);
    assert.ok(sawStreet, 'nhân viên đi ra vỉa hè giữa hai tòa nhà');
    assert.ok(reachedXoiDoor, 'nhân viên đi qua cửa tiệm xôi');
    assert.equal(sim.getStaff().find(s => s.id === 'refill-1')!.workerTask, undefined);
  }

  // Không có đường tới kệ (cửa tiệm xôi bị chặn khi tiệm chưa mua) thì việc bị hủy kèm lý do, hàng quay về kho.
  {
    const save = baseSave();
    save.storeLayout.unlockedPlotIds = [];
    // Chưa mua: không còn nội thất xôi hợp lệ nào, nên kệ xôi bị cất; giao việc cho kệ không tồn tại phải thất bại gọn.
    save.storeLayout.fixtures = save.storeLayout.fixtures.filter(f => !f.id.startsWith('xoi_'));
    save.inventory = [{ productId: 'xoi_man_tp', quantity: 4, lots: [lot(4)] }];
    const sim = newSim(save);
    const result = sim.assignRefillJob('refill-1', 'xoi_shelf');
    assert.equal(result.success, false);
    assert.equal(sim.getInventory().find(i => i.productId === 'xoi_man_tp')?.quantity, 4, 'kho không bị trừ khi giao việc thất bại');
  }

  // Một nhân viên thu ngân phục vụ được khách ở quầy tiệm xôi (không gắn vị trí, phục vụ khách đang ở bước thanh toán).
  {
    const save = baseSave();
    const shelf = save.storeLayout.fixtures.find(f => f.id === 'xoi_shelf')!;
    shelf.assignedProductId = 'xoi_man_tp';
    shelf.currentStock = 10;
    shelf.stockLots = [lot(10)];
    const customer: CustomerState = {
      id: 'x1', position: { x: 4.5 * 32, y: 8.5 * 32 }, stage: 'checkout', targetFixtureId: 'xoi_cashier_counter', checkoutId: 'checkout-x1', patience: 600, checkoutWait: 600,
      buildingId: 'xoi', cashierFixtureId: 'xoi_cashier_counter', basket: [{ productId: 'xoi_man_tp', quantity: 1, unitPrice: 25_000, lots: [lot(1)] }],
    };
    save.customers = [customer];
    save.worldTime.hour = 11;
    const sim = newSim(save);
    const money = sim.getPlayerData().money;
    for (let i = 0; i < 30 && live(sim).some(c => c.id === 'x1' && c.stage === 'checkout'); i++) sim.update(1);
    assert.ok(sim.getPlayerData().money >= money + 25_000, 'thu ngân thanh toán cho khách tiệm xôi');
    assert.equal(sim.getStatistics().totalCustomersServed >= 1, true);
    assert.ok(sim.getLedger().some(entry => entry.type === 'sale'), 'ghi sổ cái chung');
  }
  console.log('Nhân viên giữa hai tòa nhà: PASS');
}
