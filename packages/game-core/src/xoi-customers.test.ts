import assert from 'node:assert/strict';
import type { CustomerState, SaveGameData, StoreFixture } from '@game/shared';
import { BUILDING_MAP, DEFAULT_INITIAL_SAVE, DINING_ADD_ON_RULES, XOI_BOUNDS, XOI_PLOT_ID, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions } from './store-layout';
import { rollDiningAddOns } from './dining';

const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
const lot = (quantity: number) => ({ quantity, expiresOnDay: 400, unitCost: 5_000, provenance: 'known' as const });

/** Tiệm xôi đã mua; kệ xôi có hàng; mọi kệ tiệm chính hết hàng nên chỉ tiệm xôi có gì để bán. */
const xoiOnlySave = (): SaveGameData => {
  const base = structuredClone(DEFAULT_INITIAL_SAVE);
  base.player.level = 30;
  base.player.money = 5_000_000;
  base.worldTime.isStoreOpen = false;
  const bought = applyStoreLayoutActions(base, [{ type: 'buy_plot', plotId: XOI_PLOT_ID }], mapFor).save!;
  for (const fixture of bought.storeLayout.fixtures) {
    if (fixture.id === 'xoi_shelf') { fixture.assignedProductId = 'xoi_man_tp'; fixture.currentStock = 20; fixture.stockLots = [lot(20)]; }
    else if (fixture.type === 'shelf_wooden' || fixture.type === 'refrigerator') { fixture.assignedProductId = undefined; fixture.currentStock = 0; fixture.stockLots = []; }
  }
  bought.worldTime.isStoreOpen = true;
  bought.worldTime.hour = 8;
  bought.customer = undefined;
  bought.customers = [];
  return bought;
};

const newSim = (save: SaveGameData) => new GameSimulation(save, mapFor(save.storeLayout.unlockedPlotIds ?? []), new InputManager(), {});
const live = (sim: GameSimulation): CustomerState[] => (sim as never as { customerManager: { customers: CustomerState[] } }).customerManager.customers;
const inXoi = (c: CustomerState) => c.position.x < XOI_BOUNDS.right * 32 && c.position.y > XOI_BOUNDS.top * 32 && c.position.y < XOI_BOUNDS.bottom * 32;

const diner = (id: string, shelf: StoreFixture, buildingId: string | undefined, position: { x: number; y: number }): CustomerState => ({
  id, position, stage: 'to_shelf', targetFixtureId: shelf.id, checkoutId: `checkout-${id}`, reservedProductId: shelf.assignedProductId,
  basket: [], patience: 600, checkoutWait: 600, ...(buildingId ? { buildingId } : {}),
});

