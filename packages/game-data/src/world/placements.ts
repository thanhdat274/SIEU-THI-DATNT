/**
 * Lớp 3b của mô hình thế giới mở: vị trí đặt tòa. Mọi hình học tòa (biên, cửa, ô vào cửa, mái hiên, bố cục mặc định)
 * được SUY RA từ mẫu tòa + gốc vị trí đặt. Với `DEFAULT_PLACEMENTS`, mọi giá trị trùng hằng số trước refactor (golden).
 */
import type { BuildingPlacementRecord, StoreFixture } from '@game/shared';
import { BUILDING_TEMPLATES, MAIN_EAST_WING_COLUMNS, NORTH_EXPANSION_ROWS, type BuildingId, type BuildingTemplate, type RelTile } from './building-templates';
import { baseFloorTiles, checkFootprintTiles, footprintFloor, tileKey, type Tile } from './footprint';
import { TREE_PROPS } from './infrastructure';
import { PARCEL_MAP } from './parcels';
import { rectContains, type WorldRect } from './world-grid';

/** Biên một tòa nhà (ô, tính cả tường). */
export interface BuildingBounds { left: number; right: number; top: number; bottom: number }

export interface BuildingPlacement {
  buildingId: BuildingId;
  parcelId: string;
  /** Gốc = góc trên-trái biên gốc của tòa (tọa độ thế giới). */
  originX: number;
  originY: number;
  /** Lô đã sở hữu (ban đầu = 1 lô; D7b mở rộng sang lô kề thì thêm vào danh sách). */
  parcelIds?: string[];
  /** Ô sàn đã xây thêm ngoài sàn gốc (tọa độ thế giới); chỉ tiệm chính dùng (OpenSpec `open-world-main-expansion`). */
  floorTiles?: Tile[];
  /** Đang thi công sau khi dời: mở lại khi ngày ≥ giá trị này (xem `relocateBuilding` ở game-core). */
  constructionUntilDay?: number;
}

/** Thứ tự = thứ tự ưu tiên khi hai tòa chạm cùng một ô (tường chung thuộc tòa đứng trước). */
export const DEFAULT_PLACEMENTS: readonly BuildingPlacement[] = [
  { buildingId: 'main', parcelId: 'lot-center', originX: 6, originY: 3 },
  { buildingId: 'xoi', parcelId: 'lot-west', originX: 0, originY: 3 },
  { buildingId: 'drink', parcelId: 'lot-east-2', originX: 26, originY: 3 },
  { buildingId: 'snack', parcelId: 'lot-east-1', originX: 21, originY: 3 },
];

export interface PlacementGeometry {
  template: BuildingTemplate;
  /** Biên gốc (chưa gồm mở rộng phía bắc). */
  bounds: BuildingBounds;
  /** Biên khi mua đủ mọi mảnh mở rộng. */
  maxBounds: BuildingBounds;
  /** Chỉ tiệm chính: biên lõi chưa mua cánh đông. */
  coreBounds: BuildingBounds;
  doorTiles: Array<{ x: number; y: number }>;
  entranceTile: { x: number; y: number };
  awning: { x0: number; x1: number };
  eaveY: number;
  defaultFixtures: StoreFixture[];
}

const abs = (p: BuildingPlacement, t: RelTile) => ({ x: p.originX + t.x, y: p.originY + t.y });

export function placementGeometry(placement: BuildingPlacement): PlacementGeometry {
  const template = BUILDING_TEMPLATES[placement.buildingId];
  const { originX: ox, originY: oy } = placement;
  const bounds: BuildingBounds = { left: ox, right: ox + template.width - 1, top: oy, bottom: oy + template.height - 1 };
  const northRows = NORTH_EXPANSION_ROWS * (template.expansionPlotIds?.length ?? 0);
  return {
    template,
    bounds,
    maxBounds: { ...bounds, top: bounds.top - northRows },
    coreBounds: { ...bounds, right: ox + (template.coreWidth ?? template.width) - 1 },
    doorTiles: template.doorTiles.map(tile => abs(placement, tile)),
    entranceTile: abs(placement, template.entranceTile),
    awning: { x0: (ox + template.awning.startTiles) * 32, x1: (ox + template.awning.startTiles) * 32 + template.awning.widthTiles * 32 },
    eaveY: (bounds.bottom + 1) * 32 - template.eaveOffsetPx,
    defaultFixtures: template.defaultFixtures.map(fixture => ({ ...fixture, tileX: fixture.tileX + ox, tileY: fixture.tileY + oy })),
  };
}

