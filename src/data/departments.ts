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
