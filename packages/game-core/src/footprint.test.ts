import assert from 'node:assert/strict';
import { isSaveGameData, tileIndex, CURRENT_SAVE_SCHEMA_VERSION, type SaveGameData } from '@game/shared';
import {
  DEFAULT_INITIAL_SAVE, EXPANSION_TILE_PRICE, MAIN_EAST_WING_PLOT_IDS, checkFootprintTiles, expansionBudgetAtLevel, expansionTilesUsed, footprintFloor,
  generateStarterTileMap, normalizePlacements, placementsProblem, wallRing, adjacentParcels, buildingAt, buildingOfTiles,
} from '@game/data';
import { CollisionSystem } from './collision';
import { InputManager } from './input';
import { findPath } from './pathfinding';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions, buyLandPlot, buyShopFixture, expandFootprint, expansionBudget, relocateBuilding, sharedExpansionBudget, validateStoreLayout } from './store-layout';

/** Mở rộng tiệm chính theo ô (OpenSpec `open-world-main-expansion`, nhóm 1–3). */
export function runFootprintTests(): void {
  console.log('\n--- Mở rộng tiệm chính theo ô: footprint, ngân sách, luật, bản đồ ---');
  const rect = (x0: number, x1: number, y0: number, y1: number) => {
    const tiles: Array<{ x: number; y: number }> = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push({ x, y });
    return tiles;
  };
  const closed = (patch: Partial<SaveGameData['player']> = {}): SaveGameData => {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.worldTime.isStoreOpen = false;
    save.player = { ...save.player, level: 10, money: 5_000_000, ...patch };
    return save;
  };
  const ground = (map: ReturnType<typeof generateStarterTileMap>) => map.layers.find(layer => layer.name === 'ground')!.data;
  const walls = (map: ReturnType<typeof generateStarterTileMap>) => map.layers.find(layer => layer.name === 'walls')!.data;
  const mapOf = (save: SaveGameData) => generateStarterTileMap(save.storeLayout.unlockedPlotIds ?? [], [], save.storeLayout.buildingPlacements);

  // Ngân sách theo cấp: mốc 5/10 trùng số ô sàn của hai cánh đông cũ (24 + 24).
  assert.equal(expansionBudgetAtLevel(4), 0, 'dưới cấp 5 chưa có ô mở rộng');
  assert.equal(expansionBudgetAtLevel(5), 24, 'cấp 5 = 24 ô (cánh đông a cũ)');
  assert.equal(expansionBudgetAtLevel(10), 48, 'cấp 10 = 48 ô (cả hai cánh đông cũ)');
  assert.equal(expansionBudgetAtLevel(29), 84, 'giữa hai mốc giữ mốc thấp hơn');
  assert.equal(expansionBudgetAtLevel(60), 200, 'cấp 60 = 200 ô');
  assert.ok(expansionBudgetAtLevel(35) > 90, 'từ cấp 35 vượt sức chứa lô (90) có chủ đích');

  // Hình học thuần: sàn, tường, luật.
  const core = { left: 6, right: 13, top: 3, bottom: 10 };
  const baseFloor = footprintFloor(core, new Set());
  assert.equal(baseFloor.size, 36, 'sàn gốc 6×6 = 36 ô');
  assert.equal(wallRing(baseFloor).size, 28, 'tường gốc 8×8 viền = 28 ô');
  const parcel = { x0: 6, x1: 21, y0: -3, y1: 10 };
  const warehouse = [{ x0: 6, x1: 13, y0: -3, y1: 3 }];
  const check = (tiles: Array<{ x: number; y: number }>) => checkFootprintTiles({ floor: baseFloor, tiles, parcelId: 'lot-center', blocked: warehouse });
  assert.equal(check([]), 'empty');
  assert.equal(check([{ x: 7, y: 5 }]), 'duplicate', 'ô đã là sàn');
  assert.equal(check([{ x: 13, y: 5 }, { x: 13, y: 5 }]), 'duplicate', 'ô trùng nhau');
  assert.equal(check([{ x: 21, y: 5 }]), 'outside_parcel', 'x=21 là tường chung với quán ăn vặt, ngoài vùng sàn của lô');
  assert.equal(check([{ x: 14, y: 10 }]), 'outside_parcel', 'hàng y=10 là tường mặt tiền');
  assert.equal(check([{ x: 12, y: 2 }]), 'blocked_by_building', 'không xây sàn vào nhà kho');
  assert.equal(check([{ x: 16, y: 6 }]), 'not_adjacent', 'ô lẻ không kề sàn');
  assert.equal(check([{ x: 13, y: 5 }, { x: 17, y: 6 }]), 'disconnected', 'một ô nối được, ô kia là đảo');
  assert.equal(check([{ x: 13, y: 5 }, { x: 14, y: 5 }, { x: 14, y: 4 }]), null, 'dải liền nối vào sàn hợp lệ (không bắt buộc từng ô kề sàn)');

  // Lệnh: ngân sách, tiền, cửa hàng đóng.
  const base = closed();
  assert.deepEqual(expansionBudget(base), { used: 0, max: 48, remaining: 48 });
  assert.equal(expandFootprint({ ...base, worldTime: { ...base.worldTime, isStoreOpen: true } }, 'main', rect(13, 13, 4, 5)).error, 'store_open');
  assert.equal(expandFootprint(base, 'xoi', rect(13, 13, 4, 5)).error, 'invalid_tiles', 'Bước 2 chỉ mở rộng tiệm chính');
  assert.equal(expandFootprint(base, 'main', []).error, 'invalid_tiles');
  assert.equal(expandFootprint(closed({ level: 4 }), 'main', rect(13, 13, 4, 5)).error, 'over_budget', 'cấp 4 chưa có ngân sách');
  assert.equal(expandFootprint(closed({ money: 10_000 }), 'main', rect(13, 13, 4, 5)).error, 'money');
  assert.equal(expandFootprint(closed({ level: 5 }), 'main', rect(13, 15, 4, 12)).error, 'outside_parcel', 'lỗi hình học báo trước ngân sách');
  assert.equal(expandFootprint(closed({ level: 5 }), 'main', rect(13, 16, 3, 9)).error, 'blocked_by_building', 'chạm kho trước');
  assert.equal(expandFootprint(closed({ level: 5 }), 'main', rect(13, 17, 4, 9)).error, 'over_budget', '30 ô > 24 ô ở cấp 5');
  assert.equal(base.player.money, 5_000_000, 'lỗi không đổi save gốc');

  // path_blocked: bố cục đã hỏng sẵn (nội thất đè ngoài sàn) thì lệnh mở rộng bị từ chối, không trừ tiền.
  const broken = closed();
  broken.storeLayout.fixtures = [...broken.storeLayout.fixtures, { id: 'stray_shelf', type: 'shelf_wooden', tileX: 40, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 20, label: 'lạc' }];
  const brokenResult = expandFootprint(broken, 'main', rect(13, 14, 4, 9));
  assert.equal(brokenResult.error, 'path_blocked', 'bố cục hỏng sau khi dựng lại bản đồ báo path_blocked');
  assert.equal(brokenResult.save, undefined);

  // Khách thật mua ở kệ nằm ở phần mở rộng phía bắc (ngoài hộp tiệm cũ): mọi kệ khác để trống.
  const shopSave = expandFootprint(closed({ level: 25 }), 'main', [...rect(13, 14, 4, 9), ...rect(14, 17, 1, 3)]).save!;
  const withShelf = buyShopFixture(shopSave, 'shelf', 15, 1, 0).save!;
  const northShelf = withShelf.storeLayout.fixtures.find(f => f.shopId === 'shelf')!;
  for (const f of withShelf.storeLayout.fixtures) if (f.id !== northShelf.id && (f.type === 'shelf_wooden' || f.type === 'refrigerator')) { f.currentStock = 0; f.stockLots = []; }
  const shopSim = new GameSimulation(structuredClone(withShelf), mapOf(withShelf), new InputManager(), {});
  const northId = shopSim.getFixtures().find(f => f.shopId === 'shelf')!.id;
  const restock = () => {
    const shelf = shopSim.getFixtures().find(f => f.id === northId)!;
    shelf.assignedProductId = 'mi_hao_hao';
    shelf.currentStock = 14;
    shelf.stockLots = [{ quantity: 14, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  };
  restock();
  let hour = shopSim.getTime().hour, guard = 0;
  while (shopSim.getTime().day < 3 && guard++ < 400_000) {
    const t = shopSim.getTime();
    if (t.hour !== hour) { hour = t.hour; restock(); }
    if (!t.isStoreOpen && t.hour < 20) shopSim.getClock().toggleStoreStatus();
    shopSim.update(0.25);
  }
  const served = Object.values(shopSim.getDailyRecords()).reduce((sum, r) => sum + r.customersServed, 0);
  assert.ok(served > 0, `khách mua được ở kệ phía bắc ngoài sàn cũ (phục vụ ${served})`);

  // Hình chữ L: dải cột 13..14 (12 ô) rồi mảng 14..16 × y2..3 (6 ô) nối lên phía bắc.
  const first = expandFootprint(base, 'main', rect(13, 14, 4, 9));
  assert.ok(first.save, 'mở rộng sang đông hợp lệ');
  assert.equal(first.save!.player.money, 5_000_000 - 12 * EXPANSION_TILE_PRICE, 'trừ 8.000 ₫ mỗi ô');
  assert.deepEqual(expansionBudget(first.save!), { used: 12, max: 48, remaining: 36 });
  const second = expandFootprint(first.save!, 'main', rect(14, 16, 2, 3));
  assert.ok(second.save, 'mảng phía bắc nối vào ô vừa mở');
  assert.equal(second.save!.storeLayout.buildingPlacements!.length, 1, 'chỉ lưu vị trí của tòa đang có (tiệm chính; tòa phụ chưa mua không có vị trí)');
  assert.equal(second.save!.storeLayout.buildingPlacements!.find(p => p.buildingId === 'main')!.floorTiles!.length, 18);
  assert.equal(isSaveGameData(second.save), true, 'save có ô sàn mở rộng đúng hình dạng');
  assert.equal(expandFootprint(second.save!, 'main', rect(14, 16, 2, 3)).error, 'invalid_tiles', 'gửi lại lệnh cũ bị từ chối, không trừ tiền lần nữa');

  const lMap = mapOf(second.save!);
  const at = (x: number, y: number) => tileIndex(lMap, x, y);
  for (const [x, y] of [[13, 6], [14, 6], [15, 3], [16, 2]]) {
    assert.equal(ground(lMap)[at(x, y)], 3, `(${x},${y}) là sàn`);
    assert.equal(lMap.collisionLayer[at(x, y)], false, `(${x},${y}) đi được`);
    assert.equal(walls(lMap)[at(x, y)], 0, `(${x},${y}) không có tường`);
  }
  for (const [x, y] of [[15, 6], [15, 9], [13, 10], [14, 10], [15, 10], [14, 1], [17, 2], [17, 3], [17, 4]]) {
    assert.equal(walls(lMap)[at(x, y)], 4, `(${x},${y}) là tường quanh footprint`);
    assert.equal(lMap.collisionLayer[at(x, y)], true, `(${x},${y}) chặn đường`);
  }
  assert.equal(walls(lMap)[at(13, 3)], 10, 'tường kho giữ nguyên kiểu tường kho');
  assert.deepEqual(lMap.storeBounds, { left: 6, right: 17, top: 1, bottom: 10 }, 'storeBounds là hộp bao sàn + tường');
  assert.equal(walls(lMap)[at(9, 10)], 0, 'cửa tiệm vẫn mở');
  assert.equal(validateStoreLayout(second.save!, lMap).error, undefined, 'bố cục vẫn hợp lệ sau khi mở rộng');

  // Khách đi được vào phần mới (kể cả phần phía bắc ngoài hộp tiệm cũ).
  const collision = new CollisionSystem(lMap, []);
  assert.ok(findPath(lMap, collision, { x: 9, y: 11 }, { x: 14, y: 6 }).length > 0, 'đường từ cửa tới ô sàn mới phía đông');
  assert.ok(findPath(lMap, collision, { x: 9, y: 11 }, { x: 15, y: 2 }).length > 0, 'đường từ cửa tới ô sàn mới phía bắc');

  // Đặt kệ vào phần mở rộng: hợp lệ, trong tòa chính.
  const shelf = buyShopFixture(second.save!, 'shelf', 15, 2, 0);
  assert.ok(shelf.save, 'mua kệ đặt vào ô sàn mới');
  assert.equal(validateStoreLayout(shelf.save!, lMap).error, undefined, 'kệ ở phần phía bắc đi tới được');
  const onWall = buyShopFixture(second.save!, 'shelf', 16, 8, 0);
  assert.equal(validateStoreLayout(onWall.save!, lMap).error, 'outside_floor', 'kệ đè lên tường quanh footprint bị từ chối');

  // Lưu/nạp qua simulation; lệnh qua applyStoreLayoutActions (đường layout_batch).
  const viaBatch = applyStoreLayoutActions(base, [{ type: 'expand_footprint', buildingId: 'main', tiles: rect(13, 14, 4, 9) }], (ids, placements) => generateStarterTileMap(ids, [], placements));
  assert.deepEqual(viaBatch.save?.storeLayout.buildingPlacements, first.save!.storeLayout.buildingPlacements, 'layout_batch cho cùng kết quả lệnh trực tiếp');
  const sim = new GameSimulation(structuredClone(base), mapOf(base), new InputManager(), {});
  assert.ok(sim.expandFootprint('main', rect(13, 14, 4, 9)).save, 'simulation mở rộng');
  const exported = sim.exportSaveData('footprint-test', 1);
  assert.equal(exported.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(exported.storeLayout.buildingPlacements?.find(p => p.buildingId === 'main')?.floorTiles?.length, 12, 'save xuất có ô sàn mở rộng');
  assert.equal(exported.player.money, 5_000_000 - 12 * EXPANSION_TILE_PRICE);
  const reloaded = new GameSimulation(structuredClone(exported), mapOf(exported), new InputManager(), {});
  assert.deepEqual(reloaded.exportSaveData('footprint-test', 1).storeLayout.buildingPlacements, exported.storeLayout.buildingPlacements, 'nạp lại giữ nguyên ô sàn');
  assert.deepEqual(reloaded.getBuildingPlacements(), exported.storeLayout.buildingPlacements);

  // Khung liền khối có ô lõm bên trong (dải đông + thanh trên + thanh dưới + cột cuối).
  const wide = closed({ level: 25 });
  const uShape = expandFootprint(wide, 'main', [...rect(13, 14, 4, 9), ...rect(15, 18, 4, 4), ...rect(15, 18, 9, 9), ...rect(18, 19, 5, 8)]);
  assert.ok(uShape.save, 'hình phức tạp liền khối hợp lệ');
  const uMap = mapOf(uShape.save!);
  assert.equal(ground(uMap)[tileIndex(uMap, 16, 5)], 3, 'ô lõm kề sàn là tường (ground 3)');
  assert.equal(walls(uMap)[tileIndex(uMap, 16, 5)], 4, 'ô lõm kề sàn là tường');
  assert.equal(walls(uMap)[tileIndex(uMap, 16, 6)], 0, 'ô giữa lõm không kề sàn nào thì không có tường (sân trong, khách không tới được)');
  assert.equal(ground(uMap)[tileIndex(uMap, 16, 6)], 2, 'sân trong là cỏ');

  // Save cũ có cánh đông: tính vào ngân sách đã dùng, bản đồ khớp golden Bước 1; không mua lại được khi đã có ô mở rộng.
  const legacy = closed({ level: 10 });
  legacy.storeLayout.unlockedPlotIds = [...MAIN_EAST_WING_PLOT_IDS];
  assert.deepEqual(expansionBudget(legacy), { used: 48, max: 48, remaining: 0 }, 'hai cánh cũ dùng hết ngân sách cấp 10');
  assert.equal(expandFootprint(legacy, 'main', rect(14, 15, 3, 3)).error, 'over_budget');
  assert.equal(expansionTilesUsed(core, new Set(['east-wing-a']), undefined), 24);
  const legacyL10 = closed({ level: 25 });
  legacyL10.storeLayout.unlockedPlotIds = ['east-wing-a'];
  const northOfWing = expandFootprint(legacyL10, 'main', rect(14, 16, 2, 3));
  assert.ok(northOfWing.save, 'mở rộng tiếp từ cánh đông cũ');
  assert.equal(expansionBudget(northOfWing.save!).used, 24 + 6);
  assert.equal(applyStoreLayoutActions(first.save!, [{ type: 'buy_plot', plotId: 'east-wing-a' }], (ids, p) => generateStarterTileMap(ids, [], p)).error, 'plot_locked', 'không mua cánh đông cũ khi đã có ô mở rộng');

  // Save: kiểm hợp lệ ô sàn đã lưu (server dùng placementsProblem).
  const placements = second.save!.storeLayout.buildingPlacements!;
  assert.equal(placementsProblem(placements, []), null, 'ô sàn hợp lệ được nhận');
  const withTiles = (tiles: Array<{ x: number; y: number }>) => placements.map(p => (p.buildingId === 'main' ? { ...p, floorTiles: tiles } : p));
  assert.equal(placementsProblem(withTiles([{ x: 40, y: 5 }]), []), 'footprint:outside_parcel');
  assert.equal(placementsProblem(withTiles([{ x: 15, y: 5 }]), []), 'footprint:not_adjacent', 'ô đảo bị coi là save hỏng');
  assert.equal(placementsProblem(withTiles([{ x: 13, y: 5 }, { x: 13, y: 5 }]), []), 'footprint:duplicate');
  // Tòa phụ cũng có ô sàn mở rộng (Bước 3 lát C): hợp lệ khi kề sàn, trong lô, không chạm tòa khác.
  const withXoi = (tiles: Array<{ x: number; y: number }>) => [...placements, { buildingId: 'xoi', parcelId: 'lot-west', originX: 0, originY: 3, floorTiles: tiles }];
  assert.equal(placementsProblem(withXoi([{ x: 3, y: 3 }]), ['building-xoi']), null, 'xôi mở rộng lên hàng tường sau (kề sàn gốc, trong lô)');
  assert.equal(placementsProblem(withXoi([{ x: 3, y: 0 }]), ['building-xoi']), 'footprint:not_adjacent', 'ô đảo của tòa phụ');
  assert.equal(placementsProblem(withXoi([{ x: 3, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 0 }, { x: 3, y: -1 }, { x: 3, y: -2 }, { x: 3, y: -3 }]), ['building-xoi']), 'footprint:outside_parcel', 'tường quá mép lô');
  assert.equal(placementsProblem(withXoi([{ x: 6, y: 5 }]), ['building-xoi']), 'footprint:outside_parcel', 'xôi không lấn sang tường chung/sàn tiệm chính');
  assert.equal(normalizePlacements(withTiles([{ x: 15, y: 5 }]), []).some(p => p.floorTiles), false, 'ô sàn hỏng bị bỏ, dùng mặc định');
  assert.equal(normalizePlacements(placements, []).find(p => p.buildingId === 'main')?.floorTiles?.length, 18, 'ô sàn hợp lệ được giữ');
  assert.equal(normalizePlacements(undefined, []).some(p => p.floorTiles), false);
  const tooMany = rect(7, 26, 0, 20); // > 400 ô
  assert.equal(isSaveGameData({ ...base, storeLayout: { ...base.storeLayout, buildingPlacements: withTiles(tooMany) } }), false, 'save phình quá giới hạn bị coi là hỏng');
  // D7b: mở rộng sang lô kề trống
  const baseFloor2 = footprintFloor(core, new Set());
  const checkWithFree = (tiles: Array<{ x: number; y: number }>) => checkFootprintTiles({ floor: baseFloor2, tiles, parcelId: 'lot-center', blocked: warehouse, freeParcelIds: ['lot-west'] });
  // Lô tây kề nên cho phép mở rộng sang (x=6 nằm trong lot-west, kề với x=7 là sàn gốc)
  assert.equal(checkWithFree([{ x: 6, y: 5 }]), null, 'mở rộng sang lô kề trống (freeParcelIds), ô kề sàn');
  // Lô đông 1 không kề nên không cho phép
  assert.equal(checkWithFree([{ x: 22, y: 5 }]), 'outside_parcel', 'lô đông 1 không kề lot-center');
  // D7b qua vòng lưu/nạp: ô lấn sang lô tây trống phải còn sau khi nạp, lô được ghi vào parcelIds, và lô đó không bán lại được cho tòa khác.
  {
    const west = closed({ level: 10 });
    const grown = expandFootprint(west, 'main', [{ x: 6, y: 5 }]);
    assert.ok(grown.save, 'lấn sang lô tây trống');
    const saved = grown.save!.storeLayout.buildingPlacements!;
    assert.equal(placementsProblem(saved, grown.save!.storeLayout.unlockedPlotIds ?? []), null, 'save sau lấn lô kề hợp lệ khi nạp lại');
    const reloaded = normalizePlacements(saved, new Set(grown.save!.storeLayout.unlockedPlotIds ?? [])).find(p => p.buildingId === 'main')!;
    assert.deepEqual(reloaded.floorTiles, [{ x: 6, y: 5 }], 'ô lấn lô kề không bị bỏ khi nạp');
    assert.deepEqual(reloaded.parcelIds, ['lot-center', 'lot-west']);
    const fakeLot = saved.map(p => (p.buildingId === 'main' ? { ...p, parcelIds: ['lot-center', 'lot-nope'] } : p));
    assert.equal(placementsProblem(fakeLot, []), 'unknown_parcel:lot-nope');
    // Tiếp tục lấn từ lô đã nhận: ô thứ hai trong lô tây vẫn qua được.
    const more = expandFootprint(grown.save!, 'main', [{ x: 5, y: 5 }]);
    assert.ok(more.save, 'lấn tiếp trong lô đã nhận');
    assert.equal(placementsProblem(more.save!.storeLayout.buildingPlacements!, []), null);
  }
  // Mở rộng sàn cho tòa phụ (Bước 3 lát C, L3-C1): xôi/quán nước/ăn vặt lấn lên hàng tường sau, ngân sách chung, tường theo footprint, save/nạp.
  {
    let all: SaveGameData = closed({ level: 60, money: 90_000_000 });
    for (const plotId of ['building-snack', 'building-xoi', 'building-drink']) {
      const bought = buyLandPlot(all, plotId);
      assert.ok(bought.save, `mua ${plotId}`);
      all = bought.save!;
    }
    const rowAt = (y: number, x0: number, x1: number) => rect(x0, x1, y, y);
    const cases = [
      { id: 'xoi', tiles: rowAt(3, 1, 5), wallCols: [0, 6] },
      { id: 'drink', tiles: rowAt(3, 27, 34), wallCols: [26, 35] },
      { id: 'snack', tiles: rowAt(3, 22, 25), wallCols: [21, 26] },
    ] as const;
    let used = 0;
    for (const { id, tiles, wallCols } of cases) {
      const grown = expandFootprint(all, id, tiles);
      assert.ok(grown.save, `${id}: mở rộng sàn lên hàng tường sau (${grown.error ?? 'ok'})`);
      used += tiles.length;
      assert.equal(grown.save!.player.money, all.player.money - tiles.length * EXPANSION_TILE_PRICE, `${id}: trừ ${tiles.length} ô × giá ô`);
      all = grown.save!;
      const map = mapOf(all);
      const info = map.buildings!.find(building => building.id === id)!;
      const mid = tiles[Math.floor(tiles.length / 2)];
      assert.equal(ground(map)[tileIndex(map, mid.x, mid.y)], 3, `${id}: ô mới là sàn`);
      assert.equal(walls(map)[tileIndex(map, mid.x, mid.y)], 0, `${id}: ô mới không còn tường`);
      assert.equal(walls(map)[tileIndex(map, mid.x, 2)], 4, `${id}: tường mới dựng ở hàng kề trên`);
      for (const x of wallCols) assert.equal(walls(map)[tileIndex(map, x, 3)] !== 0, true, `${id}: tường bên ở hàng mới`);
      assert.equal(info.top, 2, `${id}: hàng tường sau lùi lên 1 hàng`);
      assert.equal(buildingOfTiles([{ x: mid.x, y: mid.y }], map.buildings), id, `${id}: nội thất đặt được ở ô mới`);
      assert.equal(buildingAt(mid.x, mid.y, map.buildings), id);
      const lane = new CollisionSystem(map, []);
      assert.ok(findPath(map, lane, { x: info.entranceTile!.x, y: info.entranceTile!.y }, { x: mid.x, y: mid.y }).length > 0, `${id}: đi từ cửa tới ô mới`);
    }
    assert.equal(sharedExpansionBudget(all).used, used, 'ngân sách chung cộng ô của cả ba tòa');
    assert.equal(placementsProblem(all.storeLayout.buildingPlacements, all.storeLayout.unlockedPlotIds ?? []), null, 'save ba tòa mở rộng hợp lệ khi nạp lại');
    // Mở rộng tiệm chính SAU khi tòa phụ đã có sàn mở rộng: phần của tòa phụ không bị mất (lỗi footprint_unsupported trước đây).
    const mainGrown = expandFootprint(all, 'main', [{ x: 13, y: 5 }]);
    assert.ok(mainGrown.save, `tiệm chính vẫn mở rộng được (${mainGrown.error ?? 'ok'})`);
    assert.equal(placementsProblem(mainGrown.save!.storeLayout.buildingPlacements, mainGrown.save!.storeLayout.unlockedPlotIds ?? []), null);
    assert.equal(normalizePlacements(mainGrown.save!.storeLayout.buildingPlacements, new Set(mainGrown.save!.storeLayout.unlockedPlotIds)).find(p => p.buildingId === 'xoi')?.floorTiles?.length, 5, 'sàn mở rộng của xôi còn nguyên sau khi nạp');
    // Luật: không ô đảo, không lấn qua tường chung/hàng mặt tiền, quá ngân sách bị từ chối, không trừ tiền.
    assert.equal(expandFootprint(all, 'xoi', [{ x: 3, y: -1 }]).error, 'not_adjacent', 'ô đảo');
    assert.equal(expandFootprint(all, 'xoi', [{ x: 6, y: 5 }]).error, 'outside_parcel', 'không lấn tường chung với tiệm chính');
    assert.equal(expandFootprint(all, 'snack', rowAt(2, 22, 25).concat(rowAt(1, 22, 25), rowAt(0, 22, 25), rowAt(-1, 22, 25), rowAt(-2, 22, 25), rowAt(-3, 22, 25))).error, 'outside_parcel', 'tường quá mép lô phía bắc');
    const lowLevel = closed({ level: 5, money: 90_000_000 });
    const lowOwned = buyLandPlot({ ...lowLevel, player: { ...lowLevel.player, level: 60 } }, 'building-xoi').save!;
    lowOwned.player.level = 5;
    assert.equal(expandFootprint(lowOwned, 'xoi', rect(1, 5, 2, 3).concat(rect(1, 5, 1, 1), rect(1, 5, 0, 0), rect(1, 5, -1, -1))).error, 'over_budget', 'cấp 5 chỉ có 24 ô');
    // Dời tòa phụ kéo theo ô sàn mở rộng.
    const relocated = relocateBuilding(all, 'snack', { parcelId: 'lot-west', originX: 1 });
    assert.equal(relocated.error, 'parcel_occupied', 'lô tây đã có tiệm xôi');
  }
  console.log('  ✓ ngân sách theo cấp, luật hình học, lệnh mở rộng L/U, bản đồ/tường/va chạm, đường đi, save/nạp, save cũ có cánh đông, D7b lô kề');
}
