/**
 * Lưới an toàn cho refactor thế giới mở (OpenSpec `open-world-land-grid`, nhóm 1): chụp lại đầu ra hình học và mô phỏng
 * hiện tại thành một bản golden. Refactor không được đổi bất kỳ giá trị nào ở đây; đổi = đổi gameplay, nằm ngoài phạm vi.
 * Sinh lại: `yarn --cwd packages/game-core tsx src/world-golden-gen.ts` (chỉ khi có thay đổi gameplay đã được duyệt).
 */
import { createHash } from 'node:crypto';
import { isSalesFixture, type GameTileMap, type SaveGameData } from '@game/shared';
import {
  AWNING_SPANS, BUILDINGS, DEFAULT_INITIAL_SAVE, DRINK_DEFAULT_FIXTURES, INITIAL_FIXTURES, LAND_PLOTS, MAP_HEIGHT, MAP_ORIGIN_Y, MAP_WIDTH,
  ONLINE_SPAWN_POINTS, PLAY_MAP_PX, PRODUCT_MAP, ROOF_EAVES, SHELTER_ZONES, SHOP_AWNING_PX, SHOP_FRONT, SHOPKEEPER_POSITION, SHOPKEEPER_TILE,
  SNACK_DEFAULT_FIXTURES, STALLS, STORE_BOUNDS, WAREHOUSE_BOUNDS, WAREHOUSE_CENTER, WAREHOUSE_DOOR_LEFT, WAREHOUSE_ENTRANCE, WAREHOUSE_FIXTURES,
  XOI_DEFAULT_FIXTURES, buildingAt, buildingOfTiles, buildingTop, generateStarterTileMap, isFenceTile,
} from '@game/data';
import { CollisionSystem } from './collision';
import { ENTRANCE_TILE } from './customers';
import { InputManager } from './input';
import { createMarketState } from './market';
import { findPath } from './pathfinding';
import { GameSimulation } from './simulation';
import { applyStoreLayoutActions } from './store-layout';

const sha = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

/** Mọi tập mảnh đất hợp lệ (tôn trọng `prerequisitePlotId`), sắp xếp ổn định. */
export function validPlotCombos(): string[][] {
  const ids = LAND_PLOTS.map(plot => plot.id);
  const combos: string[][] = [];
  for (let mask = 0; mask < 1 << ids.length; mask++) {
    const set = ids.filter((_, i) => mask & (1 << i));
    const ok = set.every(id => {
      const pre = LAND_PLOTS.find(plot => plot.id === id)?.prerequisitePlotId;
      return !pre || set.includes(pre);
    });
    if (ok) combos.push(set);
  }
  return combos;
}

const mapDigest = (map: GameTileMap) => sha({
  originTileY: map.originTileY, width: map.width, height: map.height, layers: map.layers.map(layer => [layer.name, layer.data]),
  collision: map.collisionLayer, storeBounds: map.storeBounds, buildings: map.buildings?.map(b => ({ id: b.id, open: b.open, top: b.top })), stalls: map.stalls,
});

/** Lưới ký tự theo hàng của vùng chơi: hàm trả về một ký tự cho mỗi ô. */
const grid = (cell: (x: number, y: number) => string): string[] => {
  const rows: string[] = [];
  for (let y = MAP_ORIGIN_Y; y < MAP_ORIGIN_Y + MAP_HEIGHT; y++) {
    let row = '';
    for (let x = 0; x < MAP_WIDTH; x++) row += cell(x, y);
    rows.push(row);
  }
  return rows;
};
const code = (id: string | undefined) => (id ? id[0] : '.');

function geometry() {
  return {
    map: { MAP_WIDTH, MAP_HEIGHT, MAP_ORIGIN_Y, STORE_BOUNDS, PLAY_MAP_PX },
    buildings: BUILDINGS.map(b => ({ id: b.id, bounds: b.bounds, maxBounds: b.maxBounds, doorTiles: b.doorTiles, entranceTile: b.entranceTile, plotId: b.plotId, expansionPlotIds: b.expansionPlotIds })),
    buildingTop: validPlotCombos().map(combo => [combo.join('+'), BUILDINGS.map(b => buildingTop(b.id, combo))]),
    AWNING_SPANS, ROOF_EAVES, SHELTER_ZONES, SHOP_FRONT, SHOP_AWNING_PX,
    WAREHOUSE_BOUNDS, WAREHOUSE_CENTER, WAREHOUSE_DOOR_LEFT, WAREHOUSE_ENTRANCE, WAREHOUSE_FIXTURES,
    SHOPKEEPER_TILE, SHOPKEEPER_POSITION, ONLINE_SPAWN_POINTS, ENTRANCE_TILE,
    INITIAL_FIXTURES, XOI_DEFAULT_FIXTURES, DRINK_DEFAULT_FIXTURES, SNACK_DEFAULT_FIXTURES,
    fence: grid((x, y) => (isFenceTile(x, y, MAP_WIDTH) ? '#' : '.')),
  };
}

