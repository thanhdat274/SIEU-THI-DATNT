import assert from 'node:assert/strict';
import { isSalesFixture, validateSaveGameData, CURRENT_SAVE_SCHEMA_VERSION, type SaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, resolveParcel } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { SITE_BUFFER_CAPACITY, SITE_LOG_LIMIT, appendSiteLog } from './multi-site';

const PRODUCT = 'nuoc_suoi';
const LOTS = [{ quantity: 30, expiresOnDay: 80, unitCost: 3000, provenance: 'known' as const }, { quantity: 30, expiresOnDay: 95, unitCost: 3500, provenance: 'known' as const }];

function newSim(): GameSimulation {
  const s = structuredClone(DEFAULT_INITIAL_SAVE);
  s.player.level = 80; s.player.money = 80_000_000; s.worldTime.isStoreOpen = false;
  s.inventory = s.inventory.filter(i => i.productId !== PRODUCT);
  s.inventory.push({ productId: PRODUCT, quantity: 60, lots: structuredClone(LOTS) });
  const sim = new GameSimulation(s, generateStarterTileMap(), new InputManager(), {});
  sim.reclaimWave('w1');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(3);
  return sim;
}

/** Thuê lô rồi mở cơ sở ở gốc hợp lệ đầu tiên; trả siteId + id nội thất mới của cơ sở. */
export function leaseAndOpen(sim: GameSimulation, parcelId: string, typeId = 'grocery_branch'): { siteId: string; fixtureIds: string[] } {
  assert.ok(sim.leaseParcel(parcelId).success, `thuê ${parcelId}`);
  const before = new Set(sim.getFixtures().map(f => f.id));
  const rect = resolveParcel(parcelId)!.rect;
  let r: ReturnType<GameSimulation['openSite']> = { success: false, reason: 'no_origin' };
  for (let y = rect.y0; y <= rect.y1 && !r.success; y++) for (let x = rect.x0; x <= rect.x1 && !r.success; x++) r = sim.openSite(typeId, parcelId, x, y);
  assert.ok(r.success && r.siteId, `mở cơ sở trên ${parcelId} (${r.reason ?? ''})`);
  return { siteId: r.siteId!, fixtureIds: sim.getFixtures().filter(f => !before.has(f.id)).map(f => f.id) };
}

const central = (sim: GameSimulation) => sim.getInventory().find(i => i.productId === PRODUCT)?.quantity ?? 0;
const buffer = (sim: GameSimulation, siteId: string) => sim.getSiteBuffer(siteId).find(i => i.productId === PRODUCT)?.quantity ?? 0;
const transit = (sim: GameSimulation) => sim.getInternalDeliveries().filter(d => d.productId === PRODUCT).reduce((n, d) => n + d.totalQty, 0);
const shelves = (sim: GameSimulation, ids: string[]) => sim.getFixtures().filter(f => ids.includes(f.id) && isSalesFixture(f));
const onShelves = (sim: GameSimulation, ids: string[]) => shelves(sim, ids).reduce((n, f) => n + (f.assignedProductId === PRODUCT ? f.currentStock : 0), 0);
const total = (sim: GameSimulation, ...sites: { siteId: string; fixtureIds: string[] }[]) =>
  central(sim) + transit(sim) + sites.reduce((n, s) => n + buffer(sim, s.siteId) + onShelves(sim, s.fixtureIds), 0);

/** Chạy tới khi mọi chuyến nội bộ tới nơi. */
export function arriveAll(sim: GameSimulation): void {
  const last = Math.max(...sim.getInternalDeliveries().map(d => d.arriveAtMinute ?? 0));
  if (!Number.isFinite(last)) return;
  sim.getClock().setTime({ ...sim.getTime(), day: Math.floor(last / 1440), hour: Math.floor((last % 1440) / 60), minute: last % 60 });
  sim.update(0.1);
}

