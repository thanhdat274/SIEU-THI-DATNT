/**
 * Footprint của tiệm chính theo ô (OpenSpec `open-world-main-expansion`): sàn = sàn gốc ∪ cánh đông cũ (`east-wing-a/b`) ∪ `floorTiles`;
 * tường = mọi ô kề 8 hướng của sàn nằm ngoài sàn. Hàm thuần, không phụ thuộc vị trí đặt: nơi gọi truyền vào biên lõi, lô và vùng cấm.
 */
import { MAIN_EAST_WING_COLUMNS, MAIN_EAST_WING_PLOT_IDS } from './building-templates';
import { PARCEL_MAP } from './parcels';
import type { WorldRect } from './world-grid';

export interface Tile { x: number; y: number }

/** Biên lõi tiệm chính (tính cả tường), cùng hình dạng `BuildingBounds`. */
export interface CoreBounds { left: number; right: number; top: number; bottom: number }

export const tileKey = (x: number, y: number): string => `${x},${y}`;

/** Giá một ô sàn mở rộng (provisional; Bước 4 nhân thêm hệ số mặt tiền). */
export const EXPANSION_TILE_PRICE = 8_000;

/** Ngân sách ô mở rộng cộng dồn theo cấp (provisional). Mốc cấp 5/10 = số ô sàn của `east-wing-a/b` (24 + 24). */
export const EXPANSION_TILE_MILESTONES: Readonly<Record<number, number>> = {
  5: 24, 10: 48, 15: 60, 20: 72, 25: 84, 30: 90, 35: 110, 40: 130, 45: 150, 50: 170, 55: 185, 60: 200,
};

export function expansionBudgetAtLevel(level: number): number {
  let budget = 0;
  for (const [milestone, tiles] of Object.entries(EXPANSION_TILE_MILESTONES)) {
    if (Number(milestone) <= level) budget = Math.max(budget, tiles);
  }
  return budget;
}

/** Sàn gốc của tòa: phần trong tường của biên lõi. */
export function baseFloorTiles(core: CoreBounds): Tile[] {
  const tiles: Tile[] = [];
  for (let y = core.top + 1; y < core.bottom; y++) for (let x = core.left + 1; x < core.right; x++) tiles.push({ x, y });
  return tiles;
}

/**
 * Ô sàn của các cánh đông cũ đã mua (mua liên tiếp từ cánh đầu). Cánh thứ k phủ cột `core.right + 4k .. core.right + 4k + 3`,
 * hàng trong tường; cột `core.right` (tường đông cũ) thành sàn khi mua cánh đầu.
 */
export function legacyWingFloorTiles(core: CoreBounds, ownedPlotIds: ReadonlySet<string>): Tile[] {
  const tiles: Tile[] = [];
  for (let wing = 0; wing < MAIN_EAST_WING_PLOT_IDS.length; wing++) {
    if (!ownedPlotIds.has(MAIN_EAST_WING_PLOT_IDS[wing])) break;
    const x0 = core.right + wing * MAIN_EAST_WING_COLUMNS;
    for (let y = core.top + 1; y < core.bottom; y++) for (let dx = 0; dx < MAIN_EAST_WING_COLUMNS; dx++) tiles.push({ x: x0 + dx, y });
  }
  return tiles;
}

/** Tập khóa ô sàn đang có: sàn gốc ∪ cánh đông cũ ∪ ô sàn mở rộng. */
export function footprintFloor(core: CoreBounds, ownedPlotIds: ReadonlySet<string>, floorTiles?: readonly Tile[]): Set<string> {
  const floor = new Set<string>();
  for (const tile of baseFloorTiles(core)) floor.add(tileKey(tile.x, tile.y));
  for (const tile of legacyWingFloorTiles(core, ownedPlotIds)) floor.add(tileKey(tile.x, tile.y));
  for (const tile of floorTiles ?? []) floor.add(tileKey(tile.x, tile.y));
  return floor;
}

/** Số ô sàn đã dùng của ngân sách mở rộng: cánh đông cũ + ô sàn mở rộng (trùng nhau chỉ tính một lần). */
export function expansionTilesUsed(core: CoreBounds, ownedPlotIds: ReadonlySet<string>, floorTiles?: readonly Tile[]): number {
  const base = new Set(baseFloorTiles(core).map(tile => tileKey(tile.x, tile.y)));
  const used = new Set<string>();
  for (const tile of [...legacyWingFloorTiles(core, ownedPlotIds), ...(floorTiles ?? [])]) {
    const key = tileKey(tile.x, tile.y);
    if (!base.has(key)) used.add(key);
  }
  return used.size;
}

