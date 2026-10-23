import { RECLAMATION_WAVES, WAREHOUSE_BOUNDS } from '@game/data';
import type { GameTileMap } from '@game/shared';

export type TileTarget =
  | { kind: 'parcel'; id: string }
  | { kind: 'building'; id: string }
  | null;

export interface TileTargetContext {
  tileMap: GameTileMap;
  openedWaves?: readonly string[];
  ownedParcelIds?: readonly string[];
}

/**
 * Hàm thuần xác định đối tượng tại ô bản đồ (tx, ty):
 * 1. Ô thuộc lô đợt đã mở mà chưa mua -> trả { kind: 'parcel', id: parcelId } (chuẩn logic Pixi)
 * 2. Ô thuộc tòa nhà (hoặc kho gắn liền tiệm chính) -> trả { kind: 'building', id: buildingId }
 * 3. Chỗ trống (đường, vỉa hè tự do, cây xanh ngoài lô...) -> trả null
 */
export function resolveTileTarget(
  tx: number,
  ty: number,
  context: TileTargetContext,
): TileTarget {
  // 1. Kiểm tra lô đất đợt đã mở mà chưa mua (chuẩn logic Pixi trong viewport-input.ts)
  const opened = context.openedWaves ?? [];
  const owned = context.ownedParcelIds ?? [];
  for (const wave of RECLAMATION_WAVES) {
    if (!opened.includes(wave.id)) continue;
    for (const raw of wave.parcels) {
      if (owned.includes(raw.id)) continue;
      const r = raw.rect;
      if (tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1) {
        return { kind: 'parcel', id: raw.id };
      }
    }
  }

  // 2. Kiểm tra tòa nhà (tiệm chính, quán ăn, quán nước, xôi, v.v.)
  const buildings = context.tileMap.buildings ?? [];
  for (const b of buildings) {
    const bounds = b.bounds;
    if (!bounds) continue;
    const top = b.top ?? bounds.top;
    if (tx >= bounds.left && tx <= bounds.right && ty >= top && ty <= bounds.bottom) {
      return { kind: 'building', id: b.id };
    }
    if (b.floorTiles?.some((tile) => tile.x === tx && tile.y === ty)) {
      return { kind: 'building', id: b.id };
    }
  }

  // Nhà kho gắn liền phía sau tiệm chính
  if (
    tx >= WAREHOUSE_BOUNDS.left &&
    tx <= WAREHOUSE_BOUNDS.right &&
    ty >= WAREHOUSE_BOUNDS.top &&
    ty <= WAREHOUSE_BOUNDS.bottom
  ) {
    return { kind: 'building', id: 'main' };
  }

  return null;
}

/** Chọn kết quả click: trúng mesh tòa (có buildingId) thì ưu tiên tòa đó, không thì dùng đối tượng ở ô mặt đất (lô đất, v.v.). */
export function pickTarget(pickedBuildingId: string | null | undefined, groundTarget: TileTarget): TileTarget {
  if (pickedBuildingId) return { kind: 'building', id: pickedBuildingId };
  return groundTarget;
}