export function runMultiSiteTests(): void {
  console.log('\n--- Test multi-site-parcel-lease: cơ sở trên lô thuê, kho đệm, trả lô ---');
  const sim = newSim();
  const moneyBefore = sim.getPlayerData().money;

  // Lô tiệm chính / lô chưa thuê bị từ chối; lô thuê mở được, kho đệm rỗng, tiền trừ một lần.
  assert.equal(sim.openSite('grocery_branch', 'lot-west', 0, 0).reason, 'main_parcel');
  assert.equal(sim.openSite('grocery_branch', 'w1-corner', 0, 0).reason, 'parcel_not_held');
  const a = leaseAndOpen(sim, 'w1-corner');
  assert.ok(sim.getPlayerData().money < moneyBefore, 'trừ tiền mở cơ sở');
  const site = sim.getSites().find(s => s.siteId === a.siteId)!;
  assert.equal(site.parcelId, 'w1-corner');
  assert.ok(sim.getBuildingPlacements()!.some(p => p.buildingId === a.siteId), 'siteId = instanceId của tòa');
  assert.equal(sim.getSiteBuffer(a.siteId).length, 0, 'kho đệm rỗng');
  assert.equal(sim.openSite('grocery_branch', 'w1-corner', 0, 0).reason, 'site_exists', 'một lô tối đa một cơ sở');
  assert.ok(shelves(sim, a.fixtureIds).length > 0, 'cơ sở có kệ bán');
  // Kệ gắn lô (D3): nội thất cơ sở nằm trọn trong lô; dời một kệ vắt qua ranh lô bị từ chối, không đổi bố cục.
  const rect = resolveParcel('w1-corner')!.rect;
  const siteShelf = shelves(sim, a.fixtureIds)[0];
  for (const f of shelves(sim, a.fixtureIds)) assert.ok(f.tileX >= rect.x0 && f.tileX <= rect.x1 && f.tileY >= rect.y0 && f.tileY <= rect.y1, `kệ ${f.id} nằm trong lô`);
  const layout = sim.exportSaveData();
  const target = layout.storeLayout.fixtures.find(f => f.id === siteShelf.id)!;
  target.tileX = rect.x1; target.rotation = 0;
  assert.ok(target.widthTiles > 1 || target.heightTiles > 1, 'kệ thử rộng hơn 1 ô');
  if (target.widthTiles <= 1) { target.tileY = rect.y1; }
  const layoutBefore = JSON.stringify(sim.getFixtures().map(f => [f.id, f.tileX, f.tileY]));
  const outside = sim.applyStoreLayout(layout);
  assert.equal(outside.error, 'outside_parcel', `vắt qua ranh lô bị từ chối (${outside.error})`);
  assert.deepEqual(outside.blockedFixtureIds, [siteShelf.id]);
  assert.equal(JSON.stringify(sim.getFixtures().map(f => [f.id, f.tileX, f.tileY])), layoutBefore, 'bố cục không đổi');
  const start = total(sim, a);

  // Kệ cơ sở không lấy từ kho tổng khi kho đệm rỗng.
  const shelfA = shelves(sim, a.fixtureIds)[0].id;
  assert.equal(sim.transferToShelf(shelfA, PRODUCT, 5).reason, 'no_inventory', 'kệ cơ sở không châm từ kho tổng');

  // Chuyển 20 vào kho đệm: đang chuyển rồi vào kho đệm; FEFO + giá vốn; tổng không đổi.
  const moved = sim.siteTransfer(a.siteId, PRODUCT, 20, 'in');
  assert.ok(moved.success, `chuyển vào (${moved.reason ?? ''})`);
  assert.equal(central(sim), 40);
  assert.equal(transit(sim), 20, 'hàng đang chuyển');
  assert.equal(buffer(sim, a.siteId), 0, 'chưa tới thì chưa vào kho đệm');
  assert.equal(total(sim, a), start);
  // Lưu/tải giữa chừng (schema 17): giữ chuyến, cơ sở, nhật ký; không nhân đôi.
  const mid = sim.exportSaveData();
  assert.equal(mid.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(CURRENT_SAVE_SCHEMA_VERSION, 17);
  const reloaded = new GameSimulation(structuredClone(mid), generateStarterTileMap(), new InputManager(), {});
  assert.deepEqual(reloaded.getSites(), sim.getSites(), 'lưu/tải giữ cơ sở');
  assert.equal(total(reloaded, a), start, 'lưu/tải giữa chuyến không mất/không nhân đôi');
  arriveAll(reloaded);
  assert.equal(buffer(reloaded, a.siteId), 20, 'tới nơi: kho đệm có 20');
  const bufLots = reloaded.getSiteBuffer(a.siteId)[0].lots!;
  assert.deepEqual(bufLots.map(l => [l.quantity, l.expiresOnDay, l.unitCost]), [[20, 80, 3000]], 'FEFO: lô hạn sớm nhất, giữ giá vốn');
  assert.equal(total(reloaded, a), start);

  // Sức chứa tính cả hàng đang chuyển.
  assert.ok(reloaded.siteTransfer(a.siteId, PRODUCT, 30, 'in').success);
  assert.equal(reloaded.siteBufferLoad(a.siteId), 50);
  const centralBeforeFull = central(reloaded);
  assert.equal(reloaded.siteTransfer(a.siteId, PRODUCT, SITE_BUFFER_CAPACITY - 50 + 1, 'in').reason, 'buffer_full', 'vượt sức chứa tính cả hàng đang chuyển');
  assert.equal(central(reloaded), centralBeforeFull, 'từ chối không đổi kho');
  arriveAll(reloaded);
  assert.equal(buffer(reloaded, a.siteId), 50);

  // Kệ cơ sở lấy từ kho đệm của chính nó.
  const shelfStock = reloaded.transferToShelf(shelfA, PRODUCT, 5);
  assert.ok(shelfStock.success && shelfStock.actualQuantity === 5, `kệ cơ sở lấy từ kho đệm (${shelfStock.reason})`);
  assert.equal(buffer(reloaded, a.siteId), 45);
  assert.equal(central(reloaded), 10, 'kho tổng không bị trừ khi châm kệ cơ sở');
  assert.equal(total(reloaded, a), start);

  // Không châm chéo: kho đệm A rỗng, kho đệm B còn → kệ A không châm.
  const b = leaseAndOpen(reloaded, 'w1-east');
  assert.ok(reloaded.siteTransfer(a.siteId, PRODUCT, 45, 'out').success, 'rút hết kho đệm A');
  assert.ok(reloaded.siteTransfer(b.siteId, PRODUCT, 10, 'in').success);
  arriveAll(reloaded);
  assert.equal(buffer(reloaded, a.siteId), 0);
  assert.equal(buffer(reloaded, b.siteId), 10);
  assert.equal(reloaded.transferToShelf(shelfA, PRODUCT, 99).reason === 'success' ? 'success' : 'refused', 'refused', 'kệ A không châm từ kho đệm B');
  assert.equal(onShelves(reloaded, a.fixtureIds), 5);
  assert.equal(reloaded.autoRestockShelves() >= 0, true);
  assert.equal(onShelves(reloaded, a.fixtureIds), 5, 'châm tự động không lấy chéo');
  assert.equal(total(reloaded, a, b), start);

  // Trả lô chưa dọn → từ chối kèm danh sách; dọn xong theo thứ tự → được.
  assert.ok(reloaded.siteTransfer(a.siteId, PRODUCT, 1, 'out').reason === 'no_buffer_stock', 'kho đệm rỗng không rút được');
  // Đưa lại 5 món vào kho đệm A để có cả kệ lẫn hàng.
  assert.ok(reloaded.siteTransfer(a.siteId, PRODUCT, 5, 'in').success);
  const refusedTrip = reloaded.endLease('w1-corner');
  assert.equal(refusedTrip.reason, 'site_not_cleared');
  assert.ok(refusedTrip.todo!.some(t => t.startsWith('deliveries:')), 'chuyến đang chạy nằm trong danh sách');
  arriveAll(reloaded);
  const refused = reloaded.endLease('w1-corner');
  assert.equal(refused.success, false);
  assert.ok(refused.todo!.includes('buffer:5') && refused.todo!.some(t => t.startsWith('fixtures:')) && refused.todo!.at(-1) === 'close_site', `danh sách việc: ${refused.todo}`);
  assert.equal(reloaded.closeSite(a.siteId).reason, 'site_not_cleared', 'đóng cơ sở khi chưa dọn bị từ chối');
  // Dọn: rút kho đệm, cất kệ (hàng trên kệ về kho), đóng cơ sở, trả lô.
  assert.ok(reloaded.siteTransfer(a.siteId, PRODUCT, 5, 'out').success);
  arriveAll(reloaded);
  for (const id of shelves(reloaded, a.fixtureIds).map(f => f.id)) reloaded.unstockShelf(id, 999);
  const stowed = reloaded.exportSaveData();
  const aFixtureIds = new Set(a.fixtureIds);
  stowed.storeLayout.storedFixtures = [...(stowed.storeLayout.storedFixtures ?? []), ...stowed.storeLayout.fixtures.filter(f => aFixtureIds.has(f.id) || aFixtureIds.has(f.parentId ?? ''))];
  stowed.storeLayout.fixtures = stowed.storeLayout.fixtures.filter(f => !aFixtureIds.has(f.id) && !aFixtureIds.has(f.parentId ?? ''));
  assert.ok(!reloaded.applyStoreLayout(stowed).error, 'cất kệ cơ sở A');
  assert.deepEqual(reloaded.siteClearanceTodo(a.siteId), ['close_site']);
  assert.ok(reloaded.closeSite(a.siteId).success, 'đóng cơ sở');
  assert.ok(!reloaded.getBuildingPlacements()!.some(p => p.buildingId === a.siteId), 'gỡ tòa khỏi lô');
  assert.ok(reloaded.endLease('w1-corner').success, 'dọn xong trả lô được');
  assert.equal(central(reloaded) + transit(reloaded) + buffer(reloaded, b.siteId) + onShelves(reloaded, b.fixtureIds), start, 'bảo toàn hàng sau khi trả lô');
  assert.ok(reloaded.getSiteLog(a.siteId).some(e => e.action === 'close_site'), 'nhật ký còn sau khi đóng');

  // Lô đóng do nợ thuê: chuyển ra được, chuyển vào bị từ chối.
  const placements = reloaded.exportSaveData();
  placements.storeLayout.buildingPlacements = placements.storeLayout.buildingPlacements!.map(p => p.buildingId === b.siteId ? { ...p, closedForRent: true } : p);
  const closed = new GameSimulation(placements, generateStarterTileMap(), new InputManager(), {});
  assert.equal(closed.siteTransfer(b.siteId, PRODUCT, 1, 'in').reason, 'closed_for_rent', 'lô nợ thuê: không cho chuyển vào');
  assert.ok(closed.siteTransfer(b.siteId, PRODUCT, buffer(closed, b.siteId), 'out').success, 'lô nợ thuê: vẫn cứu hàng ra');

  // Id chuyến dùng bộ đếm: chuyến cũ đã xóa không làm trùng id.
  const ids = new Set<string>();
  const idSim = newSim();
  const c = leaseAndOpen(idSim, 'w1-corner');
  for (let i = 0; i < 3; i++) {
    const r = idSim.siteTransfer(c.siteId, PRODUCT, 1, 'in');
    assert.ok(!ids.has(r.deliveryId!), 'id chuyến không trùng'); ids.add(r.deliveryId!);
    arriveAll(idSim);
    assert.equal(idSim.getInternalDeliveries().length, 0);
  }
  const reId = new GameSimulation(idSim.exportSaveData(), generateStarterTileMap(), new InputManager(), {});
  const r4 = reId.siteTransfer(c.siteId, PRODUCT, 1, 'in');
  assert.ok(!ids.has(r4.deliveryId!), 'bộ đếm lưu trong save: sau tải lại vẫn không trùng');

  // Nhật ký giữ 200 dòng.
  let logs = appendSiteLog(undefined, { day: 1, minute: 0, actorAccountId: 'a', action: 'x' });
  for (let i = 0; i < SITE_LOG_LIMIT + 10; i++) logs = appendSiteLog(logs, { day: 1, minute: i, actorAccountId: 'a', action: 'x' });
  assert.equal(logs.length, SITE_LOG_LIMIT);

  // Migration 16 → 17: save cũ không có cơ sở nạp như cũ; bộ đếm chuyến sau số chuyến đang chạy.
  const v16 = structuredClone(mid) as SaveGameData;
  v16.schemaVersion = 16;
  delete v16.sites; delete v16.siteBuffers; delete v16.siteLogs; delete v16.internalDeliverySeq;
  const migrated = validateSaveGameData(v16);
  assert.equal(migrated.versionStatus, 'legacy_migrate');
  assert.equal(migrated.data!.schemaVersion, 17);
  assert.equal(migrated.data!.sites, undefined, 'không tạo cơ sở/kho đệm cho save cũ');
  assert.equal(migrated.data!.siteBuffers, undefined);
  assert.equal(migrated.data!.internalDeliverySeq, v16.internalDeliveries!.length);
  const legacy = structuredClone(DEFAULT_INITIAL_SAVE);
  const legacySim = new GameSimulation(legacy, generateStarterTileMap(), new InputManager(), {});
  assert.equal(legacySim.getSites().length, 0, '4 tòa cũ không thành cơ sở có kho đệm');
  const legacyExport = legacySim.exportSaveData();
  assert.ok(!('sites' in legacyExport) && !('siteBuffers' in legacyExport) && !('internalDeliverySeq' in legacyExport), 'save cũ xuất ra không thêm trường mới');
  console.log('  ✓ open_site trên lô thuê, kho đệm (FEFO, sức chứa, không châm chéo), trả lô phải dọn trước, lô nợ chỉ chuyển ra, id chuyến tăng dần, migration 16→17');
}