/**
 * Hàng tường sau hiện tại của tòa theo các mảnh đã mua: lùi `NORTH_EXPANSION_ROWS` hàng cho mỗi mảnh mở rộng phía bắc
 * đã mua liên tiếp từ mảnh đầu; tòa chưa mua giữ biên gốc.
 */
export function placementTop(geo: PlacementGeometry, owned: ReadonlySet<string>): number {
  const { template } = geo;
  if (template.plotId && !owned.has(template.plotId)) return geo.bounds.top;
  let rows = 0;
  for (const plotId of template.expansionPlotIds ?? []) {
    if (!owned.has(plotId)) break;
    rows++;
  }
  return geo.bounds.top - NORTH_EXPANSION_ROWS * rows;
}

/** Cột tường đông hiện tại của tòa có cánh đông (tiệm chính): lõi + `MAIN_EAST_WING_COLUMNS` cho mỗi cánh mua liên tiếp. */
export function placementEastWall(geo: PlacementGeometry, owned: ReadonlySet<string>): number {
  let east = geo.coreBounds.right;
  for (const plotId of geo.template.eastWingPlotIds ?? []) {
    if (!owned.has(plotId)) break;
    east += MAIN_EAST_WING_COLUMNS;
  }
  return east;
}

/** Nhà kho sau tòa có kho (tiệm chính): cùng bề ngang lõi, cao 6 hàng phía bắc, chung toàn bộ tường sau; cửa 2 ô ở giữa. */
export function warehouseGeometry(geo: PlacementGeometry) {
  const core = geo.coreBounds;
  const bounds = { left: core.left, right: core.right, top: core.top - 6, bottom: core.top };
  const center = { x: (bounds.left + bounds.right + 1) * 16, y: (bounds.top + bounds.bottom + 1) * 16 };
  return { bounds, center, doorLeft: Math.floor(center.x / 32) - 1 };
}

/** Ô của cánh đông thứ `index` (0, 1) của tiệm chính, gồm cả hàng tường trên/dưới; cột cuối là tường mới. */
export function mainEastWingTiles(index: number, placement: BuildingPlacement = DEFAULT_PLACEMENTS[0]): Array<{ x: number; y: number }> {
  const template = BUILDING_TEMPLATES.main;
  const x0 = placement.originX + (template.coreWidth ?? template.width) + index * MAIN_EAST_WING_COLUMNS;
  return Array.from({ length: MAIN_EAST_WING_COLUMNS * template.height }, (_, i) => ({ x: x0 + i % MAIN_EAST_WING_COLUMNS, y: placement.originY + Math.floor(i / MAIN_EAST_WING_COLUMNS) }));
}

const toRect = (b: BuildingBounds): WorldRect => ({ x0: b.left, x1: b.right, y0: b.top, y1: b.bottom });

/** Lỗi đầu tiên của danh sách vị trí đặt (tòa trùng, lô không tồn tại/trùng, tòa vượt lô), hoặc null nếu hợp lệ. */
export function validatePlacements(placements: readonly BuildingPlacementRecord[]): string | null {
  const buildings = new Set<string>();
  const parcels = new Set<string>();
  for (const placement of placements) {
    if (!Object.prototype.hasOwnProperty.call(BUILDING_TEMPLATES, placement.buildingId)) return `unknown_building:${placement.buildingId}`;
    if (buildings.has(placement.buildingId)) return `duplicate_building:${placement.buildingId}`;
    buildings.add(placement.buildingId);
    const parcel = PARCEL_MAP[placement.parcelId];
    if (!parcel) return `unknown_parcel:${placement.parcelId}`;
    if (parcels.has(placement.parcelId)) return `parcel_occupied:${placement.parcelId}`;
    parcels.add(placement.parcelId);
    if (!Number.isSafeInteger(placement.originX) || !Number.isSafeInteger(placement.originY)) return `invalid_origin:${placement.buildingId}`;
    if (!rectContains(parcel.rect, toRect(placementGeometry(placement as BuildingPlacement).maxBounds))) return `outside_parcel:${placement.buildingId}`;
  }
  return null;
}

const samePlacement = (a: BuildingPlacementRecord, b: BuildingPlacementRecord) =>
  a.buildingId === b.buildingId && a.parcelId === b.parcelId && a.originX === b.originX && a.originY === b.originY;

