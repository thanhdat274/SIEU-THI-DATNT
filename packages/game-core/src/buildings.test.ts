import assert from 'node:assert/strict';
import type { GameTileMap, SaveGameData, StoreFixture } from '@game/shared';
import { BUILDINGS, BUILDING_MAP, DEFAULT_INITIAL_SAVE, FIXTURE_SHOP, LAND_PLOTS, MAP_HEIGHT, MAP_ORIGIN_Y, MAP_WIDTH, STORE_BOUNDS, XOI_BOUNDS, XOI_DEFAULT_FIXTURES, XOI_PLOT_ID, buildingAt, buildingOfTiles, generateStarterTileMap, isFenceTile } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions, buyLandPlot, relocateMisplacedFixtures, validateStoreLayout } from './store-layout';

const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
const tileIndex = (x: number, y: number) => (y - MAP_ORIGIN_Y) * MAP_WIDTH + x;

/** Có đường đi (không qua ô vật cản) từ `from` tới `to` trên bản đồ. */
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

const baseSave = (level = 29, money = 2_000_000): SaveGameData => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = level;
  save.player.money = money;
  save.worldTime.isStoreOpen = false;
  return save;
};

const buyXoi = (save: SaveGameData): SaveGameData => {
  const result = applyStoreLayoutActions(save, [{ type: 'buy_plot', plotId: XOI_PLOT_ID }], mapFor);
  assert.ok(result.save, `mua tiệm xôi hợp lệ (${result.error ?? ''} ${result.blockedFixtureIds?.join(',') ?? ''})`);
  return result.save;
};

const fixture = (over: Partial<StoreFixture> & Pick<StoreFixture, 'id' | 'type' | 'tileX' | 'tileY'>): StoreFixture => ({
  widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: over.id, ...over,
});

