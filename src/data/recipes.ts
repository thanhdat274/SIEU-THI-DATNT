// ============================================================================
// Data: Recipes / Công thức nấu ăn & quầy chế biến
// ----------------------------------------------------------------------------
// Hệ thống nấu ăn: mỗi recipe mô tả nguyên liệu → thành phẩm, thời gian nấu,
// cấp mở khóa, và trạm nấu (station). Thành phẩm tự động thêm vào PRODUCTS.
// ============================================================================

/** Trạm nấu: nơi có thể thực hiện recipe. */
export type CookingStation =
  | 'food_grill'     // Bếp nướng (bánh mì trứng, xúc xích, cơm sườn)
  | 'hot_kettle'     // Ấm nước (trà gừng, mì trứng, chè)
  | 'blender'        // Máy xay (sinh tố, kem)
  | 'drink_counter'  // Quầy pha (cà phê, trà sữa, bạc xỉu)
  | 'fryer'          // Chảo chiên (bắp xào, cá viên)
  | 'steamer'        // Nồi hấp (bánh bao, xôi)
  | 'sugarcane_press'// Máy ép mía (nước mía)
  | 'rice_station'   // Quây xôi (xôi các loại)
  | 'gift_wrap';     // Bàn gói quà (giỏ quà ngày lễ, chỉ gói trong dịp)

/** Thành phần nguyên liệu. */
export interface RecipeIngredient {
  productId: string;
  quantity: number;
}

/** Công thức nấu ăn. */
export interface Recipe {
  id: string;
  name: string;
  /** Trạm nấu cho phép chế biến. */
  station: CookingStation;
  inputs: RecipeIngredient[];
  /** Sản phẩm đầu ra (id trong PRODUCTS). */
  outputId: string;
  /** Số suất/bình tạo ra mỗi lần nấu. */
  outputQty: number;
  /** Thời gian nấu (phút game). */
  durationMin: number;
  /** Cấp mở khóa. */
  unlock: number;
  /** Danh tiếng tăng khi bán món này. */
  reputationGain: number;
  /** Chỉ thực hiện được trong dịp lễ này (id trong FESTIVALS) — vd. giỏ quà Tết chỉ gói được mùa Tết. */
  festival?: string;
}

// ──────────────────────────────────────────────
// SẢN PHẨM TỰ CHẾ (tự động thêm vào PRODUCTS ở products.ts)
// ──────────────────────────────────────────────

