import { COLD_WAREHOUSE_CAPACITY, UNITS_PER_WAREHOUSE_CELL, getFixtureDimensions, type Product, isSalesFixture, isSlotChild, syncSlotChildren, type GameTileMap, type SaveGameData, type StoreFixture } from '@game/shared';
import { BUILDING_MAP, DECOR_MAP, FIXTURE_SHOP, LAND_PLOTS, MAP_ORIGIN_Y, STORE_BOUNDS, WAREHOUSE_DOOR_LEFT, WAREHOUSE_TIERS, STORAGE_RACK_CELL_BONUS, MAX_STORAGE_RACKS, XOI_DEFAULT_FIXTURES, XOI_PLOT_ID, DRINK_DEFAULT_FIXTURES, DRINK_PLOT_ID, buildingOfTiles, type BuildingId } from '@game/data';

export type LayoutFailure = 'fixture_missing' | 'plot_locked' | 'outside_floor' | 'overlap' | 'path_blocked' | 'invalid_rotation' | 'store_open' | 'level' | 'money' | 'prerequisite' | 'unknown_item' | 'unavailable' | 'owned' | 'wrong_building';

export interface LayoutResult {
  save?: SaveGameData;
  error?: LayoutFailure;
  blockedFixtureIds?: string[];
}

export type StoreLayoutAction =
  | { type: 'move'; fixtureId: string; tileX: number; tileY: number; rotation: StoreFixture['rotation'] }
  | { type: 'store'; fixtureId: string }
  | { type: 'retrieve'; fixtureId: string; tileX: number; tileY: number }
  | { type: 'buy_plot'; plotId: string }
  | { type: 'buy_decor'; decorId: string }
  | { type: 'buy_fixture'; shopId: string; tileX: number; tileY: number; rotation: StoreFixture['rotation'] }
  | { type: 'buy_warehouse_tier'; tier: number }
  | { type: 'buy_storage_rack' };

const key = (x: number, y: number) => `${x},${y}`;
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
export function relocateMisplacedFixtures(fixtures: StoreFixture[], stored: StoreFixture[]): { fixtures: StoreFixture[]; stored: StoreFixture[]; movedIds: string[] } {
  const misplaced = new Set<string>();
  for (const fixture of fixtures) {
    if (fixture.parentId || fixture.type.startsWith('warehouse_') || !fixture.shopId) continue;
    const allowed = FIXTURE_SHOP.find(item => item.id === fixture.shopId)?.allowedBuildings;
    if (!allowed) continue;
    const home = buildingOfTiles(footprint(fixture));
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
      const localY = tile.y - (map.originTileY ?? 0);
      const idx = localY * map.width + tile.x;
      const k = key(tile.x, tile.y);
      if (tile.x < 0 || tile.x >= map.width || localY < 0 || localY >= map.height || ground[idx] !== 3 || map.collisionLayer[idx]) return { error: 'outside_floor' };
      if (occupied.has(k)) return { error: 'overlap' };
      occupied.set(k, fixture.id);
    }
    // Footprint phải nằm trọn trong một tòa nhà và tòa đó phải nhận món này (trạm xôi chỉ ở tiệm xôi).
    const home = buildingOfTiles(footprint(fixture));
    if (!home) return { error: 'outside_floor' };
    const shopItem = fixture.shopId ? FIXTURE_SHOP.find(item => item.id === fixture.shopId) : undefined;
    if (shopItem?.allowedBuildings && !shopItem.allowedBuildings.includes(home)) return { error: 'wrong_building', blockedFixtureIds: [fixture.id] };
    buildingOf.set(fixture.id, home);
  }
  // Tiệm xôi đã mở phải có quầy thu ngân riêng (mỗi tòa một quầy và một hàng đợi).
  for (const [plotId, building] of [[XOI_PLOT_ID, 'xoi'], [DRINK_PLOT_ID, 'drink']] as const) {
    if (plotIds.includes(plotId) && !save.storeLayout.fixtures.some(fixture => fixture.type === 'cashier_counter' && buildingOf.get(fixture.id) === building)) invalid.push('cashier_missing');
  }

  const walkable = (x: number, y: number) => {
    const localY = y - (map.originTileY ?? 0);
    const idx = localY * map.width + x;
    return x >= 0 && x < map.width && localY >= 0 && localY < map.height && ground[idx] === 3 && !map.collisionLayer[idx] && !occupied.has(key(x, y));
  };
  // Vùng đi được tính từ ô trước cửa của từng tòa (mỗi tòa một cửa riêng).
  const reachCache = new Map<BuildingId, Map<string, number>>();
  const reachFrom = (id: BuildingId): Map<string, number> => {
    const cached = reachCache.get(id);
    if (cached) return cached;
    const entry = BUILDING_MAP[id].entranceTile;
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
    const localY = y - (map.originTileY ?? MAP_ORIGIN_Y);
    const idx = localY * map.width + x;
    return x >= 0 && x < map.width && localY >= 0 && localY < map.height && ground[idx] === 3 && !map.collisionLayer[idx];
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
    const home = buildingOfTiles(footprint(next.storeLayout.fixtures[index]));
    const sameBuilding = next.storeLayout.fixtures.filter(item => item.type === 'cashier_counter' && buildingOfTiles(footprint(item)) === home);
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

export function buyLandPlot(save: SaveGameData, plotId: string): LayoutResult {
  if (save.worldTime.isStoreOpen) return { error: 'store_open' };
  const plot = LAND_PLOTS.find(item => item.id === plotId);
  if (!plot) return { error: 'plot_locked' };
  const owned = save.storeLayout.unlockedPlotIds ?? [];
  if (owned.includes(plotId)) return { save: structuredClone(save) };
  if (save.player.level < plot.level) return { error: 'level' };
  if (plot.prerequisitePlotId && !owned.includes(plot.prerequisitePlotId)) return { error: 'prerequisite' };
  if (save.player.money < plot.cost) return { error: 'money' };
  const next = structuredClone(save);
  next.player.money -= plot.cost;
  next.storeLayout.unlockedPlotIds = [...owned, plotId];
  const defaults = plot.buildingId === 'xoi' ? XOI_DEFAULT_FIXTURES : plot.buildingId === 'drink' ? DRINK_DEFAULT_FIXTURES : undefined;
  if (defaults) {
    // Mua tòa nhà: đặt bố cục mặc định (id cố định, đã có thì bỏ qua), miễn phí vì đã gồm trong giá.
    const used = new Set([...next.storeLayout.fixtures, ...(next.storeLayout.storedFixtures ?? [])].map(fixture => fixture.id));
    for (const fixture of defaults) if (!used.has(fixture.id)) next.storeLayout.fixtures.push(structuredClone(fixture));
    syncLayoutSlots(next);
  }
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

export function applyStoreLayoutActions(save: SaveGameData, actions: readonly StoreLayoutAction[], mapFor: (ownedPlotIds: readonly string[]) => GameTileMap): LayoutResult {
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
    } else {
      const result = buyLandPlot(draft, action.plotId);
      if (!result.save) return result;
      draft = result.save;
    }
  }
  const valid = validateStoreLayout(draft, mapFor(draft.storeLayout.unlockedPlotIds ?? []));
  return valid.error ? valid : { save: draft };
}
