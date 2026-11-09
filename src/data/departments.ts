import type { Category } from './products';
import type { FurnitureType } from './furniture';
import { SHOP_TIERS } from './shopTiers';

/**
 * GĐ-A — Trục "Siêu thị hóa sâu": bảng NGÀNH HÀNG siêu thị.
 *
 * Đây là phần NỀN, THUẦN — chỉ dữ liệu + helper đọc, không đổi state/save/kinh tế/seed (co-op an toàn).
 * Mục đích: mỗi bậc tiệm khi lên siêu thị KHÔNG chỉ nới mặt bằng (xem `src/data/shopTiers.ts` — hiện chỉ
 * width×depth + tiền nhà + phí vận hành), mà còn lộ ra "ngành hàng" có cơ chế riêng — để người chơi biết
 * bậc này vừa mở thứ gì, đặt đồ gì để kích hoạt, đang bày được gì. Tất cả ngành hàng gắn vào NỘI THẤT ĐÃ CÓ
 * (không cần đồ mới, không đổi công thức kinh tế — Nguyên tắc c).
 */

/** Một ngành hàng siêu thị: mở theo bậc tiệm, kích hoạt khi đặt nội thất chủ chốt. */
export interface DepartmentDef {
  id: string;
  name: string;
  icon: string;
  /** Bậc tiệm (chỉ số SHOP_TIERS) từ đó ngành này trở nên khả dụng. */
  fromTier: number;
  /** Nội thất CHỦ CHỐT — đặt ít nhất 1 cái là ngành "kích hoạt". */
  keyFurniture: FurnitureType[];
  /** Nội thất phụ trợ làm ngành đầy đủ hơn (kệ/tủ lạnh...), không bắt buộc kích hoạt. */
  supportFurniture: FurnitureType[];
  /** Nhóm sản phẩm thuộc ngành này. */
  categories: Category[];
  /** Mô tả đời thường một dòng (dùng cho tooltip). */
  desc: string;
}

export const DEPARTMENTS: DepartmentDef[] = [
  {
    id: 'mat_dong', name: 'Khu mát & đông lạnh', icon: '❄️', fromTier: 1,
    keyFurniture: ['fridge'], supportFurniture: ['freezer'],
    categories: ['cold', 'frozen'],
    desc: 'Hàng mát/đông để ngoài hỏng nhanh — trữ trong tủ lạnh/tủ đông mới giữ được lâu.',
  },
  {
    id: 'rau_qua', name: 'Khu rau quả tươi', icon: '🥬', fromTier: 2,
    keyFurniture: ['produce'], supportFurniture: ['fridge', 'shelf'],
    categories: ['fresh'],
    desc: 'Rau quả tươi hạn ngắn — bày ở quầy rau quả, trữ vừa đủ để không hỏng đêm.',
  },
  {
    id: 'thit_ca', name: 'Khu thịt cá tươi', icon: '🥩', fromTier: 3,
    keyFurniture: ['meat_counter'], supportFurniture: ['freezer', 'fridge'],
    categories: ['meat', 'frozen'],
    desc: 'Thịt cá sống chỉ giữ 2 ngày, cần quầy thịt cá mát — trữ nhiều dễ hỏng đêm.',
  },
  {
    id: 'tu_chon', name: 'Khu tự chọn (giỏ lớn)', icon: '🛒', fromTier: 3,
    keyFurniture: ['cartStation', 'bigShelf'], supportFurniture: ['shelf'],
    categories: ['dry', 'drink', 'household'],
    desc: 'Kệ siêu thị + xe đẩy: khách mua giỏ LỚN trải nhiều ngành — cần kệ đầy đủ theo ngành.',
  },
  {
    id: 'mon_nha_lam', name: 'Khu món nhà làm & nóng', icon: '🍲', fromTier: 2,
    keyFurniture: ['food_grill', 'fryer', 'hot_kettle'], supportFurniture: ['steamer', 'rice_station', 'drink_counter'],
    categories: ['fresh', 'dry'],
    desc: 'Món nóng nhà làm hút khách — cần trạm nấu chế biến từ nguyên liệu kho.',
  },
];

/** Tên bậc tiệm để hiện cạnh ngành hàng (chỉ để đọc, không phải logic kinh tế). */
export const tierName = (tier: number) => SHOP_TIERS[tier]?.name ?? '';

/** Ngành hàng một bậc tiệm MỞ THÊM so với bậc trước (chưa cần kể đã đặt đồ chưa). */
export function departmentsUnlockedAtTier(tier: number): DepartmentDef[] {
  return DEPARTMENTS.filter((d) => d.fromTier === tier);
}

/**
 * Trạng thái kích hoạt theo nội thất đã đặt — THUẦN, không import store.
 * `activated`: đã đặt ít nhất 1 nội thất chủ chốt của ngành (điều kiện để cơ chế ngành chạy).
 * `supportCount`: số nội thất phụ trợ đã đặt (thang "đầy đủ").
 */
