import type { Category } from './products';
import type { CookingStation } from './recipes';

export type FurnitureType =
  | 'shelf' | 'bigShelf' | 'fridge' | 'freezer' | 'produce' | 'meat_counter'
  | 'checkout' | 'cartStation' | 'plant' | 'wall'
  | CookingStation;

/** Trạm nấu: id trùng tên trạm trong recipes.ts; đặt trong tiệm mới nấu được món của trạm đó. */
export const isCookStation = (type: FurnitureType): type is CookingStation =>
  type === 'hot_kettle' || type === 'food_grill' || type === 'blender' || type === 'drink_counter'
  || type === 'fryer' || type === 'sugarcane_press' || type === 'rice_station' || type === 'steamer'
  || type === 'gift_wrap';

export interface FurnitureDef {
  type: FurnitureType;
  name: string;
  price: number;
  unlock: number;
  /** Kích thước sàn [rộng, sâu] (m) khi chưa xoay; mặt trước là cạnh "rộng" phía +z. */
  size: [number, number];
  /** Số tầng bày hàng; 0 = không bày hàng. */
  tiers: number;
  /** Số ô hàng mỗi tầng: mỗi ô bày một món, nên một tầng bày được nhiều món khác nhau. */
  slots: number;
  /** Số món tối đa mỗi ô. */
  capacity: number;
  /** Ngành hàng bày được. */
  categories: Category[];
  /** Khách trả thêm bao nhiêu % khi mua từ món đồ này (vd. đồ uống lạnh). */
  priceBonus?: number;
  desc: string;
}

const SHELF_GOODS: Category[] = ['dry', 'drink', 'household'];