/** Vùng cấm xây sàn của tiệm chính: nhà kho sau tiệm (tính cả tường). */
export const mainBlockedRects = (geo: PlacementGeometry): WorldRect[] => [toRect(warehouseGeometry(geo).bounds)];

/**
 * Sàn hiện có của một tòa: tiệm chính = sàn gốc ∪ cánh đông cũ đã mua ∪ ô sàn mở rộng; tòa phụ = sàn gốc (trong tường) ∪ ô sàn mở rộng
 * (mảnh `*-north-*` cũ đã đổi thành `floorTiles` lúc nạp, xem `northToFloorTiles`).
 */
export function placementFloor(placement: BuildingPlacement, ownedPlotIds: ReadonlySet<string>): Set<string> {
  const geo = placementGeometry(placement);
  if (geo.template.hasWarehouse) return footprintFloor(geo.coreBounds, ownedPlotIds, placement.floorTiles);
  const floor = new Set(baseFloorTiles(geo.bounds).map(tile => tileKey(tile.x, tile.y)));
  for (const tile of placement.floorTiles ?? []) floor.add(tileKey(tile.x, tile.y));
  return floor;
}

/**
 * Vùng cấm khi mở rộng sàn của `placement` (mọi tòa): kho sau tiệm chính; với mỗi tòa khác: hộp `maxBounds` (và kho), cộng ô sàn của nó
 * và các ô kề (tường của nó), để tường hai tòa chỉ chạm chứ không chồng lên sàn của nhau.
 */
export function footprintBlockers(placement: BuildingPlacement, others: readonly BuildingPlacement[], ownedPlotIds: ReadonlySet<string>): { rects: WorldRect[]; keys: Set<string> } {
  const geo = placementGeometry(placement);
  const rects: WorldRect[] = geo.template.hasWarehouse ? mainBlockedRects(geo) : [];
  const keys = new Set<string>();
  for (const other of others) {
    if (other.buildingId === placement.buildingId) continue;
    const otherGeo = placementGeometry(other);
    rects.push(toRect(otherGeo.maxBounds));
    if (otherGeo.template.hasWarehouse) rects.push(toRect(warehouseGeometry(otherGeo).bounds));
    for (const key of placementFloor(other, ownedPlotIds)) {
      const [x, y] = key.split(',').map(Number);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) keys.add(tileKey(x + dx, y + dy));
    }
  }
  return { rects, keys };
}

/** Lỗi của ô sàn mở rộng đã lưu trong một vị trí đặt (hoặc null), mọi tòa; ô trùng sàn có sẵn bị bỏ qua. `others` = các tòa còn lại đang có. */
function floorTilesProblem(placement: BuildingPlacementRecord, ownedPlotIds: ReadonlySet<string>, others: readonly BuildingPlacement[]): string | null {
  if (!placement.floorTiles || placement.floorTiles.length === 0) return null;
  const self = placement as BuildingPlacement;
  const geo = placementGeometry(self);
  const existing = geo.template.hasWarehouse ? footprintFloor(geo.coreBounds, ownedPlotIds) : new Set(baseFloorTiles(geo.bounds).map(tile => tileKey(tile.x, tile.y)));
  const seen = new Set<string>();
  for (const tile of placement.floorTiles) {
    const key = tileKey(tile.x, tile.y);
    if (seen.has(key)) return 'footprint:duplicate';
    seen.add(key);
  }
  const extra = placement.floorTiles.filter(tile => !existing.has(tileKey(tile.x, tile.y)));
  if (extra.length === 0) return null;
  const blockers = footprintBlockers(self, others, ownedPlotIds);
  const error = checkFootprintTiles({
    floor: existing, tiles: extra, parcelId: placement.parcelId, blocked: blockers.rects, blockedKeys: blockers.keys,
    freeParcelIds: (placement.parcelIds ?? []).filter(pid => pid !== placement.parcelId),
  });
  return error ? `footprint:${error}` : null;
}

/** Một tòa đã đặt, kèm hình học suy ra; đây là dạng nằm trong `GameTileMap.buildings` (xem `MapBuilding` ở shared). */
export interface BuildingInfo {
  id: BuildingId;
  /** false khi đang thi công sau khi dời: cửa bị chặn, không sinh khách. */
  open: boolean;
  top: number;
  bounds: BuildingBounds;
  maxBounds: BuildingBounds;
  doorTiles: Array<{ x: number; y: number }>;
  entranceTile: { x: number; y: number };
  awning: { x0: number; x1: number };
  eaveY: number;
  /** Chỉ tòa phụ có sàn mở rộng: các ô sàn thêm (ngoài sàn gốc), kể cả ngoài `maxBounds`. */
  floorTiles?: Array<{ x: number; y: number }>;
}

