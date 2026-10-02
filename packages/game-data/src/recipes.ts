import type { Product } from '@game/shared';

/** Số liệu cân bằng ban đầu (giá, thời gian, hao hụt) là provisional, chưa playtest. */
export interface RecipeIngredient {
  productId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** `shopId` của trạm (FIXTURE_SHOP) được phép nấu công thức này. */
  stationShopId: string;
  inputs: RecipeIngredient[];
  outputProductId: string;
  outputQuantity: number;
  /** Thời gian nấu theo giây của game. */
  durationSeconds: number;
  unlockLevel: number;
}

/** Hàng tự sản xuất: có trong PRODUCT_MAP và nhu cầu bán, nhưng không nhập được từ nhà cung cấp. */
export const PRODUCED_PRODUCTS: Product[] = [
  { id: 'banh_mi_trung_nuong', name: 'Bánh mì trứng nướng', category: 'bread', spriteId: 'item_banh_mi_que', purchasePrice: 5000, baseSellingPrice: 12000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 21, demandProfile: { basePopularity: 0.5 }, description: 'Bánh mì nướng nóng phết trứng, làm tại bếp nướng của tiệm.' },
  { id: 'tra_gung_nong', name: 'Trà gừng pha nóng', category: 'soft_drinks', spriteId: 'item_tra_nong_gung', purchasePrice: 7500, baseSellingPrice: 12000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 21, demandProfile: { basePopularity: 0.4 }, description: 'Ly trà gừng nóng pha từ ấm nước của tiệm.' },
  { id: 'mi_trung_nong', name: 'Mì trứng nấu sẵn', category: 'instant_noodles', spriteId: 'item_mi_omachi', purchasePrice: 8000, baseSellingPrice: 15000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 21, demandProfile: { basePopularity: 0.45 }, description: 'Tô mì gói nấu nóng thêm trứng, ăn ngay tại bàn hoặc mang đi.' },
  // Chuỗi xôi (chuyển thể từ game gốc): ngâm nếp → hấp → múc xôi. Bán thành phẩm không bán trực tiếp.
  { id: 'nep_ngam', name: 'Nếp đã ngâm (1kg)', category: 'cooking_ingredients', spriteId: 'item_nep_ngam', purchasePrice: 28000, baseSellingPrice: 28000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 2 }, unlockLevel: 29, demandProfile: { basePopularity: 0 }, intermediate: true, description: 'Nếp ngâm ở thùng ngâm, cần hấp trong ngày mai nếu chưa dùng, để lâu sẽ chua.' },
  { id: 'nep_chin', name: 'Nếp chín (phần)', category: 'cooking_ingredients', spriteId: 'item_nep_chin', purchasePrice: 5600, baseSellingPrice: 5600, shelfCapacity: 20, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 29, demandProfile: { basePopularity: 0 }, intermediate: true, description: 'Nếp vừa hấp xong, dùng múc xôi ngay trong ngày; hết ngày là bỏ.' },
  { id: 'xoi_dau_xanh_tp', name: 'Xôi đậu xanh', category: 'bread', spriteId: 'item_xoi_dau_xanh_tp', purchasePrice: 8100, baseSellingPrice: 15000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 29, demandProfile: { basePopularity: 0.5 }, description: 'Xôi nếp dẻo phủ đậu xanh nghiền, món sáng quen thuộc.' },
  { id: 'xoi_man_tp', name: 'Xôi mặn', category: 'bread', spriteId: 'item_xoi_man_tp', purchasePrice: 15100, baseSellingPrice: 25000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 29, demandProfile: { basePopularity: 0.45 }, description: 'Xôi mặn đủ đầy chả bông, lạp xưởng và hành phi.' },
  { id: 'xoi_trung_tp', name: 'Xôi trứng', category: 'bread', spriteId: 'item_xoi_trung_tp', purchasePrice: 9600, baseSellingPrice: 18000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 29, demandProfile: { basePopularity: 0.45 }, description: 'Xôi nóng ăn kèm trứng và hành phi thơm lừng.' },
  { id: 'xoi_dua_tp', name: 'Xôi dừa', category: 'bread', spriteId: 'item_xoi_dua_tp', purchasePrice: 8100, baseSellingPrice: 12000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 29, demandProfile: { basePopularity: 0.4 }, description: 'Xôi nếp rắc dừa nạo béo ngậy.' },
];

