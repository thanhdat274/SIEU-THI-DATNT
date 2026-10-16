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
 * - `buildCost`: giá xây cho civic (lấy từ CIVIC_DEFS).
 * - `hasCheckout`: loại có quầy thu ngân (parking_lot = false).
 * - `effects?`: hiệu ứng đặc biệt (bãi xe, khung giờ cao điểm) — PROVISIONAL.
 * - `tiers?`: hạng cửa hàng theo diện tích sàn (D9) — chỉ loại bán lẻ.
 *
 * Civic data (service, qolPoints, radiusTiles, buildCost, upkeepPerDay)
 * là nguồn DUY NHẤT ở `civic.ts`. BuildingTypeDef chỉ giữ geometry + unlockLevel.
 */
import type { StoreFixture } from '@game/shared';
import { nullProto } from '../safe-map';
import { PRODUCT_MAP } from '../products';
import { DRINK_SHOP_PRODUCT_IDS } from '../store-types';
import { SNACK_SHOP_PRODUCT_IDS } from '../recipes';
import {
  BUILDING_TEMPLATES, type BuildingId, type BuildingTemplate,
} from './building-templates';
import { CIVIC_DEFS, type CivicServiceId } from './civic';

/** Loại hình tòa nhà (đích tới của khái niệm `BuildingId` sau refactor 1.2). */
export type BuildingTypeId =
  | 'grocery_main'
  | 'xoi_shop'
  | 'drink_shop'
  | 'snack_shop'
  | 'grocery_branch'
  | 'cafe'
  | 'parking_lot'
  | 'com_restaurant'
  | 'park'
  | 'clinic'
  | 'ward_police'
  | 'primary_school';

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
  /** Cấp mở khóa loại này — nguồn DUY NHẤT cho unlock level (civic + non-civic). */
  unlockLevel: number;
  /** Giá mở tòa của loại này (₫). Civic: bằng buildCost. */
  openCost: number;
  /** Số tòa tối đa của loại này (loại cũ = 1; loại mới theo D4). Civic = 2 (chống spam có nghĩa). */
  maxInstances: number;
  /** Loại có quầy thu ngân không (bãi giữ xe không có). */
  hasCheckout: boolean;
  /** Giá xây công trình (₫) — civic: lấy từ CIVIC_DEFS. */
  buildCost?: number;
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
const fx = (id: string, type: StoreFixture['type'], tileX: number, tileY: number, widthTiles: number, label: string, shopId?: string, slotCount?: number, maxCapacity = 0): StoreFixture =>
  ({ id, type, tileX, tileY, widthTiles, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity, label, ...(shopId ? { shopId } : {}), ...(slotCount ? { slotCount } : {}) } as StoreFixture);
const shelfFx = (id: string, x: number, y: number, label: string) => fx(id, 'shelf_wooden', x, y, 2, label, 'shelf', 12, 20);
const cashierFx = (x: number, y: number, label: string) => fx('cashier_counter', 'cashier_counter', x, y, 2, label);

