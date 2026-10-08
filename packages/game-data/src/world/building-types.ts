/**
 * Registry loại tòa (OpenSpec `open-world-building-types`, task 1.1 — PHẦN THUẦN).
 *
 * Đây là lớp DỮ LIỆU: khai báo mọi loại tòa theo thiết kế D1/D2/D4 trong
 * `openspec/changes/open-world-building-types/design.md`. Registry này CHỈ ĐỌC dữ liệu
 * có sẵn (buildings.ts / building-templates.ts / store-types.ts / land.ts / recipes.ts)
 * và KHÔNG sửa chúng; kiểu `BuildingId` (union 'main'|'xoi'|'drink'|'snack') GIỮ NGUYÊN —
 * việc refactor `BuildingId` → string (task 1.2) là việc SAU, chờ máy thật.
 *
 * Quy ước ở đây:
 * - `id`: id instance tòa (với 4 loại cũ bằng đúng `BuildingId` hiện tại).
 * - `typeId`: id loại mới; instance mới sau này dùng `${typeId}-${n}` (D2).
 * - `template` / `defaultFixtures`: mẫu hình học + bố cục mặc định (Bước 1).
 * - `allowedStationIds`: các trạm sản xuất (stationShopId) được phép đặt trong loại này;
 *   rỗng = không giới hạn trạm.
 * - `productFilter`: hàm quyết định sản phẩm nào được bày/bán ở loại này (D1.3).
 * - `trafficShare`: nhịp sinh khách so với trần (1 = tiệm chính); các loại mới là PROVISIONAL.
 * - `unlockLevel` / `openCost` / `maxInstances`: cấp mở, giá mở, số tòa tối đa.
 *   Loại cũ lấy từ `LAND_PLOTS` (level/cost); loại mới theo D4.
 * - `hasCheckout`: loại có quầy thu ngân (parking_lot = false).
 * - `effects?`: hiệu ứng đặc biệt (bãi xe, khung giờ cao điểm) — PROVISIONAL.
 * - `tiers?`: hạng cửa hàng theo diện tích sàn (D9) — chỉ loại bán lẻ.
 */
import type { StoreFixture } from '@game/shared';
import { nullProto } from '../safe-map';
import { PRODUCT_MAP } from '../products';
import { DRINK_SHOP_PRODUCT_IDS } from '../store-types';
import { SNACK_SHOP_PRODUCT_IDS } from '../recipes';
import {
  BUILDING_TEMPLATES, type BuildingId, type BuildingTemplate,
} from './building-templates';
import {
  DRINK_DEFAULT_FIXTURES, SNACK_DEFAULT_FIXTURES, XOI_DEFAULT_FIXTURES,
} from '../buildings';

/** Loại hình tòa nhà (đích tới của khái niệm `BuildingId` sau refactor 1.2). */
export type BuildingTypeId =
  | 'grocery_main'
  | 'xoi_shop'
  | 'drink_shop'
  | 'snack_shop'
  | 'grocery_branch'
  | 'cafe'
  | 'parking_lot'
  | 'com_restaurant';

/**
 * Hàm lọc sản phẩm của một loại tòa: trả true nếu `productId` được bày/bán ở loại này.
 * (D1.3: kệ trong loại chỉ tự nhận các món thỏa `productFilter`.
 */
export type BuildingProductFilter = (productId: string) => boolean;

/** Khung giờ cao điểm của một loại tòa (giờ game; `fromHour` bao gồm, `toHour` không bao gồm). */
export interface PeakHours { fromHour: number; toHour: number }

/** Hiệu ứng đặc biệt của một loại tòa — PROVISIONAL, chỉ dữ liệu mô tả chưa nối mô phỏng. */
export interface BuildingTypeEffects {
  /** Bãi giữ xe: bán kính (ô) mà tòa trong đó được tăng khách đi xe. */
  carRadiusTiles?: number;
  /** Bãi giữ xe: phần trăm khách đi xe cộng thêm cho tòa trong bán kính. */
  carCustomerBonus?: number;
  /** Khung giờ khách đông của loại (vd cafe 6–10 h, cơm 11–13 h & 17–20 h). */
  peakHours?: readonly PeakHours[];
}