export const RECIPES: Recipe[] = [
  { id: 'recipe_banh_mi_trung_nuong', name: 'Bánh mì trứng nướng', stationShopId: 'food_grill', inputs: [{ productId: 'banh_mi_goi', quantity: 1 }, { productId: 'trung_ga', quantity: 2 }], outputProductId: 'banh_mi_trung_nuong', outputQuantity: 4, durationSeconds: 40, unlockLevel: 21 },
  { id: 'recipe_tra_gung_nong', name: 'Trà gừng pha nóng', stationShopId: 'hot_kettle', inputs: [{ productId: 'tra_nong_gung', quantity: 1 }, { productId: 'nuoc_suoi', quantity: 4 }], outputProductId: 'tra_gung_nong', outputQuantity: 5, durationSeconds: 30, unlockLevel: 21 },
  { id: 'recipe_mi_trung_nong', name: 'Mì trứng nấu sẵn', stationShopId: 'hot_kettle', inputs: [{ productId: 'mi_omachi', quantity: 1 }, { productId: 'trung_ga', quantity: 1 }], outputProductId: 'mi_trung_nong', outputQuantity: 2, durationSeconds: 25, unlockLevel: 21 },
  // Xôi: số liệu (thời gian, cỡ mẻ) là provisional, chưa playtest. Mỗi trạm chạy một mẻ một lúc.
  { id: 'recipe_ngam_nep_5', name: 'Ngâm nếp 5 kg', stationShopId: 'thung_ngam', inputs: [{ productId: 'nep', quantity: 5 }], outputProductId: 'nep_ngam', outputQuantity: 5, durationSeconds: 300, unlockLevel: 29 },
  { id: 'recipe_ngam_nep_10', name: 'Ngâm nếp 10 kg', stationShopId: 'thung_ngam', inputs: [{ productId: 'nep', quantity: 10 }], outputProductId: 'nep_ngam', outputQuantity: 10, durationSeconds: 300, unlockLevel: 29 },
  { id: 'recipe_hap_nep_5', name: 'Hấp 5 kg nếp (25 phần)', stationShopId: 'xung_hap', inputs: [{ productId: 'nep_ngam', quantity: 5 }], outputProductId: 'nep_chin', outputQuantity: 25, durationSeconds: 20, unlockLevel: 29 },
  { id: 'recipe_hap_nep_10', name: 'Hấp 10 kg nếp (50 phần)', stationShopId: 'xung_hap', inputs: [{ productId: 'nep_ngam', quantity: 10 }], outputProductId: 'nep_chin', outputQuantity: 50, durationSeconds: 30, unlockLevel: 29 },
  { id: 'recipe_xoi_dau_xanh', name: 'Xôi đậu xanh (5 phần)', stationShopId: 'quay_xoi', inputs: [{ productId: 'nep_chin', quantity: 5 }, { productId: 'dau_xanh', quantity: 5 }], outputProductId: 'xoi_dau_xanh_tp', outputQuantity: 5, durationSeconds: 30, unlockLevel: 29 },
  { id: 'recipe_xoi_man', name: 'Xôi mặn (5 phần)', stationShopId: 'quay_xoi', inputs: [{ productId: 'nep_chin', quantity: 5 }, { productId: 'cha_bong', quantity: 5 }, { productId: 'lap_xuong', quantity: 5 }, { productId: 'hanh_phi', quantity: 5 }], outputProductId: 'xoi_man_tp', outputQuantity: 5, durationSeconds: 30, unlockLevel: 29 },
  { id: 'recipe_xoi_trung', name: 'Xôi trứng (5 phần)', stationShopId: 'quay_xoi', inputs: [{ productId: 'nep_chin', quantity: 5 }, { productId: 'trung_ga', quantity: 5 }, { productId: 'hanh_phi', quantity: 5 }], outputProductId: 'xoi_trung_tp', outputQuantity: 5, durationSeconds: 30, unlockLevel: 29 },
  { id: 'recipe_xoi_dua', name: 'Xôi dừa (5 phần)', stationShopId: 'quay_xoi', inputs: [{ productId: 'nep_chin', quantity: 5 }, { productId: 'dua_nao', quantity: 5 }], outputProductId: 'xoi_dua_tp', outputQuantity: 5, durationSeconds: 30, unlockLevel: 29 },
];

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(RECIPES.map(recipe => [recipe.id, recipe]));

/** Thành phẩm quầy xôi (món chỉ `autoFillShelf` chấp nhận cho kệ tiệm xôi). */
export const XOI_DISH_IDS: ReadonlySet<string> = new Set(
  RECIPES.filter(recipe => recipe.stationShopId === 'quay_xoi').map(recipe => recipe.outputProductId)
);