/** Sản phẩm tự chế: được thêm vào PRODUCTS khi khởi tạo (xem products.ts). */
export const COOKED_PRODUCTS: { id: string; name: string; category: import('./products').Category; buy: number; sell: number; color: number; unlock: number }[] = [
  // --- Bếp nướng (food_grill) ---
  { id: 'banh_mi_trung_nuong', name: 'Bánh mì trứng nướng', category: 'fresh', buy: 13000, sell: 24700, color: 0xdc7633, unlock: 21 },
  { id: 'xuc_xich_nuong', name: 'Xúc xích nướng', category: 'fresh', buy: 3000, sell: 5700, color: 0xc0392b, unlock: 22 },
  { id: 'com_hop_ga', name: 'Cơm hộp gà', category: 'fresh', buy: 8200, sell: 15600, color: 0xf5cba7, unlock: 23 },
  { id: 'banh_trang_tron', name: 'Bánh tráng trộn', category: 'fresh', buy: 6700, sell: 12700, color: 0xe84393, unlock: 24 },

  // --- Ấm nước (hot_kettle) ---
  { id: 'tra_gung_nong', name: 'Trà gừng nóng', category: 'drink', buy: 7200, sell: 13700, color: 0xd4ac0d, unlock: 21 },
  { id: 'mi_trung_nong', name: 'Mì trứng nấu sẵn', category: 'fresh', buy: 5500, sell: 10500, color: 0xe67e22, unlock: 21 },
  { id: 'che_dau_xanh', name: 'Chè đậu xanh', category: 'fresh', buy: 7800, sell: 14900, color: 0xfadbd8, unlock: 22 },

  // --- Máy xay (blender) ---
  { id: 'sinh_to_trai_cay', name: 'Sinh tố trái cây', category: 'cold', buy: 7500, sell: 14300, color: 0xfd79a8, unlock: 25 },
  { id: 'kem_trai_cay', name: 'Kem trái cây tự làm', category: 'frozen', buy: 9400, sell: 17900, color: 0xff9ff3, unlock: 28 },

  // --- Quầy pha (drink_counter) ---
  { id: 'ca_phe_sua_da', name: 'Cà phê sữa đá', category: 'drink', buy: 9800, sell: 18700, color: 0x6e2c00, unlock: 25 },
  { id: 'tra_sua', name: 'Trà sữa', category: 'drink', buy: 9800, sell: 18600, color: 0xdfe6e9, unlock: 25 },
  { id: 'bac_xiu', name: 'Bạc xỉu', category: 'drink', buy: 9600, sell: 18200, color: 0xf5cba7, unlock: 26 },
  { id: 'tra_dao_cam_sa', name: 'Trà đào cam sả', category: 'drink', buy: 10300, sell: 19600, color: 0xfab1a0, unlock: 26 },
  { id: 'ca_phe_den_da', name: 'Cà phê đen đá', category: 'drink', buy: 7800, sell: 14900, color: 0x2c3e50, unlock: 34 },
  { id: 'ca_phe_trung', name: 'Cà phê trứng', category: 'drink', buy: 21500, sell: 40900, color: 0xe17055, unlock: 36 },

  // --- Chảo chiên (fryer) ---
  { id: 'bap_xao', name: 'Bắp xào', category: 'fresh', buy: 2700, sell: 5100, color: 0xf9ca24, unlock: 26 },
  { id: 'ca_vien_chien', name: 'Cá viên chiên', category: 'fresh', buy: 5000, sell: 9500, color: 0xe55039, unlock: 26 },

  // --- Nồi hấp (steamer) ---
  { id: 'banh_bao_hap', name: 'Bánh bao hấp nóng', category: 'fresh', buy: 4500, sell: 8600, color: 0xf5f6fa, unlock: 39 },

  // --- Quây xôi (rice_station) ---
  { id: 'xoi_dau_xanh', name: 'Xôi đậu xanh', category: 'fresh', buy: 1400, sell: 2600, color: 0xf9ca24, unlock: 36 },
  { id: 'xoi_man', name: 'Xôi mặn', category: 'fresh', buy: 2900, sell: 5500, color: 0xf5cba7, unlock: 36 },
  { id: 'xoi_trung', name: 'Xôi trứng', category: 'fresh', buy: 1400, sell: 2600, color: 0xfadbd8, unlock: 36 },
  { id: 'xoi_dua', name: 'Xôi dừa', category: 'fresh', buy: 800, sell: 1400, color: 0xffffff, unlock: 36 },
  { id: 'xoi_thap_cam', name: 'Xôi thập cẩm', category: 'fresh', buy: 2900, sell: 5500, color: 0xe17055, unlock: 36 },
  { id: 'xoi_bap', name: 'Xôi bắp', category: 'fresh', buy: 1400, sell: 2600, color: 0xf9ca24, unlock: 36 },

  // --- Máy ép mía (sugarcane_press) ---
  { id: 'nuoc_mia', name: 'Nước mía', category: 'drink', buy: 4800, sell: 9100, color: 0x00b894, unlock: 25 },

  // --- Cơm (food_grill) ---
  { id: 'com_suon_nuong', name: 'Cơm sườn nướng', category: 'fresh', buy: 11600, sell: 22000, color: 0xd35400, unlock: 40 },
  { id: 'com_chien_trung', name: 'Cơm chiên trứng', category: 'fresh', buy: 4100, sell: 7800, color: 0xf5cba7, unlock: 40 },
  { id: 'canh_rau_thit', name: 'Canh rau thịt', category: 'fresh', buy: 6700, sell: 12700, color: 0x27ae60, unlock: 40 },

  // --- Combo ---
  { id: 'combo_xoi_doi', name: 'Suất Xôi Đôi', category: 'fresh', buy: 4300, sell: 8200, color: 0xe17055, unlock: 36 },
  { id: 'combo_nuoc_doi', name: 'Combo Hai Ly', category: 'drink', buy: 19600, sell: 37200, color: 0x74b9ff, unlock: 26 },

  // --- Giỏ quà ngày lễ (bàn gói quà; chỉ bán trong dịp, xem festival trong RECIPES) ---
  { id: 'gio_qua_tet', name: 'Giỏ quà Tết', category: 'dry', buy: 47000, sell: 89000, color: 0xc0392b, unlock: 28 },
  { id: 'gio_qua_83', name: 'Giỏ quà 8/3', category: 'dry', buy: 47000, sell: 89000, color: 0xe84393, unlock: 30 },
  { id: 'gio_qua_2011', name: 'Giỏ quà 20/11', category: 'dry', buy: 50000, sell: 95000, color: 0xf78fb3, unlock: 32 },
  { id: 'gio_qua_trung_thu', name: 'Giỏ quà Trung thu', category: 'dry', buy: 56000, sell: 106000, color: 0xd4a24c, unlock: 30 },
];

