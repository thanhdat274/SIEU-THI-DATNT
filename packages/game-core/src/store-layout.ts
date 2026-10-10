import { COLD_WAREHOUSE_CAPACITY, MAX_FOOTPRINT_TILES, UNITS_PER_WAREHOUSE_CELL, getFixtureDimensions, type Product, isSalesFixture, isSlotChild, syncSlotChildren, tileIndex, tileInMap, type BuildingPlacementRecord, type GameTileMap, type SaveGameData, type StoreFixture } from '@game/shared';
import {
  BUILDINGS, DECOR_MAP, EXPANSION_TILE_PRICE, LAND_PARCELS, FIXTURE_SHOP, LAND_PLOTS, MAIN_EAST_WING_PLOT_IDS, MAP_ORIGIN_Y, PARCEL_MAP, STORE_BOUNDS, WAREHOUSE_DOOR_LEFT, WAREHOUSE_TIERS, STORAGE_RACK_CELL_BONUS, MAX_STORAGE_RACKS,
  buildingOfTiles, checkFootprintTiles, placementsProblem, defaultPlacementOf, entranceOf, layoutBuildings, resolvePlacements, validatePlacement, expansionBudgetAtLevel, expansionTilesUsed, generateStarterTileMap, normalizePlacements, placementFloor, placementGeometry, type BuildingId, type BuildingPlacement,
  baseFloorTiles, legacyWingFloorTiles, tileKey, inRect, adjacentParcels, footprintBlockers,
  RECLAMATION_WAVES, WAVE_EXPANSION_BONUS,
} from '@game/data';

export type LayoutFailure = 'fixture_missing' | 'plot_locked' | 'outside_floor' | 'overlap' | 'path_blocked' | 'invalid_rotation' | 'store_open' | 'level' | 'money' | 'prerequisite' | 'unknown_item' | 'unavailable' | 'owned' | 'wrong_building'
  // Mở rộng tiệm theo ô (OpenSpec `open-world-main-expansion`)
  | 'not_adjacent' | 'disconnected' | 'outside_parcel' | 'blocked_by_building' | 'over_budget' | 'invalid_tiles'
  // Đặt tòa phụ vào lô (OpenSpec `open-world-building-relocation`)
  | 'parcel_occupied' | 'door_blocked' | 'invalid_placement'
  // Lô đợt mới chưa mua (OpenSpec `open-world-land-reclamation` D4)
  | 'parcel_not_owned';

export interface LayoutResult {
  save?: SaveGameData;
  error?: LayoutFailure;
  blockedFixtureIds?: string[];
}

export type StoreLayoutAction =
  | { type: 'move'; fixtureId: string; tileX: number; tileY: number; rotation: StoreFixture['rotation'] }
  | { type: 'store'; fixtureId: string }
  | { type: 'retrieve'; fixtureId: string; tileX: number; tileY: number }
  | { type: 'buy_plot'; plotId: string; placement?: { parcelId: string; originX: number } }
  | { type: 'expand_footprint'; buildingId: string; tiles: Array<{ x: number; y: number }> }
  | { type: 'relocate_building'; buildingId: string; placement: { parcelId: string; originX: number } }
  | { type: 'buy_decor'; decorId: string }
  | { type: 'buy_fixture'; shopId: string; tileX: number; tileY: number; rotation: StoreFixture['rotation'] }
  | { type: 'buy_warehouse_tier'; tier: number }
  | { type: 'buy_storage_rack' };

const key = (x: number, y: number) => `${x},${y}`;
const DEFAULT_ORDER: readonly string[] = ['main', 'xoi', 'drink', 'snack'];
const footprint = (fixture: StoreFixture) => {
  const { widthTiles: width, heightTiles: height } = getFixtureDimensions(fixture);
  return Array.from({ length: width * height }, (_, i) => ({ x: fixture.tileX + i % width, y: fixture.tileY + Math.floor(i / width) }));
};

/**
 * Save cũ lưu số khay/sức chứa theo catalog cũ (4/8/12/16 khay, ô chính 16–24): nâng số khay lên catalog hiện tại
 * (không giảm) và đưa sức chứa ô chính kệ về 20 như các ô phụ (không cắt hàng đang có).
 */
export function upgradeFixtureSlots(fixtures: StoreFixture[]): StoreFixture[] {
  return fixtures.map(f => {
    if (f.parentId) return f;
    const shop = f.shopId ? FIXTURE_SHOP.find(item => item.id === f.shopId) : undefined;
    const next = { ...f };
    if (shop && (f.slotCount ?? 0) < shop.slotCount) next.slotCount = shop.slotCount;
    const cap = shop?.maxCapacity ?? (f.type === 'shelf_wooden' || f.type === 'shelf_glass' ? 20 : 0);
    if (isSalesFixture(f) && cap === 20 && f.maxCapacity !== cap) next.maxCapacity = Math.max(cap, f.currentStock);
    return next;
  });
}

/**
 * Đưa nội thất đang đặt sai tòa nhà (vd. trạm xôi trong tiệm chính, từ save trước khi có tiệm xôi) vào kho nội thất,
 * kèm ô phụ; giữ nguyên toàn bộ dữ liệu. Trả danh sách id đã cất (rỗng nếu không có gì).
 */
export function relocateMisplacedFixtures(fixtures: StoreFixture[], stored: StoreFixture[], buildings?: GameTileMap['buildings']): { fixtures: StoreFixture[]; stored: StoreFixture[]; movedIds: string[] } {
  const misplaced = new Set<string>();
  for (const fixture of fixtures) {
    if (fixture.parentId || fixture.type.startsWith('warehouse_') || !fixture.shopId) continue;
    const allowed = FIXTURE_SHOP.find(item => item.id === fixture.shopId)?.allowedBuildings;
    if (!allowed) continue;
    const home = buildingOfTiles(footprint(fixture), buildings);
    if (home && !allowed.includes(home)) misplaced.add(fixture.id);
  }
  if (misplaced.size === 0) return { fixtures, stored, movedIds: [] };
  const moving = (fixture: StoreFixture) => misplaced.has(fixture.id) || (!!fixture.parentId && misplaced.has(fixture.parentId));
  return { fixtures: fixtures.filter(fixture => !moving(fixture)), stored: [...stored, ...fixtures.filter(moving)], movedIds: [...misplaced] };
}

