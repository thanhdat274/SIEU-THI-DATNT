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
  | 'rice_station';   // Quây xôi (xôi các loại)

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
}

// ──────────────────────────────────────────────
// SẢN PHẨM TỰ CHẾ (tự động thêm vào PRODUCTS)
// ──────────────────────────────────────────────

/** Sản phẩm tự chế: được thêm vào PRODUCTS khi khởi tạo. */
const COOKED_PRODUCTS: { id: string; name: string; category: import('./products').Category; buy: number; sell: number; color: number; unlock: number }[] = [
  // --- Bếp nướng (food_grill) ---
  { id: 'banh_mi_trung_nuong', name: 'Bánh mì trứng nướng', category: 'fresh', buy: 5000, sell: 12000, color: 0xdc7633, unlock: 21 },
  { id: 'xuc_xich_nuong', name: 'Xúc xích nướng', category: 'fresh', buy: 6400, sell: 12000, color: 0xc0392b, unlock: 22 },
  { id: 'com_hop_ga', name: 'Cơm hộp gà', category: 'fresh', buy: 17750, sell: 35000, color: 0xf5cba7, unlock: 23 },
  { id: 'banh_trang_tron', name: 'Bánh tráng trộn', category: 'fresh', buy: 7750, sell: 15000, color: 0xe84393, unlock: 24 },

  // --- Ấm nước (hot_kettle) ---
  { id: 'tra_gung_nong', name: 'Trà gừng nóng', category: 'drink', buy: 7500, sell: 12000, color: 0xd4ac0d, unlock: 21 },
  { id: 'mi_trung_nong', name: 'Mì trứng nấu sẵn', category: 'fresh', buy: 8000, sell: 15000, color: 0xe67e22, unlock: 21 },
  { id: 'che_dau_xanh', name: 'Chè đậu xanh', category: 'fresh', buy: 4500, sell: 12000, color: 0xfadbd8, unlock: 22 },

  // --- Máy xay (blender) ---
  { id: 'sinh_to_trai_cay', name: 'Sinh tố trái cây', category: 'cold', buy: 8000, sell: 18000, color: 0xfd79a8, unlock: 25 },
  { id: 'kem_trai_cay', name: 'Kem trái cây tự làm', category: 'frozen', buy: 8000, sell: 16000, color: 0xff9ff3, unlock: 28 },

  // --- Quầy pha (drink_counter) ---
  { id: 'ca_phe_sua_da', name: 'Cà phê sữa đá', category: 'drink', buy: 5500, sell: 14000, color: 0x6e2c00, unlock: 25 },
  { id: 'tra_sua', name: 'Trà sữa', category: 'drink', buy: 5000, sell: 15000, color: 0xdfe6e9, unlock: 25 },
  { id: 'bac_xiu', name: 'Bạc xỉu', category: 'drink', buy: 4500, sell: 15000, color: 0xf5cba7, unlock: 26 },
  { id: 'tra_dao_cam_sa', name: 'Trà đào cam sả', category: 'drink', buy: 4500, sell: 14000, color: 0xfab1a0, unlock: 26 },
  { id: 'ca_phe_den_da', name: 'Cà phê đen đá', category: 'drink', buy: 3000, sell: 10000, color: 0x2c3e50, unlock: 34 },
  { id: 'ca_phe_trung', name: 'Cà phê trứng', category: 'drink', buy: 7275, sell: 24000, color: 0xe17055, unlock: 36 },

  // --- Chảo chiên (fryer) ---
  { id: 'bap_xao', name: 'Bắp xào', category: 'fresh', buy: 3900, sell: 12000, color: 0xf9ca24, unlock: 26 },
  { id: 'ca_vien_chien', name: 'Cá viên chiên', category: 'fresh', buy: 4600, sell: 12000, color: 0xe55039, unlock: 26 },

  // --- Nồi hấp (steamer) ---
  { id: 'banh_bao_hap', name: 'Bánh bao hấp nóng', category: 'fresh', buy: 8400, sell: 15000, color: 0xf5f6fa, unlock: 39 },

  // --- Quây xôi (rice_station) ---
  { id: 'xoi_dau_xanh', name: 'Xôi đậu xanh', category: 'fresh', buy: 8100, sell: 15000, color: 0xf9ca24, unlock: 36 },
  { id: 'xoi_man', name: 'Xôi mặn', category: 'fresh', buy: 15100, sell: 25000, color: 0xf5cba7, unlock: 36 },
  { id: 'xoi_trung', name: 'Xôi trứng', category: 'fresh', buy: 9600, sell: 18000, color: 0xfadbd8, unlock: 36 },
  { id: 'xoi_dua', name: 'Xôi dừa', category: 'fresh', buy: 8100, sell: 12000, color: 0xffffff, unlock: 36 },
  { id: 'xoi_thap_cam', name: 'Xôi thập cẩm', category: 'fresh', buy: 14000, sell: 22000, color: 0xe17055, unlock: 36 },
  { id: 'xoi_bap', name: 'Xôi bắp', category: 'fresh', buy: 8000, sell: 13000, color: 0xf9ca24, unlock: 36 },

  // --- Máy ép mía (sugarcane_press) ---
  { id: 'nuoc_mia', name: 'Nước mía', category: 'drink', buy: 3000, sell: 8000, color: 0x00b894, unlock: 25 },

  // --- Cơm (food_grill) ---
  { id: 'com_suon_nuong', name: 'Cơm sườn nướng', category: 'fresh', buy: 26250, sell: 52000, color: 0xd35400, unlock: 40 },
  { id: 'com_chien_trung', name: 'Cơm chiên trứng', category: 'fresh', buy: 5280, sell: 16000, color: 0xf5cba7, unlock: 40 },
  { id: 'canh_rau_thit', name: 'Canh rau thịt', category: 'fresh', buy: 7000, sell: 15000, color: 0x27ae60, unlock: 40 },

  // --- Combo ---
  { id: 'combo_xoi_doi', name: 'Suất Xôi Đôi', category: 'fresh', buy: 24700, sell: 38700, color: 0xe17055, unlock: 36 },
  { id: 'combo_nuoc_doi', name: 'Combo Hai Ly', category: 'drink', buy: 10500, sell: 26100, color: 0x74b9ff, unlock: 26 },
];