function paths(): Record<string, { length: number; digest: string }> {
  const out: Record<string, { length: number; digest: string }> = {};
  const all = validPlotCombos().reduce((a, b) => (b.length > a.length ? b : a), [] as string[]);
  for (const [label, combo] of [['none', [] as string[]], ['all', all]] as const) {
    const map = generateStarterTileMap(combo);
    const collision = new CollisionSystem(map, []);
    for (const b of BUILDINGS) {
      if (b.plotId && !combo.includes(b.plotId)) continue;
      const inside = { x: b.doorTiles[0].x, y: b.doorTiles[0].y - 2 };
      for (const [side, start] of [['west', { x: 1, y: 12 }], ['east', { x: MAP_WIDTH - 2, y: 12 }]] as const) {
        const path = findPath(map, collision, start, inside);
        out[`${label}:${b.id}:${side}`] = { length: path.length, digest: sha(path) };
      }
    }
  }
  return out;
}

const MAIN_PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'ao_mua_bo', 'xa_phong', 'banh_quy'];

/** Mô phỏng headless có hạt giống cố định; kệ được châm đầy mỗi giờ để kết quả chỉ phụ thuộc hình học + khách. */
export function simulateDays(allBuildings: boolean, days = 3) {
  let save: SaveGameData = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState('golden-world', 1) };
  save.createdAt = save.updatedAt = '2026-01-01T00:00:00.000Z';
  save.player = { ...save.player, level: 60, money: 10_000_000 };
  save.worldTime = { ...save.worldTime, isStoreOpen: false };
  const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
  if (allBuildings) {
    const buys = LAND_PLOTS.filter(plot => plot.buildingId).map(plot => ({ type: 'buy_plot' as const, plotId: plot.id }));
    save = applyStoreLayoutActions(save, buys, mapFor).save!;
  }
  const sim = new GameSimulation(save, mapFor(save.storeLayout.unlockedPlotIds ?? []), new InputManager(), {});
  const refill = () => {
    let i = 0;
    for (const shelf of sim.getFixtures().filter(isSalesFixture)) {
      shelf.assignedProductId ??= MAIN_PRODUCTS[i++ % MAIN_PRODUCTS.length];
      shelf.currentStock = 14;
      shelf.stockLots = [{ quantity: 14, expiresOnDay: 99999, unitCost: PRODUCT_MAP[shelf.assignedProductId]?.purchasePrice ?? 3_000, provenance: 'known' }];
    }
  };
  refill();
  let hour = sim.getTime().hour;
  let guard = 0;
  while (sim.getTime().day < 1 + days && guard++ < 2_000_000) {
    const t = sim.getTime();
    if (t.hour !== hour) { hour = t.hour; refill(); }
    if (!t.isStoreOpen && t.hour < 20) sim.getClock().toggleStoreStatus();
    sim.update(0.25);
  }
  const records = Object.values(sim.getDailyRecords()).filter(r => r.day >= 1 && r.day < 1 + days).sort((a, b) => a.day - b.day);
  return {
    days: records.map(r => ({ day: r.day, customersServed: r.customersServed, revenue: r.revenue, netProfit: r.netProfit, sales: sha(r.productSales ?? {}) })),
    money: sim.getPlayerData().money,
    fixtures: sha(sim.getFixtures().map(f => [f.id, f.tileX, f.tileY, f.rotation]).sort()),
  };
}

export interface WorldGolden {
  maps: Record<string, string>;
  buildingAt: string[];
  buildingOfTiles: string[];
  paths: Record<string, { length: number; digest: string }>;
  geometry: string;
  geometryDump: ReturnType<typeof geometry>;
  simulation: { base: ReturnType<typeof simulateDays>; allBuildings: ReturnType<typeof simulateDays> };
}

export function computeWorldGolden(options: { simulation?: boolean } = {}): Omit<WorldGolden, 'simulation'> & Partial<Pick<WorldGolden, 'simulation'>> {
  const maps: Record<string, string> = {};
  const allStalls = STALLS.map(stall => stall.id);
  for (const combo of validPlotCombos()) {
    const key = combo.join('+') || '(none)';
    maps[key] = mapDigest(generateStarterTileMap(combo));
    maps[`${key}|stalls`] = mapDigest(generateStarterTileMap(combo, allStalls));
  }
  const geo = geometry();
  return {
    maps,
    buildingAt: grid((x, y) => code(buildingAt(x, y))),
    buildingOfTiles: grid((x, y) => code(buildingOfTiles([{ x, y }]))),
    paths: paths(),
    geometry: sha(geo),
    geometryDump: geo,
    ...(options.simulation === false ? {} : { simulation: { base: simulateDays(false), allBuildings: simulateDays(true) } }),
  };
}