/** Đồng bộ ô phụ (vị trí theo kệ cha, đủ số ô) cho cả sàn lẫn kho. */
export function syncLayoutSlots(save: SaveGameData): void {
  save.storeLayout.fixtures = syncSlotChildren(upgradeFixtureSlots(save.storeLayout.fixtures));
  if (save.storeLayout.storedFixtures?.length) save.storeLayout.storedFixtures = syncSlotChildren(upgradeFixtureSlots(save.storeLayout.storedFixtures));
}

export function validateStoreLayout(save: SaveGameData, map: GameTileMap): LayoutResult {
  const plotIds = save.storeLayout.unlockedPlotIds ?? [];
  if (plotIds.some(id => !LAND_PLOTS.some(plot => plot.id === id))) return { error: 'plot_locked' };
  if (new Set(plotIds).size !== plotIds.length) return { error: 'plot_locked' };
  for (const id of plotIds) {
    const prerequisite = LAND_PLOTS.find(plot => plot.id === id)?.prerequisitePlotId;
    if (prerequisite && !plotIds.includes(prerequisite)) return { error: 'prerequisite' };
  }
  const allFixtures = [...save.storeLayout.fixtures, ...(save.storeLayout.storedFixtures ?? [])];
  if (new Set(allFixtures.map(fixture => fixture.id)).size !== allFixtures.length || allFixtures.some(fixture =>
    !fixture.id || !Number.isSafeInteger(fixture.tileX) || !Number.isSafeInteger(fixture.tileY) ||
    !Number.isSafeInteger(fixture.widthTiles) || fixture.widthTiles <= 0 || !Number.isSafeInteger(fixture.heightTiles) || fixture.heightTiles <= 0 ||
    ![0, 90, 180, 270].includes(fixture.rotation))) return { error: 'invalid_rotation' };
  const ground = map.layers.find(layer => layer.name === 'ground')?.data ?? [];
  const occupied = new Map<string, string>();
  const invalid: string[] = [];
  const buildingOf = new Map<string, BuildingId>();
  if (!save.storeLayout.fixtures.some(fixture => fixture.type === 'cashier_counter')) invalid.push('cashier_missing');
  for (const fixture of save.storeLayout.fixtures) {
    if (fixture.type.startsWith('warehouse_') || isSlotChild(fixture)) continue;
    if (![0, 90, 180, 270].includes(fixture.rotation)) return { error: 'invalid_rotation' };
    for (const tile of footprint(fixture)) {
      const idx = tileIndex(map, tile.x, tile.y);
      const k = key(tile.x, tile.y);
      if (!tileInMap(map, tile.x, tile.y) || ground[idx] !== 3 || map.collisionLayer[idx]) return { error: 'outside_floor' };
      if (occupied.has(k)) return { error: 'overlap' };
      occupied.set(k, fixture.id);
    }
    // Footprint phải nằm trọn trong một tòa nhà và tòa đó phải nhận món này (trạm xôi chỉ ở tiệm xôi).
    const home = buildingOfTiles(footprint(fixture), map.buildings);
    if (!home) return { error: 'outside_floor' };
    const shopItem = fixture.shopId ? FIXTURE_SHOP.find(item => item.id === fixture.shopId) : undefined;
    if (shopItem?.allowedBuildings && !shopItem.allowedBuildings.includes(home)) return { error: 'wrong_building', blockedFixtureIds: [fixture.id] };
    buildingOf.set(fixture.id, home);
  }
  // Mỗi tòa mua thêm đã mở phải có quầy thu ngân riêng (mỗi tòa một quầy và một hàng đợi).
  for (const building of BUILDINGS) {
    if (building.plotId && plotIds.includes(building.plotId) && !save.storeLayout.fixtures.some(fixture => fixture.type === 'cashier_counter' && buildingOf.get(fixture.id) === building.id)) invalid.push('cashier_missing');
  }

  const walkable = (x: number, y: number) => {
    const idx = tileIndex(map, x, y);
    return tileInMap(map, x, y) && ground[idx] === 3 && !map.collisionLayer[idx] && !occupied.has(key(x, y));
  };
  // Vùng đi được tính từ ô trước cửa của từng tòa (mỗi tòa một cửa riêng).
  const reachCache = new Map<BuildingId, Map<string, number>>();
  const reachFrom = (id: BuildingId): Map<string, number> => {
    const cached = reachCache.get(id);
    if (cached) return cached;
    const entry = entranceOf(id, map.buildings);
    const distances = new Map<string, number>();
    const queue = [entry];
    if (walkable(entry.x, entry.y)) distances.set(key(entry.x, entry.y), 0);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = current.x + dx, y = current.y + dy, k = key(x, y);
        if (!walkable(x, y) || distances.has(k)) continue;
        distances.set(k, distances.get(key(current.x, current.y))! + 1);
        queue.push({ x, y });
      }
    }
    reachCache.set(id, distances);
    return distances;
  };

  const requiredStaffTargets = new Set((save.staff ?? []).map(member => member.assignedFixtureId).filter((id): id is string => !!id));
  for (const fixture of save.storeLayout.fixtures) {
    if (isSlotChild(fixture)) continue;
    // Tòa đang thi công (cửa bị chặn) chưa cần đi tới nội thất: kiểm lại khi mở cửa.
    if (map.buildings?.some(building => !building.open && building.id === buildingOf.get(fixture.id))) continue;
    const required = fixture.type === 'cashier_counter' || ((fixture.type === 'shelf_wooden' || fixture.type === 'shelf_glass' || fixture.type === 'refrigerator') && fixture.currentStock > 0) || requiredStaffTargets.has(fixture.id);
    if (!required) continue;
    const own = new Set(footprint(fixture).map(tile => key(tile.x, tile.y)));
    const distances = reachFrom(buildingOf.get(fixture.id) ?? 'main');
    const accessible = footprint(fixture).some(tile => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => {
      const k = key(tile.x + dx, tile.y + dy);
      return !own.has(k) && distances.has(k);
    }));
    if (!accessible) invalid.push(fixture.id);
  }
  const warehouseDoorWalkable = [WAREHOUSE_DOOR_LEFT, WAREHOUSE_DOOR_LEFT + 1].some(x => {
    const y = STORE_BOUNDS.top - 1;
    const frame = { ...map, originTileY: map.originTileY ?? MAP_ORIGIN_Y }; // bản đồ thiếu gốc y: giữ mặc định cũ là gốc bản đồ chơi
    const idx = tileIndex(frame, x, y);
    return tileInMap(frame, x, y) && ground[idx] === 3 && !map.collisionLayer[idx];
  });
  if (warehouseDoorWalkable && ![WAREHOUSE_DOOR_LEFT, WAREHOUSE_DOOR_LEFT + 1].some(x => reachFrom('main').has(key(x, STORE_BOUNDS.top + 1)))) invalid.push('warehouse_door');
  return invalid.length ? { error: 'path_blocked', blockedFixtureIds: invalid } : {};
}