// ──────────────────────────────────────────────
// RECIPE LIST
// ──────────────────────────────────────────────

export const RECIPES: Recipe[] = [
  // --- Bếp nướng (food_grill) ---
  { id: 'recipe_banh_mi_trung', name: 'Bánh mì trứng nướng', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 2 }, { productId: 'trung', quantity: 2 }],
    outputId: 'banh_mi_trung_nuong', outputQty: 4, durationMin: 15, unlock: 21, reputationGain: 2 },
  { id: 'recipe_xuc_xich', name: 'Xúc xích nướng', station: 'food_grill',
    inputs: [{ productId: 'xucxich', quantity: 2 }],
    outputId: 'xuc_xich_nuong', outputQty: 10, durationMin: 12, unlock: 22, reputationGain: 1 },
  { id: 'recipe_com_hop_ga', name: 'Cơm hộp gà', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'thit', quantity: 2 }, { productId: 'rau', quantity: 1 }],
    outputId: 'com_hop_ga', outputQty: 4, durationMin: 25, unlock: 23, reputationGain: 3 },
  { id: 'recipe_banh_trang', name: 'Bánh tráng trộn', station: 'food_grill',
    inputs: [{ productId: 'banh', quantity: 2 }, { productId: 'traicay', quantity: 1 }],
    outputId: 'banh_trang_tron', outputQty: 6, durationMin: 10, unlock: 24, reputationGain: 2 },
  { id: 'recipe_com_suon', name: 'Cơm sườn nướng', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'thit', quantity: 2 }, { productId: 'rau', quantity: 1 }],
    outputId: 'com_suon_nuong', outputQty: 4, durationMin: 30, unlock: 40, reputationGain: 4 },
  { id: 'recipe_com_chien', name: 'Cơm chiên trứng', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'trung', quantity: 3 }],
    outputId: 'com_chien_trung', outputQty: 5, durationMin: 20, unlock: 40, reputationGain: 3 },
  { id: 'recipe_canh', name: 'Canh rau thịt', station: 'hot_kettle',
    inputs: [{ productId: 'rau', quantity: 2 }, { productId: 'thit', quantity: 1 }],
    outputId: 'canh_rau_thit', outputQty: 6, durationMin: 18, unlock: 40, reputationGain: 3 },

  // --- Ấm nước (hot_kettle) ---
  { id: 'recipe_tra_gung', name: 'Trà gừng nóng', station: 'hot_kettle',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'nuoc', quantity: 4 }],
    outputId: 'tra_gung_nong', outputQty: 5, durationMin: 10, unlock: 21, reputationGain: 1 },
  { id: 'recipe_mi_trung', name: 'Mì trứng nấu sẵn', station: 'hot_kettle',
    inputs: [{ productId: 'mi', quantity: 1 }, { productId: 'trung', quantity: 1 }],
    outputId: 'mi_trung_nong', outputQty: 2, durationMin: 8, unlock: 21, reputationGain: 2 },
  { id: 'recipe_che_dau_xanh', name: 'Chè đậu xanh', station: 'hot_kettle',
    inputs: [{ productId: 'traicay', quantity: 2 }],
    outputId: 'che_dau_xanh', outputQty: 6, durationMin: 15, unlock: 22, reputationGain: 2 },

  // --- Máy xay (blender) ---
  { id: 'recipe_sinh_to', name: 'Sinh tố trái cây', station: 'blender',
    inputs: [{ productId: 'traicay', quantity: 2 }, { productId: 'suachua', quantity: 2 }],
    outputId: 'sinh_to_trai_cay', outputQty: 4, durationMin: 8, unlock: 25, reputationGain: 2 },
  { id: 'recipe_kem', name: 'Kem trái cây', station: 'blender',
    inputs: [{ productId: 'traicay', quantity: 2 }, { productId: 'suachua', quantity: 2 }, { productId: 'duong', quantity: 1 }],
    outputId: 'kem_trai_cay', outputQty: 5, durationMin: 12, unlock: 28, reputationGain: 3 },

  // --- Quầy pha (drink_counter) ---
  { id: 'recipe_ca_phe_sua', name: 'Cà phê sữa đá', station: 'drink_counter',
    inputs: [{ productId: 'caphe', quantity: 1 }, { productId: 'sua', quantity: 2 }, { productId: 'duong', quantity: 1 }],
    outputId: 'ca_phe_sua_da', outputQty: 6, durationMin: 10, unlock: 25, reputationGain: 2 },
  { id: 'recipe_tra_sua', name: 'Trà sữa', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'sua', quantity: 2 }, { productId: 'duong', quantity: 1 }],
    outputId: 'tra_sua', outputQty: 5, durationMin: 8, unlock: 25, reputationGain: 3 },
  { id: 'recipe_bac_xiu', name: 'Bạc xỉu', station: 'drink_counter',
    inputs: [{ productId: 'caphe', quantity: 1 }, { productId: 'sua', quantity: 3 }],
    outputId: 'bac_xiu', outputQty: 5, durationMin: 8, unlock: 26, reputationGain: 2 },
  { id: 'recipe_tra_dao', name: 'Trà đào cam sả', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'traicay', quantity: 1 }, { productId: 'duong', quantity: 1 }],
    outputId: 'tra_dao_cam_sa', outputQty: 6, durationMin: 10, unlock: 26, reputationGain: 3 },
  { id: 'recipe_ca_phe_den', name: 'Cà phê đen đá', station: 'drink_counter',
    inputs: [{ productId: 'caphe', quantity: 1 }, { productId: 'duong', quantity: 1 }],
    outputId: 'ca_phe_den_da', outputQty: 6, durationMin: 5, unlock: 34, reputationGain: 2 },
  { id: 'recipe_ca_phe_trung', name: 'Cà phê trứng', station: 'drink_counter',
    inputs: [{ productId: 'caphe', quantity: 1 }, { productId: 'trung', quantity: 2 }, { productId: 'sua', quantity: 1 }],
    outputId: 'ca_phe_trung', outputQty: 4, durationMin: 15, unlock: 36, reputationGain: 4 },

  // --- Chảo chiên (fryer) ---
  { id: 'recipe_bap_xao', name: 'Bắp xào', station: 'fryer',
    inputs: [{ productId: 'traicay', quantity: 3 }],
    outputId: 'bap_xao', outputQty: 6, durationMin: 12, unlock: 26, reputationGain: 2 },
  { id: 'recipe_ca_vien', name: 'Cá viên chiên', station: 'fryer',
    inputs: [{ productId: 'ca', quantity: 1 }],
    outputId: 'ca_vien_chien', outputQty: 10, durationMin: 15, unlock: 26, reputationGain: 2 },

  // --- Nồi hấp (steamer) ---
  { id: 'recipe_banh_bao', name: 'Bánh bao hấp nóng', station: 'steamer',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'thit', quantity: 1 }, { productId: 'trung', quantity: 1 }],
    outputId: 'banh_bao_hap', outputQty: 8, durationMin: 20, unlock: 39, reputationGain: 3 },

  // --- Quây xôi (rice_station) ---
  { id: 'recipe_xoi_dau_xanh', name: 'Xôi đậu xanh', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 5 }, { productId: 'traicay', quantity: 5 }],
    outputId: 'xoi_dau_xanh', outputQty: 5, durationMin: 15, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_man', name: 'Xôi mặn', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 5 }, { productId: 'thit', quantity: 5 }, { productId: 'trung', quantity: 5 }],
    outputId: 'xoi_man', outputQty: 5, durationMin: 15, unlock: 36, reputationGain: 3 },
  { id: 'recipe_xoi_trung', name: 'Xôi trứng', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 5 }, { productId: 'trung', quantity: 5 }],
    outputId: 'xoi_trung', outputQty: 5, durationMin: 12, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_dua', name: 'Xôi dừa', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 5 }],
    outputId: 'xoi_dua', outputQty: 5, durationMin: 12, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_thap_cam', name: 'Xôi thập cẩm', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 5 }, { productId: 'thit', quantity: 5 }, { productId: 'trung', quantity: 5 }],
    outputId: 'xoi_thap_cam', outputQty: 5, durationMin: 15, unlock: 36, reputationGain: 3 },
  { id: 'recipe_xoi_bap', name: 'Xôi bắp', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 5 }, { productId: 'traicay', quantity: 5 }],
    outputId: 'xoi_bap', outputQty: 5, durationMin: 12, unlock: 36, reputationGain: 2 },

  // --- Máy ép mía (sugarcane_press) ---
  { id: 'recipe_nuoc_mia', name: 'Nước mía', station: 'sugarcane_press',
    inputs: [{ productId: 'traicay', quantity: 4 }],
    outputId: 'nuoc_mia', outputQty: 6, durationMin: 6, unlock: 25, reputationGain: 1 },

  // --- Combo ---
  { id: 'combo_xoi_doi', name: 'Suất Xôi Đôi', station: 'rice_station',
    inputs: [{ productId: 'xoi_man', quantity: 1 }, { productId: 'xoi_trung', quantity: 1 }],
    outputId: 'combo_xoi_doi', outputQty: 1, durationMin: 5, unlock: 36, reputationGain: 2 },
  { id: 'combo_nuoc_doi', name: 'Combo Hai Ly', station: 'drink_counter',
    inputs: [{ productId: 'tra_sua', quantity: 1 }, { productId: 'ca_phe_sua_da', quantity: 1 }],
    outputId: 'combo_nuoc_doi', outputQty: 1, durationMin: 3, unlock: 26, reputationGain: 2 },
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
