import type { Product } from '@game/shared';
import { nullProto } from './safe-map';

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
  // Đồ uống pha tại quầy nước (khu F). Số liệu provisional, chưa playtest.
  { id: 'nuoc_mia', name: 'Nước mía', category: 'soft_drinks', spriteId: 'item_mia', purchasePrice: 3000, baseSellingPrice: 8000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 25, demandProfile: { basePopularity: 0.5 }, description: 'Nước mía ép tươi tại máy ép của tiệm, uống ngay cho mát.' },
  { id: 'sinh_to_trai_cay', name: 'Sinh tố trái cây', category: 'soft_drinks', spriteId: 'item_trai_cay', purchasePrice: 8000, baseSellingPrice: 18000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 25, demandProfile: { basePopularity: 0.4 }, description: 'Sinh tố trái cây xay từ máy xay, thêm sữa chua cho béo.' },
  { id: 'ca_phe_sua_pha', name: 'Cà phê sữa', category: 'soft_drinks', spriteId: 'item_ca_phe_bot', purchasePrice: 4500, baseSellingPrice: 12000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 25, demandProfile: { basePopularity: 0.45 }, description: 'Cà phê pha phin thêm đường, bán tại quầy nước.' },
  // Món tự chế mở rộng, bán trong ngày. Giá vốn ≈ giá nguyên liệu / số suất.
  { id: 'che_dau_xanh_tp', name: 'Chè đậu xanh', category: 'snacks', spriteId: 'item_che_dau_xanh_tp', purchasePrice: 4500, baseSellingPrice: 12000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 22, demandProfile: { basePopularity: 0.45 }, description: 'Chè đậu xanh nấu nhừ nước cốt dừa, ăn nóng hay ướp đá đều mát bụng.' },
  { id: 'xuc_xich_nuong_tp', name: 'Xúc xích nướng', category: 'snacks', spriteId: 'item_xuc_xich_nuong_tp', purchasePrice: 6400, baseSellingPrice: 12000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 22, demandProfile: { basePopularity: 0.5 }, description: 'Xúc xích nướng than vàng ươm xiên que, học sinh tan trường mua cả chục.' },
  { id: 'com_hop_ga_tp', name: 'Cơm hộp gà', category: 'bread', spriteId: 'item_com_hop_ga_tp', purchasePrice: 17750, baseSellingPrice: 35000, shelfCapacity: 8, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 23, demandProfile: { basePopularity: 0.45 }, description: 'Hộp cơm gà nướng kèm rau, bữa trưa gọn nhẹ cho dân công sở.' },
  { id: 'banh_trang_tron_tp', name: 'Bánh tráng trộn', category: 'snacks', spriteId: 'item_banh_trang_tron_tp', purchasePrice: 7750, baseSellingPrice: 15000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 24, demandProfile: { basePopularity: 0.5 }, description: 'Bánh tráng trộn trứng cút, hành phi, sa tế cay xè - món ăn vặt quốc dân.' },
  { id: 'che_thai_tp', name: 'Chè Thái', category: 'soft_drinks', spriteId: 'item_che_thai_tp', purchasePrice: 8000, baseSellingPrice: 18000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 26, demandProfile: { basePopularity: 0.4 }, description: 'Chè Thái trái cây nước cốt dừa, thêm đá bào mát lạnh.' },
  { id: 'tra_dao_cam_sa_tp', name: 'Trà đào cam sả', category: 'soft_drinks', spriteId: 'item_tra_dao_cam_sa_tp', purchasePrice: 4500, baseSellingPrice: 14000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 26, demandProfile: { basePopularity: 0.5 }, description: 'Trà đào cam sả thơm dịu, món giải khát được giới trẻ săn đón.' },
  { id: 'kem_trai_cay_tp', name: 'Kem trái cây tự làm', category: 'frozen', spriteId: 'item_kem_trai_cay_tp', purchasePrice: 8000, baseSellingPrice: 16000, shelfCapacity: 10, storageType: 'cold', expirationRules: { daysToSpoil: 2 }, unlockLevel: 27, demandProfile: { basePopularity: 0.45 }, description: 'Kem sữa chua trái cây xay tại tiệm, ăn là mát tới tận tim.' },
  { id: 'banh_bao_hap_tp', name: 'Bánh bao hấp nóng', category: 'bread', spriteId: 'item_banh_bao_hap_tp', purchasePrice: 8400, baseSellingPrice: 15000, shelfCapacity: 10, storageType: 'ambient', expirationRules: { daysToSpoil: 1 }, unlockLevel: 30, demandProfile: { basePopularity: 0.45 }, description: 'Bánh bao nhân thịt trứng hấp bốc khói, ăn nóng mới ngon.' },
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
  // Đồ uống (khu F): mỗi trạm chạy một mẻ một lúc.
  { id: 'recipe_nuoc_mia', name: 'Nước mía (6 ly)', stationShopId: 'sugarcane_press', inputs: [{ productId: 'mia', quantity: 4 }], outputProductId: 'nuoc_mia', outputQuantity: 6, durationSeconds: 25, unlockLevel: 25 },
  { id: 'recipe_sinh_to', name: 'Sinh tố trái cây (4 ly)', stationShopId: 'blender', inputs: [{ productId: 'trai_cay', quantity: 2 }, { productId: 'sua_chua', quantity: 2 }], outputProductId: 'sinh_to_trai_cay', outputQuantity: 4, durationSeconds: 30, unlockLevel: 25 },
  { id: 'recipe_ca_phe_sua', name: 'Cà phê sữa (5 ly)', stationShopId: 'drink_counter', inputs: [{ productId: 'ca_phe_bot', quantity: 1 }, { productId: 'duong_cat', quantity: 1 }, { productId: 'sua_hop', quantity: 2 }], outputProductId: 'ca_phe_sua_pha', outputQuantity: 5, durationSeconds: 35, unlockLevel: 25 },
  // Món tự chế mở rộng (chè, bánh bao, cơm hộp, kem, bánh tráng trộn...). Số liệu provisional, chưa playtest.
  { id: 'recipe_che_dau_xanh', name: 'Chè đậu xanh (6 ly)', stationShopId: 'hot_kettle', inputs: [{ productId: 'dau_xanh', quantity: 2 }, { productId: 'duong_cat', quantity: 1 }, { productId: 'dua_cot_hop', quantity: 1 }], outputProductId: 'che_dau_xanh_tp', outputQuantity: 6, durationSeconds: 35, unlockLevel: 22 },
  { id: 'recipe_xuc_xich_nuong', name: 'Xúc xích nướng (10 cây)', stationShopId: 'food_grill', inputs: [{ productId: 'xuc_xich_cp', quantity: 2 }], outputProductId: 'xuc_xich_nuong_tp', outputQuantity: 10, durationSeconds: 30, unlockLevel: 22 },
  { id: 'recipe_com_hop_ga', name: 'Cơm hộp gà (4 hộp)', stationShopId: 'food_grill', inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'thit_ga', quantity: 2 }, { productId: 'rau_cai', quantity: 1 }], outputProductId: 'com_hop_ga_tp', outputQuantity: 4, durationSeconds: 45, unlockLevel: 23 },
  { id: 'recipe_banh_trang_tron', name: 'Bánh tráng trộn (6 phần)', stationShopId: 'food_grill', inputs: [{ productId: 'banh_trang', quantity: 2 }, { productId: 'hanh_phi', quantity: 1 }, { productId: 'ot_bot', quantity: 1 }, { productId: 'trung_cut_vi', quantity: 1 }], outputProductId: 'banh_trang_tron_tp', outputQuantity: 6, durationSeconds: 25, unlockLevel: 24 },
  { id: 'recipe_che_thai', name: 'Chè Thái (5 ly)', stationShopId: 'drink_counter', inputs: [{ productId: 'trai_cay', quantity: 2 }, { productId: 'dua_cot_hop', quantity: 1 }, { productId: 'duong_cat', quantity: 1 }], outputProductId: 'che_thai_tp', outputQuantity: 5, durationSeconds: 35, unlockLevel: 26 },
  { id: 'recipe_tra_dao_cam_sa', name: 'Trà đào cam sả (6 ly)', stationShopId: 'drink_counter', inputs: [{ productId: 'tra_tac_base', quantity: 1 }, { productId: 'trai_cay', quantity: 1 }, { productId: 'duong_cat', quantity: 1 }], outputProductId: 'tra_dao_cam_sa_tp', outputQuantity: 6, durationSeconds: 30, unlockLevel: 26 },
  { id: 'recipe_kem_trai_cay', name: 'Kem trái cây tự làm (5 ly)', stationShopId: 'blender', inputs: [{ productId: 'trai_cay', quantity: 2 }, { productId: 'sua_chua', quantity: 2 }, { productId: 'duong_cat', quantity: 1 }], outputProductId: 'kem_trai_cay_tp', outputQuantity: 5, durationSeconds: 35, unlockLevel: 27 },
  { id: 'recipe_banh_bao_hap', name: 'Bánh bao hấp nóng (8 cái)', stationShopId: 'xung_hap', inputs: [{ productId: 'bot_mi', quantity: 2 }, { productId: 'thit_xay', quantity: 1 }, { productId: 'trung_ga', quantity: 1 }], outputProductId: 'banh_bao_hap_tp', outputQuantity: 8, durationSeconds: 40, unlockLevel: 30 },
];

export const RECIPE_MAP: Record<string, Recipe> = nullProto(Object.fromEntries(RECIPES.map(recipe => [recipe.id, recipe])));

/** Thành phẩm quầy xôi (món chỉ `autoFillShelf` chấp nhận cho kệ tiệm xôi). */
export const XOI_DISH_IDS: ReadonlySet<string> = new Set(
  RECIPES.filter(recipe => recipe.stationShopId === 'quay_xoi').map(recipe => recipe.outputProductId)
);