export function moveStoreFixture(save: SaveGameData, fixtureId: string, tileX: number, tileY: number, rotation?: StoreFixture['rotation'], map?: GameTileMap): LayoutResult {
  const next = structuredClone(save);
  const fixture = next.storeLayout.fixtures.find(item => item.id === fixtureId);
  if (!fixture) return { error: 'fixture_missing' };
  if (fixture.type.startsWith('warehouse_')) return { error: 'prerequisite' };
  fixture.tileX = tileX;
  fixture.tileY = tileY;
  if (fixture.parentId) return { error: 'prerequisite' };
  if (rotation !== undefined) fixture.rotation = rotation;
  syncLayoutSlots(next);
  if (map) {
    const result = validateStoreLayout(next, map);
    if (result.error) return result;
  }
  return { save: next };
}

export function storeFixture(save: SaveGameData, fixtureId: string): LayoutResult {
  const next = structuredClone(save);
  const index = next.storeLayout.fixtures.findIndex(item => item.id === fixtureId);
  if (index < 0) return { error: 'fixture_missing' };
  if (next.storeLayout.fixtures[index].type.startsWith('warehouse_')) return { error: 'prerequisite' };
  if (next.storeLayout.fixtures[index].type === 'cashier_counter') {
    // Mỗi tòa đang mở phải giữ ít nhất một quầy thu ngân.
    const placed = buildingsOfSave(next);
    const home = buildingOfTiles(footprint(next.storeLayout.fixtures[index]), placed);
    const sameBuilding = next.storeLayout.fixtures.filter(item => item.type === 'cashier_counter' && buildingOfTiles(footprint(item), placed) === home);
    if (sameBuilding.length <= 1) return { error: 'prerequisite' };
  }
  if (next.storeLayout.fixtures[index].parentId) return { error: 'prerequisite' };
  const moving = next.storeLayout.fixtures.filter(item => item.id === fixtureId || item.parentId === fixtureId);
  const movingIds = new Set(moving.map(item => item.id));
  next.storeLayout.fixtures = next.storeLayout.fixtures.filter(item => !movingIds.has(item.id));
  next.storeLayout.storedFixtures = [...(next.storeLayout.storedFixtures ?? []), ...moving];
  next.staff = (next.staff ?? []).map(member => member.assignedFixtureId && movingIds.has(member.assignedFixtureId) ? { ...member, assignedFixtureId: undefined } : member);
  return { save: next };
}

export function retrieveStoreFixture(save: SaveGameData, fixtureId: string, tileX: number, tileY: number, map: GameTileMap): LayoutResult {
  const next = structuredClone(save);
  const stored = next.storeLayout.storedFixtures ?? [];
  const index = stored.findIndex(item => item.id === fixtureId);
  if (index < 0) return { error: 'fixture_missing' };
  if (stored[index].parentId) return { error: 'prerequisite' };
  const fixture = stored[index];
  const bundle = stored.filter(item => item.id === fixtureId || item.parentId === fixtureId);
  next.storeLayout.storedFixtures = stored.filter(item => !bundle.includes(item));
  fixture.tileX = tileX; fixture.tileY = tileY;
  next.storeLayout.fixtures.push(...bundle);
  syncLayoutSlots(next);
  const valid = validateStoreLayout(next, map);
  return valid.error ? valid : { save: next };
}

/** Tòa đang có theo vị trí đặt trong save (hình học như `GameTileMap.buildings`), không cần dựng bản đồ. */
export function buildingsOfSave(save: Pick<SaveGameData, 'storeLayout'>): NonNullable<GameTileMap['buildings']> {
  const owned = new Set(save.storeLayout.unlockedPlotIds ?? []);
  return layoutBuildings(resolvePlacements(save.storeLayout.buildingPlacements, owned), owned);
}