export function runBuildingTests(): void {
  console.log('\n--- Nhiều tòa nhà: tiệm xôi riêng trên cùng dải đất ---');

  // Dữ liệu: tòa không chồng sàn trong, chỉ chung một tường, nằm trong bản đồ, cửa nằm trên hàng tường dưới.
  {
    const [main, xoi] = BUILDINGS;
    assert.equal(xoi.bounds.right, STORE_BOUNDS.left, 'tiệm xôi dùng chung tường x=6 với tiệm chính');
    for (const building of BUILDINGS) {
      assert.ok(building.bounds.left >= 0 && building.bounds.right < MAP_WIDTH);
      for (const door of building.doorTiles) {
        assert.equal(door.y, building.bounds.bottom);
        assert.ok(door.x > building.bounds.left && door.x < building.bounds.right, 'cửa không nằm ở góc');
      }
      assert.equal(building.entranceTile.y, building.bounds.bottom + 1, 'ô vào cửa nằm ngay ngoài hàng tường dưới');
      assert.ok(building.doorTiles.some(door => door.x === building.entranceTile.x));
    }
    assert.ok(main.bounds.left === xoi.bounds.right && main.bounds.top === xoi.bounds.top);
    assert.equal(buildingAt(9, 6), 'main');
    assert.equal(buildingAt(3, 6), 'xoi');
    assert.equal(buildingAt(6, 6), 'main', 'tường chung thuộc tiệm chính');
    assert.equal(buildingAt(3, 12), undefined, 'vỉa hè không thuộc tòa nào');
    assert.equal(buildingAt(9, -1), undefined, 'kho không thuộc tòa nào');
    assert.equal(buildingOfTiles([{ x: 5, y: 6 }, { x: 6, y: 6 }]), undefined, 'vắt qua tường chung bị từ chối');
    assert.equal(buildingOfTiles([{ x: 5, y: 6 }, { x: 4, y: 6 }]), 'xoi');
    assert.equal(buildingOfTiles([{ x: 8, y: 6 }, { x: 9, y: 6 }]), 'main');
    assert.equal(BUILDING_MAP.xoi.plotId, XOI_PLOT_ID);
    assert.ok(LAND_PLOTS.some(plot => plot.id === XOI_PLOT_ID && plot.buildingId === 'xoi' && plot.level === 29 && plot.cost === 700_000));
    // Cửa tiệm xôi không bị hàng rào chặn và cây (3,11) không chắn lối vào.
    for (const door of BUILDING_MAP.xoi.doorTiles) assert.equal(isFenceTile(door.x, door.y, MAP_WIDTH), false);
  }

  // Bản đồ: tiệm chính không đổi dù tiệm xôi đóng hay mở; tiệm xôi đóng thì không vào được, mở thì vào được.
  {
    const closed = mapFor([]);
    const open = mapFor([XOI_PLOT_ID]);
    assert.equal(closed.width, MAP_WIDTH);
    assert.equal(closed.height, MAP_HEIGHT);
    assert.deepEqual(closed.buildings, [{ id: 'main', open: true }, { id: 'xoi', open: false }]);
    assert.deepEqual(open.buildings, [{ id: 'main', open: true }, { id: 'xoi', open: true }]);
    const ground = (map: GameTileMap) => map.layers.find(layer => layer.name === 'ground')!.data;
    const walls = (map: GameTileMap) => map.layers.find(layer => layer.name === 'walls')!.data;
    for (let y = XOI_BOUNDS.top; y <= XOI_BOUNDS.bottom; y++) {
      for (let x = XOI_BOUNDS.right; x < MAP_WIDTH; x++) {
        const idx = tileIndex(x, y);
        assert.equal(ground(closed)[idx], ground(open)[idx], `nền (${x},${y}) bên ngoài tiệm xôi không đổi`);
        assert.equal(walls(closed)[idx], walls(open)[idx]);
        assert.equal(closed.collisionLayer[idx], open.collisionLayer[idx]);
      }
    }
    const entrance = BUILDING_MAP.xoi.entranceTile;
    const inside = { x: 3, y: 6 };
    assert.equal(reachable(closed, entrance, inside), false, 'chưa mua thì không vào được');
    assert.equal(reachable(open, entrance, inside), true, 'đã mua thì đi từ vỉa hè vào được');
    assert.equal(reachable(open, entrance, { x: 8, y: 6 }), true, 'tiệm chính vẫn vào được từ cửa xôi qua vỉa hè (đi vòng)');
    // Tường chung chặn đi xuyên giữa hai tòa: không có đường đi trực tiếp, chỉ qua vỉa hè.
    const wallBetween = tileIndex(6, 6);
    assert.equal(open.collisionLayer[wallBetween], true);
    for (const door of BUILDING_MAP.xoi.doorTiles) {
      assert.equal(closed.collisionLayer[tileIndex(door.x, door.y)], true, 'cửa đóng');
      assert.equal(open.collisionLayer[tileIndex(door.x, door.y)], false, 'cửa mở');
    }
    // Cổng chính vẫn mở như trước.
    for (const door of BUILDING_MAP.main.doorTiles) assert.equal(closed.collisionLayer[tileIndex(door.x, door.y)], false);
  }

  // Mua tiệm xôi: trừ đúng giá một lần, đặt bố cục mặc định, hợp lệ theo validator.
  {
    const save = baseSave();
    const bought = buyXoi(save);
    assert.equal(bought.player.money, save.player.money - 700_000);
    assert.deepEqual(bought.storeLayout.unlockedPlotIds, [XOI_PLOT_ID]);
    for (const expected of XOI_DEFAULT_FIXTURES) assert.ok(bought.storeLayout.fixtures.some(f => f.id === expected.id), `${expected.id} có trong bố cục mặc định`);
    assert.equal(validateStoreLayout(bought, mapFor([XOI_PLOT_ID])).error, undefined, 'bố cục mặc định hợp lệ và có đường tới quầy/kệ');
    // Mua lại: idempotent, không trừ tiền, không nhân đôi nội thất.
    const again = buyLandPlot(bought, XOI_PLOT_ID);
    assert.equal(again.save?.player.money, bought.player.money);
    assert.equal(again.save?.storeLayout.fixtures.length, bought.storeLayout.fixtures.length);
    // Điều kiện: cấp, tiền, đang mở cửa, id lạ.
    assert.equal(buyLandPlot(baseSave(28), XOI_PLOT_ID).error, 'level');
    assert.equal(buyLandPlot(baseSave(29, 699_999), XOI_PLOT_ID).error, 'money');
    assert.equal(buyLandPlot({ ...baseSave(), worldTime: { ...baseSave().worldTime, isStoreOpen: true } }, XOI_PLOT_ID).error, 'store_open');
    assert.equal(buyLandPlot(baseSave(), 'building-ghost').error, 'plot_locked');
    // Thất bại không đổi save.
    const poor = baseSave(29, 100);
    assert.equal(buyLandPlot(poor, XOI_PLOT_ID).save, undefined);
    assert.equal(poor.player.money, 100);
    assert.equal(poor.storeLayout.unlockedPlotIds?.length ?? 0, 0);
  }

  // Quy tắc đặt nội thất theo tòa nhà.
  {
    const bought = buyXoi(baseSave());
    const open = mapFor([XOI_PLOT_ID]);
    const stationShop = FIXTURE_SHOP.find(item => item.id === 'thung_ngam')!;
    assert.deepEqual(stationShop.allowedBuildings, ['xoi']);

    // Trạm xôi trong tiệm chính bị từ chối.
    const inMain = structuredClone(bought);
    inMain.storeLayout.fixtures.push(fixture({ id: 'wrong_tank', type: 'kitchen_station', tileX: 8, tileY: 6, shopId: 'thung_ngam' }));
    const rejected = validateStoreLayout(inMain, open);
    assert.equal(rejected.error, 'wrong_building');
    assert.deepEqual(rejected.blockedFixtureIds, ['wrong_tank']);
    const viaBuy = applyStoreLayoutActions(bought, [{ type: 'buy_fixture', shopId: 'thung_ngam', tileX: 8, tileY: 6, rotation: 0 }], mapFor);
    assert.equal(viaBuy.error, 'wrong_building', 'mua trạm xôi đặt vào tiệm chính bị chặn');

    // Chuyển trạm từ tiệm xôi sang tiệm chính cũng bị chặn; chuyển trong tiệm xôi được.
    const moveOut = applyStoreLayoutActions(bought, [{ type: 'move', fixtureId: 'xoi_xung_hap', tileX: 8, tileY: 6, rotation: 0 }], mapFor);
    assert.equal(moveOut.error, 'wrong_building');
    const moveIn = applyStoreLayoutActions(bought, [{ type: 'move', fixtureId: 'xoi_xung_hap', tileX: 4, tileY: 7, rotation: 0 }], mapFor);
    assert.ok(moveIn.save, `đổi chỗ trong tiệm xôi hợp lệ (${moveIn.error ?? ''})`);

    // Vắt qua tường chung, hoặc đè lên tường tiệm xôi.
    const straddle = structuredClone(bought);
    straddle.storeLayout.fixtures.push(fixture({ id: 'straddle', type: 'shelf_wooden', tileX: 5, tileY: 7, widthTiles: 2, maxCapacity: 20, slotCount: 1 }));
    assert.equal(validateStoreLayout(straddle, open).error, 'outside_floor');

    // Bàn ăn đặt được ở cả hai tòa.
    const tables = structuredClone(bought);
    tables.storeLayout.fixtures.push(fixture({ id: 'table_main', type: 'dining_table', tileX: 8, tileY: 6, shopId: 'food_table_2', slotCount: 1 }));
    assert.equal(validateStoreLayout(tables, open).error, undefined);

    // Chưa mua tiệm xôi thì không đặt được gì vào trong.
    const unowned = baseSave();
    unowned.storeLayout.fixtures.push(fixture({ id: 'ghost_table', type: 'dining_table', tileX: 3, tileY: 6, shopId: 'food_table_2', slotCount: 1 }));
    assert.equal(validateStoreLayout(unowned, mapFor([])).error, 'outside_floor');

    // Quầy thu ngân cuối cùng của tiệm xôi không cất được; thiếu quầy thì bố cục không hợp lệ.
    const storeCounter = applyStoreLayoutActions(bought, [{ type: 'store', fixtureId: 'xoi_cashier_counter' }], mapFor);
    assert.equal(storeCounter.error, 'prerequisite', 'không cất quầy thu ngân cuối của tiệm xôi');
    const noCounter = structuredClone(bought);
    noCounter.storeLayout.fixtures = noCounter.storeLayout.fixtures.filter(f => f.id !== 'xoi_cashier_counter');
    const noCounterResult = validateStoreLayout(noCounter, open);
    assert.equal(noCounterResult.error, 'path_blocked');
    assert.ok(noCounterResult.blockedFixtureIds?.includes('cashier_missing'));

    // Lối vào tiệm xôi bị chặn thì kệ có hàng không tới được → từ chối; tiệm chính vẫn tính theo cửa của nó.
    const blocked = structuredClone(bought);
    blocked.storeLayout.fixtures.push(
      fixture({ id: 'block_a', type: 'decor', tileX: 1, tileY: 9 }), fixture({ id: 'block_b', type: 'decor', tileX: 2, tileY: 9 }),
    );
    const shelf = blocked.storeLayout.fixtures.find(f => f.id === 'xoi_shelf')!;
    shelf.currentStock = 5;
    shelf.assignedProductId = 'xoi_man_tp';
    const blockedResult = validateStoreLayout(blocked, open);
    assert.equal(blockedResult.error, 'path_blocked', 'cửa tiệm xôi bị nội thất chặn thì kệ không tới được');
  }

  // Di cư: trạm xôi đã nằm trong tiệm chính được cất vào kho nội thất, giữ nguyên dữ liệu; trạm trong tiệm xôi ở nguyên.
  {
    const misplaced = fixture({ id: 'old_tank', type: 'kitchen_station', tileX: 8, tileY: 6, shopId: 'thung_ngam', slotCount: 1, label: 'Thùng ngâm cũ' });
    const fine = fixture({ id: 'good_steamer', type: 'kitchen_station', tileX: 2, tileY: 5, shopId: 'xung_hap', slotCount: 1 });
    const shelf = fixture({ id: 'main_shelf', type: 'shelf_wooden', tileX: 9, tileY: 5, widthTiles: 2, maxCapacity: 20, shopId: 'shelf', slotCount: 1 });
    const result = relocateMisplacedFixtures([misplaced, fine, shelf], []);
    assert.deepEqual(result.movedIds, ['old_tank']);
    assert.deepEqual(result.fixtures.map(f => f.id), ['good_steamer', 'main_shelf']);
    assert.deepEqual(result.stored, [misplaced], 'nguyên vẹn, không mất dữ liệu');
    assert.equal(relocateMisplacedFixtures([fine, shelf], []).movedIds.length, 0);
  }

  // Qua mô phỏng (đường lệnh buy_plot của local và server): mua tiệm, bản đồ mở, lưu/nạp giữ nguyên.
  {
    const sim = new GameSimulation(baseSave(), mapFor([]), new InputManager(), {});
    const money = sim.getPlayerData().money;
    const result = sim.purchaseLand(XOI_PLOT_ID);
    assert.ok(result.save, `mua qua simulation (${result.error ?? ''})`);
    assert.equal(sim.getPlayerData().money, money - 700_000);
    assert.ok(sim.getUnlockedPlotIds().includes(XOI_PLOT_ID));
    for (const expected of XOI_DEFAULT_FIXTURES) assert.ok(sim.getFixtures().some(f => f.id === expected.id), `${expected.id} có trên sàn`);
    assert.equal(sim.purchaseLand(XOI_PLOT_ID).save?.player.money, money - 700_000, 'mua lại không trừ thêm tiền');
    const reloaded = new GameSimulation(sim.exportSaveData('s', 1), mapFor([XOI_PLOT_ID]), new InputManager(), {});
    assert.ok(reloaded.getUnlockedPlotIds().includes(XOI_PLOT_ID));
    assert.equal(reloaded.getFixtures().filter(f => f.id.startsWith('xoi_') && !f.parentId).length, XOI_DEFAULT_FIXTURES.length, 'nội thất tiệm xôi còn nguyên sau nạp lại, không bị cất nhầm');
    assert.equal(reloaded.getPlayerData().money, money - 700_000);
  }

  // Ra khỏi tiệm xôi và điểm bảo vệ: từ sàn trong ra ô vào cửa (đường đi hai chiều) và điểm đứng của bảo vệ (4,13) không bị tòa mới chặn.
  {
    const open = generateStarterTileMap(['building-xoi']);
    assert.equal(reachable(open, { x: 3, y: 6 }, BUILDING_MAP.xoi.entranceTile), true, 'từ sàn tiệm xôi đi ra tới ô vào cửa');
    assert.equal(reachable(open, BUILDING_MAP.xoi.entranceTile, { x: 3, y: 6 }), true, 'từ ô vào cửa đi vào sàn tiệm xôi');
    assert.equal(open.collisionLayer[tileIndex(4, 13)], false, 'điểm bảo vệ (4,13) không bị chặn khi có tiệm xôi');
    assert.equal(generateStarterTileMap([]).collisionLayer[tileIndex(4, 13)], false, 'điểm bảo vệ (4,13) không bị chặn khi chưa có tiệm xôi');
  }
  console.log('Nhiều tòa nhà: PASS');
}