export function runXoiCustomerTests(): void {
  console.log('\n--- Khách theo tòa nhà: tiệm xôi riêng ---');

  // Khách tự sinh chỉ chọn tiệm xôi khi chỉ nơi đó có hàng, xuất hiện ở cửa xôi và vào được trong tiệm.
  {
    const sim = newSim(xoiOnlySave());
    const seen = new Set<string>();
    let wasInside = false;
    const spawnedAt: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 900 && !wasInside; i++) {
      sim.update(1);
      for (const customer of live(sim)) {
        assert.equal(customer.buildingId, 'xoi', 'mọi khách đều chọn tiệm xôi (tiệm chính hết hàng)');
        if (!seen.has(customer.id!)) { seen.add(customer.id!); spawnedAt.push({ ...customer.position }); }
        if (inXoi(customer)) wasInside = true;
      }
    }
    assert.ok(seen.size > 0, 'có khách ghé tiệm xôi');
    assert.ok(wasInside, 'khách đi qua cửa và vào trong sàn tiệm xôi');
    const entrance = BUILDING_MAP.xoi.entranceTile;
    for (const position of spawnedAt) {
      const walked = Math.abs(position.x / 32 - (entrance.x + 0.5)) < 1 && Math.abs(position.y / 32 - (entrance.y + 0.5)) < 1;
      const parked = position.y / 32 >= 12; // đỗ xe trên vỉa hè rồi đi bộ tới cửa
      assert.ok(walked || parked, `khách xuất hiện ở cửa tiệm xôi hoặc chỗ đỗ xe (${position.x},${position.y})`);
    }
  }

  // Tự châm kệ: kệ tiệm xôi chỉ nhận món xôi, kệ tiệm chính không nhận món xôi.
  {
    const save = xoiOnlySave();
    save.worldTime.isStoreOpen = false;
    for (const fixture of save.storeLayout.fixtures) {
      if (fixture.type === 'shelf_wooden') { fixture.assignedProductId = undefined; fixture.currentStock = 0; fixture.stockLots = []; }
    }
    save.inventory = [
      { productId: 'mi_hao_hao', quantity: 20, lots: [lot(20)] },
      { productId: 'xoi_man_tp', quantity: 8, lots: [lot(8)] },
    ];
    const sim = newSim(save);
    const xoiSlot = sim.getFixtures().find(f => f.id === 'xoi_shelf')!;
    const xoiResult = sim.autoFillShelf(xoiSlot.id);
    assert.equal(xoiResult.productId, 'xoi_man_tp', 'kệ tiệm xôi tự nhận món xôi, không phải đồ tạp hóa');
    const mainShelf = sim.getFixtures().find(f => f.id === 'shelf_wooden_noodles')!;
    const mainResult = sim.autoFillShelf(mainShelf.id);
    assert.equal(mainResult.productId, 'mi_hao_hao', 'kệ tiệm chính không nhận món xôi');
  }

  // Tiệm xôi có dòng khách riêng: khi cả hai tòa có hàng, một phần đáng kể (không bị chìm trong kệ tiệm chính) chọn tiệm xôi.
  {
    const save = xoiOnlySave();
    for (const fixture of save.storeLayout.fixtures) {
      if (fixture.type === 'shelf_wooden' && fixture.id !== 'xoi_shelf') { fixture.assignedProductId = 'mi_hao_hao'; fixture.currentStock = 12; fixture.stockLots = [lot(12)]; }
    }
    const sim = newSim(save);
    const byBuilding = { main: new Set<string>(), xoi: new Set<string>() };
    for (let i = 0; i < 1800; i++) {
      sim.update(1);
      for (const customer of live(sim)) byBuilding[(customer.buildingId as 'main' | 'xoi') ?? 'main'].add(customer.id!);
    }
    const total = byBuilding.main.size + byBuilding.xoi.size;
    assert.ok(total >= 20, `đủ khách để đo tỷ lệ (${total})`);
    const share = byBuilding.xoi.size / total;
    assert.ok(share > 0.03 && share < 0.45, `tỷ lệ khách tiệm xôi hợp lý (${(share * 100).toFixed(1)}%)`);
  }

  // Hai tòa chạy song song: mỗi khách chỉ xếp hàng ở quầy của tòa mình.
  {
    const save = xoiOnlySave();
    const mainShelf = save.storeLayout.fixtures.find(f => f.id === 'shelf_wooden_noodles')!;
    mainShelf.assignedProductId = 'mi_hao_hao'; mainShelf.currentStock = 12; mainShelf.stockLots = [lot(12)];
    const xoiShelf = save.storeLayout.fixtures.find(f => f.id === 'xoi_shelf')!;
    const entrance = BUILDING_MAP.xoi.entranceTile;
    const mainEntrance = BUILDING_MAP.main.entranceTile;
    save.customers = [
      diner('c-xoi', xoiShelf, 'xoi', { x: (entrance.x + 0.5) * 32, y: (entrance.y + 0.5) * 32 }),
      diner('c-main', mainShelf, undefined, { x: (mainEntrance.x + 0.5) * 32, y: (mainEntrance.y + 0.5) * 32 }),
    ];
    // Không sinh thêm khách trong lúc kiểm tra.
    save.worldTime.hour = 21;
    const sim = newSim(save);
    for (let i = 0; i < 120 && live(sim).some(c => c.stage === 'to_shelf'); i++) sim.update(1);
    const byId = (id: string) => live(sim).find(c => c.id === id)!;
    const x = byId('c-xoi');
    const m = byId('c-main');
    assert.ok(['to_checkout', 'checkout'].includes(x.stage) && ['to_checkout', 'checkout'].includes(m.stage), `cả hai đã lấy hàng (${x.stage}/${m.stage})`);
    assert.equal(x.cashierFixtureId, 'xoi_cashier_counter', 'khách xôi xếp hàng ở quầy tiệm xôi');
    assert.equal(m.cashierFixtureId, 'cashier_counter_wood', 'khách tiệm chính xếp hàng ở quầy tiệm chính');
    assert.equal(x.buildingId, 'xoi');
    assert.equal(m.buildingId ?? 'main', 'main');

    // Lưu/nạp giữa chừng: khách giữ tòa nhà, giai đoạn và hàng đợi.
    const reloaded = newSim(sim.exportSaveData('s', 1));
    const rx = live(reloaded).find(c => c.id === 'c-xoi')!;
    assert.equal(rx.buildingId, 'xoi');
    assert.equal(rx.stage, x.stage);
    assert.equal(rx.cashierFixtureId, 'xoi_cashier_counter');
    for (let i = 0; i < 30; i++) reloaded.update(1);
    assert.equal(live(reloaded).find(c => c.id === 'c-xoi')?.cashierFixtureId, 'xoi_cashier_counter', 'vẫn đúng quầy sau khi chạy tiếp');
  }

  // Bàn ăn không dùng chéo: hết bàn trong tòa của khách thì mang đi, dù tòa kia còn bàn trống.
  {
    const save = xoiOnlySave();
    save.storeLayout.fixtures.push({ id: 'table_main', type: 'dining_table', tileX: 8, tileY: 6, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bàn tiệm chính', shopId: 'food_table_2', slotCount: 1 });
    save.worldTime.hour = 21;
    const sim = newSim(save);
    const xoiCustomer: CustomerState = { id: 'd-xoi', position: { x: 2 * 32, y: 8.5 * 32 }, stage: 'checkout', targetFixtureId: 'xoi_cashier_counter', checkoutId: 'checkout-d-xoi', patience: 600, checkoutWait: 600, buildingId: 'xoi', basket: [{ productId: 'xoi_man_tp', quantity: 1, unitPrice: 25_000, lots: [lot(1)] }] };
    const mainCustomer: CustomerState = { ...xoiCustomer, id: 'd-main', checkoutId: 'checkout-d-main', buildingId: undefined, targetFixtureId: 'cashier_counter_wood' };
    (live(sim) as CustomerState[]).push(xoiCustomer, mainCustomer);
    assert.equal(sim.canDineIn(xoiCustomer), true, 'bàn xôi trống thì ngồi được');
    (sim as never as { diningDirtyTableIds: Set<string> }).diningDirtyTableIds.add('xoi_table');
    assert.equal(sim.canDineIn(xoiCustomer), false, 'bàn xôi bẩn: không sang ngồi bàn tiệm chính');
    assert.equal(sim.completeCustomerCheckout('checkout-d-xoi', 'xoi_cashier_counter', false, true), false, 'không có bàn trong tòa thì không xếp chỗ');
    // Khách tiệm chính không ngồi bàn tiệm xôi: bàn xôi sạch lại nhưng bàn chính bị chiếm bởi cờ bẩn.
    (sim as never as { diningDirtyTableIds: Set<string> }).diningDirtyTableIds.delete('xoi_table');
    (sim as never as { diningDirtyTableIds: Set<string> }).diningDirtyTableIds.add('table_main');
    const mainEligible = { ...mainCustomer, basket: [{ productId: 'banh_mi_que', quantity: 1, unitPrice: 5_000, lots: [lot(1)] }] };
    assert.equal(sim.canDineIn(mainEligible), false, 'khách tiệm chính không ngồi bàn của tiệm xôi');
  }
  // Khách ngồi bàn tiệm xôi gọi thêm đồ uống: trừ kho, ghi sổ cái, ngồi đúng bàn của tòa.
  {
    const save = xoiOnlySave();
    save.worldTime.hour = 10;
    save.inventory = [{ productId: 'tra_da', quantity: 5, lots: [lot(5)] }, { productId: 'sua_dau_nanh', quantity: 5, lots: [lot(5)] }];
    const day = save.worldTime.day;
    let key = '';
    for (let i = 0; i < 5000 && !key; i++) if (rollDiningAddOns(DINING_ADD_ON_RULES, ['xoi_man_tp'], `k${i}`, day).length > 0) key = `k${i}`;
    assert.ok(key, 'có khóa khách gọi thêm');
    const diner: CustomerState = { id: key, position: { x: 2.5 * 32, y: 9.5 * 32 }, stage: 'checkout', targetFixtureId: 'xoi_cashier_counter', checkoutId: `checkout-${key}`, patience: 600, checkoutWait: 600, buildingId: 'xoi', basket: [{ productId: 'xoi_man_tp', quantity: 1, unitPrice: 25_000, lots: [lot(1)] }] };
    save.customers = [diner];
    const sim = newSim(save);
    assert.equal(sim.completeCustomerCheckout(`checkout-${key}`, 'xoi_cashier_counter', false, true), true, 'thanh toán rồi đi ngồi bàn xôi');
    for (let i = 0; i < 90 && (live(sim) as CustomerState[]).find(c => c.id === key)?.stage !== 'eating'; i++) sim.update(1);
    assert.equal((live(sim) as CustomerState[]).find(c => c.id === key)?.stage, 'eating', 'khách tiệm xôi ngồi xuống bàn xôi');
    assert.ok(sim.getLedger().some(entry => entry.description.startsWith('Khách ngồi bàn gọi thêm')), 'có dòng sổ cái gọi thêm ở tiệm xôi');
    const left = sim.getInventory().reduce((sum, item) => sum + (item.productId === 'tra_da' || item.productId === 'sua_dau_nanh' ? item.quantity : 0), 0);
    assert.ok(left < 10, 'kho đồ uống bị trừ');
  }
  console.log('Khách theo tòa nhà: PASS');
}