/** Nội thất mặc định (PROVISIONAL, tọa độ tương đối; id được tiền tố theo instance khi đặt tòa). Cửa ở hàng cuối, chừa cột giữa làm lối đi. */
const GROCERY_BRANCH_FIXTURES: StoreFixture[] = [
  shelfFx('shelf_1', 1, 1, 'Kệ 1'), shelfFx('shelf_2', 3, 1, 'Kệ 2'), shelfFx('shelf_3', 5, 1, 'Kệ 3'),
  shelfFx('shelf_4', 1, 3, 'Kệ 4'), shelfFx('shelf_5', 5, 3, 'Kệ 5'),
  cashierFx(1, 5, 'Quầy thu ngân chi nhánh'),
  fx('fridge_1', 'refrigerator', 5, 5, 2, 'Tủ mát', 'fridge', 24, 20),
];
const CAFE_FIXTURES: StoreFixture[] = [
  fx('counter', 'kitchen_station', 1, 1, 2, 'Quầy pha', 'drink_counter', 1),
  fx('blender', 'kitchen_station', 3, 1, 1, 'Máy xay', 'blender', 1),
  fx('kettle', 'kitchen_station', 4, 1, 1, 'Ấm nước nóng', 'hot_kettle', 1),
  shelfFx('shelf', 5, 1, 'Kệ bánh, đồ uống'),
  fx('table_1', 'dining_table', 1, 3, 1, 'Bàn 2 chỗ', 'food_table_2', 1), fx('table_2', 'dining_table', 6, 3, 1, 'Bàn 2 chỗ', 'food_table_2', 1),
  fx('table_3', 'dining_table', 1, 4, 1, 'Bàn 2 chỗ', 'food_table_2', 1), fx('table_4', 'dining_table', 6, 4, 1, 'Bàn 2 chỗ', 'food_table_2', 1),
  cashierFx(5, 5, 'Quầy thu ngân quán cà phê'),
];
const COM_RESTAURANT_FIXTURES: StoreFixture[] = [
  fx('grill', 'kitchen_station', 1, 1, 2, 'Bếp nướng', 'food_grill', 1),
  fx('kettle', 'kitchen_station', 3, 1, 1, 'Nồi canh', 'hot_kettle', 1),
  fx('display', 'shelf_glass', 5, 1, 2, 'Tủ trưng bày món', 'bread_case', 12, 18),
  fx('table_1', 'dining_table', 1, 3, 2, 'Bàn 4 chỗ', 'food_table_4', 1), fx('table_2', 'dining_table', 4, 3, 2, 'Bàn 4 chỗ', 'food_table_4', 1),
  fx('table_3', 'dining_table', 7, 3, 2, 'Bàn 4 chỗ', 'food_table_4', 1),
  cashierFx(7, 5, 'Quầy thu ngân nhà hàng'),
];

const provisionalTemplate = (
  id: string, name: string, width: number, height: number, defaultFixtures: StoreFixture[] = [],
): BuildingTemplate => ({
  // id phải thuộc union `BuildingId` cố định; các loại mới chưa có id thật trong union đó
  // (refactor 1.2 mới cho string) nên tạm cast. Đây là dữ liệu PROVISIONAL.
  id: id as unknown as BuildingId, name, width, height,
  doorTiles: [{ x: Math.floor(width / 2) - 1, y: height - 1 }, { x: Math.floor(width / 2), y: height - 1 }],
  entranceTile: { x: Math.floor(width / 2) - 1, y: height },
  awning: { startTiles: Math.max(1, Math.floor(width / 4)), widthTiles: Math.max(2, Math.floor(width / 2)) },
  eaveOffsetPx: 10,
  defaultFixtures,
});

const GROCERY_BRANCH_TEMPLATE = provisionalTemplate('grocery_branch', 'Chi nhánh tạp hóa', 8, 8, GROCERY_BRANCH_FIXTURES);
const CAFE_TEMPLATE = provisionalTemplate('cafe', 'Quán cà phê', 8, 8, CAFE_FIXTURES);
const PARKING_LOT_TEMPLATE = provisionalTemplate('parking_lot', 'Bãi giữ xe', 6, 6);
const COM_RESTAURANT_TEMPLATE = provisionalTemplate('com_restaurant', 'Quán cơm / nhà hàng', 10, 8, COM_RESTAURANT_FIXTURES);

// --- Template công trình công cộng (civic-buildings-qol, D1) ---
// Kích thước: park 6×6, clinic 6×8, ward_police 6×8, primary_school 8×8 — đều vừa lô W0 nhỏ nhất.
const PARK_TEMPLATE = provisionalTemplate('park', 'Công viên', 6, 6);
const CLINIC_TEMPLATE = provisionalTemplate('clinic', 'Trạm y tế', 6, 8);
const WARD_POLICE_TEMPLATE = provisionalTemplate('ward_police', 'Đồn công an phường', 6, 8);
const PRIMARY_SCHOOL_TEMPLATE = provisionalTemplate('primary_school', 'Trường tiểu học', 8, 8);

