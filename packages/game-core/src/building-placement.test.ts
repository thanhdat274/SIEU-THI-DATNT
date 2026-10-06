import assert from 'node:assert/strict';
import { isSalesFixture, tileIndex, type BuildingPlacementRecord, type SaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, ROOF_EAVES, SHELTER_ZONES, SNACK_PLOT_ID, XOI_PLOT_ID, fixtureBuilding, generateStarterTileMap, placementGeometry, NORTH_EXPANSION_ROWS } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions, buyLandPlot, buildingsOfSave, placementOptions, relocateBuilding, relocationFee, validateStoreLayout } from './store-layout';

/** Đặt tòa phụ vào lô tự chọn (OpenSpec `open-world-building-relocation`, mua tòa kèm vị trí). */
export function runBuildingPlacementTests(): void {
  console.log('\n--- Đặt tòa phụ vào lô tự chọn ---');
  const base = (): SaveGameData => {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.worldTime.isStoreOpen = false;
    save.player = { ...save.player, level: 60, money: 20_000_000 };
    return save;
  };
  const mapFor = (ids: readonly string[], placements?: readonly BuildingPlacementRecord[]) => generateStarterTileMap(ids, [], placements);
  const buy = (save: SaveGameData, plotId: string, placement?: { parcelId: string; originX: number }) =>
    applyStoreLayoutActions(save, [{ type: 'buy_plot', plotId, ...(placement ? { placement } : {}) }], mapFor);

  // Các chỗ đặt hợp lệ của quán ăn vặt (6 ô) khi chưa mua gì: ba lô, cây vỉa hè chặn vài cột.
  const options = placementOptions(base(), 'snack');
  assert.deepEqual(options.map(option => option.parcelId), ['lot-west', 'lot-east-1', 'lot-east-2'], 'tiệm chính giữ lô giữa; ba lô còn lại đều trống');
  assert.deepEqual(options.find(option => option.parcelId === 'lot-west')!.originXs, [0, 1]);
  assert.deepEqual(options.find(option => option.parcelId === 'lot-east-1')!.originXs, [21]);
  assert.ok(!options.find(option => option.parcelId === 'lot-east-2')!.originXs.includes(27), 'gốc 27 đặt cửa (x=28) ngay trước cây (28,11)');
  assert.deepEqual(placementOptions(base(), 'drink').map(option => option.parcelId), ['lot-east-2'], 'quán nước 10 ô chỉ vừa lô đông 2');

  // Mặc định: vị trí cũ, save giữ dạng cũ (không ghi vị trí đặt).
  const defaultBuy = buy(base(), SNACK_PLOT_ID).save!;
  assert.equal(defaultBuy.storeLayout.buildingPlacements, undefined, 'mua ở vị trí mặc định không thêm trường mới');
  assert.ok(defaultBuy.storeLayout.fixtures.some(f => f.id === 'snack_shelf' && f.tileX === 24), 'nội thất mặc định ở lô đông 1 (gốc 21 + 3)');

  // Mua ở lô tây: nội thất, cửa, bản đồ theo gốc mới; lô đông 1 trống.
  const west = { parcelId: 'lot-west', originX: 1 };
  const bought = buy(base(), SNACK_PLOT_ID, west).save!;
  assert.ok(bought, 'đặt quán ăn vặt ở lô tây');
  assert.equal(bought.player.money, 20_000_000 - 400_000, 'giá không đổi theo lô (Bước 4 mới có hệ số vị trí)');
  assert.deepEqual(bought.storeLayout.buildingPlacements, [
    { buildingId: 'main', parcelId: 'lot-center', originX: 6, originY: 3 },
    { buildingId: 'snack', parcelId: 'lot-west', originX: 1, originY: 3 },
  ]);
  const shelf = bought.storeLayout.fixtures.find(f => f.id === 'snack_shelf')!;
  assert.equal(shelf.tileX, 4, 'kệ ăn vặt: gốc 1 + 3');
  const placed = mapFor(bought.storeLayout.unlockedPlotIds ?? [], bought.storeLayout.buildingPlacements);
  assert.deepEqual(buildingsOfSave(bought).map(b => [b.id, b.bounds!.left, b.entranceTile!.x]), [['main', 6, 9], ['snack', 1, 2]]);
  assert.deepEqual(placed.buildings?.map(b => [b.id, b.bounds?.left]), [['main', 6], ['snack', 1]]);
  assert.equal(fixtureBuilding(shelf, placed.buildings), 'snack', 'kệ thuộc quán ăn vặt theo vị trí mới');
  assert.equal(fixtureBuilding(shelf), 'xoi', 'tra tĩnh theo vị trí mặc định sẽ sai (kệ rơi vào chỗ mặc định của tiệm xôi): phải truyền bản đồ');
  assert.equal(validateStoreLayout(bought, placed).error, undefined, 'bố cục hợp lệ, có đường từ cửa mới tới quầy/kệ');
  assert.equal(placed.collisionLayer[tileIndex(placed, 23, 5)], false, 'lô đông 1 là đất trống');

  // Lô đã có tòa, vượt lô, cây chặn cửa; tiệm xôi vào lô đã dành cho quán ăn vặt.
  assert.equal(buy(bought, XOI_PLOT_ID).error, 'parcel_occupied', 'vị trí mặc định của tiệm xôi (lô tây) đã bị quán ăn vặt chiếm');
  assert.equal(buy(bought, XOI_PLOT_ID, { parcelId: 'lot-east-1', originX: 21 }).error, 'outside_parcel', 'tiệm xôi 7 ô không vừa lô đông 1 (6 ô)');
  assert.equal(buy(bought, XOI_PLOT_ID, { parcelId: 'lot-east-2', originX: 27 }).error, 'door_blocked');
  const both = buy(bought, XOI_PLOT_ID, { parcelId: 'lot-east-2', originX: 28 }).save!;
  assert.ok(both, 'tiệm xôi ở lô đông 2 khi quán ăn vặt đã ở lô tây');
  assert.deepEqual(both.storeLayout.buildingPlacements!.map(p => p.buildingId), ['main', 'xoi', 'snack'], 'giữ thứ tự ưu tiên mặc định');
  assert.equal(buyLandPlot(bought, 'building-snack', west).save?.player.money, bought.player.money, 'mua lại cùng tòa là no-op');

  // Mô phỏng: khách chỉ ghé quán ăn vặt (kệ duy nhất có hàng) và vẫn được phục vụ khi tòa nằm ở lô tây; lưu/nạp giữ vị trí; mái hiên theo vị trí mới.
  const save = structuredClone(bought);
  for (const f of save.storeLayout.fixtures) if (isSalesFixture(f)) { f.currentStock = 0; f.stockLots = []; }
  const sim = new GameSimulation(save, mapFor(save.storeLayout.unlockedPlotIds ?? [], save.storeLayout.buildingPlacements), new InputManager(), {});
  const shelfId = 'snack_shelf';
  const restock = () => {
    const f = sim.getFixtures().find(item => item.id === shelfId)!;
    f.assignedProductId = 'banh_mi_que';
    f.currentStock = 14;
    f.stockLots = [{ quantity: 14, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  };
  restock();
  let hour = sim.getTime().hour, guard = 0;
  while (sim.getTime().day < 3 && guard++ < 400_000) {
    const t = sim.getTime();
    if (t.hour !== hour) { hour = t.hour; restock(); }
    if (!t.isStoreOpen && t.hour < 20) sim.getClock().toggleStoreStatus();
    sim.update(0.25);
  }
  const served = Object.values(sim.getDailyRecords()).reduce((sum, r) => sum + r.customersServed, 0);
  assert.ok(served > 0, `quán ăn vặt ở lô tây có khách mua (phục vụ ${served})`);
  const snackZone = SHELTER_ZONES.find(zone => zone.id === 'snack-awning')!;
  const geo = placementGeometry({ buildingId: 'snack', parcelId: 'lot-west', originX: 1, originY: 3 });
  assert.equal(snackZone.x0, geo.awning.x0, 'khu trú mưa của mái hiên theo vị trí mới');
  assert.equal(ROOF_EAVES.find(eave => eave.awning === 'snack')!.x0, geo.awning.x0 + 8, 'mép nước mưa theo vị trí mới');
  const exported = sim.exportSaveData('placement-test', 1);
  assert.deepEqual(exported.storeLayout.buildingPlacements, bought.storeLayout.buildingPlacements, 'lưu giữ vị trí đặt');
  const reloaded = new GameSimulation(structuredClone(exported), mapFor(exported.storeLayout.unlockedPlotIds ?? [], exported.storeLayout.buildingPlacements), new InputManager(), {});
  assert.deepEqual(reloaded.getTileMap().buildings?.map(b => [b.id, b.bounds?.left]), [['main', 6], ['snack', 1]], 'nạp lại vẫn có quán ăn vặt ở lô tây');
  // Dời tòa (D5): tòa đang có hàng trên kệ, quán ăn vặt từ lô đông 1 sang lô tây.
  const stocked = structuredClone(defaultBuy);
  const stockedShelf = stocked.storeLayout.fixtures.find(f => f.id === 'snack_shelf')!;
  stockedShelf.assignedProductId = 'banh_mi_que';
  stockedShelf.currentStock = 9;
  stockedShelf.stockLots = [{ quantity: 9, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  stocked.storeLayout.unlockedPlotIds = [...(stocked.storeLayout.unlockedPlotIds ?? []), 'snack-north-a'];
  const moveTo = { parcelId: 'lot-west', originX: 1 };
  assert.equal(relocationFee(stocked, 'snack'), Math.round((400_000 + 150_000) * 0.3), 'phí = 30% (giá mở tòa + mảnh mở rộng bắc đã mua)');
  assert.equal(relocateBuilding({ ...stocked, worldTime: { ...stocked.worldTime, isStoreOpen: true } }, 'snack', moveTo).error, 'store_open');
  assert.equal(relocateBuilding(stocked, 'main', moveTo).error, 'invalid_placement', 'tiệm chính không dời được');
  assert.equal(relocateBuilding(stocked, 'snack', { parcelId: 'lot-east-1', originX: 21 }).error, 'invalid_placement', 'cùng vị trí');
  assert.equal(relocateBuilding(stocked, 'drink', moveTo).error, 'plot_locked', 'tòa chưa mở không dời được');
  assert.equal(relocateBuilding(stocked, 'snack', { parcelId: 'lot-center', originX: 6 }).error, 'parcel_occupied');
  assert.equal(relocateBuilding({ ...stocked, player: { ...stocked.player, money: 1_000 } }, 'snack', moveTo).error, 'money');
  const moved = relocateBuilding(stocked, 'snack', moveTo).save!;
  assert.ok(moved, 'dời quán ăn vặt sang lô tây');
  assert.equal(moved.player.money, stocked.player.money - relocationFee(stocked, 'snack'), 'trừ phí một lần');
  const { floorTiles: movedFloor, ...movedRecord } = moved.storeLayout.buildingPlacements!.find(p => p.buildingId === 'snack')!;
  assert.deepEqual(movedRecord, { buildingId: 'snack', parcelId: 'lot-west', originX: 1, originY: 3, constructionUntilDay: stocked.worldTime.day + 1 }, 'thi công tới sáng hôm sau');
  assert.equal(movedFloor?.length, 12, 'mảnh bắc đã mua (4 ô × 3 hàng) dời cùng tòa thành ô sàn mở rộng');
  assert.ok(movedFloor!.every(tile => tile.x >= 2 && tile.x <= 5 && tile.y >= 1 && tile.y <= 3), 'ô sàn mở rộng nằm trong lô mới, trên hàng tường sau cũ');
  const movedShelf = moved.storeLayout.fixtures.find(f => f.id === 'snack_shelf')!;
  assert.equal(movedShelf.tileX, stockedShelf.tileX - 20, 'nội thất dịch theo dx = −20');
  assert.equal(movedShelf.tileY, stockedShelf.tileY);
  assert.equal(movedShelf.currentStock, 9, 'hàng trên kệ giữ nguyên');
  assert.equal(movedShelf.assignedProductId, 'banh_mi_que', 'gán kệ giữ nguyên');
  assert.equal(moved.storeLayout.fixtures.length, stocked.storeLayout.fixtures.length, 'không mất/nhân đôi nội thất');
  assert.equal(new Set(moved.storeLayout.fixtures.map(f => f.id)).size, moved.storeLayout.fixtures.length);
  const mainFixtureBefore = JSON.stringify(stocked.storeLayout.fixtures.filter(f => !f.id.startsWith('snack_')));
  assert.equal(JSON.stringify(moved.storeLayout.fixtures.filter(f => !f.id.startsWith('snack_'))), mainFixtureBefore, 'nội thất tòa khác không đổi');
  const constructing = mapFor(moved.storeLayout.unlockedPlotIds ?? [], moved.storeLayout.buildingPlacements);
  const snackInfo = constructing.buildings!.find(b => b.id === 'snack')!;
  assert.equal(snackInfo.open, false, 'đang thi công: tòa đóng');
  for (const door of snackInfo.doorTiles!) assert.equal(constructing.collisionLayer[tileIndex(constructing, door.x, door.y)], true, 'cửa bị chặn khi thi công');
  assert.equal(validateStoreLayout(moved, constructing).error, undefined, 'bố cục sau khi dời hợp lệ');
  const viaBatch = applyStoreLayoutActions(stocked, [{ type: 'relocate_building', buildingId: 'snack', placement: moveTo }], mapFor);
  assert.deepEqual(viaBatch.save?.storeLayout.buildingPlacements, moved.storeLayout.buildingPlacements, 'layout_batch cho cùng kết quả');

  // Mô phỏng: trong ngày thi công quán ăn vặt không có khách; sáng hôm sau mở lại và có khách.
  const siege = structuredClone(moved);
  const dayOne = siege.worldTime.day;
  const sim2 = new GameSimulation(siege, mapFor(siege.storeLayout.unlockedPlotIds ?? [], siege.storeLayout.buildingPlacements), new InputManager(), {});
  const restock2 = () => {
    const f = sim2.getFixtures().find(item => item.id === 'snack_shelf')!;
    f.assignedProductId = 'banh_mi_que';
    f.currentStock = 14;
    f.stockLots = [{ quantity: 14, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  };
  for (const f of sim2.getFixtures()) if (isSalesFixture(f) && f.id !== 'snack_shelf') { f.currentStock = 0; f.stockLots = []; }
  restock2();
  let hour2 = sim2.getTime().hour, guard2 = 0;
  const servedOn = (day: number) => sim2.getDailyRecords()[day]?.customersServed ?? 0;
  while (sim2.getTime().day < dayOne + 3 && guard2++ < 600_000) {
    const t = sim2.getTime();
    if (t.hour !== hour2) { hour2 = t.hour; restock2(); }
    if (!t.isStoreOpen && t.hour < 20) sim2.getClock().toggleStoreStatus();
    sim2.update(0.25);
  }
  assert.equal(servedOn(dayOne), 0, 'ngày thi công: không khách nào (chỉ kệ ở quán ăn vặt có hàng)');
  assert.ok(servedOn(dayOne + 1) + servedOn(dayOne + 2) > 0, 'mở lại sáng hôm sau và có khách');
  assert.equal(sim2.getTileMap().buildings!.find(b => b.id === 'snack')!.open, true);
  assert.equal(sim2.exportSaveData('reloc', 1).storeLayout.buildingPlacements!.find(p => p.buildingId === 'snack')!.constructionUntilDay, undefined, 'hết thi công thì xóa cờ');
  console.log('  ✓ lựa chọn lô/gốc, luật đặt (lô, cây, vượt lô), nội thất theo gốc, bản đồ/lô trống, khách mua ở lô tây, mái hiên, lưu/nạp, dời tòa (phí, dịch nội thất, thi công 1 ngày, mở lại)');

  // Migration Lát C: *-north-* → floorTiles khi nạp save schema 5
  const northSave = structuredClone(base());
  northSave.schemaVersion = 5;
  northSave.storeLayout.unlockedPlotIds = ['building-xoi', 'xoi-north-a', 'xoi-north-b'];
  northSave.player.money = 20_000_000;
  // Nạp qua simulation: resolvePlacements chuyển north plots → floorTiles
  const northSim = new GameSimulation(northSave, mapFor(northSave.storeLayout.unlockedPlotIds!), new InputManager(), {});
  // Kiểm tra bản đồ có tiệm xôi với sàn mở rộng phía bắc
  const northMap = northSim.getTileMap();
  const groundData = northMap.layers.find(l => l.name === 'ground')!.data;
  const xoiGeo = placementGeometry({ buildingId: 'xoi', parcelId: 'lot-west', originX: 0, originY: 3 });
  // Xoi: width 7, sàn rộng 5 (trừ 2 tường), 2 mảnh × 3 hàng × 5 = 30 ô
  const floorWidth = xoiGeo.bounds.right - xoiGeo.bounds.left - 1; // 5
  const expectedNorthTiles = NORTH_EXPANSION_ROWS * 2 * floorWidth; // 30
  let northFloorCount = 0;
  for (let y = xoiGeo.bounds.top - NORTH_EXPANSION_ROWS * 2; y < xoiGeo.bounds.top; y++) {
    for (let x = xoiGeo.bounds.left + 1; x < xoiGeo.bounds.right; x++) {
      const idx = tileIndex({ width: northMap.width, height: northMap.height, originTileX: northMap.originTileX ?? 0, originTileY: northMap.originTileY ?? 0 }, x, y);
      if (groundData[idx] === 3) northFloorCount++;
    }
  }
  assert.equal(northFloorCount, expectedNorthTiles, `migration north plots → floorTiles: ${northFloorCount} ô sàn (2 mảnh × ${NORTH_EXPANSION_ROWS} hàng × ${floorWidth} rộng)`);
  // Bản đồ có tiệm xôi với sàn mở rộng
  assert.ok(northMap.buildings?.some(b => b.id === 'xoi'), 'bản đồ có tiệm xôi');
  assert.equal(northMap.buildings!.find(b => b.id === 'xoi')!.top, xoiGeo.bounds.top - NORTH_EXPANSION_ROWS * 2, 'tiệm xôi top = biên gốc - 2 mảnh × 3 hàng');
  console.log('  ✓ migration *-north-* → floorTiles (schema 5 → 6)');
}