/** Một hạng cửa hàng theo diện tích sàn (D9). */
export interface BuildingTier {
  id: string;
  /** Tên hiển thị hạng. */
  name: string;
  /** Số ô sàn footprint tối thiểu để đạt hạng này. */
  minFloorTiles: number;
  /** Hệ số nhân nhịp sinh khách của tòa ở hạng này. */
  trafficMultiplier: number;
}

/** Định nghĩa một loại tòa trong registry dữ liệu (D1). */
export interface BuildingTypeDef {
  /** Id instance của loại (4 loại cũ trùng `BuildingId` hiện tại). */
  id: string;
  /** Id loại mới (dùng cho `buildingPlacements[].typeId` sau refactor 1.2/D8). */
  typeId: BuildingTypeId;
  name: string;
  /** Mẫu hình học tòa (Bước 1). Các loại mới dùng mẫu PROVISIONAL. */
  template: BuildingTemplate;
  /** Bố cục nội thất mặc định khi mua tòa (tọa độ tương đối). */
  defaultFixtures: readonly StoreFixture[];
  /** Các trạm sản xuất được phép; rỗng = không giới hạn trạm. */
  allowedStationIds: readonly string[];
  /** Lọc sản phẩm bày/bán ở loại này. */
  productFilter: BuildingProductFilter;
  /** Nhịp sinh khách so với trần (1 = tiệm chính); loại mới PROVISIONAL. */
  trafficShare: number;
  /** Cấp mở khóa loại này. */
  unlockLevel: number;
  /** Giá mở tòa của loại này (₫). */
  openCost: number;
  /** Số tòa tối đa của loại này (loại cũ = 1; loại mới theo D4). */
  maxInstances: number;
  /** Loại có quầy thu ngân không (bãi giữ xe không có). */
  hasCheckout: boolean;
  /** Hiệu ứng đặc biệt (PROVISIONAL). */
  effects?: BuildingTypeEffects;
  /** Hạng cửa hàng theo diện tích sàn (D9), chỉ loại bán lẻ. */
  tiers?: readonly BuildingTier[];
}

// ---------------------------------------------------------------------------
// Hàm lọc sản phẩm
// ---------------------------------------------------------------------------

/** Cho phép mọi sản phẩm (tiệm chính / chi nhánh tạp hóa). */
const allProductsFilter: BuildingProductFilter = () => true;
/** Chỉ cho phép các sản phẩm nằm trong một tập id. */
const inSetFilter = (set: ReadonlySet<string>): BuildingProductFilter => (productId) => set.has(productId);

/**
 * "Cùng danh mục tiệm chính trừ đồ lạnh lớn" (D4 grocery_branch): cho phép mọi sản phẩm
 * ngoại trừ loại đồ đông lạnh (`frozen`, "đồ lạnh lớn"). PROVISIONAL.
 */
const mainExceptColdFilter: BuildingProductFilter = (productId) => {
  const product = PRODUCT_MAP[productId];
  return !product || product.category !== 'frozen';
};

// ---------------------------------------------------------------------------
// Mẫu tòa PROVISIONAL cho 4 loại mới (D4). Chưa chốt ảnh/hình học thật — chỉ đủ dữ liệu
// để registry hoàn chỉnh; renderer/placement thật nối sau (2.2, chờ máy thật).
// ---------------------------------------------------------------------------
const provisionalTemplate = (
  id: string, name: string, width: number, height: number,
): BuildingTemplate => ({
  // id phải thuộc union `BuildingId` cố định; các loại mới chưa có id thật trong union đó
  // (refactor 1.2 mới cho string) nên tạm cast. Đây là dữ liệu PROVISIONAL.
  id: id as unknown as BuildingId, name, width, height,
  doorTiles: [{ x: Math.floor(width / 2) - 1, y: height - 1 }, { x: Math.floor(width / 2), y: height - 1 }],
  entranceTile: { x: Math.floor(width / 2) - 1, y: height },
  awning: { startTiles: Math.max(1, Math.floor(width / 4)), widthTiles: Math.max(2, Math.floor(width / 2)) },
  eaveOffsetPx: 10,
  defaultFixtures: [],
});