const NEIGHBORS_8: ReadonlyArray<readonly [number, number]> = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/** Tường quanh sàn: ô kề 8 hướng của một ô sàn, nằm ngoài sàn. */
export function wallRing(floor: ReadonlySet<string>): Set<string> {
  const ring = new Set<string>();
  for (const key of floor) {
    const [x, y] = key.split(',').map(Number);
    for (const [dx, dy] of NEIGHBORS_8) {
      const next = tileKey(x + dx, y + dy);
      if (!floor.has(next)) ring.add(next);
    }
  }
  return ring;
}

/** Hộp bao của một tập khóa ô, hoặc undefined nếu rỗng. */
export function tileBox(keys: Iterable<string>): { left: number; right: number; top: number; bottom: number } | undefined {
  let box: { left: number; right: number; top: number; bottom: number } | undefined;
  for (const key of keys) {
    const [x, y] = key.split(',').map(Number);
    box = box
      ? { left: Math.min(box.left, x), right: Math.max(box.right, x), top: Math.min(box.top, y), bottom: Math.max(box.bottom, y) }
      : { left: x, right: x, top: y, bottom: y };
  }
  return box;
}

export type FootprintError = 'empty' | 'duplicate' | 'outside_parcel' | 'blocked_by_building' | 'not_adjacent' | 'disconnected';

export const inRect = (rect: WorldRect, x: number, y: number) => x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1;

/**
 * Luật hình học khi thêm ô sàn `tiles` vào sàn `floor` (D4.1–4.4): không trống/trùng; mọi ô cùng hàng tường quanh nó nằm trong lô
 * (ô sàn thuộc lô thu vào một ô); không vào vùng cấm (kho sau tiệm); có ô kề sàn hiện có và mọi ô nối được về sàn qua `floor ∪ tiles`.
 * D7b: `freeParcelIds` = danh sách lô trống được phép lấn (mở rộng sang lô kề).
 */
export function checkFootprintTiles(opts: { floor: ReadonlySet<string>; tiles: readonly Tile[]; parcelId: string; blocked: readonly WorldRect[]; blockedKeys?: ReadonlySet<string>; freeParcelIds?: readonly string[] }): FootprintError | null {
  const { floor, tiles, parcelId, blocked, blockedKeys, freeParcelIds } = opts;
  if (tiles.length === 0) return 'empty';
  const proposed = new Set<string>();
  for (const tile of tiles) {
    const key = tileKey(tile.x, tile.y);
    if (!Number.isSafeInteger(tile.x) || !Number.isSafeInteger(tile.y) || floor.has(key) || proposed.has(key)) return 'duplicate';
    proposed.add(key);
  }
  // D7b: ô và hàng tường quanh nó (ô chéo kề) phải nằm trong hợp của lô gốc và các lô trống được phép lấn.
  const allowed = [parcelId, ...(freeParcelIds ?? [])].map(pid => PARCEL_MAP[pid]).filter(Boolean);
  const inAllowed = (x: number, y: number) => allowed.some(parcel => inRect(parcel.rect, x, y));
  for (const tile of tiles) {
    if (!inAllowed(tile.x, tile.y) || !inAllowed(tile.x - 1, tile.y - 1) || !inAllowed(tile.x + 1, tile.y + 1)) return 'outside_parcel';
  }
  for (const tile of tiles) if (blocked.some(rect => inRect(rect, tile.x, tile.y)) || blockedKeys?.has(tileKey(tile.x, tile.y))) return 'blocked_by_building';
  const reached = new Set<string>();
  const queue: Tile[] = [];
  for (const tile of tiles) {
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => floor.has(tileKey(tile.x + dx, tile.y + dy)))) {
      reached.add(tileKey(tile.x, tile.y));
      queue.push(tile);
    }
  }
  if (queue.length === 0) return 'not_adjacent';
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = tileKey(current.x + dx, current.y + dy);
      if (proposed.has(key) && !reached.has(key)) {
        reached.add(key);
        queue.push({ x: current.x + dx, y: current.y + dy });
      }
    }
  }
  return reached.size === proposed.size ? null : 'disconnected';
}
