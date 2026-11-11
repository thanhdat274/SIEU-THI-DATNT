import type { Category } from './products';
import type { RegionName } from './regionSpecialty';

/**
 * Hệ 5 — Chuyến đi tỉnh lấy hàng (SPEC-CHIEU-RONG §5). KHUNG DỮ LIỆU THUẦN, test được.
 *
 * Thay vì chờ mối lái giao đặc sản sáng mai với giá chuẩn, chủ tiệm tự chạy xe về tận nguồn:
 * rẻ hơn hẳn, mặc cả được, nhưng mất nửa ngày vắng tiệm và có chuyện dọc đường (§5.1).
 *
 * L1: kiểu `RouteDef`/`HaulerDef` + 2 tuyến đầu (Chợ huyện, Miệt vườn miền Nam) + hàm thuần
 *     tính giờ / giá / sức chở. Chưa có state/action (L2+), nên KHÔNG đổi golden (§5.11 "Golden
 *     không đổi" cho L1). Các con số cân bằng là đề xuất, phải qua simEconomy trước khi chốt.
 */
export type HaulerId = 'bus' | 'moto' | 'ba_gac' | 'xe_tai';

/** Phương tiện chở hàng — TÁCH riêng khỏi xe đi lại cá nhân (`biz.vehicle`, §5.4). */
export interface HaulerDef {
  id: HaulerId;
  name: string;
  icon: string;
  /** Cấp mở (đều > 30 → không đụng golden cấp 30; R1). */
  unlock: number;
  /** Giá mua (0 = có sẵn, không cần mua). */
  price: number;
  /** Sức chở — số thùng (đơn vị `casesFor`). */
  cases: number;
  /** Nhân thời gian khứ hồi so với xe máy (1,0 = chuẩn). */
  timeMul: number;
  /** Chi phí mỗi giờ khứ hồi (xăng — VNĐ) cho xe; xe khách dùng vé cố định `tripCostFlat`. */
  fuelPerHour: number;
  /** Vé cố định một chuyến (chỉ xe khách), thay cho fuelPerHour. */
  tripCostFlat?: number;
}

export const HAULERS: HaulerDef[] = [
  { id: 'bus', name: 'Đi xe khách', icon: '🚌', unlock: 42, price: 0, cases: 4, timeMul: 1.3, fuelPerHour: 0, tripCostFlat: 60000 },
  { id: 'moto', name: 'Xe máy', icon: '🛵', unlock: 42, price: 0, cases: 8, timeMul: 1.0, fuelPerHour: 15000 },
  { id: 'ba_gac', name: 'Xe ba gác', icon: '🛺', unlock: 44, price: 18_000_000, cases: 30, timeMul: 1.15, fuelPerHour: 30000 },
  { id: 'xe_tai', name: 'Xe tải nhỏ', icon: '🚚', unlock: 55, price: 65_000_000, cases: 80, timeMul: 1.0, fuelPerHour: 55000 },
];

/** Thùng đá giữ lạnh (phụ kiện) — hàng tươi/thịt cá không mất hạn dùng trên đường. */
export const COOL_BOX = { id: 'thung_da', name: 'Thùng đá giữ lạnh', icon: '🧊', unlock: 46, price: 4_000_000 };

export const haulerById = (id: HaulerId): HaulerDef | undefined => HAULERS.find((h) => h.id === id);

/** Một món hàng bán tại nguồn của một tuyến. */
export interface RouteGood {
  productId: string;
  /** Mức rẻ hơn giá nhập chuẩn (0,30 = rẻ 30%). */
  discount: number;
  /** Trần mỗi tuần game (cổng chống farm, R7). */
  weeklyCap: number;
}

/** Một ngành hàng (tươi, thịt cá…) bán rẻ theo tuyến — cho những tuyến bán theo ngành. */
export interface RouteCategoryDeal {
  category: Category;
  discount: number;
  weeklyCap: number;
}

export interface RouteDef {
  id: string;
  name: string;
  icon: string;
  /** Cấp mở (đều > 30 → không đụng golden; R1). */
  unlock: number;
  /** Miền đặc sản nơi tới — nối REGION_PRODUCTS (tuyến có hàng đặc sản). */
  region?: RegionName;
  /** Giờ game khứ hồi VỚI XE MÁY (1,0×). */
  hours: number;
  /** Hàng bán tại nguồn và mức rẻ hơn giá nhập chuẩn. */
  goods: RouteGood[];
  /** Nhóm hàng thường (tươi, thịt cá…) bán rẻ theo ngành. */
  categoryDeals?: RouteCategoryDeal[];
  /** Id các chuyện dọc đường có thể gặp (nhịp 1 & 4, làm ở L5). */
  events: string[];
}