export const FURNITURE: FurnitureDef[] = [
  {
    type: 'shelf', name: 'Kệ gỗ', price: 150000, unlock: 1, size: [1.8, 0.5], tiers: 3, slots: 4, capacity: 6,
    categories: SHELF_GOODS, desc: '3 tầng × 4 ô × 6 món (đồ khô, đồ uống, gia dụng). Đặt cạnh cửa/lối đi thì khách để ý hơn',
  },
  {
    type: 'wall', name: 'Vách ngăn', price: 20000, unlock: 1, size: [1.0, 0.15], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Vách cao 1.5m, dùng chia khu (kho, khu đồ uống...)',
  },
  {
    type: 'plant', name: 'Chậu cây', price: 50000, unlock: 3, size: [0.5, 0.5], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trang trí: +5% khách ghé (tối đa +25%)',
  },
  {
    type: 'fridge', name: 'Tủ mát', price: 400000, unlock: 5, size: [1.2, 0.7], tiers: 4, slots: 3, capacity: 6,
    categories: ['drink', 'cold'], priceBonus: 0.2, desc: '4 tầng, mỗi tầng 3 ô × 6 món: đồ uống, hàng mát; khách trả thêm 20% vì mát lạnh',
  },
  {
    type: 'freezer', name: 'Tủ đông', price: 500000, unlock: 14, size: [1.6, 0.8], tiers: 2, slots: 3, capacity: 8,
    categories: ['frozen'], desc: '2 ngăn, mỗi ngăn 3 ô × 8 món hàng đông lạnh (kem, thịt, cá)',
  },
  {
    type: 'checkout', name: 'Quầy thu ngân phụ', price: 300000, unlock: 15, size: [1.6, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Thêm một hàng chờ tính tiền; cần thu ngân hoặc bạn đứng quầy',
  },
  {
    type: 'cartStation', name: 'Bãi xe đẩy', price: 200000, unlock: 20, size: [1.2, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Một nửa số khách lấy xe đẩy, mua 3–7 món thay vì 1–4',
  },
  {
    type: 'bigShelf', name: 'Kệ siêu thị', price: 350000, unlock: 26, size: [2.4, 0.6], tiers: 4, slots: 5, capacity: 8,
    categories: SHELF_GOODS, desc: '4 tầng, mỗi tầng 5 ô × 8 món, kệ sắt dài',
  },
  {
    type: 'produce', name: 'Quầy rau quả', price: 300000, unlock: 21, size: [1.6, 1.0], tiers: 2, slots: 3, capacity: 8,
    categories: ['fresh'], desc: '2 tầng, mỗi tầng 3 ô × 8 món hàng tươi (rau, trái cây, bánh mì, món nấu ăn tươi)',
  },
  {
    type: 'meat_counter', name: 'Quầy thịt cá tươi', price: 650000, unlock: 32, size: [2.0, 1.0], tiers: 2, slots: 3, capacity: 6,
    categories: ['meat'], priceBonus: 0.15,
    desc: '2 tầng × 3 ô × 6 món thịt cá tươi, quầy mát giữ hàng; khách trả thêm 15% vì tươi. Hạn dùng chỉ 2 ngày, cần giấy phép an toàn thực phẩm và người bán thịt cá đứng quầy',
  },
  // ──────────────────────────────────────────────
  // TRẠM NẤU: món nấu xong về kho, bày bán như hàng thường
  // ──────────────────────────────────────────────
  {
    type: 'hot_kettle', name: 'Ấm nước nóng', price: 220000, unlock: 21, size: [0.8, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: trà gừng, mì trứng, chè đậu xanh, canh (xem Sổ nấu 🍳)',
  },
  {
    type: 'food_grill', name: 'Bếp nướng', price: 320000, unlock: 21, size: [1.2, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: bánh mì trứng, xúc xích, cơm hộp gà, cơm sườn (xem Sổ nấu 🍳)',
  },
  {
    type: 'blender', name: 'Máy xay sinh tố', price: 260000, unlock: 25, size: [0.7, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: sinh tố trái cây, kem trái cây (xem Sổ nấu 🍳)',
  },
  {
    type: 'drink_counter', name: 'Quầy pha chế', price: 320000, unlock: 25, size: [1.4, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: cà phê, trà sữa, bạc xỉu, trà đào (xem Sổ nấu 🍳)',
  },
  {
    type: 'sugarcane_press', name: 'Máy ép mía', price: 240000, unlock: 25, size: [1.0, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: nước mía tươi (xem Sổ nấu 🍳)',
  },
  {
    type: 'fryer', name: 'Chảo chiên', price: 280000, unlock: 26, size: [0.9, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: bắp xào, cá viên chiên (xem Sổ nấu 🍳)',
  },
  {
    type: 'rice_station', name: 'Quầy xôi', price: 360000, unlock: 36, size: [1.2, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: xôi các loại, suất xôi đôi (xem Sổ nấu 🍳)',
  },
  {
    type: 'steamer', name: 'Nồi hấp', price: 340000, unlock: 39, size: [0.9, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: bánh bao hấp nóng (xem Sổ nấu 🍳)',
  },
  {
    type: 'gift_wrap', name: 'Bàn gói quà', price: 300000, unlock: 28, size: [1.0, 0.6], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm gói giỏ quà lễ: Tết, 8/3, 20/11, Trung thu — chỉ gói được trong dịp, lãi cao (xem Sổ nấu 🍳)',
  },
];

export const furnitureDef = (type: FurnitureType) => FURNITURE.find((f) => f.type === type)!;

/** Tổng số ô hàng (tầng × ô mỗi tầng); `Furniture.tiers` có đúng chừng này phần tử, ô i nằm ở tầng i / slots. */
export const slotCount = (type: FurnitureType) => furnitureDef(type).tiers * furnitureDef(type).slots;

/** Kích thước sàn sau khi xoay rot × 90°. */
export function footprint(type: FurnitureType, rot: number): [number, number] {
  const [w, d] = furnitureDef(type).size;
  return rot % 2 === 0 ? [w, d] : [d, w];
}

/** Hướng mặt trước (rot 0 = quay ra cửa, trục +z). */
export function frontDir(rot: number): [number, number] {
  return [[0, 1], [1, 0], [0, -1], [-1, 0]][((rot % 4) + 4) % 4] as [number, number];
}
