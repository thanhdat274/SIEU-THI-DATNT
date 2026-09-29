import { Product, ProductCategory, StorageType } from '@game/shared';

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

type CatalogRow = [string, string, ProductCategory, number, number, number, StorageType, number, number];

// id, Vietnamese name, category, purchase/sale price, shelf capacity, storage,
// shelf life in game days, unlock level. Keep catalog data out of the renderer.
const ADDITIONAL_ROWS: CatalogRow[] = [
  ['mi_omachi', 'Mì Omachi khoai tây', 'instant_noodles', 5000, 7500, 20, 'ambient', 90, 1],
  ['mi_ba_mien', 'Mì Ba Miền bò hầm', 'instant_noodles', 3200, 5000, 24, 'ambient', 90, 1],
  ['pho_goi', 'Phở gói Hà Nội', 'instant_noodles', 5500, 8000, 18, 'ambient', 75, 2],
  ['hu_tieu_goi', 'Hủ tiếu Nam Vang gói', 'instant_noodles', 6000, 9000, 18, 'ambient', 75, 2],
  ['banh_poca', 'Khoai tây chiên Poca', 'snacks', 7000, 10000, 18, 'ambient', 60, 1],
  ['bim_bim_oishi', 'Snack Oishi tôm cay', 'snacks', 4000, 6500, 20, 'ambient', 60, 1],
  ['banh_gao', 'Bánh gạo vị ngọt', 'snacks', 9000, 13000, 16, 'ambient', 50, 2],
  ['dau_phong_rang', 'Đậu phộng rang tỏi', 'snacks', 8000, 12000, 16, 'ambient', 25, 2],
  ['keo_dua', 'Kẹo dừa Bến Tre', 'candy', 2500, 4000, 24, 'ambient', 90, 1],
  ['keo_me', 'Kẹo mè xửng Huế', 'candy', 3500, 5500, 20, 'ambient', 90, 2],
  ['socola_thanh', 'Sô cô la thanh', 'candy', 9000, 14000, 16, 'ambient', 60, 2],
  ['nuoc_suoi', 'Nước suối chai nhỏ', 'bottled_water', 3000, 5000, 24, 'ambient', 180, 1],
  ['nuoc_khoang', 'Nước khoáng Vĩnh Hảo', 'bottled_water', 5000, 7500, 20, 'ambient', 180, 2],
  ['nuoc_tinh_khiet', 'Nước tinh khiết bình nhỏ', 'bottled_water', 4500, 7000, 20, 'ambient', 180, 1],
  ['nuoc_cam', 'Nước cam có ga', 'soft_drinks', 6000, 9000, 16, 'ambient', 90, 1],
  ['tra_xanh', 'Trà xanh đóng chai', 'soft_drinks', 6500, 10000, 16, 'ambient', 60, 2],
  ['sua_tuoi', 'Sữa tươi hộp', 'milk', 8500, 12000, 12, 'cold', 7, 1],
  ['sua_chua', 'Sữa chua hũ', 'milk', 5000, 8000, 12, 'cold', 5, 1],
  ['sua_dau_nanh', 'Sữa đậu nành chai', 'milk', 6000, 9000, 12, 'cold', 4, 2],
  ['banh_mi_goi', 'Bánh mì gối lát', 'bread', 14000, 20000, 10, 'ambient', 5, 1],
  ['banh_bao', 'Bánh bao nhân thịt', 'bread', 10000, 15000, 10, 'cold', 3, 2],
  ['trung_ga', 'Trứng gà', 'eggs', 2800, 4500, 20, 'cold', 12, 1],
  ['trung_vit', 'Trứng vịt', 'eggs', 3500, 5500, 20, 'cold', 12, 2],
  ['nuoc_mam', 'Nước mắm chai nhỏ', 'cooking_ingredients', 16000, 23000, 12, 'ambient', 180, 1],
  ['duong_cat', 'Đường cát trắng', 'cooking_ingredients', 12000, 18000, 12, 'ambient', 180, 1],
  ['bot_ngot', 'Bột ngọt gói nhỏ', 'cooking_ingredients', 9000, 14000, 14, 'ambient', 180, 2],
  ['dau_an', 'Dầu ăn chai nhỏ', 'cooking_ingredients', 26000, 36000, 10, 'ambient', 120, 2],
  ['xa_phong', 'Xà phòng cục', 'household', 7000, 11000, 16, 'ambient', 365, 1],
  ['nuoc_rua_chen', 'Nước rửa chén túi', 'household', 13000, 19000, 12, 'ambient', 365, 2],
  ['giay_ve_sinh', 'Giấy vệ sinh cuộn', 'household', 8000, 12000, 16, 'ambient', 365, 1],
  ['kem_danh_rang', 'Kem đánh răng tuýp', 'household', 17000, 25000, 12, 'ambient', 365, 2],
];

export const ADDITIONAL_PRODUCTS: Product[] = ADDITIONAL_ROWS.map(([
  id, name, category, purchasePrice, baseSellingPrice, shelfCapacity, storageType, daysToSpoil, unlockLevel,
]) => ({
  id, name, category, purchasePrice, baseSellingPrice, shelfCapacity, storageType, unlockLevel,
  spriteId: `item_${id}`,
  expirationRules: { daysToSpoil },
  demandProfile: { basePopularity: 0.6 },
  description: `${name} quen thuộc ở tiệm tạp hóa đầu hẻm.`,
}));

export const ALL_PRODUCTS: Product[] = [...STARTER_PRODUCTS, ...ADDITIONAL_PRODUCTS];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  instant_noodles: 'Mì ăn liền', snacks: 'Bánh ăn vặt', candy: 'Kẹo', bottled_water: 'Nước suối',
  soft_drinks: 'Nước ngọt', milk: 'Sữa', bread: 'Bánh mì', eggs: 'Trứng',
  cooking_ingredients: 'Gia vị', household: 'Đồ gia dụng',
};

export const PRODUCT_MAP: Record<string, Product> = ALL_PRODUCTS.reduce(
  (acc, prod) => {
    acc[prod.id] = prod;
    return acc;
  },
  {} as Record<string, Product>
);