/** Toàn bộ tuyến. L1 chỉ có Chợ huyện + Miệt vườn; các tuyến khác (L7) thêm sau. */
export const ROUTES: RouteDef[] = [
  // Chợ huyện — 42, 3h, bán theo ngành rẻ 20–25% so với Đại lý (§5.5): hàng tươi, thịt cá, rau.
  // L3: thêm các mặt hàng cụ thể (người chợ bán thật) để chọn mua ở nhịp 2; categoryDeals giữ để
  // nhóm hàng khác cùng ngành cũng được chiết khấu nếu nằm trong giỏ.
  {
    id: 'cho_huyen',
    name: 'Chợ huyện',
    icon: '🛒',
    unlock: 42,
    hours: 3,
    goods: [
      { productId: 'rau', discount: 0.25, weeklyCap: 120 },
      { productId: 'thit_heo_tuoi', discount: 0.20, weeklyCap: 40 },
      { productId: 'ca_loc_tuoi', discount: 0.20, weeklyCap: 40 },
      { productId: 'ga_ta_tuoi', discount: 0.22, weeklyCap: 30 },
    ],
    categoryDeals: [
      { category: 'fresh', discount: 0.25, weeklyCap: 80 },
      { category: 'meat', discount: 0.20, weeklyCap: 60 },
    ],
    events: [],
  },
  // Miệt vườn miền Nam — 44, 5h, 5 đặc sản Nam rẻ 30% so với mối lái `dacsan` (§5.5).
  {
    id: 'miet_vuon',
    name: 'Miệt vườn miền Nam',
    icon: '🌴',
    unlock: 44,
    region: 'Nam',
    hours: 5,
    goods: [
      { productId: 'rg_kho_tom', discount: 0.30, weeklyCap: 12 },
      { productId: 'rg_lap_xuong', discount: 0.30, weeklyCap: 12 },
      { productId: 'rg_banh_pia', discount: 0.30, weeklyCap: 12 },
      { productId: 'rg_banh_phong', discount: 0.30, weeklyCap: 12 },
      { productId: 'rg_hat_dieu', discount: 0.30, weeklyCap: 12 },
    ],
    events: [],
  },
];

export const routeById = (id: string): RouteDef | undefined => ROUTES.find((r) => r.id === id);

// ─────────────────── Hàm thuần tính giờ / giá / sức chở ───────────────────

/** Một món hàng bán tại nguồn của tuyến (nếu tuyến đó có). */
export const routeGood = (route: RouteDef, productId: string): RouteGood | undefined =>
  route.goods.find((g) => g.productId === productId);

/** Một ngành hàng bán tại nguồn của tuyến (theo categoryDeals). */
export const routeCategoryDeal = (route: RouteDef, category: Category): RouteCategoryDeal | undefined =>
  route.categoryDeals?.find((c) => c.category === category);

/** Mức rẻ hơn (0..1) cho một món hàng ở tuyến — ưu tiên khoản `goods` rồi tới ngành của nó. */
export function routeDiscountFor(route: RouteDef, productId: string, category: Category): number {
  const g = routeGood(route, productId);
  if (g) return g.discount;
  return routeCategoryDeal(route, category)?.discount ?? 0;
}

/** Giá nhập sau khi rẻ hơn trên một tuyến, từ giá nhập chuẩn (VNĐ). */
export const routeBuyPrice = (standardBuy: number, discount: number): number =>
  Math.max(0, Math.round(standardBuy * (1 - discount)));

/** Thời gian khứ hồi phút game của một tuyến với một xe (hours × 60 × timeMul). */
export function roundTripMinutes(route: RouteDef, hauler: HaulerDef): number {
  return Math.round(route.hours * 60 * hauler.timeMul);
}

/** Chi phí đi lại (xăng/vé) một chuyến khứ hồi, theo số phút game thực đi. */
export function tripTravelCost(hauler: HaulerDef, minutes: number): number {
  if (hauler.tripCostFlat != null) return hauler.tripCostFlat;
  return Math.round((minutes / 60) * hauler.fuelPerHour);
}

/** Sức chở tối đa một chuyến (thùng) — tương đương số thùng `casesFor` có thể chở. */
export const tripCapacity = (hauler: HaulerDef): number => hauler.cases;

/** Tuyến có mở cho cấp `level` không. */
export const routeUnlocked = (r: RouteDef, level: number): boolean => r.unlock <= level;

/** Xe chở hàng có mở cho cấp `level` không (xe khách/xe máy có sẵn ô 42). */
export const haulerUnlocked = (h: HaulerDef, level: number): boolean => h.unlock <= level;