/** Lô và gốc x hợp lệ để đặt `buildingId` (tòa phụ) theo luật `validatePlacement`, cho giao diện chọn vị trí. Rỗng = không còn chỗ. */
export function placementOptions(save: Pick<SaveGameData, 'storeLayout'>, buildingId: BuildingId): Array<{ parcelId: string; originXs: number[] }> {
  const owned = new Set(save.storeLayout.unlockedPlotIds ?? []);
  const ownedParcels = save.storeLayout.ownedParcelIds ?? [];
  const others = resolvePlacements(save.storeLayout.buildingPlacements, owned).filter(placement => placement.buildingId !== buildingId);
  const def = defaultPlacementOf(buildingId);
  const options: Array<{ parcelId: string; originXs: number[] }> = [];
  for (const parcel of LAND_PARCELS) {
    const originXs: number[] = [];
    for (let originX = parcel.rect.x0; originX <= parcel.rect.x1; originX++) {
      if (validatePlacement({ buildingId, parcelId: parcel.id, originX, originY: def.originY }, others, ownedParcels) === null) originXs.push(originX);
    }
    if (originXs.length) options.push({ parcelId: parcel.id, originXs });
  }
  return options;
}

/** Mã lỗi của `validatePlacement` → mã `LayoutFailure` hiển thị được. */
const placementFailure = (problem: string): LayoutFailure => {
  const code = problem.split(':')[0];
  if (code === 'parcel_occupied') return 'parcel_occupied';
  if (code === 'outside_parcel') return 'outside_parcel';
  if (code === 'door_blocked') return 'door_blocked';
  if (code === 'overlap') return 'overlap';
  if (code === 'parcel_not_owned') return 'parcel_not_owned';
  return 'invalid_placement';
};

/** Tỷ lệ phí dời tòa trên giá đã bỏ ra cho tòa (giá mở tòa + các mảnh mở rộng bắc đã mua); số tạm, chưa cân bằng. */
export const RELOCATION_FEE_RATE = 0.3;

/** Phí dời một tòa phụ đã mở. */
export function relocationFee(save: Pick<SaveGameData, 'storeLayout'>, buildingId: BuildingId): number {
  const owned = new Set(save.storeLayout.unlockedPlotIds ?? []);
  const spent = LAND_PLOTS
    .filter(plot => (plot.buildingId === buildingId || plot.expandsBuilding === buildingId) && owned.has(plot.id))
    .reduce((sum, plot) => sum + plot.cost, 0);
  return Math.round(spent * RELOCATION_FEE_RATE);
}

/**
 * Dời một tòa phụ đã mở sang lô/gốc x khác (tái quy hoạch có phí). Cửa hàng phải đóng. Nội thất trên sàn của tòa (kể cả ô phụ của kệ) dịch cùng
 * `dx`; hàng trên kệ, gán kệ/planogram (theo id) và nội thất đang cất giữ nguyên. Tòa thi công tới sáng hôm sau (`constructionUntilDay` = ngày + 1):
 * cửa bị chặn, không sinh khách. Tiệm chính không dời được (Bước 3).
 */
export function relocateBuilding(save: SaveGameData, buildingId: string, placement: { parcelId: string; originX: number }): LayoutResult {
  if (save.worldTime.isStoreOpen) return { error: 'store_open' };
  const plot = LAND_PLOTS.find(item => item.buildingId === buildingId);
  if (!plot || buildingId === 'main') return { error: 'invalid_placement' };
  const id = buildingId as BuildingId;
  const owned = new Set(save.storeLayout.unlockedPlotIds ?? []);
  if (!owned.has(plot.id)) return { error: 'plot_locked' };
  const current = resolvePlacements(save.storeLayout.buildingPlacements, owned);
  const old = current.find(item => item.buildingId === id);
  if (!old) return { error: 'plot_locked' };
  const candidate: BuildingPlacement = { buildingId: id, parcelId: placement.parcelId, originX: placement.originX, originY: old.originY };
  if (candidate.parcelId === old.parcelId && candidate.originX === old.originX) return { error: 'invalid_placement' };
  // Ô sàn mở rộng dời cùng tòa (cùng `dx`, cùng hàng); lô đã lấn (`parcelIds`) trả lại, tòa chỉ giữ lô mới.
  const dxMove = candidate.originX - old.originX;
  if (old.floorTiles?.length) candidate.floorTiles = old.floorTiles.map(tile => ({ x: tile.x + dxMove, y: tile.y }));
  const problem = validatePlacement(candidate, current.filter(item => item.buildingId !== id), save.storeLayout.ownedParcelIds ?? []);
  if (problem) return { error: placementFailure(problem) };
  const rest = current.filter(item => item.buildingId !== id);
  const footprintProblem = placementsProblem([...rest, candidate].map(item => ({ buildingId: item.buildingId, parcelId: item.parcelId, originX: item.originX, originY: item.originY, ...(item.parcelIds && item.parcelIds.length > 1 ? { parcelIds: item.parcelIds } : {}), ...(item.floorTiles?.length ? { floorTiles: item.floorTiles } : {}) })), owned, save.storeLayout.ownedParcelIds ?? []);
  if (footprintProblem) return { error: 'invalid_placement' };
  const fee = relocationFee(save, id);
  if (save.player.money < fee) return { error: 'money' };

  const next = structuredClone(save);
  next.player.money -= fee;
  const before = layoutBuildings(current, owned);
  const dx = candidate.originX - old.originX;
  const roots = next.storeLayout.fixtures.filter(fixture => !fixture.parentId && !fixture.type.startsWith('warehouse_') && buildingOfTiles(footprint(fixture), before) === id);
  const moving = new Set(roots.map(fixture => fixture.id));
  for (const fixture of next.storeLayout.fixtures) {
    if (moving.has(fixture.id) || (fixture.parentId && moving.has(fixture.parentId))) fixture.tileX += dx;
  }
  syncLayoutSlots(next);
  candidate.constructionUntilDay = save.worldTime.day + 1;
  const all = current.map(item => (item.buildingId === id ? candidate : item)).sort((a, b) => DEFAULT_ORDER.indexOf(a.buildingId) - DEFAULT_ORDER.indexOf(b.buildingId));
  storePlacements(next.storeLayout, all);
  return { save: next };
}

