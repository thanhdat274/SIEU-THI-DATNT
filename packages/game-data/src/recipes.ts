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
];

export const RECIPES: Recipe[] = [
  { id: 'recipe_banh_mi_trung_nuong', name: 'Bánh mì trứng nướng', stationShopId: 'food_grill', inputs: [{ productId: 'banh_mi_goi', quantity: 1 }, { productId: 'trung_ga', quantity: 2 }], outputProductId: 'banh_mi_trung_nuong', outputQuantity: 4, durationSeconds: 40, unlockLevel: 21 },
  { id: 'recipe_tra_gung_nong', name: 'Trà gừng pha nóng', stationShopId: 'hot_kettle', inputs: [{ productId: 'tra_nong_gung', quantity: 1 }, { productId: 'nuoc_suoi', quantity: 4 }], outputProductId: 'tra_gung_nong', outputQuantity: 5, durationSeconds: 30, unlockLevel: 21 },
  { id: 'recipe_mi_trung_nong', name: 'Mì trứng nấu sẵn', stationShopId: 'hot_kettle', inputs: [{ productId: 'mi_omachi', quantity: 1 }, { productId: 'trung_ga', quantity: 1 }], outputProductId: 'mi_trung_nong', outputQuantity: 2, durationSeconds: 25, unlockLevel: 21 },
];

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(RECIPES.map(recipe => [recipe.id, recipe]));