export const defaultPlacementOf = (id: BuildingId): BuildingPlacement => DEFAULT_PLACEMENTS.find(p => p.buildingId === id) as BuildingPlacement;

/** Tiệm chính luôn có; tòa phụ chỉ có khi đã mua (`plotId` trong `ownedPlotIds`). Thứ tự = thứ tự ưu tiên mặc định. */
export function placedBuildingIds(ownedPlotIds: ReadonlySet<string>): BuildingId[] {
  return DEFAULT_PLACEMENTS
    .filter(def => { const plotId = BUILDING_TEMPLATES[def.buildingId].plotId; return !plotId || ownedPlotIds.has(plotId); })
    .map(def => def.buildingId);
}

/**
 * Chuyển mảnh mở rộng phía bắc (`*-north-*`) thành `floorTiles` cho `buildingId` (Lát C, migration schema 5→6).
 * Mỗi mảnh mở rộng `NORTH_EXPANSION_ROWS` hàng sàn, chiều rộng = chiều rộng sàn gốc của tòa.
 */
function northToFloorTiles(placement: BuildingPlacement, owned: ReadonlySet<string>): Tile[] | undefined {
  const template = BUILDING_TEMPLATES[placement.buildingId];
  const plotIds = template.expansionPlotIds;
  if (!plotIds?.length) return undefined;
  const tiles: Tile[] = [];
  const geo = placementGeometry(placement);
  const floorWidth = geo.bounds.right - geo.bounds.left - 1; // chiều rộng sàn (không tường)
  let rows = 0;
  for (const plotId of plotIds) {
    if (!owned.has(plotId)) break;
    rows++;
  }
  if (!rows) return undefined;
  // Các hàng sàn mở rộng phía bắc: lùi từ biên trên của tòa
  const topY = geo.bounds.top;
  for (let row = 0; row < rows * NORTH_EXPANSION_ROWS; row++) {
    const y = topY - row; // hàng tường sau cũ thành sàn; tường mới lùi lên đúng `rows * NORTH_EXPANSION_ROWS` hàng (khớp `placementTop`)
    for (let x = geo.bounds.left + 1; x < geo.bounds.right; x++) {
      tiles.push({ x, y });
    }
  }
  return tiles.length ? tiles : undefined;
}

/** Gộp hai danh sách ô, bỏ ô trùng, sắp theo hàng rồi cột. */
const mergeTiles = (a: readonly Tile[], b: readonly Tile[]): Tile[] => {
  const map = new Map<string, Tile>();
  for (const tile of [...a, ...b]) map.set(tileKey(tile.x, tile.y), { x: tile.x, y: tile.y });
  return [...map.values()].sort((m, n) => m.y - n.y || m.x - n.x);
};

/**
 * Vị trí đặt dùng được cho các tòa đang có (tiệm chính + tòa phụ đã mua): mỗi tòa lấy bản ghi trong save nếu có, không thì vị trí mặc định.
 * Bản ghi hỏng/không hợp lệ làm cả danh sách về mặc định (xem `placementsProblem`). Tòa chưa mua KHÔNG có vị trí: lô của nó trống.
 * Migration Lát C: mảnh `*-north-*` → `floorTiles` khi nạp save schema 5.
 */
