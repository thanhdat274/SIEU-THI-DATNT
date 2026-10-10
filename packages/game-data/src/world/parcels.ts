/**
 * Lớp 2 của mô hình thế giới mở: lô đất. Lô là chữ nhật ô khai báo sẵn (không phải lưới đều) vì bốn tòa hiện có rộng khác
 * nhau và dùng chung tường (chủ dự án đồng ý 05/10/2026). Rect tính cả tường; tường chung x=6, 21, 26 thuộc cả hai lô.
 */
import { rectHeight, rectWidth, type WorldRect } from './world-grid';

export interface LandParcel {
  id: string;
  rect: WorldRect;
  /** Đợt khai hoang chứa lô (0 = bản đồ ban đầu). */
  wave: number;
  /** Đường mà mặt tiền lô quay ra. */
  frontageRoadId: string;
  /** Vị trí mặt tiền: `corner: true` = lô góc ngã tư. Mặc định (thiếu) = mặt đường thường. */
  frontage?: { corner: boolean };
}

// ==========================================
// Giá trị vị trí (open-world-land-reclamation D5, provisional — chốt sau mô phỏng/playtest)
// ==========================================

/** Phân loại đường cho hệ số vị trí: đường chính (`main`) so với đường phụ (`south`...). */
export type RoadCategory = 'main' | 'side';

/** Ánh xạ `frontageRoadId` → loại đường; mặc định là đường phụ. */
export const ROAD_CATEGORY: Readonly<Record<string, RoadCategory>> = {
  main: 'main',
  south: 'side',
};

/** Hệ số GIÁ đất theo (loại đường, góc/mặt): D5. */
export const FRONTAGE_VALUE: Readonly<Record<`${RoadCategory}-${'corner' | 'face'}`, number>> = {
  'main-corner': 1.6,
  'main-face': 1.0,
  'side-corner': 1.0,
  'side-face': 0.6,
};

/** Hệ số KHÁCH theo (loại đường, góc/mặt): D5 (nhịp sinh khách tòa nhân hệ số này). */
export const FRONTAGE_TRAFFIC: Readonly<Record<`${RoadCategory}-${'corner' | 'face'}`, number>> = {
  'main-corner': 1.25,
  'main-face': 1.0,
  'side-corner': 0.9,
  'side-face': 0.75,
};

/** Giá gốc mỗi ô đất đợt mới (đồng/ô) — D4, provisional. */
export const PARCEL_BASE_PRICE = 12_000;

/** Ngân sách ô mở rộng cộng thêm mỗi ô theo đợt đã mở — D6, provisional (mốc theo cấp + thưởng này). */
export const WAVE_EXPANSION_BONUS: Readonly<Record<string, number>> = {
  w0: 0,
  w1: 24,
  w2: 24,
  w3: 24,
  w4: 24,
};

export const roadCategoryOf = (parcel: LandParcel): RoadCategory => ROAD_CATEGORY[parcel.frontageRoadId] ?? 'side';

export const frontagePosition = (parcel: LandParcel): 'corner' | 'face' => (parcel.frontage?.corner ? 'corner' : 'face');

/** Hệ số GIÁ đất của lô (D5). Bản đồ ban đầu (W0, mặt đường chính) ra 1, nên golden trước không đổi. */
export function parcelLandValueMultiplier(parcel: LandParcel): number {
  return FRONTAGE_VALUE[`${roadCategoryOf(parcel)}-${frontagePosition(parcel)}`];
}

/** Hệ số KHÁCH của lô (D5). Bản đồ ban đầu ra 1. */
export function parcelTrafficMultiplier(parcel: LandParcel): number {
  return FRONTAGE_TRAFFIC[`${roadCategoryOf(parcel)}-${frontagePosition(parcel)}`];
}

/** Giá mua lô đợt mới: `PARCEL_BASE_PRICE × số ô × hệ số giá` (D4). Lô W0 coi như đã sở hữu, không dùng hàm này. */
export function parcelPrice(parcel: LandParcel): number {
  return Math.round(PARCEL_BASE_PRICE * rectWidth(parcel.rect) * rectHeight(parcel.rect) * parcelLandValueMultiplier(parcel));
}

export const LAND_PARCELS: readonly LandParcel[] = [
  { id: 'lot-west', rect: { x0: 0, x1: 6, y0: -3, y1: 10 }, wave: 0, frontageRoadId: 'main', frontage: { corner: false } },
  { id: 'lot-center', rect: { x0: 6, x1: 21, y0: -3, y1: 10 }, wave: 0, frontageRoadId: 'main', frontage: { corner: false } },
  { id: 'lot-east-1', rect: { x0: 21, x1: 26, y0: -3, y1: 10 }, wave: 0, frontageRoadId: 'main', frontage: { corner: false } },
  { id: 'lot-east-2', rect: { x0: 26, x1: 35, y0: -3, y1: 10 }, wave: 0, frontageRoadId: 'main', frontage: { corner: false } },
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
