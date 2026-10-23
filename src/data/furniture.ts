import type { Category } from './products';

export type FurnitureType =
  | 'shelf' | 'bigShelf' | 'fridge' | 'freezer' | 'produce'
  | 'checkout' | 'cartStation' | 'plant' | 'wall';

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
    type: 'shelf', name: 'Kệ gỗ', price: 150000, unlock: 1, size: [1.8, 0.5], tiers: 3, slots: 2, capacity: 4,
    categories: SHELF_GOODS, desc: '3 tầng, mỗi tầng 2 ô × 4 món: đồ khô, đồ uống, gia dụng',
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
    type: 'fridge', name: 'Tủ mát', price: 400000, unlock: 5, size: [1.2, 0.7], tiers: 4, slots: 2, capacity: 4,
    categories: ['drink', 'cold'], priceBonus: 0.2, desc: '4 tầng, mỗi tầng 2 ô: đồ uống, hàng mát; khách trả thêm 20% vì mát lạnh',
  },
  {
    type: 'freezer', name: 'Tủ đông', price: 500000, unlock: 14, size: [1.6, 0.8], tiers: 2, slots: 2, capacity: 5,
    categories: ['frozen'], desc: '2 ngăn, mỗi ngăn 2 ô × 5 món hàng đông lạnh (kem, thịt, cá)',
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
    type: 'bigShelf', name: 'Kệ siêu thị', price: 350000, unlock: 26, size: [2.4, 0.6], tiers: 4, slots: 3, capacity: 4,
    categories: SHELF_GOODS, desc: '4 tầng, mỗi tầng 3 ô × 4 món, kệ sắt dài',
  },
  {
    type: 'produce', name: 'Quầy rau quả', price: 300000, unlock: 26, size: [1.6, 1.0], tiers: 2, slots: 2, capacity: 5,
    categories: ['fresh'], desc: '2 tầng, mỗi tầng 2 ô × 5 món hàng tươi (rau, trái cây, bánh mì)',
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