export function resolvePlacements(records: readonly BuildingPlacementRecord[] | undefined, ownedPlotIds: Iterable<string> = []): readonly BuildingPlacement[] {
  const owned = new Set(ownedPlotIds);
  const ids = placedBuildingIds(owned);
  const usable = !!records?.length && placementsProblem(records, owned) === null;
  const chosen = ids.map((id): BuildingPlacement => {
    const def = defaultPlacementOf(id);
    const found = usable ? (records!.find(p => p.buildingId === id) as BuildingPlacement | undefined) : undefined;
    const placement = found ?? def;
    // Migration Lát C: chuyển mảnh bắc → floorTiles
    const northTiles = northToFloorTiles(placement, owned);
    // D7b: hợp nhất parcelId và parcelIds
    const parcelIds = found?.parcelIds ? [found.parcelId, ...found.parcelIds.filter(pid => pid !== found.parcelId)] : [found?.parcelId ?? def.parcelId];
    return {
      buildingId: id, parcelId: found?.parcelId ?? def.parcelId, originX: found?.originX ?? def.originX, originY: found?.originY ?? def.originY,
      parcelIds: parcelIds.length > 1 ? parcelIds : undefined,
      ...(found?.floorTiles?.length ? { floorTiles: found.floorTiles.map(tile => ({ x: tile.x, y: tile.y })) } : {}),
      ...(northTiles?.length ? { floorTiles: mergeTiles(found?.floorTiles ?? [], northTiles) } : {}),
      ...(found?.constructionUntilDay ? { constructionUntilDay: found.constructionUntilDay } : {}),
    };
  });
  // Migration có thể làm chosen khác DEFAULT_PLACEMENTS → không cache nếu có floorTiles
  const hasNorthTiles = chosen.some(p => p.floorTiles?.length && !defaultPlacementOf(p.buildingId).floorTiles?.length);
  const isDefault = chosen.every(p => { const def = defaultPlacementOf(p.buildingId); return !p.floorTiles && !p.constructionUntilDay && samePlacement(p, def); });
  // Mặc định + đủ bốn tòa trả về chính hằng số (so sánh bằng tham chiếu ở nơi cache).
  return hasNorthTiles || !isDefault || chosen.length !== DEFAULT_PLACEMENTS.length ? chosen : DEFAULT_PLACEMENTS;
}

/** Tương thích tên cũ: trước Bước 3 trả cả bốn tòa; nay chỉ trả tòa đang có (xem `resolvePlacements`). */
export const normalizePlacements = resolvePlacements;

/** Hộp bao hai biên chồng nhau; trả null nếu không chạm. */
const overlap = (a: BuildingBounds, b: BuildingBounds): BuildingBounds | null => {
  const left = Math.max(a.left, b.left), right = Math.min(a.right, b.right), top = Math.max(a.top, b.top), bottom = Math.min(a.bottom, b.bottom);
  return left <= right && top <= bottom ? { left, right, top, bottom } : null;
};

/**
 * Luật đặt một tòa phụ (D3): đúng hàng mặt tiền, nằm trọn trong lô, không đè tòa khác (chỉ được chung một cột tường), mỗi lô một tòa,
 * ô vỉa hè trước cửa không có cây. `others` là các vị trí đặt còn lại (tiệm chính + tòa phụ khác đang có). Trả mã lỗi hoặc null.
 */
export function validatePlacement(candidate: BuildingPlacementRecord, others: readonly BuildingPlacement[]): string | null {
  const template = Object.prototype.hasOwnProperty.call(BUILDING_TEMPLATES, candidate.buildingId) ? BUILDING_TEMPLATES[candidate.buildingId as BuildingId] : undefined;
  if (!template) return `unknown_building:${candidate.buildingId}`;
  const parcel = PARCEL_MAP[candidate.parcelId];
  if (!parcel) return `unknown_parcel:${candidate.parcelId}`;
  if (!Number.isSafeInteger(candidate.originX) || !Number.isSafeInteger(candidate.originY)) return `invalid_origin:${candidate.buildingId}`;
  const geo = placementGeometry(candidate as BuildingPlacement);
  // Đợt 0: mặt tiền nằm ở hàng y=10 (vỉa hè y 11–12) nên gốc y cố định theo mẫu tòa.
  if (geo.bounds.bottom !== DEFAULT_GEOMETRY.main.bounds.bottom) return `front_row:${candidate.buildingId}`;
  if (!rectContains(parcel.rect, toRect(geo.maxBounds))) return `outside_parcel:${candidate.buildingId}`;
  for (const other of others) {
    if (other.buildingId === candidate.buildingId) continue;
    if (other.parcelId === candidate.parcelId || other.parcelIds?.includes(candidate.parcelId)) return `parcel_occupied:${candidate.parcelId}`;
    const otherGeo = placementGeometry(other);
    const boxes = [otherGeo.maxBounds, ...(otherGeo.template.hasWarehouse ? [warehouseGeometry(otherGeo).bounds] : [])];
    for (const box of boxes) {
      const shared = overlap(geo.maxBounds, box);
      // Chỉ được chung đúng một cột tường (tường đông của tòa này là tường tây của tòa kia).
      if (shared && shared.left !== shared.right) return `overlap:${candidate.buildingId}:${other.buildingId}`;
    }
  }
  // Ô trước cửa (hàng vỉa hè y=11) phải đi được: không có cây trên các ô cửa hay ô vào cửa.
  const front = [geo.entranceTile, ...geo.doorTiles.map(door => ({ x: door.x, y: geo.entranceTile.y }))];
  if (TREE_PROPS.some(tree => front.some(tile => tile.x === tree.tileX && tile.y === tree.tileY))) return `door_blocked:${candidate.buildingId}`;
  return null;
}

