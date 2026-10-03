import { nullProto } from './safe-map';
import { RECIPES } from './recipes';

/**
 * Loại hình cửa hàng của chuỗi chi nhánh (OpenSpec `branch-chain`, D6). Thêm loại mới = thêm một mục dữ liệu.
 * Số liệu (giá mở, cấp, cầu, lương) là đề xuất tạm, **chưa cân bằng/playtest**.
 */
export interface StoreTypeDef {
  id: string;
  name: string;
  unlockLevel: number;
  /** Tiền mở chi nhánh (₫), trừ một lần khỏi ví chung. */
  openCost: number;
  /** Số chi nhánh tối đa của loại này. */
  maxBranches: number;
  /** Lương nhân viên chạy nền mỗi ngày (₫), chỉ trả khi còn tiền trong ví chung. */
  staffWagePerDay: number;
  /** Sức chứa kho chi nhánh (tổng đơn vị hàng). */
  stockCapacity: number;
  /** Cầu cơ bản mỗi ngày (đơn vị) theo sản phẩm; chỉ các món này được bán ở loại hình này. */
  baseDailyDemand: Readonly<Record<string, number>>;
  /** Danh tiếng khởi điểm (0..100). */
  startingReputation: number;
}

export const STORE_TYPES: readonly StoreTypeDef[] = [
  {
    id: 'drink_shop',
    name: 'Quán nước',
    unlockLevel: 32,
    openCost: 1_500_000,
    maxBranches: 3,
    staffWagePerDay: 60_000,
    stockCapacity: 400,
    baseDailyDemand: {
      nuoc_suoi: 14, nuoc_khoang: 6, nuoc_tinh_khiet: 6, nuoc_cam: 8, tra_xanh: 8,
      sua_tuoi: 5, sua_chua: 4, sua_dau_nanh: 4,
    },
    startingReputation: 20,
  },
];

export const STORE_TYPE_MAP: Record<string, StoreTypeDef> = nullProto(Object.fromEntries(STORE_TYPES.map((type) => [type.id, type])));

/**
 * Mức giá chi nhánh: nhân giá bán và cầu. Giá cao lãi mỗi món nhiều hơn nhưng bán ít hơn (hệ số **tạm, chưa playtest**).
 * Với hệ số 0,9/1,1 cầu và giá 0,9/1,1 thì doanh thu gần như bằng nhau; khác biệt nằm ở lãi gộp và hao hụt.
 */
export const BRANCH_PRICE_MODES = {
  low: { label: 'Giá mềm', priceFactor: 0.9, demandFactor: 1.15 },
  normal: { label: 'Giá chuẩn', priceFactor: 1, demandFactor: 1 },
  high: { label: 'Giá cao', priceFactor: 1.1, demandFactor: 0.85 },
} as const;

/** Quản lý chi nhánh: lương thêm mỗi ngày (₫) và hệ số cầu nền khi có quản lý (thay cho hệ số nền 0,7). **Tạm, chưa playtest.** */
export const BRANCH_MANAGER = { wagePerDay: 40_000, demandFactor: 0.95 } as const;

/** Số chi nhánh tối đa toàn chuỗi ở bản đầu (D8). */
export const MAX_CHAIN_BRANCHES = 3;

/** Trạm đồ uống (khớp `FIXTURE_SHOP`): thành phẩm của chúng là hàng của quán nước. */
const DRINK_STATION_IDS: ReadonlySet<string> = new Set(['drink_counter', 'blender', 'sugarcane_press']);

/** Món bán ở quán nước: danh mục của loại hình + thành phẩm các trạm đồ uống. Kệ quán nước chỉ tự nhận các món này. */
export const DRINK_SHOP_PRODUCT_IDS: ReadonlySet<string> = new Set([
  ...Object.keys(STORE_TYPE_MAP.drink_shop.baseDailyDemand),
  ...RECIPES.filter(recipe => DRINK_STATION_IDS.has(recipe.stationShopId)).map(recipe => recipe.outputProductId),
]);