const GROCERY_BRANCH_TEMPLATE = provisionalTemplate('grocery_branch', 'Chi nhánh tạp hóa', 8, 8);
const CAFE_TEMPLATE = provisionalTemplate('cafe', 'Quán cà phê', 8, 8);
const PARKING_LOT_TEMPLATE = provisionalTemplate('parking_lot', 'Bãi giữ xe', 6, 6);
const COM_RESTAURANT_TEMPLATE = provisionalTemplate('com_restaurant', 'Quán cơm / nhà hàng', 10, 8);

// ---------------------------------------------------------------------------
// Registry loại tòa
// ---------------------------------------------------------------------------
export const BUILDING_TYPE_DEFS: Record<BuildingTypeId, BuildingTypeDef> = {
  // --- 4 loại cũ (khai báo lại, giữ id hiện tại; cấp/giá theo LAND_PLOTS) ---
  grocery_main: {
    id: 'main',
    typeId: 'grocery_main',
    name: BUILDING_TEMPLATES.main.name,
    template: BUILDING_TEMPLATES.main,
    defaultFixtures: [],
    allowedStationIds: [],
    productFilter: allProductsFilter,
    trafficShare: 1,
    unlockLevel: 1,
    openCost: 0,
    maxInstances: 1,
    hasCheckout: true,
    tiers: [
      { id: 'hold', name: 'Tiệm tạp hóa', minFloorTiles: 0, trafficMultiplier: 1 },
      { id: 'convenience', name: 'Cửa hàng tiện lợi', minFloorTiles: 60, trafficMultiplier: 1.15 },
      { id: 'mini_super', name: 'Siêu thị mini', minFloorTiles: 100, trafficMultiplier: 1.3 },
      { id: 'super', name: 'Siêu thị', minFloorTiles: 160, trafficMultiplier: 1.5 },
      { id: 'hyper', name: 'Đại siêu thị', minFloorTiles: 240, trafficMultiplier: 1.7 },
    ],
  },
  xoi_shop: {
    id: 'xoi',
    typeId: 'xoi_shop',
    name: BUILDING_TEMPLATES.xoi.name,
    template: BUILDING_TEMPLATES.xoi,
    defaultFixtures: XOI_DEFAULT_FIXTURES,
    allowedStationIds: ['thung_ngam', 'xung_hap', 'quay_xoi'],
    productFilter: allProductsFilter,
    trafficShare: 0.02,
    unlockLevel: 36,
    openCost: 700_000,
    maxInstances: 1,
    hasCheckout: true,
  },
  drink_shop: {
    id: 'drink',
    typeId: 'drink_shop',
    name: BUILDING_TEMPLATES.drink.name,
    template: BUILDING_TEMPLATES.drink,
    defaultFixtures: DRINK_DEFAULT_FIXTURES,
    allowedStationIds: ['drink_counter', 'blender', 'sugarcane_press'],
    productFilter: inSetFilter(DRINK_SHOP_PRODUCT_IDS),
    trafficShare: 0.05,
    unlockLevel: 46,
    openCost: 1_500_000,
    maxInstances: 1,
    hasCheckout: true,
  },
  snack_shop: {
    id: 'snack',
    typeId: 'snack_shop',
    name: BUILDING_TEMPLATES.snack.name,
    template: BUILDING_TEMPLATES.snack,
    defaultFixtures: SNACK_DEFAULT_FIXTURES,
    allowedStationIds: ['chao_xao', 'chao_chien'],
    productFilter: inSetFilter(SNACK_SHOP_PRODUCT_IDS),
    trafficShare: 0.03,
    unlockLevel: 26,
    openCost: 400_000,
    maxInstances: 1,
    hasCheckout: true,
  },

  // --- 4 loại mới PROVISIONAL (D4) ---
  grocery_branch: {
    id: 'grocery_branch',
    typeId: 'grocery_branch',
    name: 'Chi nhánh tạp hóa',
    template: GROCERY_BRANCH_TEMPLATE,
    defaultFixtures: [],
    allowedStationIds: [],
    productFilter: mainExceptColdFilter,
    trafficShare: 0.9,
    unlockLevel: 32,
    openCost: 1_500_000,
    maxInstances: 3,
    hasCheckout: true,
    tiers: [
      { id: 'hold', name: 'Tiệm tạp hóa', minFloorTiles: 0, trafficMultiplier: 1 },
      { id: 'convenience', name: 'Cửa hàng tiện lợi', minFloorTiles: 60, trafficMultiplier: 1.15 },
    ],
  },
  cafe: {
    id: 'cafe',
    typeId: 'cafe',
    name: 'Quán cà phê',
    template: CAFE_TEMPLATE,
    defaultFixtures: [],
    allowedStationIds: ['cafe_pha_che'],
    productFilter: allProductsFilter,
    trafficShare: 0.06,
    unlockLevel: 34,
    openCost: 1_200_000,
    maxInstances: 2,
    hasCheckout: true,
    effects: { peakHours: [{ fromHour: 6, toHour: 10 }] },
  },
  parking_lot: {
    id: 'parking_lot',
    typeId: 'parking_lot',
    name: 'Bãi giữ xe',
    template: PARKING_LOT_TEMPLATE,
    defaultFixtures: [],
    allowedStationIds: [],
    productFilter: () => false,
    trafficShare: 0,
    unlockLevel: 24,
    openCost: 600_000,
    maxInstances: 2,
    hasCheckout: false,
    // PROVISIONAL: thu phí theo xe; tòa trong bán kính 12 ô nhận +15% khách đi xe.
    effects: { carRadiusTiles: 12, carCustomerBonus: 0.15 },
  },
  com_restaurant: {
    id: 'com_restaurant',
    typeId: 'com_restaurant',
    name: 'Quán cơm / nhà hàng',
    template: COM_RESTAURANT_TEMPLATE,
    defaultFixtures: [],
    allowedStationIds: ['food_grill', 'hot_kettle'],
    productFilter: allProductsFilter,
    trafficShare: 0.07,
    unlockLevel: 40,
    openCost: 2_000_000,
    maxInstances: 2,
    hasCheckout: true,
    effects: { peakHours: [{ fromHour: 11, toHour: 13 }, { fromHour: 17, toHour: 20 }] },
  },
};