// ──────────────────────────────────────────────
// RECIPE LIST
// ──────────────────────────────────────────────

export const RECIPES: Recipe[] = [
  // --- Bếp nướng (food_grill) ---
  { id: 'recipe_banh_mi_trung', name: 'Bánh mì trứng nướng', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 5 }, { productId: 'trung', quantity: 1 }],
    outputId: 'banh_mi_trung_nuong', outputQty: 5, durationMin: 15, unlock: 21, reputationGain: 2 },
  { id: 'recipe_xuc_xich', name: 'Xúc xích nướng', station: 'food_grill',
    inputs: [{ productId: 'xucxich', quantity: 2 }],
    outputId: 'xuc_xich_nuong', outputQty: 10, durationMin: 12, unlock: 22, reputationGain: 1 },
  { id: 'recipe_com_hop_ga', name: 'Cơm hộp gà', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'thit', quantity: 5 }, { productId: 'rau', quantity: 3 }],
    outputId: 'com_hop_ga', outputQty: 50, durationMin: 25, unlock: 23, reputationGain: 3 },
  { id: 'recipe_banh_trang', name: 'Bánh tráng trộn', station: 'food_grill',
    inputs: [{ productId: 'banhtrang', quantity: 3 }, { productId: 'traicay', quantity: 1 }],
    outputId: 'banh_trang_tron', outputQty: 6, durationMin: 10, unlock: 24, reputationGain: 2 },
  { id: 'recipe_com_suon', name: 'Cơm sườn nướng', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'thit', quantity: 8 }, { productId: 'rau', quantity: 2 }],
    outputId: 'com_suon_nuong', outputQty: 50, durationMin: 30, unlock: 40, reputationGain: 4 },
  { id: 'recipe_com_chien', name: 'Cơm chiên trứng', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'trung', quantity: 5 }],
    outputId: 'com_chien_trung', outputQty: 50, durationMin: 20, unlock: 40, reputationGain: 3 },
  { id: 'recipe_canh', name: 'Canh rau thịt', station: 'hot_kettle',
    inputs: [{ productId: 'rau', quantity: 2 }, { productId: 'thit', quantity: 1 }],
    outputId: 'canh_rau_thit', outputQty: 12, durationMin: 18, unlock: 40, reputationGain: 3 },

  // --- Ấm nước (hot_kettle) ---
  { id: 'recipe_tra_gung', name: 'Trà gừng nóng', station: 'hot_kettle',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'nuoc', quantity: 4 }],
    outputId: 'tra_gung_nong', outputQty: 5, durationMin: 10, unlock: 21, reputationGain: 1 },
  { id: 'recipe_mi_trung', name: 'Mì trứng nấu sẵn', station: 'hot_kettle',
    inputs: [{ productId: 'mi', quantity: 10 }, { productId: 'trung', quantity: 1 }],
    outputId: 'mi_trung_nong', outputQty: 10, durationMin: 8, unlock: 21, reputationGain: 2 },
  { id: 'recipe_che_dau_xanh', name: 'Chè đậu xanh', station: 'hot_kettle',
    inputs: [{ productId: 'dau_xanh', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_dau_xanh', outputQty: 6, durationMin: 15, unlock: 22, reputationGain: 2 },

  // --- Máy xay (blender) ---
  { id: 'recipe_sinh_to', name: 'Sinh tố trái cây', station: 'blender',
    inputs: [{ productId: 'traicay', quantity: 1 }, { productId: 'suachua', quantity: 1 }],
    outputId: 'sinh_to_trai_cay', outputQty: 4, durationMin: 8, unlock: 25, reputationGain: 2 },
  { id: 'recipe_kem', name: 'Kem trái cây', station: 'blender',
    inputs: [{ productId: 'traicay', quantity: 1 }, { productId: 'suachua', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'kem_trai_cay', outputQty: 5, durationMin: 12, unlock: 28, reputationGain: 3 },

  // --- Quầy pha (drink_counter) ---
  { id: 'recipe_ca_phe_sua', name: 'Cà phê sữa đá', station: 'drink_counter',
    inputs: [{ productId: 'caphe', quantity: 1 }, { productId: 'sua', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'ca_phe_sua_da', outputQty: 6, durationMin: 10, unlock: 25, reputationGain: 2 },
  { id: 'recipe_tra_sua', name: 'Trà sữa', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'sua', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'tra_sua', outputQty: 5, durationMin: 8, unlock: 25, reputationGain: 3 },
  { id: 'recipe_bac_xiu', name: 'Bạc xỉu', station: 'drink_counter',
    inputs: [{ productId: 'caphe', quantity: 1 }, { productId: 'sua', quantity: 3 }],
    outputId: 'bac_xiu', outputQty: 5, durationMin: 8, unlock: 26, reputationGain: 2 },
  { id: 'recipe_tra_dao', name: 'Trà đào cam sả', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'traicay', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'tra_dao_cam_sa', outputQty: 6, durationMin: 10, unlock: 26, reputationGain: 3 },
  { id: 'recipe_ca_phe_den', name: 'Cà phê đen đá', station: 'drink_counter',
    inputs: [{ productId: 'caphe', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'ca_phe_den_da', outputQty: 6, durationMin: 5, unlock: 34, reputationGain: 2 },
  { id: 'recipe_ca_phe_trung', name: 'Cà phê trứng', station: 'drink_counter',
    inputs: [{ productId: 'caphe', quantity: 1 }, { productId: 'trung', quantity: 2 }, { productId: 'sua', quantity: 1 }],
    outputId: 'ca_phe_trung', outputQty: 4, durationMin: 15, unlock: 36, reputationGain: 4 },

  // --- Chảo chiên (fryer) ---
  { id: 'recipe_bap_xao', name: 'Bắp xào', station: 'fryer',
    inputs: [{ productId: 'bap', quantity: 2 }],
    outputId: 'bap_xao', outputQty: 6, durationMin: 12, unlock: 26, reputationGain: 2 },
  { id: 'recipe_ca_vien', name: 'Cá viên chiên', station: 'fryer',
    inputs: [{ productId: 'ca', quantity: 1 }],
    outputId: 'ca_vien_chien', outputQty: 10, durationMin: 15, unlock: 26, reputationGain: 2 },

  // --- Nồi hấp (steamer) ---
  { id: 'recipe_banh_bao', name: 'Bánh bao hấp nóng', station: 'steamer',
    inputs: [{ productId: 'botmi', quantity: 2 }, { productId: 'thit', quantity: 2 }, { productId: 'trung', quantity: 1 }],
    outputId: 'banh_bao_hap', outputQty: 40, durationMin: 20, unlock: 39, reputationGain: 3 },

  // --- Quây xôi (rice_station) ---
  { id: 'recipe_xoi_dau_xanh', name: 'Xôi đậu xanh', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'traicay', quantity: 1 }],
    outputId: 'xoi_dau_xanh', outputQty: 40, durationMin: 15, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_man', name: 'Xôi mặn', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'trung', quantity: 1 }],
    outputId: 'xoi_man', outputQty: 40, durationMin: 15, unlock: 36, reputationGain: 3 },
  { id: 'recipe_xoi_trung', name: 'Xôi trứng', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'trung', quantity: 1 }],
    outputId: 'xoi_trung', outputQty: 40, durationMin: 12, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_dua', name: 'Xôi dừa', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }],
    outputId: 'xoi_dua', outputQty: 40, durationMin: 12, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_thap_cam', name: 'Xôi thập cẩm', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'trung', quantity: 1 }],
    outputId: 'xoi_thap_cam', outputQty: 40, durationMin: 15, unlock: 36, reputationGain: 3 },
  { id: 'recipe_xoi_bap', name: 'Xôi bắp', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'traicay', quantity: 1 }],
    outputId: 'xoi_bap', outputQty: 40, durationMin: 12, unlock: 36, reputationGain: 2 },

  // --- Máy ép mía (sugarcane_press) ---
  { id: 'recipe_nuoc_mia', name: 'Nước mía', station: 'sugarcane_press',
    inputs: [{ productId: 'mia', quantity: 4 }],
    outputId: 'nuoc_mia', outputQty: 10, durationMin: 6, unlock: 25, reputationGain: 1 },

  // --- Combo ---
  { id: 'combo_xoi_doi', name: 'Suất Xôi Đôi', station: 'rice_station',
    inputs: [{ productId: 'xoi_man', quantity: 1 }, { productId: 'xoi_trung', quantity: 1 }],
    outputId: 'combo_xoi_doi', outputQty: 1, durationMin: 5, unlock: 36, reputationGain: 2 },
  { id: 'combo_nuoc_doi', name: 'Combo Hai Ly', station: 'drink_counter',
    inputs: [{ productId: 'tra_sua', quantity: 1 }, { productId: 'ca_phe_sua_da', quantity: 1 }],
    outputId: 'combo_nuoc_doi', outputQty: 1, durationMin: 3, unlock: 26, reputationGain: 2 },

  // --- Giỏ quà ngày lễ (bàn gói quà): mỗi mẻ 2 giỏ, chỉ gói trong đúng dịp ---
  { id: 'recipe_gio_tet', name: 'Giỏ quà Tết', station: 'gift_wrap',
    inputs: [{ productId: 'x_keo', quantity: 8 }, { productId: 'x_banh_quy', quantity: 4 }, { productId: 'tra', quantity: 2 }, { productId: 'x_bao_li_xi', quantity: 2 }],
    outputId: 'gio_qua_tet', outputQty: 2, durationMin: 12, unlock: 28, reputationGain: 3, festival: 'tet' },
  { id: 'recipe_gio_83', name: 'Giỏ quà 8/3', station: 'gift_wrap',
    inputs: [{ productId: 'traicay', quantity: 2 }, { productId: 'sua', quantity: 4 }, { productId: 'banh', quantity: 4 }],
    outputId: 'gio_qua_83', outputQty: 2, durationMin: 10, unlock: 30, reputationGain: 3, festival: 'quoc_te_phu_nu' },
  { id: 'recipe_gio_2011', name: 'Giỏ quà 20/11', station: 'gift_wrap',
    inputs: [{ productId: 'tra', quantity: 2 }, { productId: 'sua', quantity: 4 }, { productId: 'banh', quantity: 4 }, { productId: 'x_khan_giay', quantity: 2 }],
    outputId: 'gio_qua_2011', outputQty: 2, durationMin: 10, unlock: 32, reputationGain: 3, festival: 'nha_giao' },
  { id: 'recipe_gio_trung_thu', name: 'Giỏ quà Trung thu', station: 'gift_wrap',
    inputs: [{ productId: 'x_banh_trung_thu', quantity: 4 }, { productId: 'tra', quantity: 2 }],
    outputId: 'gio_qua_trung_thu', outputQty: 2, durationMin: 10, unlock: 30, reputationGain: 3, festival: 'trung_thu' },
];

// ──────────────────────────────────────────────
// HELPER MAPS
// ──────────────────────────────────────────────

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(RECIPES.map(r => [r.id, r]));

/** Món bán ở quán ăn vặt: thành phẩm của chảo chiên. */
export const SNACK_PRODUCT_IDS: ReadonlySet<string> = new Set(
  RECIPES.filter(r => r.station === 'fryer' || r.station === 'food_grill').map(r => r.outputId)
);

/** Món pha ở quán cà phê: thành phẩm của quầy pha. */
export const CAFE_SHOP_IDS: ReadonlySet<string> = new Set(
  RECIPES.filter(r => r.station === 'drink_counter' || r.station === 'blender').map(r => r.outputId)
);

/** Món xôi: thành phẩm của quây xôi. */
export const XOI_IDS: ReadonlySet<string> = new Set(
  RECIPES.filter(r => r.station === 'rice_station').map(r => r.outputId)
);

/** Tất cả sản phẩm tự chế. */
export const COOKED_PRODUCT_IDS: ReadonlySet<string> = new Set(RECIPES.map(r => r.outputId));

/** Trạm nấu ra từng món nhà làm (món → trạm), để tính boa theo loại món. */
export const STATION_BY_OUTPUT: Record<string, CookingStation> = Object.fromEntries(RECIPES.map(r => [r.outputId, r.station]));

/** Cấp mở bếp: trạm nấu rẻ nhất (ấm nước nóng, bếp nướng) mở ở cấp này. */
export const COOK_UNLOCK = 21;

// ──────────────────────────────────────────────
// TRẠM NẤU
// ──────────────────────────────────────────────

export interface StationDef {
  id: CookingStation;
  name: string;
  icon: string;
  description: string;
  unlock: number;
  /** Số recipe thuộc trạm này. */
  recipeCount: number;
}

export const STATIONS: StationDef[] = [
  { id: 'hot_kettle', name: 'Ấm nước nóng', icon: '🫖', description: 'Nấu trà gừng, mì trứng, chè', unlock: 21, recipeCount: RECIPES.filter(r => r.station === 'hot_kettle').length },
  { id: 'food_grill', name: 'Bếp nướng', icon: '🔥', description: 'Bánh mì trứng, xúc xích, cơm hộp', unlock: 21, recipeCount: RECIPES.filter(r => r.station === 'food_grill').length },
  { id: 'blender', name: 'Máy xay sinh tố', icon: '🍹', description: 'Sinh tố, kem trái cây', unlock: 25, recipeCount: RECIPES.filter(r => r.station === 'blender').length },
  { id: 'drink_counter', name: 'Quầy pha', icon: '☕', description: 'Cà phê, trà sữa, bạc xỉu', unlock: 25, recipeCount: RECIPES.filter(r => r.station === 'drink_counter').length },
  { id: 'fryer', name: 'Chảo chiên', icon: '🍳', description: 'Bắp xào, cá viên chiên', unlock: 26, recipeCount: RECIPES.filter(r => r.station === 'fryer').length },
  { id: 'sugarcane_press', name: 'Máy ép mía', icon: '🥤', description: 'Nước mía tươi', unlock: 25, recipeCount: RECIPES.filter(r => r.station === 'sugarcane_press').length },
  { id: 'steamer', name: 'Nồi hấp', icon: '♨️', description: 'Bánh bao hấp nóng', unlock: 39, recipeCount: RECIPES.filter(r => r.station === 'steamer').length },
  { id: 'rice_station', name: 'Quây xôi', icon: '🍚', description: 'Xôi các loại, combo xôi', unlock: 36, recipeCount: RECIPES.filter(r => r.station === 'rice_station').length },
  { id: 'gift_wrap', name: 'Bàn gói quà', icon: '🎁', description: 'Giỏ quà Tết / 8/3 / 20/11 / Trung thu (chỉ gói trong dịp)', unlock: 28, recipeCount: RECIPES.filter(r => r.station === 'gift_wrap').length },
];

/** Số tiền tip trung bình mỗi lần bán món tự chế. */
export const COOKED_TIP_RANGE: Record<string, [number, number]> = {
  drink_counter: [500, 2000],
  blender: [500, 1500],
  food_grill: [1000, 3000],
  hot_kettle: [300, 1000],
  rice_station: [1000, 2500],
  fryer: [500, 1500],
  steamer: [500, 1000],
  sugarcane_press: [200, 500],
};
