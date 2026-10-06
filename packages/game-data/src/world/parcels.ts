/**
 * Lớp 2 của mô hình thế giới mở: lô đất. Lô là chữ nhật ô khai báo sẵn (không phải lưới đều) vì bốn tòa hiện có rộng khác
 * nhau và dùng chung tường (chủ dự án đồng ý 05/10/2026). Rect tính cả tường; tường chung x=6, 21, 26 thuộc cả hai lô.
 */
import type { WorldRect } from './world-grid';

export interface LandParcel {
  id: string;
  rect: WorldRect;
  /** Đợt khai hoang chứa lô (0 = bản đồ ban đầu). */
  wave: number;
  /** Đường mà mặt tiền lô quay ra. */
  frontageRoadId: string;
}

export const LAND_PARCELS: readonly LandParcel[] = [
  { id: 'lot-west', rect: { x0: 0, x1: 6, y0: -3, y1: 10 }, wave: 0, frontageRoadId: 'main' },
  { id: 'lot-center', rect: { x0: 6, x1: 21, y0: -3, y1: 10 }, wave: 0, frontageRoadId: 'main' },
  { id: 'lot-east-1', rect: { x0: 21, x1: 26, y0: -3, y1: 10 }, wave: 0, frontageRoadId: 'main' },
  { id: 'lot-east-2', rect: { x0: 26, x1: 35, y0: -3, y1: 10 }, wave: 0, frontageRoadId: 'main' },
];

export const PARCEL_MAP: Readonly<Record<string, LandParcel>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, LandParcel>, Object.fromEntries(LAND_PARCELS.map(parcel => [parcel.id, parcel]))),
);

/**
 * D7b: Tìm các lô kề nhau (chạm cạnh, không chỉ góc) với `parcelId`. Dùng để cho phép mở rộng sang lô trống.
 */
export function adjacentParcels(parcelId: string): string[] {
  const parcel = PARCEL_MAP[parcelId];
  if (!parcel) return [];
  return LAND_PARCELS
    .filter(p => p.id !== parcelId && rectsShareEdge(parcel.rect, p.rect))
    .map(p => p.id);
}

/** Hai lô có chia sẻ một cạnh (không chỉ góc). */
const rectsShareEdge = (a: WorldRect, b: WorldRect): boolean => {
  // Chạm cạnh trái-phải: a.x1 === b.x0 - 1 hoặc b.x1 === a.x0 - 1, và chồng lên nhau theo y
  const overlapsY = a.y0 <= b.y1 && a.y1 >= b.y0;
  const touchesX = a.x1 === b.x0 || b.x1 === a.x0;
  return touchesX && overlapsY;
};