export function departmentStatus(placedFurniture: readonly { type: FurnitureType }[]): Record<string, { activated: boolean; supportCount: number }> {
  const placed = new Set(placedFurniture.map((f) => f.type));
  const out: Record<string, { activated: boolean; supportCount: number }> = {};
  for (const d of DEPARTMENTS) {
    let supportCount = 0;
    for (const s of d.supportFurniture) if (placed.has(s)) supportCount++;
    out[d.id] = {
      activated: d.keyFurniture.some((k) => placed.has(k)),
      supportCount,
    };
  }
  return out;
}

/**
 * GĐ1943 — Nối NGÀNH HÀNG vào kinh tế (siêu thị phase 2, mẫu regionFlags: helper thuần, nối 2 điểm —
 * kéo khách qua 🩷 và % giá). Chỉ chạy từ bậc "Siêu thị tạp hóa" (SHOP_TIERS[4], mở cấp 45 — sau mốc
 * vàng 30) nên đường sim mốc 30 không đổi.
 */
export const DEPT_ECON_FROM_TIER = 4;
export const KHU_DECOR_BASE = 2;
export const KHU_DECOR_PER_SUPPORT = 1;
export const KHU_SUPPORT_CAP = 3;
/** Khu có ≥1 vách ngăn đứng sát quanh (đã "chia vách") thì +2 🩷. */
export const KHU_WALL_BONUS = 2;
export const KHU_PRICE_MUL = 1.02;
/** Khoảng nới quanh hộp bao nội thất của khu để tính vách ngăn "quanh khu" (m). */
const KHU_WALL_REACH = 1.5;

type PlacedFurn = { type: FurnitureType; x: number; z: number; broken?: boolean; trial?: boolean };

/** Hộp bao (toạ độ trong tiệm) của nội thất chủ chốt + phụ trợ của một khu; null nếu khu chưa có đồ. */
export function departmentBounds(dep: DepartmentDef, list: readonly PlacedFurn[]): { x0: number; z0: number; x1: number; z1: number } | null {
  const own = new Set<FurnitureType>([...dep.keyFurniture, ...dep.supportFurniture]);
  let b: { x0: number; z0: number; x1: number; z1: number } | null = null;
  for (const f of list) {
    if (f.trial || !own.has(f.type)) continue;
    if (!b) b = { x0: f.x, z0: f.z, x1: f.x, z1: f.z };
    else b = { x0: Math.min(b.x0, f.x), z0: Math.min(b.z0, f.z), x1: Math.max(b.x1, f.x), z1: Math.max(b.z1, f.z) };
  }
  return b;
}

/** Khu đã có vách ngăn đứng quanh (trong hộp bao nới KHU_WALL_REACH). */
export function departmentWalled(dep: DepartmentDef, list: readonly PlacedFurn[]): boolean {
  const b = departmentBounds(dep, list);
  if (!b) return false;
  const r = KHU_WALL_REACH;
  return list.some((f) => f.type === 'wall' && !f.trial && f.x >= b.x0 - r && f.x <= b.x1 + r && f.z >= b.z0 - r && f.z <= b.z1 + r);
}

/** Các khu đang chạy cơ chế kinh tế ở bậc tiệm này (đã mở theo bậc + đã kích hoạt). */
export function activeDepartments(list: readonly PlacedFurn[], shopTier: number): DepartmentDef[] {
  if (shopTier < DEPT_ECON_FROM_TIER) return [];
  const live = list.filter((f) => !f.broken && !f.trial);
  const st = departmentStatus(live);
  return DEPARTMENTS.filter((d) => d.fromTier <= shopTier && st[d.id].activated);
}

/** 🩷 thưởng của các khu siêu thị (cộng vào decorScoreOf ở công thức kéo khách). */
export function departmentDecorBonus(list: readonly PlacedFurn[], shopTier: number): number {
  const live = list.filter((f) => !f.broken && !f.trial);
  const st = departmentStatus(live);
  let bonus = 0;
  for (const d of activeDepartments(live, shopTier)) {
    bonus += KHU_DECOR_BASE + KHU_DECOR_PER_SUPPORT * Math.min(KHU_SUPPORT_CAP, st[d.id].supportCount);
    if (departmentWalled(d, live)) bonus += KHU_WALL_BONUS;
  }
  return bonus;
}

/** Hệ số giá của 1 món theo khu siêu thị chứa nhóm hàng của nó (1 = không thưởng). */
export function departmentPriceMul(category: Category | undefined, list: readonly PlacedFurn[], shopTier: number): number {
  if (!category) return 1;
  return activeDepartments(list, shopTier).some((d) => d.categories.includes(category)) ? KHU_PRICE_MUL : 1;
}