// --- Helper: lookup buildCost/unlockLevel from CIVIC_DEFS for civic types ---
const CIVIC_MAP = Object.fromEntries(CIVIC_DEFS.map(c => [c.buildingTypeId, c])) as Record<string, (typeof CIVIC_DEFS)[number]>;

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
    defaultFixtures: BUILDING_TEMPLATES.xoi.defaultFixtures,
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
    defaultFixtures: BUILDING_TEMPLATES.drink.defaultFixtures,
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
    defaultFixtures: BUILDING_TEMPLATES.snack.defaultFixtures,
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
    allowedStationIds: ['drink_counter', 'blender', 'hot_kettle'],
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

  // --- 4 loại công trình công cộng (civic-buildings-qol, D1 + D2) ---
  // Nguồn dữ liệu: unlockLevel nằm ở đây; service/qolPoints/radius/buildCost/upkeep lấy từ CIVIC_DEFS.
  park: {
    id: 'park',
    typeId: 'park',
    name: 'Công viên',
    template: PARK_TEMPLATE,
    defaultFixtures: [],
    allowedStationIds: [],
    productFilter: () => false,
    trafficShare: 0,
    unlockLevel: 10,
    openCost: CIVIC_MAP.park.buildCost,
    maxInstances: 2,
    hasCheckout: false,
    buildCost: CIVIC_MAP.park.buildCost,
  },
  clinic: {
    id: 'clinic',
    typeId: 'clinic',
    name: 'Trạm y tế',
    template: CLINIC_TEMPLATE,
    defaultFixtures: [],
    allowedStationIds: [],
    productFilter: () => false,
    trafficShare: 0,
    unlockLevel: 15,
    openCost: CIVIC_MAP.clinic.buildCost,
    maxInstances: 2,
    hasCheckout: false,
    buildCost: CIVIC_MAP.clinic.buildCost,
  },
  ward_police: {
    id: 'ward_police',
    typeId: 'ward_police',
    name: 'Đồn công an phường',
    template: WARD_POLICE_TEMPLATE,
    defaultFixtures: [],
    allowedStationIds: [],
    productFilter: () => false,
    trafficShare: 0,
    unlockLevel: 20,
    openCost: CIVIC_MAP.ward_police.buildCost,
    maxInstances: 2,
    hasCheckout: false,
    buildCost: CIVIC_MAP.ward_police.buildCost,
  },
  primary_school: {
    id: 'primary_school',
    typeId: 'primary_school',
    name: 'Trường tiểu học',
    template: PRIMARY_SCHOOL_TEMPLATE,
    defaultFixtures: [],
    allowedStationIds: [],
    productFilter: () => false,
    trafficShare: 0,
    unlockLevel: 25,
    openCost: CIVIC_MAP.primary_school.buildCost,
    maxInstances: 2,
    hasCheckout: false,
    buildCost: CIVIC_MAP.primary_school.buildCost,
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
 * Tòa mở thêm (`${typeId}-${n}`) tra qua `typeId` để tìm loại tương ứng.
 */
export function buildingTypeOfInstance(id: string): BuildingTypeDef | undefined {
  // Thử khớp id instance cũ
  const exact = BUILDING_TYPES.find((def) => def.id === id);
  if (exact) return exact;
  // Tòa mở thêm: `${typeId}-${n}` → tra typeId
  const dashIdx = id.lastIndexOf('-');
  if (dashIdx > 0) {
    const candidate = id.slice(0, dashIdx);
    const numeric = id.slice(dashIdx + 1);
    if (Number.isSafeInteger(Number(numeric)) && safeBuildingType(candidate)) {
      return BUILDING_TYPE_DEFS[candidate as BuildingTypeId];
    }
  }
  return undefined;
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