/** Lưu danh sách vị trí đặt: về `undefined` khi mọi tòa ở vị trí mặc định và không có ô sàn mở rộng (save mặc định giữ nguyên dạng cũ). */
function storePlacements(layout: SaveGameData['storeLayout'], placements: readonly BuildingPlacement[]): void {
  const plain = placements.every(placement => !placement.floorTiles?.length && !placement.constructionUntilDay && JSON.stringify([placement.parcelId, placement.originX, placement.originY]) === JSON.stringify([defaultPlacementOf(placement.buildingId).parcelId, defaultPlacementOf(placement.buildingId).originX, defaultPlacementOf(placement.buildingId).originY]));
  if (plain) delete layout.buildingPlacements;
  else layout.buildingPlacements = placements.map((placement): BuildingPlacementRecord => ({
    buildingId: placement.buildingId, parcelId: placement.parcelId, originX: placement.originX, originY: placement.originY,
    ...(placement.parcelIds && placement.parcelIds.length > 1 ? { parcelIds: [...placement.parcelIds] } : {}),
    ...(placement.floorTiles?.length ? { floorTiles: placement.floorTiles.map(tile => ({ x: tile.x, y: tile.y })) } : {}),
    ...(placement.constructionUntilDay ? { constructionUntilDay: placement.constructionUntilDay } : {}),
  }));
}

export function buyLandPlot(save: SaveGameData, plotId: string, placement?: { parcelId: string; originX: number }): LayoutResult {
  if (save.worldTime.isStoreOpen) return { error: 'store_open' };
  const plot = LAND_PLOTS.find(item => item.id === plotId);
  if (!plot) return { error: 'plot_locked' };
  const owned = save.storeLayout.unlockedPlotIds ?? [];
  if (owned.includes(plotId)) return { save: structuredClone(save) };
  // Cánh đông cũ không mua được khi tiệm chính đã có ô sàn mở rộng (tránh trùng ô); ô mới mở qua `expand_footprint`.
  if ((MAIN_EAST_WING_PLOT_IDS as readonly string[]).includes(plotId) && buildingFloorTiles(save, 'main').length > 0) return { error: 'plot_locked' };
  if (save.player.level < plot.level) return { error: 'level' };
  if (plot.prerequisitePlotId && !owned.includes(plot.prerequisitePlotId)) return { error: 'prerequisite' };
  if (save.player.money < plot.cost) return { error: 'money' };
  // Mua tòa = đặt tòa: vị trí chọn (lô + gốc x) hoặc vị trí mặc định nếu lô đó còn trống; luật ở `validatePlacement`.
  let chosen: BuildingPlacement | undefined;
  let current: readonly BuildingPlacement[] = [];
  if (plot.buildingId) {
    current = resolvePlacements(save.storeLayout.buildingPlacements, owned);
    const def = defaultPlacementOf(plot.buildingId);
    chosen = placement ? { buildingId: plot.buildingId, parcelId: placement.parcelId, originX: placement.originX, originY: def.originY } : def;
    const problem = validatePlacement(chosen, current, save.storeLayout.ownedParcelIds ?? []);
    if (problem) return { error: placementFailure(problem) };
  }
  const next = structuredClone(save);
  next.player.money -= plot.cost;
  next.storeLayout.unlockedPlotIds = [...owned, plotId];
  if (chosen) {
    // Giữ thứ tự ưu tiên mặc định (main → xoi → drink → snack): tường chung thuộc tòa đứng trước.
    const all = [...current, chosen].sort((a, b) => DEFAULT_ORDER.indexOf(a.buildingId) - DEFAULT_ORDER.indexOf(b.buildingId));
    storePlacements(next.storeLayout, all);
  }
  // Bố cục mặc định của tòa = mẫu tòa + vị trí đặt đã chọn, không rẽ nhánh theo id tòa.
  const defaults = chosen ? placementGeometry(chosen).defaultFixtures : undefined;
  if (defaults) {
    // Mua tòa nhà: đặt bố cục mặc định (id cố định, đã có thì bỏ qua), miễn phí vì đã gồm trong giá.
    const used = new Set([...next.storeLayout.fixtures, ...(next.storeLayout.storedFixtures ?? [])].map(fixture => fixture.id));
    for (const fixture of defaults) if (!used.has(fixture.id)) next.storeLayout.fixtures.push(structuredClone(fixture));
    syncLayoutSlots(next);
  }
  return { save: next };
}

/** Ô sàn mở rộng đã lưu của `buildingId` (không gồm cánh đông cũ / mảnh bắc). */
export function buildingFloorTiles(save: Pick<SaveGameData, 'storeLayout'>, buildingId: BuildingId): Array<{ x: number; y: number }> {
  return save.storeLayout.buildingPlacements?.find(placement => placement.buildingId === buildingId)?.floorTiles ?? [];
}

/** Tổng số ô sàn mở rộng đã dùng trên mọi tòa (cánh đông cũ + floorTiles của từng tòa). Dùng cho ngân sách chung. */
export function totalExpansionTilesUsed(save: SaveGameData): number {
  const owned = new Set(save.storeLayout.unlockedPlotIds ?? []);
  const placements = normalizePlacements(save.storeLayout.buildingPlacements, owned);
  let total = 0;
  for (const placement of placements) {
    const geo = placementGeometry(placement);
    if (!geo.template.hasWarehouse) {
      // Tòa phụ: ô sàn mở rộng = floorTiles ngoài sàn gốc (gồm mảnh `*-north-*` cũ đã đổi thành floorTiles).
      const baseKeys = new Set(baseFloorTiles(geo.bounds).map(t => tileKey(t.x, t.y)));
      total += new Set((placement.floorTiles ?? []).map(t => tileKey(t.x, t.y)).filter(key => !baseKeys.has(key))).size;
      continue;
    }
    // Cánh đông cũ (tiệm chính)
    const legacyTiles = legacyWingFloorTiles(geo.coreBounds, owned);
    const legacySet = new Set(legacyTiles.map(t => tileKey(t.x, t.y)));
    total += legacySet.size;
    // floorTiles đã lưu
    const base = new Set(baseFloorTiles(geo.coreBounds).map(t => tileKey(t.x, t.y)));
    for (const tile of placement.floorTiles ?? []) {
      const key = tileKey(tile.x, tile.y);
      if (!base.has(key) && !legacySet.has(key)) total++;
    }
  }
  return total;
}