/** Mảng các loại tòa (thứ tự khai báo). */
export const BUILDING_TYPES: readonly BuildingTypeDef[] = Object.values(BUILDING_TYPE_DEFS);

/** Tra cứu loại tòa theo `typeId`; trả undefined nếu không tồn tại (an toàn). */
export function buildingTypeOf(typeId: string): BuildingTypeDef | undefined {
  return BUILDING_TYPE_DEFS[typeId as BuildingTypeId];
}

/**
 * Tra loại tòa theo id instance cũ (`main`/`xoi`/`drink`/`snack`, sau này cả `${typeId}-${n}`).
 * Đây là phép ánh xạ phụ: 4 loại cũ có `id === typeId`? Không — `id` là id instance cũ
 * ('main'...), `typeId` khác ('grocery_main'...). Hàm này giúp tìm loại từ id instance.
 */
export function buildingTypeOfInstance(id: string): BuildingTypeDef | undefined {
  return BUILDING_TYPES.find((def) => def.id === id);
}

/**
 * Mã kiểu record an toàn (không nguyên mẫu) để tra `BUILDING_TYPE_DEFS` theo `typeId`
 * khi key động — tránh trúng các key nguyên mẫu như 'constructor'/'toString'.
 */
export function safeBuildingType(typeId: string): BuildingTypeDef | undefined {
  return Object.prototype.hasOwnProperty.call(BUILDING_TYPE_DEFS, typeId) ? BUILDING_TYPE_DEFS[typeId as BuildingTypeId] : undefined;
}

// Đảm bảo mọi mục đều khớp key typeId (thất bại lúc build nếu khai báo thiếu).
const _check: Readonly<Record<BuildingTypeId, true>> = nullProto(Object.fromEntries(
  BUILDING_TYPES.map((def) => [def.typeId, true]),
)) as Readonly<Record<BuildingTypeId, true>>;
void _check;
