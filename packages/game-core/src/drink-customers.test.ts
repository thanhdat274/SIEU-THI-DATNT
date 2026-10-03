import assert from 'node:assert/strict';
import type { CustomerState, SaveGameData } from '@game/shared';
import { BUILDING_MAP, BUILDING_TRAFFIC_SHARE, DEFAULT_INITIAL_SAVE, DRINK_BOUNDS, DRINK_PLOT_ID, DRINK_SHOP_PRODUCT_IDS, XOI_DISH_IDS, XOI_PLOT_ID, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions } from './store-layout';

const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
const lot = (quantity: number) => ({ quantity, expiresOnDay: 400, unitCost: 3_000, provenance: 'known' as const });

/** Quán nước đã mua; chỉ kệ quán nước có hàng nên mọi khách phải chọn quán nước. */
const drinkOnlySave = (extraPlots: string[] = []): SaveGameData => {
  const base = structuredClone(DEFAULT_INITIAL_SAVE);
  base.player.level = 35;
  base.player.money = 10_000_000;
  base.worldTime.isStoreOpen = false;
  const bought = applyStoreLayoutActions(base, [...extraPlots, DRINK_PLOT_ID].map(plotId => ({ type: 'buy_plot' as const, plotId })), mapFor).save!;
  assert.ok(bought, 'mua quán nước hợp lệ');
  for (const fixture of bought.storeLayout.fixtures) {
    if (fixture.id === 'drink_shelf') { fixture.assignedProductId = 'nuoc_suoi'; fixture.currentStock = 20; fixture.stockLots = [lot(20)]; }
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
const inDrink = (c: CustomerState) => c.position.x > DRINK_BOUNDS.left * 32 && c.position.x < DRINK_BOUNDS.right * 32 && c.position.y > DRINK_BOUNDS.top * 32 && c.position.y < DRINK_BOUNDS.bottom * 32;

export function runDrinkCustomerTests(): void {
  console.log('\n--- Khách theo tòa nhà: quán nước ---');

  // Dữ liệu: tỷ lệ khách các tòa phụ hợp lệ và thứ tự xét cố định.
  {
    assert.deepEqual(BUILDING_TRAFFIC_SHARE.map(([id]) => id), ['xoi', 'drink']);
    assert.ok(BUILDING_TRAFFIC_SHARE.reduce((sum, [, share]) => sum + share, 0) < 1, 'luôn còn phần cho tiệm chính');
    for (const id of ['nuoc_suoi', 'tra_xanh', 'sua_tuoi', 'nuoc_mia', 'sinh_to_trai_cay', 'ca_phe_sua_pha']) assert.ok(DRINK_SHOP_PRODUCT_IDS.has(id), `${id} là hàng quán nước`);
    for (const id of XOI_DISH_IDS) assert.equal(DRINK_SHOP_PRODUCT_IDS.has(id), false, `${id} (món xôi) không phải hàng quán nước`);
    assert.equal(DRINK_SHOP_PRODUCT_IDS.has('mi_hao_hao'), false);
  }

  // Khách tự sinh chọn quán nước khi chỉ nơi đó có hàng: xuất hiện ở cửa quán, đi vào trong sàn quán.
  {
    const sim = newSim(drinkOnlySave());
    const seen = new Set<string>();
    let wasInside = false;
    const spawnedAt: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 900 && !wasInside; i++) {
      sim.update(1);
      for (const customer of live(sim)) {
        assert.equal(customer.buildingId, 'drink', 'mọi khách đều chọn quán nước (tiệm chính hết hàng)');
        if (!seen.has(customer.id!)) { seen.add(customer.id!); spawnedAt.push({ ...customer.position }); }
        if (inDrink(customer)) wasInside = true;
      }
    }
    assert.ok(seen.size > 0, 'có khách ghé quán nước');
    assert.ok(wasInside, 'khách đi qua cửa và vào trong sàn quán nước');
    const entrance = BUILDING_MAP.drink.entranceTile;
    for (const position of spawnedAt) {
      const walked = Math.abs(position.x / 32 - (entrance.x + 0.5)) < 1 && Math.abs(position.y / 32 - (entrance.y + 0.5)) < 1;
      const parked = position.y / 32 >= 12; // đỗ xe trên vỉa hè rồi đi bộ tới cửa
      assert.ok(walked || parked, `khách xuất hiện ở cửa quán nước hoặc chỗ đỗ xe (${position.x},${position.y})`);
    }
  }

  // Bán hàng thật: quán nước ghi doanh thu vào ví/sổ cái chung và hao kho quán nước (kệ riêng).
  {
    const save = drinkOnlySave();
    const sim = newSim(save);
    const money0 = sim.getPlayerData().money;
    const ledger0 = sim.getLedger().length;
    const shelf0 = sim.getFixtures().find(f => f.id === 'drink_shelf')!.currentStock;
    for (let i = 0; i < 2400 && sim.getLedger().slice(ledger0).filter(e => e.type === 'sale').length < 3; i++) sim.update(1);
    const sales = sim.getLedger().slice(ledger0).filter(e => e.type === 'sale');
    assert.ok(sales.length >= 1, 'quán nước bán được hàng');
    assert.ok(sim.getPlayerData().money > money0, 'doanh thu vào ví chung');
    assert.ok(sim.getFixtures().find(f => f.id === 'drink_shelf')!.currentStock < shelf0, 'kệ quán nước giảm hàng sau khi bán');
    assert.ok(sales.every(e => e.branchId === undefined), 'bán ở tòa nhà không gắn branchId (khác chi nhánh nền)');
  }

  // Tự châm kệ: kệ quán nước chỉ nhận đồ uống của quán; kệ tiệm chính không nhận món xôi nhưng nhận đồ uống thường.
  {
    const save = drinkOnlySave();
    save.worldTime.isStoreOpen = false;
    for (const fixture of save.storeLayout.fixtures) {
      if (fixture.type === 'shelf_wooden') { fixture.assignedProductId = undefined; fixture.currentStock = 0; fixture.stockLots = []; }
    }
    save.inventory = [
      { productId: 'mi_hao_hao', quantity: 20, lots: [lot(20)] },
      { productId: 'nuoc_suoi', quantity: 8, lots: [lot(8)] },
    ];
    const sim = newSim(save);
    const drinkShelf = sim.autoFillShelf('drink_shelf');
    assert.equal(drinkShelf.productId, 'nuoc_suoi', 'kệ quán nước tự nhận đồ uống, không nhận mì gói');
    assert.equal(sim.getFixtures().find(f => f.id === 'drink_shelf')!.assignedProductId, 'nuoc_suoi');

    const onlyGrocery = structuredClone(save);
    onlyGrocery.inventory = [{ productId: 'mi_hao_hao', quantity: 20, lots: [lot(20)] }];
    const sim2 = newSim(onlyGrocery);
    const none = sim2.autoFillShelf('drink_shelf');
    assert.equal(none.assigned, false);
    assert.equal(none.reason, 'no_compatible_inventory', 'kệ quán nước không tự nhận hàng tạp hóa');
  }

  // Sản xuất ngay trong quán nước: ba trạm đồ uống nấu ra thành phẩm, nhập kho tổng, rồi tự châm lên kệ quán nước.
  {
    const save = drinkOnlySave();
    save.worldTime.isStoreOpen = false;
    for (const fixture of save.storeLayout.fixtures) {
      if (fixture.type === 'shelf_wooden') { fixture.assignedProductId = undefined; fixture.currentStock = 0; fixture.stockLots = []; }
    }
    save.inventory = [
      { productId: 'mia', quantity: 4, lots: [lot(4)] },
      { productId: 'trai_cay', quantity: 2, lots: [lot(2)] },
      { productId: 'sua_chua', quantity: 2, lots: [lot(2)] },
      { productId: 'ca_phe_bot', quantity: 1, lots: [lot(1)] },
      { productId: 'duong_cat', quantity: 1, lots: [lot(1)] },
      { productId: 'sua_hop', quantity: 2, lots: [lot(2)] },
    ];
    const sim = newSim(save);
    assert.equal(sim.startProduction('recipe_nuoc_mia', 'drink_press_1').success, true, 'máy ép mía trong quán nước chạy được');
    assert.equal(sim.startProduction('recipe_sinh_to', 'drink_blender_1').success, true, 'máy xay trong quán nước chạy được');
    assert.equal(sim.startProduction('recipe_ca_phe_sua', 'drink_counter_1').success, true, 'quầy nước trong quán chạy được');
    assert.equal(sim.startProduction('recipe_nuoc_mia', 'drink_blender_1').success, false, 'sai trạm bị từ chối');
    for (let i = 0; i < 120 && sim.getProductionJobs().length > 0; i++) sim.update(1);
    assert.equal(sim.getProductionJobs().length, 0, 'ba mẻ đã xong');
    const stock = (id: string) => sim.getInventory().find(item => item.productId === id)?.quantity ?? 0;
    assert.equal(stock('nuoc_mia'), 6);
    assert.equal(stock('sinh_to_trai_cay'), 4);
    assert.equal(stock('ca_phe_sua_pha'), 5);
    const filled = sim.autoFillShelf('drink_shelf');
    assert.ok(filled.productId && DRINK_SHOP_PRODUCT_IDS.has(filled.productId) && filled.filled > 0, 'kệ quán nước tự nhận thành phẩm đồ uống');
  }

  // Mở rộng phía bắc: khách đi được vào vùng sàn mới (hàng y<=3 vốn bị chặn với khách) và mua hàng ở kệ trong vùng đó.
  {
    const base = drinkOnlySave();
    base.worldTime.isStoreOpen = false; // chỉ mua đất khi đóng cửa
    const expanded = applyStoreLayoutActions(base, [{ type: 'buy_plot', plotId: 'drink-north-a' }], mapFor).save!;
    assert.ok(expanded, 'mua mảnh mở rộng hợp lệ');
    for (const fixture of expanded.storeLayout.fixtures) {
      if (fixture.id === 'drink_shelf') { fixture.assignedProductId = undefined; fixture.currentStock = 0; fixture.stockLots = []; }
    }
    expanded.storeLayout.fixtures.push({ id: 'north_shelf', type: 'shelf_wooden', tileX: 28, tileY: 1, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 20, maxCapacity: 20, label: 'Kệ phía bắc', shopId: 'shelf', slotCount: 12, assignedProductId: 'nuoc_suoi', stockLots: [lot(20)] });
    expanded.worldTime.isStoreOpen = true;
    const sim = newSim(expanded);
    let reachedNorth = false;
    const ledger0 = sim.getLedger().length;
    for (let i = 0; i < 2400 && !(reachedNorth && sim.getLedger().slice(ledger0).some(e => e.type === 'sale')); i++) {
      sim.update(1);
      for (const customer of live(sim)) if (customer.buildingId === 'drink' && customer.position.y < 3 * 32 && customer.position.y > 0 && inDrink({ ...customer, position: { x: customer.position.x, y: DRINK_BOUNDS.top * 32 + 40 } })) reachedNorth = true;
    }
    assert.ok(reachedNorth, 'khách đi vào vùng sàn mở rộng phía bắc');
    assert.ok(sim.getLedger().slice(ledger0).some(e => e.type === 'sale'), 'khách mua được hàng ở kệ vùng mở rộng');
  }

  // Dòng khách riêng: mở thêm quán nước là thêm khách, không chia bớt khách tiệm chính.
  {
    const stocked = (withDrink: boolean) => {
      const save = withDrink ? drinkOnlySave() : (() => {
        const plain = structuredClone(DEFAULT_INITIAL_SAVE);
        plain.player.level = 35; plain.player.money = 10_000_000;
        plain.worldTime = { ...plain.worldTime, isStoreOpen: true, hour: 8 };
        return plain;
      })();
      for (const fixture of save.storeLayout.fixtures) {
        if (fixture.id === 'shelf_wooden_noodles') { fixture.assignedProductId = 'mi_hao_hao'; fixture.currentStock = 12; fixture.stockLots = [lot(12)]; }
      }
      return save;
    };
    const countBy = (withDrink: boolean) => {
      const sim = newSim(stocked(withDrink));
      const seen = new Map<string, string>();
      for (let i = 0; i < 1200; i++) {
        sim.update(1);
        for (const fixture of sim.getFixtures()) {
          if (fixture.assignedProductId && fixture.currentStock < 8) { fixture.currentStock = 12; fixture.stockLots = [lot(12)]; }
        }
        for (const customer of live(sim)) if (customer.id && !seen.has(customer.id)) seen.set(customer.id, customer.buildingId ?? 'main');
      }
      const counts = { main: 0, drink: 0 };
      for (const building of seen.values()) counts[building === 'drink' ? 'drink' : 'main']++;
      return counts;
    };
    const without = countBy(false);
    const withShop = countBy(true);
    assert.equal(without.drink, 0);
    assert.ok(withShop.drink > 0, 'quán nước có khách riêng');
    assert.ok(withShop.main >= without.main * 0.85, `khách tiệm chính không bị chia bớt (${without.main} → ${withShop.main})`);
    assert.ok(withShop.main + withShop.drink > without.main, 'tổng khách tăng khi mở thêm quán nước');
  }

  // Chia khách giữa ba tòa: cả ba cùng có hàng thì tòa phụ nhận phần của mình, phần còn lại vào tiệm chính.
  {
    const save = drinkOnlySave([XOI_PLOT_ID]);
    for (const fixture of save.storeLayout.fixtures) {
      if (fixture.id === 'xoi_shelf') { fixture.assignedProductId = 'xoi_man_tp'; fixture.currentStock = 20; fixture.stockLots = [lot(20)]; }
      else if (fixture.id === 'shelf_wooden_noodles') { fixture.assignedProductId = 'mi_hao_hao'; fixture.currentStock = 12; fixture.stockLots = [lot(12)]; }
    }
    const counts: Record<string, number> = { main: 0, xoi: 0, drink: 0 };
    const sim = newSim(save);
    const seen = new Set<string>();
    for (let i = 0; i < 6000; i++) {
      sim.update(1);
      // Giữ hàng đầy để kệ không cạn trong lúc đếm.
      for (const fixture of sim.getFixtures()) {
        if (fixture.assignedProductId && fixture.currentStock < 10) { fixture.currentStock = 20; fixture.stockLots = [lot(20)]; }
      }
      for (const customer of live(sim)) {
        if (customer.id && !seen.has(customer.id)) { seen.add(customer.id); counts[customer.buildingId ?? 'main']++; }
      }
      if (seen.size >= 120) break;
    }
    assert.ok(seen.size >= 60, `đủ mẫu khách (${seen.size})`);
    assert.ok(counts.drink > 0 && counts.xoi > 0 && counts.main > counts.drink, `cả ba tòa có khách: ${JSON.stringify(counts)}`);
    const share = counts.drink / seen.size;
    assert.ok(share > 0.03 && share < 0.4, `tỷ lệ khách quán nước hợp lý (${share.toFixed(2)})`);
  }
}