/**
 * Thưởng ngân sách ô mở rộng theo từng đợt đã mở (open-world-land-reclamation D6): cộng `WAVE_EXPANSION_BONUS[waveId]`
 * cho mỗi đợt trong `world.openedWaves`. W0 bonus 0 nên save chỉ có ['w0'] giữ nguyên hạn mức cũ (golden không đổi).
 * Khớp logic `expansionBudgetAt` ở `reclamation.ts` (cùng duyệt `RECLAMATION_WAVES`).
 */
function waveExpansionBonus(openedWaves: readonly string[] | undefined): number {
  let bonus = 0;
  for (const wave of RECLAMATION_WAVES) {
    if (openedWaves?.includes(wave.id)) bonus += WAVE_EXPANSION_BONUS[wave.id] ?? 0;
  }
  return bonus;
}

/** Hạn mức ô mở rộng = mốc theo cấp + thưởng theo đợt đã mở (D6). */
function expansionBudgetMax(save: SaveGameData): number {
  return expansionBudgetAtLevel(save.player.level) + waveExpansionBonus(save.world?.openedWaves);
}

/** Ngân sách ô mở rộng chung cho mọi tòa: đã dùng (cánh đông cũ + floorTiles của từng tòa), tối đa theo cấp + đợt đã mở, và còn lại. */
export function sharedExpansionBudget(save: SaveGameData): { used: number; max: number; remaining: number } {
  const used = totalExpansionTilesUsed(save);
  const max = expansionBudgetMax(save);
  return { used, max, remaining: Math.max(0, max - used) };
}

/** Ngân sách ô mở rộng của tiệm chính (giữ nguyên cho UI cũ): đã dùng (cánh đông cũ + ô sàn mở rộng), tối đa theo cấp + đợt đã mở, và còn lại. */
export function expansionBudget(save: SaveGameData): { used: number; max: number; remaining: number } {
  const owned = new Set(save.storeLayout.unlockedPlotIds ?? []);
  const main = normalizePlacements(save.storeLayout.buildingPlacements, owned).find(placement => placement.buildingId === 'main') as BuildingPlacement;
  const used = expansionTilesUsed(placementGeometry(main).coreBounds, owned, main.floorTiles);
  const max = expansionBudgetMax(save);
  return { used, max, remaining: Math.max(0, max - used) };
}

/** Giá mở rộng `tileCount` ô (chưa gồm hệ số mặt tiền của Bước 4). */
export const expansionPrice = (tileCount: number): number => tileCount * EXPANSION_TILE_PRICE;

/**
 * Mở rộng sàn thêm `tiles` cho `buildingId` (OpenSpec `open-world-main-expansion` + `open-world-building-relocation` Lát C).
 * Luật hình học ở `checkFootprintTiles`; thêm ngân sách chung theo cấp, tiền, tiệm đóng cửa,
 * và `validateStoreLayout` sau khi dựng lại bản đồ (nội thất/cửa/quầy vẫn đi tới được). Lỗi không trừ tiền và không đổi save.
 * D7b: cho phép mở rộng sang lô kề trống (gắn vào `parcelIds` của tòa).
 */
export function expandFootprint(save: SaveGameData, buildingId: string, tiles: ReadonlyArray<{ x: number; y: number }>): LayoutResult {
  if (save.worldTime.isStoreOpen) return { error: 'store_open' };
  if (!['main', 'xoi', 'drink', 'snack'].includes(buildingId) || !Array.isArray(tiles) || tiles.length === 0 || tiles.length > MAX_FOOTPRINT_TILES) return { error: 'invalid_tiles' };
  const owned = new Set(save.storeLayout.unlockedPlotIds ?? []);
  const placements = normalizePlacements(save.storeLayout.buildingPlacements, owned);
  const building = placements.find(placement => placement.buildingId === buildingId) as BuildingPlacement;
  if (!building) return { error: 'invalid_tiles' };
  const parcel = PARCEL_MAP[building.parcelId];
  if (!parcel) return { error: 'outside_parcel' };
  // D7b: tính lô kề trống (không có tòa nào đang dùng)
  const ownedParcels = building.parcelIds ?? [building.parcelId];
  const claimed = new Set(placements.flatMap(placement => placement.parcelIds ?? [placement.parcelId]));
  const freeAdjacent = [...new Set([...ownedParcels, ...ownedParcels.flatMap(pid => adjacentParcels(pid))])].filter(pid => !claimed.has(pid) || (building.parcelIds ?? []).includes(pid));
  const blockers = footprintBlockers(building, placements, owned);
  const failure = checkFootprintTiles({ floor: placementFloor(building, owned), tiles, parcelId: building.parcelId, blocked: blockers.rects, blockedKeys: blockers.keys, freeParcelIds: freeAdjacent.filter(pid => pid !== building.parcelId) });
  if (failure === 'empty' || failure === 'duplicate') return { error: 'invalid_tiles' };
  if (failure) return { error: failure };
  const budget = sharedExpansionBudget(save);
  if (tiles.length > budget.remaining) return { error: 'over_budget' };
  const price = expansionPrice(tiles.length);
  if (save.player.money < price) return { error: 'money' };
  const next = structuredClone(save);
  next.player.money -= price;
  const floorTiles = [...(building.floorTiles ?? []), ...tiles.map(tile => ({ x: tile.x, y: tile.y }))].sort((a, b) => a.y - b.y || a.x - b.x);
  // D7b: nếu mở rộng sang lô kề, thêm vào parcelIds
  const newlyClaimable = freeAdjacent.filter(pid => !ownedParcels.includes(pid));
  const tilesInAdjacent = newlyClaimable.some((pid: string) => {
    const p = PARCEL_MAP[pid];
    return tiles.some(t => p && inRect(p.rect, t.x, t.y));
  });
  const newPlacements = placements.map(placement => {
    if (placement.buildingId !== buildingId) return placement;
    const newParcelIds = tilesInAdjacent && !placement.parcelIds ? [placement.parcelId] : placement.parcelIds;
    if (tilesInAdjacent && newParcelIds) {
      // Thêm các lô kề có chứa tile được mở rộng
      const added = newlyClaimable.filter((pid: string) => {
        const p = PARCEL_MAP[pid];
        return p && tiles.some(t => inRect(p.rect, t.x, t.y));
      });
      return { ...placement, floorTiles, parcelIds: [...newParcelIds, ...added.filter((pid: string) => !newParcelIds!.includes(pid))] };
    }
    return { ...placement, floorTiles };
  });
  storePlacements(next.storeLayout, newPlacements);
  const valid = validateStoreLayout(next, generateStarterTileMap(next.storeLayout.unlockedPlotIds ?? [], [], next.storeLayout.buildingPlacements, next.world?.openedWaves));
  if (valid.error) return { error: 'path_blocked', blockedFixtureIds: valid.blockedFixtureIds };
  return { save: next };
}

