import { getFixtureDimensions, type GameTileMap, type SaveGameData, type StoreFixture } from '@game/shared';
import { LAND_PLOTS, MAP_ORIGIN_Y, STORE_BOUNDS, WAREHOUSE_DOOR_LEFT } from '@game/data';

export type LayoutFailure = 'fixture_missing' | 'plot_locked' | 'outside_floor' | 'overlap' | 'path_blocked' | 'invalid_rotation' | 'store_open' | 'level' | 'money' | 'prerequisite';

export interface LayoutResult {
  save?: SaveGameData;
  error?: LayoutFailure;
  blockedFixtureIds?: string[];
}

export type StoreLayoutAction =
  | { type: 'move'; fixtureId: string; tileX: number; tileY: number; rotation: StoreFixture['rotation'] }
  | { type: 'store'; fixtureId: string }
  | { type: 'retrieve'; fixtureId: string; tileX: number; tileY: number }
  | { type: 'buy_plot'; plotId: string };

const key = (x: number, y: number) => `${x},${y}`;
const footprint = (fixture: StoreFixture) => {
  const { widthTiles: width, heightTiles: height } = getFixtureDimensions(fixture);
  return Array.from({ length: width * height }, (_, i) => ({ x: fixture.tileX + i % width, y: fixture.tileY + Math.floor(i / width) }));
};

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
  if (!save.storeLayout.fixtures.some(fixture => fixture.type === 'cashier_counter')) invalid.push('cashier_missing');
  for (const fixture of save.storeLayout.fixtures) {
    if (fixture.type.startsWith('warehouse_')) continue;
    if (![0, 90, 180, 270].includes(fixture.rotation)) return { error: 'invalid_rotation' };
    for (const tile of footprint(fixture)) {
      const localY = tile.y - (map.originTileY ?? 0);
      const idx = localY * map.width + tile.x;
      const k = key(tile.x, tile.y);
      if (tile.x < 0 || tile.x >= map.width || localY < 0 || localY >= map.height || ground[idx] !== 3 || map.collisionLayer[idx]) return { error: 'outside_floor' };
      if (occupied.has(k)) return { error: 'overlap' };
      occupied.set(k, fixture.id);
    }
  }

  const entry = { x: 9, y: STORE_BOUNDS.bottom + 1 };
  const walkable = (x: number, y: number) => {
    const localY = y - (map.originTileY ?? 0);
    const idx = localY * map.width + x;
    return x >= 0 && x < map.width && localY >= 0 && localY < map.height && ground[idx] === 3 && !map.collisionLayer[idx] && !occupied.has(key(x, y));
  };
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

  const requiredStaffTargets = new Set((save.staff ?? []).map(member => member.assignedFixtureId).filter((id): id is string => !!id));
  for (const fixture of save.storeLayout.fixtures) {
    const required = fixture.type === 'cashier_counter' || ((fixture.type === 'shelf_wooden' || fixture.type === 'shelf_glass' || fixture.type === 'refrigerator') && fixture.currentStock > 0) || requiredStaffTargets.has(fixture.id);
    if (!required) continue;
    const own = new Set(footprint(fixture).map(tile => key(tile.x, tile.y)));
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
  if (warehouseDoorWalkable && ![WAREHOUSE_DOOR_LEFT, WAREHOUSE_DOOR_LEFT + 1].some(x => distances.has(key(x, STORE_BOUNDS.top + 1)))) invalid.push('warehouse_door');
  return invalid.length ? { error: 'path_blocked', blockedFixtureIds: invalid } : {};
}

export function moveStoreFixture(save: SaveGameData, fixtureId: string, tileX: number, tileY: number, rotation?: StoreFixture['rotation'], map?: GameTileMap): LayoutResult {
  const next = structuredClone(save);
  const fixture = next.storeLayout.fixtures.find(item => item.id === fixtureId);
  if (!fixture) return { error: 'fixture_missing' };
  if (fixture.type.startsWith('warehouse_')) return { error: 'prerequisite' };
  fixture.tileX = tileX;
  fixture.tileY = tileY;
  if (rotation !== undefined) fixture.rotation = rotation;
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
  if (next.storeLayout.fixtures[index].type === 'cashier_counter') return { error: 'prerequisite' };
  const [fixture] = next.storeLayout.fixtures.splice(index, 1);
  next.storeLayout.storedFixtures = [...(next.storeLayout.storedFixtures ?? []), fixture];
  next.staff = (next.staff ?? []).map(member => member.assignedFixtureId === fixtureId ? { ...member, assignedFixtureId: undefined } : member);
  return { save: next };
}

export function retrieveStoreFixture(save: SaveGameData, fixtureId: string, tileX: number, tileY: number, map: GameTileMap): LayoutResult {
  const next = structuredClone(save);
  const stored = next.storeLayout.storedFixtures ?? [];
  const index = stored.findIndex(item => item.id === fixtureId);
  if (index < 0) return { error: 'fixture_missing' };
  const [fixture] = stored.splice(index, 1);
  fixture.tileX = tileX; fixture.tileY = tileY;
  next.storeLayout.fixtures.push(fixture);
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
  return { save: next };
}

export function rotateStoreFixture(fixture: StoreFixture): StoreFixture['rotation'] {
  return ((fixture.rotation + 90) % 360) as StoreFixture['rotation'];
}

export function applyStoreLayoutActions(save: SaveGameData, actions: readonly StoreLayoutAction[], mapFor: (ownedPlotIds: readonly string[]) => GameTileMap): LayoutResult {
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > 64) return { error: 'prerequisite' };
  if (save.worldTime.isStoreOpen || (save.customers ?? (save.customer ? [save.customer] : [])).some(customer => customer.stage !== 'leaving') || (save.staff ?? []).some(staff => !!staff.workerTask)) {
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
      const [fixture] = stored.splice(index, 1);
      if (fixture.type.startsWith('warehouse_')) return { error: 'prerequisite' };
      fixture.tileX = action.tileX; fixture.tileY = action.tileY;
      draft.storeLayout.storedFixtures = stored;
      draft.storeLayout.fixtures.push(fixture);
    } else {
      const result = buyLandPlot(draft, action.plotId);
      if (!result.save) return result;
      draft = result.save;
    }
  }
  const valid = validateStoreLayout(draft, mapFor(draft.storeLayout.unlockedPlotIds ?? []));
  return valid.error ? valid : { save: draft };
}
