import { Product } from '@game/shared';

export const STARTER_PRODUCTS: Product[] = [
  {
    id: 'mi_hao_hao',
    name: 'Mì Tôm Hảo Hảo',
    category: 'instant_noodles',
    spriteId: 'item_mi_hao_hao',
    purchasePrice: 3000,
    baseSellingPrice: 4500,
    shelfCapacity: 24,
    storageType: 'ambient',
    expirationRules: {
      daysToSpoil: 90,
    },
    unlockLevel: 1,
    demandProfile: {
      basePopularity: 0.95,
    },
    description: 'Mì tôm chua cay huyền thoại tuổi thơ. Hàng bán chạy nhất xóm, già trẻ lớn bé ai cũng thích.',
  },
  {
    id: 'xa_xi_chuong_duong',
    name: 'Xá Xị Chương Dương',
    category: 'soft_drinks',
    spriteId: 'item_xa_xi',
    purchasePrice: 5000,
    baseSellingPrice: 8000,
    shelfCapacity: 16,
    storageType: 'ambient',
    expirationRules: {
      daysToSpoil: 60,
    },
    unlockLevel: 1,
    demandProfile: {
      basePopularity: 0.8,
    },
    description: 'Chai xá xị thủy tinh ướp lạnh, thơm lừng vị thảo mộc sảng khoái trưa hè oi ả.',
  },
  {
    id: 'keo_big_babol',
    name: 'Kẹo Cao Su Big Babol',
    category: 'candy',
    spriteId: 'item_keo_big_babol',
    purchasePrice: 1000,
    baseSellingPrice: 2000,
    shelfCapacity: 30,
    storageType: 'ambient',
    expirationRules: {
      daysToSpoil: 180,
    },
    unlockLevel: 1,
    demandProfile: {
      basePopularity: 0.9,
    },
    description: 'Kẹo thổi bong bóng vị dưa hấu quen thuộc của học trò tiểu học sau giờ tan trường.',
  },
  {
    id: 'sua_ong_tho',
    name: 'Sữa Đặc Ông Thọ Đỏ',
    category: 'milk',
    spriteId: 'item_sua_ong_tho',
    purchasePrice: 18000,
    baseSellingPrice: 24000,
    shelfCapacity: 12,
    storageType: 'ambient',
    expirationRules: {
      daysToSpoil: 120,
    },
    unlockLevel: 1,
    demandProfile: {
      basePopularity: 0.75,
    },
    description: 'Hộp sữa đặc có đường nắp giật, không thể thiếu cho ly cà phê sữa đá buổi sáng.',
  },
  {
    id: 'banh_mi_que',
    name: 'Bánh Mì Que Giòn Cay',
    category: 'bread',
    spriteId: 'item_banh_mi_que',
    purchasePrice: 6000,
    baseSellingPrice: 10000,
    shelfCapacity: 10,
    storageType: 'ambient',
    expirationRules: {
      daysToSpoil: 2,
    },
    unlockLevel: 1,
    demandProfile: {
      basePopularity: 0.85,
    },
    description: 'Bánh mì que kẹp patê béo ngậy quết chí chương cay xé lưỡi, ăn là ghiền.',
  },
];

export const PRODUCT_MAP: Record<string, Product> = STARTER_PRODUCTS.reduce(
  (acc, prod) => {
    acc[prod.id] = prod;
    return acc;
  },
  {} as Record<string, Product>
);