export function buyShopFixture(save: SaveGameData, shopId: string, tileX: number, tileY: number, rotation: StoreFixture['rotation']): LayoutResult {
  if (save.worldTime.isStoreOpen) return { error: 'store_open' };
  const item = FIXTURE_SHOP.find(entry => entry.id === shopId);
  if (!item) return { error: 'unknown_item' };
  if (!item.functional) return { error: 'unavailable' };
  if (save.player.level < item.unlockLevel) return { error: 'level' };
  if (![0, 90, 180, 270].includes(rotation) || !Number.isSafeInteger(tileX) || !Number.isSafeInteger(tileY)) return { error: 'invalid_rotation' };
  if (item.limit !== undefined && [...save.storeLayout.fixtures, ...(save.storeLayout.storedFixtures ?? [])].filter(fixture => fixture.shopId === item.id).length >= item.limit) return { error: 'owned' };
  if (save.player.money < item.cost) return { error: 'money' };
  const next = structuredClone(save);
  const used = new Set([...next.storeLayout.fixtures, ...(next.storeLayout.storedFixtures ?? [])].map(fixture => fixture.id));
  let n = 1;
  while (used.has(`${item.type}_buy_${n}`)) n++;
  next.player.money -= item.cost;
  next.storeLayout.fixtures.push({
    id: `${item.type}_buy_${n}`, type: item.type, tileX, tileY, widthTiles: item.widthTiles, heightTiles: item.heightTiles,
    rotation, currentStock: 0, maxCapacity: item.maxCapacity, label: `${item.name} mới ${n}`, shopId: item.id, slotCount: item.slotCount,
  });
  syncLayoutSlots(next);
  return { save: next };
}

/** Mua đồ trang trí tường/biển/quầy. Biển hiệu chỉ có một: mua biển mới thay biển cũ. Đồ sàn mua qua buy_fixture. */
export function buyDecorItem(save: SaveGameData, decorId: string): LayoutResult {
  if (save.worldTime.isStoreOpen) return { error: 'store_open' };
  const item = DECOR_MAP[decorId];
  if (!item || item.exclusive || item.slot === 'floor') return { error: 'unknown_item' };
  if (save.player.level < item.unlockLevel) return { error: 'level' };
  const owned = save.storeLayout.decorOwned ?? [];
  if (owned.includes(decorId)) return { error: 'owned' };
  if (save.player.money < item.cost) return { error: 'money' };
  const next = structuredClone(save);
  next.player.money -= item.cost;
  next.storeLayout.decorOwned = [...owned.filter(id => item.slot !== 'sign' || DECOR_MAP[id]?.slot !== 'sign'), decorId];
  return { save: next };
}

// ==========================================
// Warehouse tier & storage rack (ported from tap-hoa-dau-hem)
// ==========================================

/** Mua/cập nhật tier kho hàng. Chỉ được nâng dần (không được nhảy cóc hoặc hạ cấp). */
export function buyWarehouseTier(save: SaveGameData, tier: number): LayoutResult {
  if (tier < 0 || tier >= WAREHOUSE_TIERS.length) return { error: 'unknown_item' };
  const current = save.warehouseTier ?? 0;
  if (current === tier) return { error: 'owned' };
  if (tier <= current) return { error: 'owned' }; // only sequential upgrade
  if (tier !== current + 1) return { error: 'owned' }; // must upgrade to next tier only
  const target = WAREHOUSE_TIERS[tier];
  if (save.player.level < target.unlockLevel) return { error: 'level' };
  if (save.player.money < target.cost) return { error: 'money' };
  const next = structuredClone(save);
  next.player.money -= target.cost;
  next.warehouseTier = tier;
  return { save: next };
}

/** Mua thêm 1 kệ kho storage_rack (+20 cells, tối đa 10 cái). */
export function buyStorageRack(save: SaveGameData): LayoutResult {
  const current = save.storageRackCount ?? 0;
  if (current >= MAX_STORAGE_RACKS) return { error: 'owned' };
  if (save.player.money < 50_000) return { error: 'money' };
  const next = structuredClone(save);
  next.player.money -= 50_000;
  next.storageRackCount = current + 1;
  return { save: next };
}

