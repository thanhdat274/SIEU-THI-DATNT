import assert from 'node:assert/strict';
import type { GameTileMap, SaveGameData, StoreFixture } from '@game/shared';
import { BUILDINGS, BUILDING_MAP, DEFAULT_INITIAL_SAVE, FIXTURE_SHOP, LAND_PLOTS, MAP_HEIGHT, MAP_ORIGIN_Y, MAP_WIDTH, STORE_BOUNDS, XOI_BOUNDS, XOI_DEFAULT_FIXTURES, XOI_PLOT_ID, DRINK_BOUNDS, DRINK_DEFAULT_FIXTURES, DRINK_PLOT_ID, DRINK_EXPANSION_PLOT_IDS, XOI_EXPANSION_PLOT_IDS, NORTH_EXPANSION_ROWS, buildingTop, fixtureBuilding, buildingAt, buildingOfTiles, generateStarterTileMap, isFenceTile } from '@game/data';
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

const baseSave = (level = 36, money = 2_000_000): SaveGameData => {
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
    assert.equal(BUILDINGS.length, 4, 'main, xoi, drink, snack');
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
    assert.ok(LAND_PLOTS.some(plot => plot.id === XOI_PLOT_ID && plot.buildingId === 'xoi' && plot.level === 36 && plot.cost === 700_000));
    // Cửa tiệm xôi không bị hàng rào chặn và cây (3,11) không chắn lối vào.
    for (const door of BUILDING_MAP.xoi.doorTiles) assert.equal(isFenceTile(door.x, door.y, MAP_WIDTH), false);
  }

  // Bản đồ: tiệm chính không đổi dù tiệm xôi đóng hay mở; tiệm xôi đóng thì không vào được, mở thì vào được.
  {
    const closed = mapFor([]);
    const open = mapFor([XOI_PLOT_ID]);
    assert.equal(closed.width, MAP_WIDTH);
    assert.equal(closed.height, MAP_HEIGHT);
    // Tòa chưa mua KHÔNG còn trên bản đồ (OpenSpec open-world-building-relocation: lô trống, không vỏ nhà).
    const brief = (map: GameTileMap) => map.buildings!.map(b => ({ id: b.id, open: b.open, top: b.top }));
    assert.deepEqual(brief(closed), [{ id: 'main', open: true, top: 3 }]);
    assert.deepEqual(brief(open), [{ id: 'main', open: true, top: 3 }, { id: 'xoi', open: true, top: 3 }]);
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
    assert.equal(closed.collisionLayer[tileIndex(6, 6)], true, 'tường tiệm chính vẫn còn');
    assert.equal(closed.collisionLayer[tileIndex(3, 6)], false, 'chưa mua thì lô tây là đất trống đi được, không có vỏ nhà');
    assert.equal(walls(closed)[tileIndex(1, 10)], 0, 'không có tường mặt tiền ở lô trống');
    assert.equal(reachable(open, entrance, inside), true, 'đã mua thì đi từ vỉa hè vào được');
    assert.equal(reachable(open, entrance, { x: 8, y: 6 }), true, 'tiệm chính vẫn vào được từ cửa xôi qua vỉa hè (đi vòng)');
    // Tường chung chặn đi xuyên giữa hai tòa: không có đường đi trực tiếp, chỉ qua vỉa hè.
    const wallBetween = tileIndex(6, 6);
    assert.equal(open.collisionLayer[wallBetween], true);
    for (const door of BUILDING_MAP.xoi.doorTiles) {
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
    assert.equal(buyLandPlot(baseSave(35), XOI_PLOT_ID).error, 'level');
    assert.equal(buyLandPlot(baseSave(36, 699_999), XOI_PLOT_ID).error, 'money');
    assert.equal(buyLandPlot({ ...baseSave(), worldTime: { ...baseSave().worldTime, isStoreOpen: true } }, XOI_PLOT_ID).error, 'store_open');
    assert.equal(buyLandPlot(baseSave(), 'building-ghost').error, 'plot_locked');
    // Thất bại không đổi save.
    const poor = baseSave(36, 100);
    assert.equal(buyLandPlot(poor, XOI_PLOT_ID).save, undefined);
    assert.equal(poor.player.money, 100);
    assert.equal(poor.storeLayout.unlockedPlotIds?.length ?? 0, 0);
  }

  // Quán nước: tòa thứ ba đứng riêng ở dải đông (bản đồ mở rộng), đủ bốn tường, mua như tiệm xôi.
  {
    const drink = BUILDING_MAP.drink;
    assert.equal(MAP_WIDTH, 36, 'bản đồ mở rộng cho quán nước');
    assert.equal(DRINK_BOUNDS.right, MAP_WIDTH - 1, 'quán nước sát mép đông');
    assert.equal(DRINK_BOUNDS.right - DRINK_BOUNDS.left + 1, 10);
    assert.equal(DRINK_BOUNDS.bottom - DRINK_BOUNDS.top + 1, 8);
    assert.ok(DRINK_BOUNDS.left > 21, 'không chồng cánh đông tiệm chính');
    assert.equal(buildingAt(30, 6), 'drink');
    assert.equal(buildingAt(DRINK_BOUNDS.left, 6), 'drink');
    assert.equal(buildingAt(24, 6), 'snack', 'khoảng giữa cánh đông tiệm chính và quán nước nay là quán ăn vặt');
    assert.equal(buildingAt(24, 12), undefined, 'vỉa hè không thuộc tòa nào');
    assert.equal(buildingAt(9, 6), 'main');
    assert.equal(buildingOfTiles([{ x: 26, y: 6 }, { x: 27, y: 6 }]), undefined, 'tường quán nước không đặt được nội thất');
    assert.equal(buildingOfTiles([{ x: 30, y: 6 }, { x: 31, y: 6 }]), 'drink');
    assert.ok(LAND_PLOTS.some(plot => plot.id === DRINK_PLOT_ID && plot.buildingId === 'drink' && plot.level === 46 && plot.cost === 1_500_000));
    for (const door of drink.doorTiles) assert.equal(isFenceTile(door.x, door.y, MAP_WIDTH), false, 'cửa quán nước không bị hàng rào chặn');
    // Hàng rào vẫn chạy giữa cánh đông và quán nước, nhưng không nằm trên tường quán nước.
    assert.equal(isFenceTile(18, 10, MAP_WIDTH), true, 'hàng rào còn chạy trước cánh đông tiệm chính');
    assert.equal(isFenceTile(23, 10, MAP_WIDTH), false, 'nhưng không chắn mặt tiền quán ăn vặt');
    assert.equal(isFenceTile(DRINK_BOUNDS.left + 1, 10, MAP_WIDTH), false);

    const closed = mapFor([]);
    const open = mapFor([DRINK_PLOT_ID]);
    const walls = (map: GameTileMap) => map.layers.find(layer => layer.name === 'walls')!.data;
    assert.deepEqual(open.buildings?.filter(b => b.id === 'drink').map(b => ({ id: b.id, open: b.open, top: b.top })), [{ id: 'drink', open: true, top: 3 }]);
    for (const door of drink.doorTiles) {
      assert.equal(closed.collisionLayer[tileIndex(door.x, door.y)], true, 'cửa đóng');
      assert.equal(open.collisionLayer[tileIndex(door.x, door.y)], false, 'cửa mở');
    }
    for (let x = DRINK_BOUNDS.left; x <= DRINK_BOUNDS.right; x++) {
      for (const y of [DRINK_BOUNDS.top, DRINK_BOUNDS.bottom]) {
        if (drink.doorTiles.some(d => d.x === x && d.y === y)) continue;
        assert.equal(walls(open)[tileIndex(x, y)], 4, `tường ngang (${x},${y})`);
        assert.equal(open.collisionLayer[tileIndex(x, y)], true);
      }
    }
    for (let y = DRINK_BOUNDS.top; y <= DRINK_BOUNDS.bottom; y++) for (const x of [DRINK_BOUNDS.left, DRINK_BOUNDS.right]) assert.equal(open.collisionLayer[tileIndex(x, y)], true, `tường dọc (${x},${y})`);
    assert.equal(closed.buildings?.some(b => b.id === 'drink'), false, 'chưa mua thì không có vỏ nhà (lô trống)');
    assert.equal(reachable(open, drink.entranceTile, { x: 30, y: 6 }), true, 'đã mua thì đi từ vỉa hè vào được');
    assert.equal(reachable(open, drink.entranceTile, BUILDING_MAP.main.entranceTile), true, 'đi vòng qua vỉa hè giữa các tòa');
    // Tiệm chính và tiệm xôi không đổi khi quán nước mở.
    for (let y = 0; y < MAP_HEIGHT + MAP_ORIGIN_Y; y++) for (let x = 0; x < DRINK_BOUNDS.left; x++) {
      assert.equal(closed.collisionLayer[tileIndex(x, y)], open.collisionLayer[tileIndex(x, y)], `(${x},${y}) ngoài quán nước không đổi`);
    }

    // Mua: trừ đúng giá một lần, bố cục mặc định hợp lệ, idempotent, điều kiện.
    const save = baseSave(46, 3_000_000);
    const bought = applyStoreLayoutActions(save, [{ type: 'buy_plot', plotId: DRINK_PLOT_ID }], mapFor).save!;
    assert.ok(bought, 'mua quán nước hợp lệ');
    assert.equal(bought.player.money, save.player.money - 1_500_000);
    for (const expected of DRINK_DEFAULT_FIXTURES) assert.ok(bought.storeLayout.fixtures.some(f => f.id === expected.id), `${expected.id} có trong bố cục mặc định`);
    for (const f of DRINK_DEFAULT_FIXTURES) assert.equal(fixtureBuilding(f), 'drink', `${f.id} nằm trọn trong quán nước`);
    assert.equal(validateStoreLayout(bought, mapFor([DRINK_PLOT_ID])).error, undefined, 'bố cục mặc định hợp lệ và có đường tới quầy/kệ');
    const again = buyLandPlot(bought, DRINK_PLOT_ID);
    assert.equal(again.save?.player.money, bought.player.money);
    assert.equal(again.save?.storeLayout.fixtures.length, bought.storeLayout.fixtures.length);
    assert.equal(buyLandPlot(baseSave(45), DRINK_PLOT_ID).error, 'level');
    assert.equal(buyLandPlot(baseSave(46, 1_499_999), DRINK_PLOT_ID).error, 'money');
    assert.equal(buyLandPlot({ ...baseSave(46), worldTime: { ...baseSave().worldTime, isStoreOpen: true } }, DRINK_PLOT_ID).error, 'store_open');
    // Mua cả hai tòa: bố cục hai tòa không đè lên nhau.
    const both = applyStoreLayoutActions(buyXoi(baseSave(46, 5_000_000)), [{ type: 'buy_plot', plotId: DRINK_PLOT_ID }], mapFor).save!;
    assert.ok(both, 'mua tiệm xôi rồi quán nước');
    assert.equal(validateStoreLayout(both, mapFor([XOI_PLOT_ID, DRINK_PLOT_ID])).error, undefined);
    assert.equal(new Set(both.storeLayout.fixtures.map(f => f.id)).size, both.storeLayout.fixtures.length, 'id nội thất không trùng');
    // Quầy thu ngân riêng bắt buộc: bỏ quầy quán nước thì bố cục không hợp lệ.
    const noCashier = structuredClone(bought);
    noCashier.storeLayout.fixtures = noCashier.storeLayout.fixtures.filter(f => f.id !== 'drink_cashier_counter');
    assert.notEqual(validateStoreLayout(noCashier, mapFor([DRINK_PLOT_ID])).error, undefined, 'quán nước phải có quầy thu ngân riêng');
  }

  // Mở rộng đất về phía bắc: tiệm xôi và quán nước mua tối đa 2 mảnh, mỗi mảnh sâu thêm 3 hàng; tiệm chính vẫn mở sang đông.
  {
    for (const [id, base, plots] of [['xoi', XOI_PLOT_ID, XOI_EXPANSION_PLOT_IDS], ['drink', DRINK_PLOT_ID, DRINK_EXPANSION_PLOT_IDS]] as const) {
      const building = id;
      const def = BUILDING_MAP[building];
      assert.equal(def.expansionPlotIds?.length, 2);
      assert.equal(def.maxBounds.top, def.bounds.top - 2 * NORTH_EXPANSION_ROWS, `${id}: biên tối đa lùi 6 hàng`);
      assert.ok(def.maxBounds.top >= MAP_ORIGIN_Y, `${id}: không vượt mép bản đồ`);
      assert.equal(buildingTop(building, []), def.bounds.top);
      assert.equal(buildingTop(building, [plots[0]]), def.bounds.top, 'mảnh mở rộng không có tác dụng khi chưa mua tòa');
      assert.equal(buildingTop(building, [base]), def.bounds.top);
      assert.equal(buildingTop(building, [base, plots[0]]), def.bounds.top - 3);
      assert.equal(buildingTop(building, [base, plots[1]]), def.bounds.top, 'mảnh 2 cần mảnh 1');
      assert.equal(buildingTop(building, [base, plots[0], plots[1]]), def.bounds.top - 6);
      for (const plotId of plots) assert.ok(LAND_PLOTS.some(p => p.id === plotId && p.expandsBuilding === building && p.tiles.length === 0));
      const [pa, pb] = plots.map(plotId => LAND_PLOTS.find(p => p.id === plotId)!);
      const baseLevel = LAND_PLOTS.find(p => p.id === base)!.level;
      assert.equal(pa.prerequisitePlotId, base);
      assert.equal(pb.prerequisitePlotId, pa.id);
      assert.ok(pa.level > baseLevel && pb.level >= pa.level && pb.cost > pa.cost, `${id}: giá/cấp tăng dần`);

      const maps = [mapFor([base]), mapFor([base, plots[0]]), mapFor([base, plots[0], plots[1]])];
      const ground = (map: GameTileMap) => map.layers.find(layer => layer.name === 'ground')!.data;
      const walls = (map: GameTileMap) => map.layers.find(layer => layer.name === 'walls')!.data;
      const entrance = def.entranceTile;
      const midX = Math.floor((def.bounds.left + def.bounds.right) / 2);
      maps.forEach((map, rows) => {
        const top = def.bounds.top - 3 * rows;
        assert.equal(map.buildings?.find(b => b.id === building)?.top, top);
        assert.equal(walls(map)[tileIndex(midX, top)], 4, `${id}: tường sau ở y=${top}`);
        assert.equal(map.collisionLayer[tileIndex(midX, top)], true);
        assert.equal(map.collisionLayer[tileIndex(midX, top + 1)], false, 'hàng sát tường sau đi được');
        assert.equal(reachable(map, entrance, { x: midX, y: top + 1 }), true, `${id}: đi từ cửa tới sàn trong cùng`);
        for (let y = top - 1; y >= def.maxBounds.top; y--) assert.equal(walls(map)[tileIndex(midX, y)], 0, 'chưa mua thì chưa có tường ở hàng này');
        for (let y = top + 1; y < def.bounds.bottom; y++) assert.equal(ground(map)[tileIndex(midX, y)], 3);
        if (rows > 0) assert.equal(walls(map)[tileIndex(midX, def.bounds.top - 3 * (rows - 1))], 0, 'tường sau cũ đã thành sàn');
      });
      for (let y = 0; y < MAP_HEIGHT; y++) for (let x = 0; x < MAP_WIDTH; x++) {
        const wy = y + MAP_ORIGIN_Y;
        if (x >= def.maxBounds.left && x <= def.maxBounds.right && wy >= def.maxBounds.top && wy <= def.maxBounds.bottom) continue;
        const idx: number = y * MAP_WIDTH + x;
        assert.equal(maps[0].collisionLayer[idx], maps[2].collisionLayer[idx], `(${x},${wy}) ngoài ${id} không đổi`);
      }
    }

    // Mua mảnh mở rộng: thứ tự, cấp, tiền, idempotent, thất bại không đổi save.
    const save = baseSave(60, 10_000_000);
    assert.equal(buyLandPlot(save, 'drink-north-a').error, 'prerequisite', 'chưa mua quán nước thì chưa mở rộng được');
    const withDrink = applyStoreLayoutActions(save, [{ type: 'buy_plot', plotId: DRINK_PLOT_ID }], mapFor).save!;
    assert.equal(buyLandPlot(withDrink, 'drink-north-b').error, 'prerequisite', 'mảnh 2 cần mảnh 1');
    const a = applyStoreLayoutActions(withDrink, [{ type: 'buy_plot', plotId: 'drink-north-a' }], mapFor);
    assert.ok(a.save, `mua mảnh 1 hợp lệ (${a.error ?? ''})`);
    assert.equal(a.save.player.money, withDrink.player.money - 500_000);
    const again = buyLandPlot(a.save, 'drink-north-a');
    assert.equal(again.save?.player.money, a.save.player.money, 'mua lại không trừ tiền');
    assert.equal(buyLandPlot({ ...withDrink, player: { ...withDrink.player, level: 49 } }, 'drink-north-a').error, 'level');
    assert.equal(buyLandPlot({ ...withDrink, player: { ...withDrink.player, money: 499_999 } }, 'drink-north-a').error, 'money');
    const b = applyStoreLayoutActions(a.save, [{ type: 'buy_plot', plotId: 'drink-north-b' }], mapFor);
    assert.ok(b.save, `mua mảnh 2 hợp lệ (${b.error ?? ''})`);
    assert.equal(b.save.player.money, a.save.player.money - 750_000);
    assert.equal(validateStoreLayout(b.save, mapFor(b.save.storeLayout.unlockedPlotIds ?? [])).error, undefined, 'bố cục mặc định vẫn hợp lệ sau khi mở rộng hết');

    // Đặt nội thất vào vùng mở rộng: chỉ được khi đã mua mảnh; tòa vẫn nhận diện đúng.
    const probe = fixture({ id: 'probe_table', type: 'dining_table', tileX: 30, tileY: 1, shopId: 'drink_table_2' });
    assert.equal(fixtureBuilding(probe), 'drink', 'ô y=1 thuộc quán nước (vùng mở rộng)');
    const early = structuredClone(withDrink);
    early.storeLayout.fixtures.push(probe);
    assert.equal(validateStoreLayout(early, mapFor(early.storeLayout.unlockedPlotIds ?? [])).error, 'outside_floor', 'chưa mua mảnh thì chưa đặt được');
    const late = structuredClone(a.save);
    late.storeLayout.fixtures.push(probe);
    assert.equal(validateStoreLayout(late, mapFor(late.storeLayout.unlockedPlotIds ?? [])).error, undefined, 'đã mua mảnh 1 thì đặt được ở hàng y=1');
    const wallRow = structuredClone(a.save);
    wallRow.storeLayout.fixtures.push(fixture({ id: 'probe_old_wall', type: 'dining_table', tileX: 30, tileY: 3, shopId: 'drink_table_2' }));
    assert.equal(validateStoreLayout(wallRow, mapFor(wallRow.storeLayout.unlockedPlotIds ?? [])).error, undefined, 'hàng y=3 (tường cũ) thành sàn');
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