/**
 * Lỗi của vị trí đặt trong save, hoặc null nếu dùng được. Tiệm chính cố định ở lô/gốc mặc định (dời tiệm chính ngoài phạm vi Bước 3), kèm
 * `floorTiles` hợp lệ (`checkFootprintTiles`). Tòa phụ đã mua đặt được ở bất kỳ lô nào qua `validatePlacement`. Bản ghi của tòa chưa mua bị bỏ qua.
 */
export function placementsProblem(placements: readonly BuildingPlacementRecord[] | undefined, ownedPlotIds: Iterable<string> = []): string | null {
  if (!placements || placements.length === 0) return null;
  const owned = new Set(ownedPlotIds);
  const present = new Set<string>(placedBuildingIds(owned));
  const seen = new Set<string>();
  for (const record of placements) {
    if (!Object.prototype.hasOwnProperty.call(BUILDING_TEMPLATES, record.buildingId)) return `unknown_building:${record.buildingId}`;
    if (seen.has(record.buildingId)) return `duplicate_building:${record.buildingId}`;
    seen.add(record.buildingId);
  }
  const relevant = placements.filter(record => present.has(record.buildingId));
  const main = relevant.find(record => record.buildingId === 'main');
  if (main && !samePlacement(main, defaultPlacementOf('main'))) return 'main_fixed';
  const resolved = (record: BuildingPlacementRecord): BuildingPlacement => ({ buildingId: record.buildingId as BuildingId, parcelId: record.parcelId, originX: record.originX, originY: record.originY, ...(record.parcelIds ? { parcelIds: record.parcelIds } : {}), ...(record.floorTiles ? { floorTiles: record.floorTiles } : {}) });
  const placed = [...relevant.filter(record => record.buildingId === 'main' || present.has(record.buildingId)).map(resolved)];
  if (!main) placed.unshift(defaultPlacementOf('main'));
  for (const record of relevant) {
    if (record.buildingId === 'main') continue;
    const problem = validatePlacement(record, placed.filter(other => other.buildingId !== record.buildingId));
    if (problem) return problem;
  }
  // D7b: lô đã lấn (`parcelIds`) phải có thật và không thuộc tòa khác.
  for (const record of relevant) {
    for (const pid of record.parcelIds ?? []) {
      if (!PARCEL_MAP[pid]) return `unknown_parcel:${pid}`;
      if (pid === record.parcelId) continue;
      if (relevant.some(other => other !== record && (other.parcelId === pid || other.parcelIds?.includes(pid)))) return `parcel_occupied:${pid}`;
    }
  }
  for (const record of relevant) {
    const problem = floorTilesProblem(record, owned, placed.filter(other => other.buildingId !== record.buildingId));
    if (problem) return problem;
  }
  return null;
}

/** Hình học của mọi tòa đang có (tiệm chính + tòa phụ đã mua) cho `GameTileMap.buildings`. */
export function layoutBuildings(placements: readonly BuildingPlacement[], ownedPlotIds: ReadonlySet<string>): BuildingInfo[] {
  return placements.map(placement => {
    const geo = placementGeometry(placement);
    // Tòa phụ có ô sàn mở rộng: hàng tường sau là hàng kề trên ô sàn cao nhất; `floorTiles` cho `buildingAt`/`buildingOfTiles` nhận ô ngoài `maxBounds`.
    const extra = geo.template.hasWarehouse ? undefined : placement.floorTiles;
    const top = extra?.length ? Math.min(placementTop(geo, ownedPlotIds), ...extra.map(tile => tile.y - 1)) : placementTop(geo, ownedPlotIds);
    return {
      id: placement.buildingId, open: !placement.constructionUntilDay, top, bounds: geo.bounds, maxBounds: geo.maxBounds,
      doorTiles: geo.doorTiles, entranceTile: geo.entranceTile, awning: geo.awning, eaveY: geo.eaveY,
      ...(extra?.length ? { floorTiles: extra.map(tile => ({ x: tile.x, y: tile.y })) } : {}),
    };
  });
}

export const DEFAULT_GEOMETRY: Readonly<Record<BuildingId, PlacementGeometry>> = Object.fromEntries(
  DEFAULT_PLACEMENTS.map(placement => [placement.buildingId, placementGeometry(placement)]),
) as Record<BuildingId, PlacementGeometry>;