/** Tính tổng sức chứa kho: base tier + storage_rack bonus. */
export function totalWarehouseCells(save: Pick<SaveGameData, 'warehouseTier' | 'storageRackCount'>): number {
  const base = WAREHOUSE_TIERS[save.warehouseTier ?? 0]?.storageCells ?? WAREHOUSE_TIERS[0].storageCells;
  const racks = save.storageRackCount ?? 0;
  return base + racks * STORAGE_RACK_CELL_BONUS;
}

/** Số ô kho một món chiếm cho mỗi lô UNITS_PER_WAREHOUSE_CELL đơn vị: hàng cồng kềnh (ít chứa được trên kệ) chiếm 2. */
export function warehouseSizeOf(product: Pick<Product, 'warehouseSize' | 'shelfCapacity'> | undefined): number {
  if (!product) return 1;
  return product.warehouseSize ?? (product.shelfCapacity > 0 && product.shelfCapacity <= 12 ? 2 : 1);
}

/** Số ô kho cần cho `qty` đơn vị của một món, làm tròn lên theo ô (như game gốc `cellsFor`). */
export function warehouseCellsFor(product: Pick<Product, 'warehouseSize' | 'shelfCapacity'> | undefined, qty: number): number {
  return qty <= 0 ? 0 : Math.ceil(qty / UNITS_PER_WAREHOUSE_CELL) * warehouseSizeOf(product);
}

/** Số đơn vị lớn nhất (≤ want) thêm được vào kho khi món đã có `held` đơn vị và còn `freeCells` ô trống. */
export function unitsFittingInCells(product: Pick<Product, 'warehouseSize' | 'shelfCapacity'> | undefined, held: number, freeCells: number, want: number): number {
  const size = warehouseSizeOf(product);
  const allowedCells = warehouseCellsFor(product, held) + Math.max(0, freeCells);
  const maxTotal = Math.floor(allowedCells / size) * UNITS_PER_WAREHOUSE_CELL;
  return Math.max(0, Math.min(want, maxTotal - held));
}

/** Sức chứa kho mát tính bằng đơn vị hàng: gốc 40, mỗi bậc kho thêm 40. */
export function coldWarehouseCapacity(save: Pick<SaveGameData, 'warehouseTier'>): number {
  return COLD_WAREHOUSE_CAPACITY * (1 + (save.warehouseTier ?? 0));
}

export function rotateStoreFixture(fixture: StoreFixture): StoreFixture['rotation'] {
  return ((fixture.rotation + 90) % 360) as StoreFixture['rotation'];
}

export function applyStoreLayoutActions(save: SaveGameData, actions: readonly StoreLayoutAction[], mapFor: (ownedPlotIds: readonly string[], placements?: readonly BuildingPlacementRecord[]) => GameTileMap): LayoutResult {
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > 64) return { error: 'prerequisite' };
  if (save.worldTime.isStoreOpen || (save.customers ?? (save.customer ? [save.customer] : [])).some(customer => customer.stage !== 'leaving') || (save.staff ?? []).some(staff => !!staff.workerTask || !!staff.diningTask)) {
    return { error: 'store_open' };
  }
  let draft = structuredClone(save);
  for (const action of actions) {
    if (action.type === 'move') {
      const result = moveStoreFixture(draft, action.fixtureId, action.tileX, action.tileY, action.rotation);
      if (!result.save) return result;
      draft = result.save;
    } else if (action.type === 'store') {
      const result = storeFixture(draft, action.fixtureId);
      if (!result.save) return result;
      draft = result.save;
    } else if (action.type === 'retrieve') {
      const stored = draft.storeLayout.storedFixtures ?? [];
      const index = stored.findIndex(item => item.id === action.fixtureId);
      if (index < 0) return { error: 'fixture_missing' };
      const fixture = stored[index];
      if (fixture.type.startsWith('warehouse_') || fixture.parentId) return { error: 'prerequisite' };
      const bundle = stored.filter(item => item.id === action.fixtureId || item.parentId === action.fixtureId);
      draft.storeLayout.storedFixtures = stored.filter(item => !bundle.includes(item));
      fixture.tileX = action.tileX; fixture.tileY = action.tileY;
      draft.storeLayout.fixtures.push(...bundle);
      syncLayoutSlots(draft);
    } else if (action.type === 'buy_decor') {
      const result = buyDecorItem(draft, action.decorId);
      if (!result.save) return result;
      draft = result.save;
    } else if (action.type === 'buy_fixture') {
      const result = buyShopFixture(draft, action.shopId, action.tileX, action.tileY, action.rotation);
      if (!result.save) return result;
      draft = result.save;
    } else if (action.type === 'buy_warehouse_tier') {
      const result = buyWarehouseTier(draft, action.tier);
      if (!result.save) return result;
      draft = result.save;
    } else if (action.type === 'buy_storage_rack') {
      const result = buyStorageRack(draft);
      if (!result.save) return result;
      draft = result.save;
    } else if (action.type === 'relocate_building') {
      const result = relocateBuilding(draft, action.buildingId, action.placement);
      if (!result.save) return result;
      draft = result.save;
    } else if (action.type === 'expand_footprint') {
      const result = expandFootprint(draft, action.buildingId, action.tiles);
      if (!result.save) return result;
      draft = result.save;
    } else {
      const result = buyLandPlot(draft, action.plotId, action.placement);
      if (!result.save) return result;
      draft = result.save;
    }
  }
  const valid = validateStoreLayout(draft, mapFor(draft.storeLayout.unlockedPlotIds ?? [], draft.storeLayout.buildingPlacements));
  return valid.error ? valid : { save: draft };
}
