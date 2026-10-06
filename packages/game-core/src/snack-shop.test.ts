import assert from 'node:assert/strict';
import type { CustomerState, GameTileMap, SaveGameData } from '@game/shared';
import {
  BUILDINGS, BUILDING_MAP, BUILDING_TRAFFIC_SHARE, DEFAULT_INITIAL_SAVE, DINING_ADD_ON_RULES, DRINK_BOUNDS, DRINK_PLOT_ID, FIXTURE_SHOP, FOOD_CLUSTER_TRAFFIC_MULTIPLIER, LAND_PLOTS,
  MAIN_STORE_BOUNDS, MAIN_STORE_MAX_RIGHT, MAP_HEIGHT, MAP_ORIGIN_Y, MAP_WIDTH, PRODUCT_MAP, RECIPES, SNACK_BOUNDS, SNACK_DEFAULT_FIXTURES, SNACK_PLOT_ID, SNACK_SHOP_PRODUCT_IDS, XOI_DISH_IDS, XOI_PLOT_ID,
  buildingAt, buildingOfTiles, buildingTop, foodClusterMultiplier, generateStarterTileMap, isFenceTile,
} from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions, validateStoreLayout } from './store-layout';

const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
const tileIndex = (x: number, y: number) => (y - MAP_ORIGIN_Y) * MAP_WIDTH + x;
const lot = (quantity: number) => ({ quantity, expiresOnDay: 400, unitCost: 3_000, provenance: 'known' as const });

const reachable = (map: GameTileMap, from: { x: number; y: number }, to: { x: number; y: number }): boolean => {
  const seen = new Set<string>();
  const queue = [from];
  const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  if (map.collisionLayer[tileIndex(from.x, from.y)]) return false;
  seen.add(key(from));
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur.x === to.x && cur.y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: cur.x + dx, y: cur.y + dy };
      const localY = next.y - MAP_ORIGIN_Y;
      if (next.x < 0 || next.x >= MAP_WIDTH || localY < 0 || localY >= MAP_HEIGHT || seen.has(key(next)) || map.collisionLayer[tileIndex(next.x, next.y)]) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  return false;
};

/** Chỉ kệ quán ăn vặt có hàng nên mọi khách phải chọn quán ăn vặt. */
const snackOnlySave = (extraPlots: string[] = []): SaveGameData => {
  const base = structuredClone(DEFAULT_INITIAL_SAVE);
  base.player.level = 60;
  base.player.money = 10_000_000;
  base.worldTime.isStoreOpen = false;
  const bought = applyStoreLayoutActions(base, [...extraPlots, SNACK_PLOT_ID].map(plotId => ({ type: 'buy_plot' as const, plotId })), mapFor).save!;
  assert.ok(bought, 'mua quán ăn vặt hợp lệ');
  for (const fixture of bought.storeLayout.fixtures) {
    if (fixture.id === 'snack_shelf') { fixture.assignedProductId = 'bap_xao_tp'; fixture.currentStock = 20; fixture.stockLots = [lot(20)]; }
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

export function runSnackShopTests(): void {
  console.log('\n--- Quán ăn vặt (tòa thứ tư) ---');

  // Hình học: chung tường x=26 với quán nước, x=21 với cánh đông tiệm chính; cửa nằm giữa, không bị hàng rào chặn.
  {
    const snack = BUILDING_MAP.snack;
    assert.equal(BUILDINGS.map(b => b.id).join(','), 'main,xoi,drink,snack');
    assert.equal(snack.bounds.right, DRINK_BOUNDS.left, 'chung tường với quán nước');
    assert.equal(snack.bounds.left, MAIN_STORE_MAX_RIGHT, 'chung tường với cánh đông tiệm chính khi mua đủ');
    assert.ok(MAIN_STORE_BOUNDS.right < snack.bounds.left);
    for (const door of snack.doorTiles) {
      assert.equal(door.y, snack.bounds.bottom);
      assert.ok(door.x > snack.bounds.left && door.x < snack.bounds.right);
      assert.equal(isFenceTile(door.x, door.y, MAP_WIDTH), false, 'cửa không bị hàng rào chặn');
    }
    assert.equal(snack.entranceTile.y, snack.bounds.bottom + 1);
    assert.equal(buildingAt(23, 6), 'snack');
    assert.equal(buildingAt(21, 6), 'main', 'tường x=21 thuộc tiệm chính (xét trước)');
    assert.equal(buildingAt(26, 6), 'drink', 'tường x=26 thuộc quán nước (xét trước)');
    assert.equal(buildingOfTiles([{ x: 22, y: 5 }, { x: 25, y: 5 }]), 'snack');
    assert.equal(buildingOfTiles([{ x: 25, y: 5 }, { x: 26, y: 5 }]), undefined, 'vắt qua tường chung bị từ chối');
    assert.equal(snack.maxBounds.top, SNACK_BOUNDS.top - 6, 'hai mảnh bắc thêm 6 hàng');
    assert.equal(buildingTop('snack', [SNACK_PLOT_ID, 'snack-north-a']), SNACK_BOUNDS.top - 3);
    assert.equal(buildingTop('snack', ['snack-north-a']), SNACK_BOUNDS.top, 'mảnh bắc không có tòa thì không tính');
    const plot = LAND_PLOTS.find(p => p.id === SNACK_PLOT_ID)!;
    assert.ok(plot.level === 26 && plot.cost === 400_000 && plot.buildingId === 'snack');
    assert.deepEqual(LAND_PLOTS.filter(p => p.expandsBuilding === 'snack').map(p => p.prerequisitePlotId), [SNACK_PLOT_ID, 'snack-north-a']);
  }

  // Bản đồ: đóng thì không vào được, mở thì đi từ vỉa hè tới trong sàn; tường chung chặn đi xuyên sang quán nước.
  {
    const closed = mapFor([]);
    const open = mapFor([SNACK_PLOT_ID]);
    assert.deepEqual(open.buildings?.filter(b => b.id === 'snack').map(b => ({ id: b.id, open: b.open, top: b.top })), [{ id: 'snack', open: true, top: 3 }]);
    const entrance = BUILDING_MAP.snack.entranceTile;
    assert.equal(closed.buildings?.some(b => b.id === 'snack'), false, 'chưa mua thì không có vỏ nhà (lô trống)');
    assert.equal(reachable(open, entrance, { x: 23, y: 6 }), true);
    for (const f of SNACK_DEFAULT_FIXTURES) {
      const tiles = Array.from({ length: f.widthTiles }, (_, i) => ({ x: f.tileX + i, y: f.tileY }));
      assert.equal(buildingOfTiles(tiles), 'snack', `${f.id} nằm trọn trong sàn quán ăn vặt`);
    }
    assert.equal(open.collisionLayer[tileIndex(26, 6)], true, 'tường chung x=26 luôn chặn');
    assert.equal(reachable(open, entrance, { x: 28, y: 6 }), true, 'quán nước chưa mua là lô trống đi được (không còn vỏ nhà)');
  }

  // Mua tòa: trừ tiền, đặt bố cục mặc định hợp lệ (có thu ngân), mua lặp không nhân đôi, dưới cấp 26 không mua được.
  {
    const base = structuredClone(DEFAULT_INITIAL_SAVE);
    base.player.level = 60; base.player.money = 1_000_000; base.worldTime.isStoreOpen = false;
    const bought = applyStoreLayoutActions(base, [{ type: 'buy_plot', plotId: SNACK_PLOT_ID }], mapFor).save!;
    assert.equal(bought.player.money, 1_000_000 - 400_000);
    for (const f of SNACK_DEFAULT_FIXTURES) assert.equal(bought.storeLayout.fixtures.filter(x => x.id === f.id).length, 1);
    assert.deepEqual(validateStoreLayout(bought, mapFor(bought.storeLayout.unlockedPlotIds ?? [])), {}, 'bố cục mặc định hợp lệ (đủ thu ngân, đi tới được mọi nội thất)');
    const again = applyStoreLayoutActions(bought, [{ type: 'buy_plot', plotId: SNACK_PLOT_ID }], mapFor).save!;
    assert.equal(again.storeLayout.fixtures.length, bought.storeLayout.fixtures.length, 'mua lặp không nhân đôi nội thất');
    const lowLevel = structuredClone(base); lowLevel.player.level = 25;
    assert.equal(applyStoreLayoutActions(lowLevel, [{ type: 'buy_plot', plotId: SNACK_PLOT_ID }], mapFor).save, undefined, 'dưới cấp 26 không mua được');
  }

  // Trạm chảo chỉ đặt trong quán ăn vặt; công thức và món bán hợp lệ.
  {
    for (const id of ['chao_xao', 'chao_chien']) {
      const item = FIXTURE_SHOP.find(x => x.id === id)!;
      assert.deepEqual(item.allowedBuildings, ['snack']);
      assert.equal(item.functional, true);
    }
    for (const id of ['bap_xao_tp', 'ca_vien_chien_tp']) {
      const product = PRODUCT_MAP[id];
      assert.ok(product && product.baseSellingPrice > product.purchasePrice, `${id} có lãi`);
      assert.ok(SNACK_SHOP_PRODUCT_IDS.has(id));
    }
    assert.ok(SNACK_SHOP_PRODUCT_IDS.has('banh_trang_tron_tp'), 'bánh tráng trộn dùng lại ở chảo xào');
    for (const id of XOI_DISH_IDS) assert.equal(SNACK_SHOP_PRODUCT_IDS.has(id), false);
    const snackRecipes = RECIPES.filter(r => r.stationShopId === 'chao_xao' || r.stationShopId === 'chao_chien');
    assert.equal(snackRecipes.length, 3);
    for (const recipe of snackRecipes) {
      assert.ok(PRODUCT_MAP[recipe.outputProductId]);
      assert.ok(FIXTURE_SHOP.some(x => x.id === recipe.stationShopId));
      for (const input of recipe.inputs) assert.ok(PRODUCT_MAP[input.productId], `${recipe.id}: nguyên liệu ${input.productId} tồn tại`);
      const cost = recipe.inputs.reduce((sum, input) => sum + input.quantity * PRODUCT_MAP[input.productId].purchasePrice, 0) / recipe.outputQuantity;
      assert.ok(cost <= PRODUCT_MAP[recipe.outputProductId].baseSellingPrice, `${recipe.id}: giá vốn không vượt giá bán`);
    }
  }

  // Gọi thêm: khách ăn vặt ngồi bàn có thể gọi trà đá/nước mía; món gọi thêm tồn tại.
  {
    const rule = DINING_ADD_ON_RULES.find(r => r.id === 'snack')!;
    assert.ok(rule && rule.whenProductIds.includes('bap_xao_tp') && rule.whenProductIds.includes('ca_vien_chien_tp'));
    for (const add of rule.addOns) assert.ok(PRODUCT_MAP[add.productId] && add.chance > 0 && add.chance <= 1);
    assert.ok(rule.addOns.some(a => a.productId === 'nuoc_mia'));
  }

  // Cụm ẩm thực: nhiều tòa phụ mở thì hệ số tăng đơn điệu, 0–1 tòa không đổi.
  {
    assert.equal(foodClusterMultiplier(0), 1);
    assert.equal(foodClusterMultiplier(1), 1);
    assert.ok(foodClusterMultiplier(2) > 1 && foodClusterMultiplier(3) > foodClusterMultiplier(2));
    assert.equal(foodClusterMultiplier(99), FOOD_CLUSTER_TRAFFIC_MULTIPLIER[FOOD_CLUSTER_TRAFFIC_MULTIPLIER.length - 1], 'bị chặn ở mức cao nhất');
    assert.equal(foodClusterMultiplier(-3), 1);
    assert.ok(BUILDING_TRAFFIC_SHARE.reduce((s, [, share]) => s + share, 0) * foodClusterMultiplier(3) < 1, 'dù có cụm vẫn còn phần cho tiệm chính');
  }

  // Khách thật: chỉ kệ quán ăn vặt có hàng nên mọi khách vào quán ăn vặt, bán được hàng, hao kho kệ riêng.
  {
    const sim = newSim(snackOnlySave());
    const ledger0 = sim.getLedger().length;
    const money0 = sim.getPlayerData().money;
    const shelf0 = sim.getFixtures().find(f => f.id === 'snack_shelf')!.currentStock;
    const seen = new Set<string>();
    for (let i = 0; i < 2400 && sim.getLedger().slice(ledger0).filter(e => e.type === 'sale').length < 2; i++) {
      sim.update(1);
      for (const customer of live(sim)) { assert.equal(customer.buildingId, 'snack'); seen.add(customer.id!); }
    }
    assert.ok(seen.size > 0, 'có khách ghé quán ăn vặt');
    assert.ok(sim.getLedger().slice(ledger0).some(e => e.type === 'sale'), 'bán được hàng');
    assert.ok(sim.getPlayerData().money > money0, 'doanh thu vào ví chung');
    assert.ok(sim.getFixtures().find(f => f.id === 'snack_shelf')!.currentStock < shelf0, 'kệ quán ăn vặt hao hàng');
  }

  // Tự bày hàng: kệ quán ăn vặt chỉ tự nhận món của quán.
  {
    const save = snackOnlySave([XOI_PLOT_ID, DRINK_PLOT_ID]);
    const shelf = save.storeLayout.fixtures.find(f => f.id === 'snack_shelf')!;
    shelf.assignedProductId = undefined; shelf.currentStock = 0; shelf.stockLots = [];
    save.inventory = [
      { productId: 'mi_hao_hao', quantity: 30, lots: [lot(30)] },
      { productId: 'ca_vien_chien_tp', quantity: 10, lots: [lot(10)] },
    ];
    const sim = newSim(save);
    const res = sim.autoFillShelf('snack_shelf');
    assert.equal(res.productId, 'ca_vien_chien_tp', 'kệ ăn vặt chỉ nhận món ăn vặt, không nhận mì gói');
    assert.ok(res.filled > 0);
  }

  console.log('  ✓ Passed: Quán ăn vặt (hình học, mua tòa, trạm chảo/công thức, gọi thêm, cụm ẩm thực, khách và bán hàng, tự bày hàng)');
}
