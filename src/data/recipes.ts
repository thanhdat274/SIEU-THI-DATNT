// ============================================================================
// Data: Recipes / Công thức nấu ăn & quầy chế biến
// ----------------------------------------------------------------------------
// Hệ thống nấu ăn: mỗi recipe mô tả nguyên liệu → thành phẩm, thời gian nấu,
// cấp mở khóa, và trạm nấu (station). Thành phẩm tự động thêm vào PRODUCTS.
// ============================================================================

/** Trạm nấu: nơi có thể thực hiện recipe. */
export type CookingStation =
  | 'food_grill'     // Bếp nướng (bánh mì trứng, xúc xích, cơm sườn)
  | 'hot_kettle'     // Bếp nồi nấu (phở, bún, cháo, món kho, chè) — id giữ 'hot_kettle' cho save cũ (GĐ1394)
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
  { id: 'banh_mi_trung_nuong', name: 'Bánh mì trứng nướng', category: 'fresh', buy: 13000, sell: 24700, color: 0xdc7633, unlock: 38 },
  { id: 'xuc_xich_nuong', name: 'Xúc xích nướng', category: 'fresh', buy: 3000, sell: 5700, color: 0xc0392b, unlock: 22 },
  { id: 'com_hop_ga', name: 'Cơm hộp gà', category: 'fresh', buy: 8200, sell: 15600, color: 0xf5cba7, unlock: 30 },
  { id: 'banh_trang_tron', name: 'Bánh tráng trộn', category: 'fresh', buy: 6700, sell: 12700, color: 0xe84393, unlock: 28 },
  // GĐ1322: Bóp gỏi khô bò — món đặc sản vùng (khô bò mối lái dacsan GĐ1321) trộn rau + đường thành mẻ:
  // mẻ (khô bò 62k + rau 10k×2 + đường 17k) = 99k → 8 đĩa × 24k = 192k, lãi 93k/mẻ, nấu hời hơn bán thẳng
  // nguyên liệu (159k < 192k). Khép chuỗi mối lái → bếp, mở 50 = đúng cấp khô bò (sau mốc golden 30 → sim không đổi).
  { id: 'bo_gio_kho_bo', name: 'Bóp gỏi khô bò', category: 'fresh', buy: 12000, sell: 24000, color: 0xb03a2e, unlock: 50 },
  // GĐ1328: Bánh tráng nướng — món ăn vặt trứ danh Sài Gòn từ bánh tráng phơi sương nhà hàng xóm (GĐ1077) + trứng +
  // hành phi + tương ớt quê (GĐ1321): mẻ (bánh tráng 10k + trứng 25k + hành phi 1.5k×2 + tương ớt 30k) = 68k →
  // 8 phần × 22k = 176k, lãi 108k/mẻ, nấu hời hơn bán thẳng nguyên liệu (104k < 176k).
  // Khép chuỗi hàng xóm → bếp nướng, mở 36 (> golden 30 → sim không đổi).
  { id: 'banh_trang_nuong', name: 'Bánh tráng nướng trứng', category: 'fresh', buy: 11000, sell: 22000, color: 0xe67e22, unlock: 36 },
  // GĐ1328: Bánh đa trộn — món trộn Hà Nội từ bánh đa bì bà Tám (GĐ1085) + cà pháo muối + tương ớt quê + thịt heo:
  // mẻ (bánh đa 14k + cà pháo 8k + tương ớt 30k + thịt 30k) = 82k → 8 phần × 24k = 192k, lãi 110k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (123k < 192k). Khép chuỗi hàng xóm → bếp nướng, mở 38 (> golden 30 → sim không đổi).
  { id: 'banh_da_tron', name: 'Bánh đa trộn', category: 'fresh', buy: 12000, sell: 24000, color: 0xb5651d, unlock: 38 },

  // --- Ấm nước (hot_kettle) ---
  { id: 'tra_gung_nong', name: 'Trà gừng nóng', category: 'drink', buy: 7200, sell: 13700, color: 0xd4ac0d, unlock: 23 },
  { id: 'mi_trung_nong', name: 'Mì trứng nấu sẵn', category: 'fresh', buy: 5500, sell: 10500, color: 0xe67e22, unlock: 21 },
  { id: 'che_dau_xanh', name: 'Chè đậu xanh', category: 'fresh', buy: 7800, sell: 14900, color: 0xfadbd8, unlock: 22 },
  // GĐ1094: Hột vịt lộn — mẻ (vịt 32k + rau 10k + muối 5k) = 47k → 10 phần × 7k = 70k, lãi 23k/mẻ, nấu hời hơn bán nguyên liệu (68k < 70k)
  { id: 'hot_vit_lon', name: 'Hột vịt lộn rau răm', category: 'fresh', buy: 3500, sell: 7000, color: 0xd9b382, unlock: 34 },
  // GĐ1660 — hột vịt muối: lối ra thứ hai của trứng vịt trại
  { id: 'hot_vit_muoi', name: 'Hột vịt muối', category: 'fresh', buy: 4000, sell: 7000, color: 0xe9e2c8, unlock: 44 },
  // GĐ1661 — trứng ngỗng luộc: lối ra thứ hai của trứng ngỗng trại (vẫn lỗ hơn bán lẻ → lời khuyên "bán" giữ nguyên)
  { id: 'trung_ngong_luoc', name: 'Trứng ngỗng luộc', category: 'fresh', buy: 18000, sell: 30000, color: 0xf4f1e8, unlock: 45 },
  // GĐ1089: Chè bưởi — mẻ (bưởi 16k + đường 17k) = 33k → 6 phần × 11k = 66k, lãi 33k/mẻ, nấu hời hơn bán nguyên liệu (45k < 66k)
  { id: 'che_buoi', name: 'Chè bưởi', category: 'fresh', buy: 5500, sell: 11000, color: 0xa9dfbf, unlock: 38 },
  // GĐ1091: Chè nhãn — mẻ (nhãn 24k + đường 17k) = 41k → 6 phần × 11k = 66k, lãi 25k/mẻ, nấu hời hơn bán nguyên liệu (55k < 66k)
  { id: 'che_nhan', name: 'Chè nhãn', category: 'fresh', buy: 5500, sell: 11000, color: 0xd5e8d4, unlock: 36 },
  // GĐ1321: Chè hạt sen — món chè thanh mát của hạt sen (mở cấp 74, sau mốc golden 30 → sim không đổi).
  // Mẻ (hạt sen 65k + đường 17k) = 82k → 8 phần × 26.5k = 212k, lãi 130k/mẻ, nấu hời hơn bán nguyên liệu (92k < 212k)
  { id: 'che_hat_sen', name: 'Chè hạt sen', category: 'fresh', buy: 14000, sell: 26500, color: 0xaed6f1, unlock: 74 },
  // GĐ1324: Chè vải — chè thanh mát của vải thiều sấy nhà hàng xóm (hồi mềm nấu đường):
  // mẻ (vải sấy 42k + đường 17k) = 59k → 8 phần × 15k = 120k, lãi 61k/mẻ, nấu hời hơn bán thẳng nguyên liệu (86k < 120k).
  // Khép chuỗi hàng xóm (vải thiều sấy GĐ1083) → ấm nước, mở 38 (sau mốc golden 30 → sim không đổi).
  { id: 'che_vai', name: 'Chè vải', category: 'fresh', buy: 7500, sell: 15000, color: 0x8e5a8a, unlock: 38 },
  // GĐ1331: Thịt kho tương Bần + Cá kho tộ — khép chuỗi 2 gia vị nhà hàng xóm còn "dead stock" (tương Bần
  // hx_tuong_ban GĐ1077, nước mắm cá cơm nhà ủ hx_nuoc_mam GĐ1077 — vốn chỉ bán thẳng làm gia vị) thành 2 món
  // kho cổ truyền. Mở 36/32 sau mốc golden 30 → sim không đổi.
  { id: 'thit_tuong_ban', name: 'Thịt kho tương Bần', category: 'fresh', buy: 11000, sell: 22000, color: 0x8a4b22, unlock: 36 },
  { id: 'ca_kho_to', name: 'Cá kho tộ', category: 'fresh', buy: 19000, sell: 38000, color: 0xcdb79e, unlock: 32 },

  // --- Máy xay (blender) ---
  { id: 'sinh_to_trai_cay', name: 'Sinh tố trái cây', category: 'cold', buy: 7500, sell: 14300, color: 0xfd79a8, unlock: 28 },
  { id: 'kem_trai_cay', name: 'Kem trái cây tự làm', category: 'frozen', buy: 9400, sell: 17900, color: 0xff9ff3, unlock: 28 },
  // GĐ1094: Sữa chua dê — mẻ (dê 45k + trái cây 25k + đường 17k) = 87k → 6 hũ × 22k = 132k, lãi 45k/mẻ, nấu hời hơn bán nguyên liệu (119k < 132k)
  { id: 'sua_chua_de', name: 'Sữa chua dê', category: 'cold', buy: 11000, sell: 22000, color: 0xfdf6ec, unlock: 40 },

  // --- Quầy pha (drink_counter) ---
  { id: 'ca_phe_sua_da', name: 'Cà phê sữa đá', category: 'drink', buy: 9800, sell: 18700, color: 0x6e2c00, unlock: 25 },
  { id: 'tra_sua', name: 'Trà sữa', category: 'drink', buy: 9800, sell: 18600, color: 0xdfe6e9, unlock: 25 },
  { id: 'bac_xiu', name: 'Bạc xỉu', category: 'drink', buy: 9600, sell: 18200, color: 0xf5cba7, unlock: 26 },
  { id: 'tra_dao_cam_sa', name: 'Trà đào cam sả', category: 'drink', buy: 10300, sell: 19600, color: 0xfab1a0, unlock: 28 },
  { id: 'tra_o_mai_mo', name: 'Trà ô mai mơ', category: 'drink', buy: 12000, sell: 21000, color: 0xe8a878, unlock: 168 },
  { id: 'tra_o_mai_me', name: 'Trà ô mai me', category: 'drink', buy: 12000, sell: 21000, color: 0xb87848, unlock: 169 },
  { id: 'tra_o_mai_sau', name: 'Trà ô mai sấu', category: 'drink', buy: 12000, sell: 21000, color: 0xc0d080, unlock: 170 },
  { id: 'tra_o_mai_quat', name: 'Trà ô mai quất', category: 'drink', buy: 12000, sell: 21000, color: 0xf0b040, unlock: 171 },
  { id: 'tra_o_mai_dao', name: 'Trà ô mai đào', category: 'drink', buy: 12000, sell: 21000, color: 0xf0a090, unlock: 172 },
  { id: 'tra_o_mai_cam', name: 'Trà ô mai cam', category: 'drink', buy: 12000, sell: 21000, color: 0xf0a030, unlock: 173 },
  { id: 'tra_o_mai_xoai', name: 'Trà ô mai xoài', category: 'drink', buy: 12000, sell: 21000, color: 0xf0c040, unlock: 174 },
  { id: 'tra_o_mai_man', name: 'Trà ô mai mận', category: 'drink', buy: 12000, sell: 21000, color: 0xc06070, unlock: 178 },
  { id: 'sua_dau_nanh_xay', name: 'Sữa đậu nành tự xay', category: 'drink', buy: 6000, sell: 10000, color: 0xf0e8c8, unlock: 34 },
  { id: 'ca_phe_den_da', name: 'Cà phê đen đá', category: 'drink', buy: 7800, sell: 14900, color: 0x2c3e50, unlock: 34 },
  { id: 'ca_phe_trung', name: 'Cà phê trứng', category: 'drink', buy: 21500, sell: 40900, color: 0xe17055, unlock: 36 },

  // --- Chảo chiên (fryer) ---
  { id: 'bap_xao', name: 'Bắp xào', category: 'fresh', buy: 2700, sell: 5100, color: 0xf9ca24, unlock: 26 },
  { id: 'ca_vien_chien', name: 'Cá viên chiên', category: 'fresh', buy: 5000, sell: 9500, color: 0xe55039, unlock: 32 },
  // GĐ1324: Nem chua rán — đặc sản nhà bà Tám (nem chua hẻm xóm GĐ1085) chiên giòn, món ăn vặt quen thuộc:
  // mẻ (nem chua 9k×2 + đường 17k) = 35k → 8 phần × 9k = 72k, lãi 37k/mẻ, nấu hời hơn bán thẳng nguyên liệu (49k < 72k).
  // Khép chuỗi hàng xóm (bà Tám) → chảo chiên, mở 36 (sau mốc golden 30 → sim không đổi).
  { id: 'nem_chua_ran', name: 'Nem chua rán', category: 'fresh', buy: 4500, sell: 9000, color: 0xd35400, unlock: 36 },
  // GĐ1332: Bánh xèo — món bánh xèo giòn trứ danh (Mỹ Tho/Đà Nẵng) từ bột gạo + nước cốt dừa + thịt + hành phi:
  // trước nay TỘT KHÔNG có bánh xèo trong bếp dù là món ăn biểu tượng nhất — lấp khoảng trống trạm chảo chiên.
  // Mẻ (bột gạo 9k + nước cốt dừa 10k + thịt 30k + hành phi 1.5k×2) = 52k → 6 cái × 19k = 114k, lãi 62k/mẻ.
  { id: 'banh_xeo', name: 'Bánh xèo', category: 'fresh', buy: 9500, sell: 19000, color: 0xf0a830, unlock: 36 },
  // GĐ1333: Chả giò chiên — `cha` (Chả giò đông lạnh) có bán sẵn nhưng CHƯA có món "rán vàng giòn" (món Tết/ăn vặt
  // quen thuộc nhất) — lấp khoảng trống trạm chảo chiên. Mẻ (chả giò 35k + hành phi 3k + muối 5k) = 43k → 8×16k = 128k, lãi 85k/mẻ.
  { id: 'cha_gio_chien', name: 'Chả giò chiên', category: 'fresh', buy: 8000, sell: 16000, color: 0xc98a2d, unlock: 36 },
  // GĐ1335: Phở bò — món QUỐC HỘI ẩm thực VN trước nay chỉ có phở gói bán sẵn, chưa có lối ra nấu (bỏ trống
  // trạm ấm nước). Mẻ (phở gói 8k + thịt 60k + hành phi 3k) = 71k → 10 tô × 15k = 150k, lãi 79k/mẻ.
  { id: 'pho_bo', name: 'Phở bò', category: 'fresh', buy: 7500, sell: 15000, color: 0xd9b382, unlock: 36 },
  // GĐ1336: Bánh mì thịt nướng — biểu tượng bánh mì Sài Gòn: `banhmi` (unlock 38) vốn chỉ có bản trứng, chưa có
  // bản thịt nướng ở bếp nướng. Mẻ (bánh mì 8k×5 + thịt heo 30k + hành phi 3k) = 73k → 5 bánh × 25k = 125k, lãi 52k/mẻ.
  { id: 'banh_mi_thit', name: 'Bánh mì thịt nướng', category: 'fresh', buy: 13000, sell: 25000, color: 0xb05c2a, unlock: 38 },
  // GĐ1337: Bún bò Huế — món bún cay đậm đà trứ danh: nguyên liệu bún tươi mới thêm (`bun` 33). Mẻ (bún 12k +
  // thịt 60k + hành phi 3k) = 75k → 10 tô × 18k = 180k, lãi 105k/mẻ.
  { id: 'bun_bo_hue', name: 'Bún bò Huế', category: 'fresh', buy: 8500, sell: 18000, color: 0xb03a2e, unlock: 36 },
  // GĐ1338: Mì Quảng — món mì vàng đậm đà Quảng Nam, phủ da lợn/rộng hành (nguyên liệu mì `mi` + thịt + hành phi):
  // mẻ (mì 3k + thịt 60k + hành phi 3k) = 66k → 10 tô × 17k = 170k, lãi 104k/mẻ.
  { id: 'mi_quang', name: 'Mì Quảng', category: 'fresh', buy: 8000, sell: 17000, color: 0xe6b422, unlock: 36 },
  // GĐ1339: Gà kho gừng — món kho gia đình trứ danh: gà nguyên con (`thit_ga` 52) kho gừng + nước mắm nhà ủ
  // (`hx_nuoc_mam` — lối ra thứ 2). Mẻ (gà 130k + gừng 7k + nước mắm 30k) = 167k → 8 phần × 45k = 360k, lãi 193k/mẻ.
  { id: 'ga_kho_gung', name: 'Gà kho gừng', category: 'fresh', buy: 22000, sell: 45000, color: 0xb5651d, unlock: 52 },
  // GĐ1340: Sữa chua trái cây — món mát trứ danh Đà Lạt, dày hơn trạm máy xay (trước chỉ 3 món): mẻ
  // (sữa chua 5k×2 + trái cây 25k + đường 17k) = 52k → 6 hũ × 14k = 84k, lãi 32k/mẻ.
  { id: 'sua_chua_trai_cay', name: 'Sữa chua trái cây', category: 'cold', buy: 9000, sell: 14000, color: 0xffb6c1, unlock: 36 },
  // GĐ1341: Hủ tiếu nam vang — món hủ tiếu Sa Đéc trứ danh, nguyên liệu hủ tiếu mới thêm (`hut_tieu` 34): mẻ
  // (hủ tiếu 10k + thịt 60k + hành phi 3k) = 73k → 10 tô × 18k = 180k, lãi 107k/mẻ.
  { id: 'hut_tieu_nam_vang', name: 'Hủ tiếu nam vang', category: 'fresh', buy: 8500, sell: 18000, color: 0xe0c068, unlock: 36 },
  // GĐ1342: 2 món nướng của hàng THỊT CÁ TƯƠI (nguồn cung còn trống — 0 lối ra trước nay):
  // Gà ta nướng muối ớt (ga_ta_tuoi 34): mẻ (gà 130k + muối 5k + hành phi 3k) = 138k → 6 phần × 42k = 252k, lãi 114k/mẻ.
  { id: 'ga_ta_nuong_muoi', name: 'Gà ta nướng muối ớt', category: 'fresh', buy: 23000, sell: 42000, color: 0xd4a017, unlock: 36 },
  // Cá lóc nướng muối (ca_loc_tuoi 33): mẻ (cá lóc 70k + muối 5k + hành phi 3k) = 78k → 6 con × 28k = 168k, lãi 90k/mẻ.
  { id: 'ca_loc_nuong_muoi', name: 'Cá lóc nướng muối', category: 'fresh', buy: 13000, sell: 28000, color: 0x8f9779, unlock: 36 },
  // GĐ1343: 3 món khép nốt quầy thịt cá (còn 3 mục 0 lối ra sau GĐ1342):
  // Thịt kho trứng (thịt kho tàu, thit_heo_tuoi 32): mẻ (heo tươi 95k + trứng 25k + nước cốt dừa 10k) = 130k → 8 phần × 30k = 240k, lãi 110k/mẻ.
  { id: 'thit_kho_trung', name: 'Thịt kho trứng', category: 'fresh', buy: 16000, sell: 30000, color: 0x8b4513, unlock: 36 },
  // Cá rô phi chiên (ca_ro_phi_tuoi 35): mẻ (cá rô 55k + hành phi 3k) = 58k → 6 con × 18k = 108k, lãi 50k/mẻ.
  { id: 'ca_ro_phi_chien', name: 'Cá rô phi chiên', category: 'fresh', buy: 9000, sell: 18000, color: 0xb8a33d, unlock: 36 },
  // Bò kho (thit_bo_tuoi 38 + bún 33 + gừng 20): mẻ (bò 210k + bún 12k + gừng 7k) = 229k → 8 tô × 45k = 360k, lãi 131k/mẻ.
  { id: 'bo_kho', name: 'Bò kho', category: 'fresh', buy: 28000, sell: 45000, color: 0xa0522d, unlock: 38 },
  // GĐ1344: Thịt kho dưa — món kho Nam Bộ trứ danh, khép lối ra cuối cùng của dưa muối nhà hàng xóm
  // (hx_dua_muoi 14 — nguồn cung còn 0 lối ra): mẻ (thịt heo 30k + dưa muối 7k + hành phi 3k) = 40k
  // → 8 phần × 15k = 120k, lãi 80k/mẻ.
  { id: 'thit_kho_dua', name: 'Thịt kho dưa', category: 'fresh', buy: 7500, sell: 15000, color: 0x7a5230, unlock: 36 },
  // GĐ1350: Bánh bao kim sa — bánh bao cao cấp trứ danh (nhân lòng đỏ trứng muối chảy béo mặn ngọt), khép lối ra
  // của trứng muối (`trung_muoi` 51 — nguồn cung còn 0 lối ra): mẻ (bột mì 18k×2 + trứng muối 30k + sữa đặc 22k)
  // = 88k → 10 bánh × 18k = 180k, lãi 92k/mẻ.
  { id: 'banh_bao_kim_sa', name: 'Bánh bao kim sa', category: 'fresh', buy: 9500, sell: 18000, color: 0xe8c04a, unlock: 52 },
  // GĐ1351: Chả cá Lã Vọng — món Hà Nội trứ danh (chả cá thác lác nướng than, rưới mỡ hành), khép lối ra của
  // chả cá thác lác (`cha_ca` 76 — nguồn cung cao cấp cuối-game còn 0 lối ra): mẻ (chả cá 120k + nước mắm
  // nhà ủ 30k + hành phi 3k) = 153k → 6 phần × 55k = 330k, lãi 177k/mẻ.
  { id: 'cha_ca_la_vong', name: 'Chả cá Lã Vọng', category: 'fresh', buy: 28000, sell: 55000, color: 0xd4a017, unlock: 76 },
  // GĐ1352: 2 món khép nốt nguồn cao cấp cuối-game còn 0 lối ra:
  // Cá basa chiên sả (ca_basa 72): mẻ (basa 85k + gừng 7k + hành phi 3k) = 95k → 6 con × 32k = 192k, lãi 97k/mẻ.
  { id: 'ca_basa_chien_sa', name: 'Cá basa chiên sả', category: 'fresh', buy: 15000, sell: 32000, color: 0xd9a33c, unlock: 72 },
  // Sò điệp nướng mỡ hành (so_diep 67): mẻ (sò điệp 180k + hành phi 3k) = 183k → 6 vỏ × 50k = 300k, lãi 117k/mẻ.
  { id: 'so_diep_nuong_mo_hanh', name: 'Sò điệp nướng mỡ hành', category: 'fresh', buy: 32000, sell: 50000, color: 0xe8a87c, unlock: 67 },
  // GĐ1353: Bò Nhật nướng muối — thăn bò Nhật (thit_bo_nhat 69) nướng muối kiểu teppanyaki, món xa xỉ bậc nhất:
  // mẻ (bò 450k + muối 5k + hành phi 3k) = 458k → 6 phần × 130k = 780k, lãi 322k/mẻ.
  { id: 'bo_nhat_nuong_muoi', name: 'Bò Nhật nướng muối', category: 'fresh', buy: 76000, sell: 130000, color: 0x68228b, unlock: 69 },
  // GĐ1355: 2 món biểu tượng khép lối ra của gà nguyên con (thứ 2) và pate (đầu tiên):
  // Cháo gà (gao + thit_ga 52): mẻ (gạo 80k + gà 130k + hành phi 3k) = 213k → 30 chén × 15k = 450k, lãi 237k/mẻ.
  { id: 'chao_ga', name: 'Cháo gà', category: 'fresh', buy: 7000, sell: 15000, color: 0xf7f3e3, unlock: 52 },
  // Bánh mì pate (pate 62): mẻ (bánh mì 8k×5 + pate 55k + hành phi 3k) = 98k → 5 bánh × 32k = 160k, lãi 62k/mẻ.
  { id: 'banh_mi_pate', name: 'Bánh mì pate', category: 'fresh', buy: 17000, sell: 32000, color: 0x8d6e63, unlock: 62 },
  // GĐ1357: Yến chưng đường phèn — món bồi bổ xa xỉ trứ danh, khép lối ra của tổ yến (`to_yen` 66 — mặt hàng
  // đắt nhất tiệm): mẻ (yến 700k + đường 17k) = 717k → 6 chén × 180k = 1080k, lãi 363k/mẻ.
  { id: 'yen_chung', name: 'Yến chưng đường phèn', category: 'fresh', buy: 115000, sell: 180000, color: 0xfdf5e6, unlock: 66 },
  // GĐ1358: Bánh mì jambon phô mai — bản bánh mì premium cuối-game, khép lối ra của jambon (`jambon` 61):
  // mẻ (jambon 90k + bánh mì 8k×5 + phô mai 25k + hành phi 3k) = 158k → 5 bánh × 55k = 275k, lãi 117k/mẻ.
  { id: 'banh_mi_jambon', name: 'Bánh mì jambon phô mai', category: 'fresh', buy: 30000, sell: 55000, color: 0xe88d8d, unlock: 62 },
  // GĐ1359: Nước mía chanh — món hè giải nhiệt kinh điển, công thức thứ 2 của máy ép mía (trước chỉ có
  // nước mía): mẻ (mía 12k×4 + chanh không hạt 10k + đường 17k) = 75k → 10 ly × 13k = 130k, lãi 55k/mẻ.
  { id: 'nuoc_mia_chanh', name: 'Nước mía chanh', category: 'drink', buy: 6500, sell: 13000, color: 0xd4e157, unlock: 36 },
  // GĐ1360: 2 món khép lối ra của chà bông (41 — còn 0 lối ra) và nếp cẩm:
  // Bánh mì chà bông (banhmi + cha_bong 41): mẻ (bánh mì 8k×5 + chà bông 32k + hành phi 3k) = 75k → 5 bánh × 26k = 130k, lãi 55k/mẻ.
  { id: 'banh_mi_cha_bong', name: 'Bánh mì chà bông', category: 'fresh', buy: 14000, sell: 26000, color: 0xc0392b, unlock: 42 },
  // Sữa chua nếp cẩm (nep_cam 70 + sữa chua): mẻ (nếp cẩm 55k + sữa chua 5k×2 + đường 17k) = 82k → 6 hũ × 22k = 132k, lãi 50k/mẻ.
  { id: 'sua_chua_nep_cam', name: 'Sữa chua nếp cẩm', category: 'cold', buy: 14000, sell: 22000, color: 0x9b59b6, unlock: 70 },
  // GĐ1363: Hộp quà trà bánh quy — giỏ biếu premium LUÔN CÓ SẴN (không cần dịp lễ, mở rộng gift_wrap ngoài
  // lễ), khép lối ra của bánh quy nhập (`banh_quy_nhap` 65): mẻ (bánh quy 120k + trà 20k×2) = 160k
  // → 2 hộp × 120k = 240k, lãi 80k/mẻ.
  { id: 'hop_qua_tra_banh_quy', name: 'Hộp quà trà bánh quy', category: 'dry', buy: 78000, sell: 120000, color: 0xd4ac0d, unlock: 65 },
  // GĐ1364: Bánh canh tôm — món sợi bánh canh dai trứ danh, khép lối ra của tôm đông lạnh (`hai_san` 43):
  // mẻ (tôm 90k + bột gạo 9k + hành phi 3k) = 102k → 8 tô × 22k = 176k, lãi 74k/mẻ.
  { id: 'banh_canh_tom', name: 'Bánh canh tôm', category: 'fresh', buy: 12000, sell: 22000, color: 0xff9a76, unlock: 44 },
  // GĐ1365: Cá hồi áp chảo — món cao cấp kiểu Nhật trứ danh, khép lối ra của cá hồi phi lê (`ca_hoi` 53):
  // mẻ (cá hồi 320k + hành phi 3k + muối 5k) = 328k → 6 phần × 90k = 540k, lãi 212k/mẻ.
  { id: 'ca_hoi_ap_chao', name: 'Cá hồi áp chảo', category: 'fresh', buy: 54000, sell: 90000, color: 0xff8a65, unlock: 53 },
  // GĐ1366: Mực khô nướng — món nhậu trứ danh bên mâm bia, khép lối ra của mực khô (`muc_kho` 49):
  // mẻ (mực 120k + hành phi 3k + muối 5k) = 128k → 6 con × 32k = 192k, lãi 64k/mẻ.
  { id: 'muc_kho_nuong', name: 'Mực khô nướng', category: 'fresh', buy: 21000, sell: 32000, color: 0xd5aa6f, unlock: 49 },
  // GĐ1367: 2 món nướng khép lối ra của lạp xưởng (44) và thịt cừu (56):
  // Lạp xưởng nướng (lap_xuong 44): mẻ (lạp xưởng 72k + hành phi 3k + muối 5k) = 80k → 10 cây × 13k = 130k, lãi 50k/mẻ.
  { id: 'lap_xuong_nuong', name: 'Lạp xưởng nướng', category: 'fresh', buy: 7500, sell: 13000, color: 0xc0392b, unlock: 44 },
  // Cừu nướng (thit_cu 56): mẻ (cừu 250k + muối 5k + hành phi 3k) = 258k → 6 phần × 70k = 420k, lãi 162k/mẻ.
  { id: 'cuu_nuong', name: 'Cừu nướng', category: 'fresh', buy: 43000, sell: 70000, color: 0x9a5d3f, unlock: 56 },
  // GĐ1368: Gà xào hạt điều — món xào Hoa-Việt trứ danh, khép lối ra của hạt điều (`hat` 37):
  // mẻ (gà nguyên con 130k + hạt điều 60k + hành phi 3k) = 193k → 6 phần × 45k = 270k, lãi 77k/mẻ.
  { id: 'ga_xao_hat_dieu', name: 'Gà xào hạt điều', category: 'fresh', buy: 32000, sell: 45000, color: 0xcc8e35, unlock: 52 },
  // GĐ1369: 2 món lành tính khép lối ra của tôm khô (47) và yến mạch (40):
  // Bún xào tôm khô (bun + tom_kho 47): mẻ (bún 12k + tôm khô 65k + hành phi 3k) = 80k → 8 tô × 17k = 136k, lãi 56k/mẻ.
  // Cháo yến mạch (yen_mach 40 + sữa tươi): mẻ (yến mạch 45k + sữa tươi 28k) = 73k → 6 chén × 18k = 108k, lãi 35k/mẻ.
  { id: 'chao_yen_mach', name: 'Cháo yến mạch', category: 'fresh', buy: 11500, sell: 18000, color: 0xd8b998, unlock: 40 },
  // GĐ1370: Bò hầm rượu vang — món hầm Pháp trứ danh, khép lối ra của rượu vang nhập (`ruou_vang_nhap` 58):
  // mẻ (bò tươi 210k + vang 450k + hành phi 3k) = 663k → 6 phần × 180k = 1080k, lãi 417k/mẻ.
  { id: 'bo_ham_vang', name: 'Bò hầm rượu vang', category: 'fresh', buy: 108000, sell: 180000, color: 0x6d214f, unlock: 58 },
  // GĐ1375: Chuối chiên — món ăn vặt quốc dân, khép lối ra bếp của chuối nông trại (`x_chuoi` 22):
  // mẻ (chuối 12k + bột mì 18k + hành phi 3k) = 33k → 10 que × 6k = 60k, lãi 27k/mẻ.
  { id: 'chuoi_chien', name: 'Chuối chiên', category: 'fresh', buy: 3300, sell: 6000, color: 0xf1c40f, unlock: 36 },
  // GĐ1376: Kem dừa — món kem Đà Lạt trứ danh (kem tươi dừa đánh lạnh), khép combo cốt dừa × máy xay:
  // mẻ (sữa tươi 28k + nước cốt dừa 10k + đường 17k) = 55k → 8 hũ × 20k = 160k, lãi 105k/mẻ.
  { id: 'kem_dua', name: 'Kem dừa', category: 'frozen', buy: 7000, sell: 20000, color: 0xfff3e0, unlock: 38 },
  // GĐ1377: Bánh mì que — đặc sản Nha Trang trứ danh (que bánh mì mỏng giòn nhồi pate que cay):
  // mẻ (bánh mì 8k×4 + hành phi 3k) = 35k → 20 que × 4k = 80k, lãi 45k/mẻ.
  { id: 'banh_mi_que', name: 'Bánh mì que', category: 'fresh', buy: 2000, sell: 4000, color: 0xd9a66c, unlock: 38 },
  // GĐ1379: Bánh da lợn — bánh dân gian trứ danh (lớn bột gạo + lá dứa xanh, lớp cốt dừa trắng):
  // mẻ (bột gạo 9k + nước cốt dừa 10k + đường 17k) = 36k → 12 miếng × 6k = 72k, lãi 36k/mẻ.
  { id: 'banh_da_lon', name: 'Bánh da lợn', category: 'fresh', buy: 3000, sell: 6000, color: 0x27ae60, unlock: 38 },
  // GĐ1380: Chè trôi nước — bánh trôi chảy dân gian trứ danh (viên nếp nhân đường trôi nước ngọt):
  // mẻ (nếp 30k + đường 17k + nước cốt dừa 10k) = 57k → 12 viên × 9k = 108k, lãi 51k/mẻ.
  { id: 'che_troi_nuoc', name: 'Chè trôi nước', category: 'fresh', buy: 4750, sell: 9000, color: 0xf5e6c8, unlock: 38 },
  // GĐ1381: Chè Thái — chè trái cây thập cẩm trứ danh (trái cây trộn sữa tươi lạnh):
  // mẻ (trái cây 25k + sữa tươi 28k + đường 17k) = 70k → 6 chén × 22k = 132k, lãi 62k/mẻ.
  { id: 'che_thai', name: 'Chè Thái', category: 'fresh', buy: 11500, sell: 22000, color: 0xff6b81, unlock: 40 },
  // GĐ1383: Chè bắp — chè ngọt dân gian trứ danh (hạt bắp nếp nấu dẻo chan cốt dừa):
  // mẻ (bắp 8k + nếp 30k + nước cốt dừa 10k + đường 17k) = 65k → 8 chén × 16k = 128k, lãi 63k/mẻ.
  { id: 'che_bap', name: 'Chè bắp', category: 'fresh', buy: 8000, sell: 16000, color: 0xf9e79f, unlock: 40 },
  // GĐ1672 — chè chuối: chè quốc dân từ chuối nhà trồng + nước cốt dừa
  { id: 'che_chuoi', name: 'Chè chuối', category: 'fresh', buy: 7000, sell: 14000, color: 0xf3e2b0, unlock: 44 },
  // GĐ1384: Bún mắm — món nước miền Tây trứ danh (nước lèo mắm ruốc đậm đà):
  // mẻ (bún 12k + mắm ruốc 36k + thịt heo 30k + hành phi 3k) = 81k → 8 tô × 18k = 144k, lãi 63k/mẻ.
  { id: 'bun_mam', name: 'Bún mắm', category: 'fresh', buy: 10000, sell: 18000, color: 0x8d6e4c, unlock: 40 },
  // GĐ1385: Cơm hến — món Huế dân dã trứ danh, khép lối ra của nghêu tươi (`ngheu` 57):
  // mẻ (gạo 80k + nghêu 45k + hành phi 3k) = 128k → 30 phần × 12k = 360k, lãi 232k/mẻ.
  { id: 'com_hen', name: 'Cơm hến', category: 'fresh', buy: 4200, sell: 12000, color: 0xcdaa7d, unlock: 57 },
  // GĐ1386: Xôi chiên phồng — đặc sản mộc mạc trứ danh (viên xôi nếp chiên phồng giòn rụm):
  // mẻ (nếp 30k + bột mì 18k + hành phi 3k) = 51k → 12 viên × 8k = 96k, lãi 45k/mẻ.
  { id: 'xoi_chien_phong', name: 'Xôi chiên phồng', category: 'fresh', buy: 4000, sell: 8000, color: 0xe8b04a, unlock: 38 },
  // GĐ1387: Bánh khúc — đặc sản đồng bằng trứ danh (vỏ nếp xanh lá làm từ bắp, nhân đậu xanh):
  // mẻ (nếp 30k + đậu xanh 15k + bắp 8k) = 53k → 10 cái × 10k = 100k, lãi 47k/mẻ.
  { id: 'banh_khuc', name: 'Bánh khúc', category: 'fresh', buy: 5300, sell: 10000, color: 0x58b368, unlock: 38 },
  // GĐ1389: Bánh chưng tự gói — món Tết trứ danh gói tay (khác x_banh_chung mua sỉ), gói trong đúng dịp Tết:
  // mẻ (nếp 30k + đậu xanh 15k + thịt heo 30k) = 75k → 10 bánh × 15k = 150k, lãi 75k/mẻ.
  { id: 'banh_chung_tu', name: 'Bánh chưng tự gói', category: 'fresh', buy: 7500, sell: 15000, color: 0x27ae60, unlock: 31 },
  // GĐ1390: Gỏi cuốn — món ăn lành trứ danh (bánh tráng gói tôm luộc):
  // mẻ (bánh tráng 5k×2 + tôm đông lạnh 90k) = 100k → 12 cuốn × 14k = 168k, lãi 68k/mẻ.
  { id: 'goi_cuon', name: 'Gỏi cuốn', category: 'fresh', buy: 8500, sell: 14000, color: 0xa8d8b9, unlock: 44 },
  // GĐ1414: Bò bít tết — lối ra ĐẦU TIÊN của thịt bò Úc: mẻ (bò 180k + trứng) → 10 phần × 35k = 350k.
  { id: 'bo_bit_tet', name: 'Bò bít tết', category: 'fresh', buy: 22000, sell: 35000, color: 0x8a3b2a, unlock: 50 },
  // GĐ1413: Bánh pía nướng nóng — lối ra ĐẦU TIÊN của bánh pía: 1 hộp (28k) nướng lại → 4 cái × 14k = 56k.
  { id: 'banh_pia_nuong', name: 'Bánh pía nướng nóng', category: 'dry', buy: 9000, sell: 14000, color: 0xc98a4a, unlock: 40 },
  // GĐ1412: Trà thảo mộc nấu — lối ra ĐẦU TIÊN của trà thảo mộc hộp ở bếp: mẻ (trà 65k + đường 17k) → 12 ly × 12k.
  { id: 'tra_thao_moc_nau', name: 'Trà thảo mộc nấu', category: 'drink', buy: 7000, sell: 12000, color: 0x6f9a5a, unlock: 59 },
  // GĐ1411: Gà nướng mật ong — lối ra ĐẦU TIÊN của mật ong rừng: mẻ (gà 130k + mật ong 260k) → 12 phần × 55k = 660k.
  { id: 'ga_nuong_mat_ong', name: 'Gà nướng mật ong', category: 'fresh', buy: 39000, sell: 55000, color: 0xc8782a, unlock: 82 },
  // GĐ1410: Mì xào trứng — lối ra ĐẦU TIÊN của mì tươi vắt: mẻ (mì + trứng + rau muống ≈ 14.5k) → 4 đĩa × 25k.
  { id: 'mi_xao_trung', name: 'Mì xào trứng', category: 'fresh', buy: 15000, sell: 25000, color: 0xe0b85a, unlock: 40 },
  // GĐ1415: Hột vịt lộn luộc — lối ra ĐẦU TIÊN của hột vịt lộn.
  { id: 'hot_vit_luoc', name: 'Hột vịt lộn luộc', category: 'fresh', buy: 5000, sell: 9000, color: 0xd8c8a0, unlock: 35 },
  // GĐ1415: Bánh mì bơ tỏi — lối ra ĐẦU TIÊN của bơ muối.
  { id: 'banh_mi_bo_toi', name: 'Bánh mì bơ tỏi', category: 'fresh', buy: 12000, sell: 20000, color: 0xe8c070, unlock: 63 },
  // GĐ1416: Sữa yến mạch đường đen — lối ra ĐẦU TIÊN của sữa yến mạch.
  { id: 'sua_yen_mach_xay', name: 'Sữa yến mạch đường đen', category: 'drink', buy: 9000, sell: 15000, color: 0xd8c49a, unlock: 73 },
  // GĐ1416: Sữa hạt mắc ca — lối ra ĐẦU TIÊN của hạt mắc ca.
  { id: 'sua_hat_macca', name: 'Sữa hạt mắc ca', category: 'drink', buy: 20000, sell: 28000, color: 0xeadcc0, unlock: 86 },
  // GĐ1416: Chè yến chưng đường phèn — lối ra ĐẦU TIÊN của tổ yến sào.
  { id: 'che_yen', name: 'Chè yến chưng đường phèn', category: 'fresh', buy: 43000, sell: 60000, color: 0xf3ead2, unlock: 96 },
  // GĐ1417: Kem chiên — lối ra ĐẦU TIÊN của kem que.
  { id: 'kem_chien', name: 'Kem chiên', category: 'fresh', buy: 8000, sell: 14000, color: 0xf0d080, unlock: 35 },
  // GĐ1417: Bánh bao hấp nóng — lối ra ĐẦU TIÊN của bánh bao.
  { id: 'banh_bao_dong_lanh_hap', name: 'Bánh bao hấp từ đông lạnh', category: 'fresh', buy: 10000, sell: 18000, color: 0xf5efe0, unlock: 35 },
  // GĐ1417: Sinh tố sữa chua nếp — lối ra ĐẦU TIÊN của sữa chua nếp cốc.
  { id: 'sinh_to_sua_chua_nep', name: 'Sinh tố sữa chua nếp', category: 'drink', buy: 7000, sell: 12000, color: 0xe6d4e8, unlock: 43 },
  // GĐ1418: Cánh gà chiên nước mắm — lối ra ĐẦU TIÊN của nước mắm.
  { id: 'canh_ga_chien_mam', name: 'Cánh gà chiên nước mắm', category: 'fresh', buy: 15000, sell: 24000, color: 0xc0702a, unlock: 35 },
  // GĐ1418: Trà mứt gừng ngày Tết — lối ra ĐẦU TIÊN của mứt Tết.
  { id: 'tra_mut_gung', name: 'Trà mứt gừng ngày Tết', category: 'drink', buy: 6000, sell: 10000, color: 0xd8a050, unlock: 50 },
  // GĐ1419: Trứng chiên dầu (suất) — lối ra ĐẦU TIÊN của dầu ăn.
  { id: 'trung_chien_dau', name: 'Trứng chiên dầu (suất)', category: 'fresh', buy: 5000, sell: 8000, color: 0xf2c94c, unlock: 35 },
  // GĐ1419: Sinh tố sữa hạt — lối ra ĐẦU TIÊN của sữa hạt lốc 4.
  { id: 'sinh_to_sua_hat', name: 'Sinh tố sữa hạt', category: 'drink', buy: 7000, sell: 12000, color: 0xe2cfa8, unlock: 41 },
  // GĐ1420: Cà phê hòa tan sữa đá — lối ra ĐẦU TIÊN của cà phê hòa tan hộp thiếc.
  { id: 'ca_phe_hoa_tan_da', name: 'Cà phê hòa tan sữa đá', category: 'drink', buy: 6000, sell: 9000, color: 0x7a4a2a, unlock: 44 },
  // GĐ1420: Sinh tố kem — lối ra ĐẦU TIÊN của kem cây hộp 10.
  { id: 'sinh_to_kem', name: 'Sinh tố kem', category: 'drink', buy: 7000, sell: 12000, color: 0xf5e1c8, unlock: 45 },
  // GĐ1421: Khoai tây chiên giòn — lối ra ĐẦU TIÊN của khoai tây chiên đông lạnh.
  { id: 'khoai_tay_chien_gion', name: 'Khoai tây chiên giòn', category: 'fresh', buy: 5000, sell: 8000, color: 0xf2c14e, unlock: 35 },
  // GĐ1421: Gà viên chiên — lối ra ĐẦU TIÊN của gà viên đông lạnh.
  { id: 'ga_vien_chien', name: 'Gà viên chiên', category: 'fresh', buy: 4000, sell: 7000, color: 0xd9963a, unlock: 37 },
  // GĐ1421: Cá basa chiên giòn — lối ra ĐẦU TIÊN của cá basa phi lê.
  { id: 'ca_basa_chien_gion', name: 'Cá basa chiên giòn', category: 'fresh', buy: 9000, sell: 15000, color: 0xe0b070, unlock: 39 },
  // GĐ1421: Pizza nướng nóng (miếng) — lối ra ĐẦU TIÊN của pizza đông lạnh.
  { id: 'pizza_nuong_nong', name: 'Pizza nướng nóng (miếng)', category: 'fresh', buy: 5000, sell: 9000, color: 0xd8573a, unlock: 41 },
  // GĐ1422: Mực khoanh chiên giòn — lối ra ĐẦU TIÊN của mực khoanh đông lạnh.
  { id: 'muc_khoanh_chien', name: 'Mực khoanh chiên giòn', category: 'fresh', buy: 6000, sell: 9000, color: 0xe8c890, unlock: 43 },
  // GĐ1422: Cánh gà nướng — lối ra ĐẦU TIÊN của cánh gà đông lạnh.
  { id: 'canh_ga_nuong_mat', name: 'Cánh gà nướng mật ong', category: 'fresh', buy: 6000, sell: 9000, color: 0xb8602a, unlock: 45 },
  // GĐ1422: Chả cá thác lác chiên — lối ra ĐẦU TIÊN của chả cá thác lác.
  { id: 'cha_ca_thac_lac_chien', name: 'Chả cá thác lác chiên', category: 'fresh', buy: 6000, sell: 9000, color: 0xd8b070, unlock: 47 },
  // GĐ1422: Cá hồi phi lê nướng — lối ra ĐẦU TIÊN của cá hồi phi lê.
  { id: 'ca_hoi_phi_le_nuong', name: 'Cá hồi phi lê nướng', category: 'fresh', buy: 13000, sell: 20000, color: 0xf08a5d, unlock: 45 },
  // GĐ1423: Sinh tố bơ — lối ra ĐẦU TIÊN của bơ.
  { id: 'sinh_to_bo_sap', name: 'Sinh tố bơ', category: 'drink', buy: 7000, sell: 12000, color: 0xa8c060, unlock: 49 },
  // GĐ1423: Nước ép thơm — lối ra ĐẦU TIÊN của thơm (dứa).
  { id: 'nuoc_ep_thom', name: 'Nước ép thơm', category: 'drink', buy: 7000, sell: 12000, color: 0xf2d04a, unlock: 51 },
  // GĐ1423: Sinh tố đu đủ — lối ra ĐẦU TIÊN của đu đủ.
  { id: 'sinh_to_du_du', name: 'Sinh tố đu đủ', category: 'drink', buy: 7000, sell: 12000, color: 0xf0904a, unlock: 53 },
  // GĐ1423: Sinh tố thanh long tím — lối ra ĐẦU TIÊN của thanh long ruột tím.
  { id: 'sinh_to_thanh_long', name: 'Sinh tố thanh long tím', category: 'drink', buy: 7000, sell: 12000, color: 0xc0306a, unlock: 55 },
  // GĐ1424: Canh sườn bí đỏ — lối ra ĐẦU TIÊN của sườn heo.
  { id: 'canh_suon_bi_do', name: 'Canh sườn bí đỏ', category: 'fresh', buy: 8000, sell: 12000, color: 0xe89a3a, unlock: 57 },
  // GĐ1424: Canh khổ qua nhồi thịt — lối ra ĐẦU TIÊN của khổ qua.
  { id: 'canh_kho_qua_nhoi', name: 'Canh khổ qua nhồi thịt', category: 'fresh', buy: 7000, sell: 11000, color: 0x6a9a4a, unlock: 37 },
  // GĐ1424: Bò xào bông cải — lối ra ĐẦU TIÊN của bông cải xanh.
  { id: 'bo_xao_bong_cai', name: 'Bò xào bông cải', category: 'fresh', buy: 10000, sell: 16000, color: 0x5a8a3a, unlock: 35 },
  // GĐ1424: Cá thu chiên — lối ra ĐẦU TIÊN của cá thu tươi.
  { id: 'ca_thu_chien', name: 'Cá thu chiên', category: 'fresh', buy: 6000, sell: 10000, color: 0xb08a5a, unlock: 37 },
  // GĐ1425: Tôm hấp nước dừa — lối ra ĐẦU TIÊN của tôm tươi.
  { id: 'tom_tuoi_hap', name: 'Tôm hấp nước dừa', category: 'fresh', buy: 7000, sell: 12000, color: 0xf08060, unlock: 37 },
  // GĐ1425: Mực hấp gừng — lối ra ĐẦU TIÊN của mực tươi.
  { id: 'muc_hap_gung', name: 'Mực hấp gừng', category: 'fresh', buy: 8000, sell: 13000, color: 0xf0e0d0, unlock: 41 },
  // GĐ1425: Cá rô phi chiên xù — lối ra ĐẦU TIÊN của cá rô phi.
  { id: 'ca_ro_phi_chien_xu', name: 'Cá rô phi chiên xù', category: 'fresh', buy: 5000, sell: 9000, color: 0xd0a060, unlock: 39 },
  // GĐ1425: Ức gà nướng — lối ra ĐẦU TIÊN của ức gà.
  { id: 'uc_ga_nuong', name: 'Ức gà nướng', category: 'fresh', buy: 5000, sell: 9000, color: 0xd89a5a, unlock: 37 },
  // GĐ1425: Nấm bào ngư xào tỏi — lối ra ĐẦU TIÊN của nấm bào ngư.
  { id: 'nam_bao_ngu_xao_toi', name: 'Nấm bào ngư xào tỏi', category: 'fresh', buy: 5000, sell: 9000, color: 0xd8d0b8, unlock: 39 },
  // GĐ1426: Cà tím xào mỡ hành — lối ra ĐẦU TIÊN của cà tím.
  { id: 'ca_tim_mo_hanh', name: 'Cà tím xào mỡ hành', category: 'fresh', buy: 4000, sell: 7000, color: 0x7a4a8a, unlock: 41 },
  // GĐ1426: Khoai lang nướng — lối ra ĐẦU TIÊN của khoai lang.
  { id: 'khoai_lang_nuong_than', name: 'Khoai lang nướng', category: 'fresh', buy: 3000, sell: 5000, color: 0xb05a3a, unlock: 43 },
  // GĐ1426: Bắp ngọt nướng mỡ hành — lối ra ĐẦU TIÊN của bắp ngọt.
  { id: 'bap_ngot_nuong', name: 'Bắp ngọt nướng mỡ hành', category: 'fresh', buy: 3000, sell: 5000, color: 0xf0d040, unlock: 45 },
  // GĐ1426: Chè khoai môn — lối ra ĐẦU TIÊN của khoai môn.
  { id: 'che_khoai_mon', name: 'Chè khoai môn', category: 'fresh', buy: 4000, sell: 8000, color: 0xb8a0c8, unlock: 47 },
  // GĐ1426: Bắp cải xào cà rốt — lối ra ĐẦU TIÊN của bắp cải.
  { id: 'bap_cai_xao_ca_rot', name: 'Bắp cải xào cà rốt', category: 'fresh', buy: 4000, sell: 8000, color: 0x9ac060, unlock: 49 },
  // GĐ1427: Cá hồi hấp xì dầu — lối ra ĐẦU TIÊN của cá hồi đông lạnh.
  { id: 'ca_hoi_hap_xi_dau', name: 'Cá hồi hấp xì dầu', category: 'fresh', buy: 9000, sell: 16000, color: 0xf09070, unlock: 47 },
  // GĐ1427: Chả mực chiên — lối ra ĐẦU TIÊN của chả mực đông lạnh.
  { id: 'cha_muc_chien', name: 'Chả mực chiên', category: 'fresh', buy: 5000, sell: 9000, color: 0xe8d0a0, unlock: 37 },
  // GĐ1427: Lẩu viên thập cẩm (phần) — lối ra ĐẦU TIÊN của viên thả lẩu.
  { id: 'lau_vien_thap_cam', name: 'Lẩu viên thập cẩm (phần)', category: 'fresh', buy: 6000, sell: 10000, color: 0xd06040, unlock: 51 },
  // GĐ1427: Bò viên nước lèo — lối ra ĐẦU TIÊN của bò viên.
  { id: 'bo_vien_nuoc_leo', name: 'Bò viên nước lèo', category: 'fresh', buy: 4000, sell: 8000, color: 0x8a5a3a, unlock: 53 },
  // GĐ1427: Cá viên chiên nước mắm — lối ra ĐẦU TIÊN của cá viên.
  { id: 'ca_vien_chien_mam', name: 'Cá viên chiên nước mắm', category: 'fresh', buy: 4000, sell: 7000, color: 0xe0a050, unlock: 55 },
  // GĐ1428: Nước ép táo — lối ra ĐẦU TIÊN của táo.
  { id: 'nuoc_ep_tao', name: 'Nước ép táo', category: 'drink', buy: 7000, sell: 12000, color: 0xd84a3a, unlock: 57 },
  // GĐ1428: Sinh tố na — lối ra ĐẦU TIÊN của na.
  { id: 'sinh_to_na', name: 'Sinh tố na', category: 'drink', buy: 7000, sell: 12000, color: 0xb8d090, unlock: 35 },
  // GĐ1428: Nước măng cụt dầm — lối ra ĐẦU TIÊN của măng cụt.
  { id: 'nuoc_mang_cut', name: 'Nước măng cụt dầm', category: 'drink', buy: 7000, sell: 12000, color: 0x6a2a4a, unlock: 37 },
  // GĐ1428: Nước ép nho xanh — lối ra ĐẦU TIÊN của nho xanh.
  { id: 'nuoc_ep_nho_xanh', name: 'Nước ép nho xanh', category: 'drink', buy: 7000, sell: 12000, color: 0xa8d060, unlock: 39 },
  // GĐ1428: Chôm chôm dầm đá — lối ra ĐẦU TIÊN của chôm chôm.
  { id: 'nuoc_chom_chom', name: 'Chôm chôm dầm đá', category: 'drink', buy: 7000, sell: 12000, color: 0xe04050, unlock: 41 },
  // GĐ1429: Đậu hũ chiên sả — lối ra ĐẦU TIÊN của đậu hũ.
  { id: 'dau_hu_chien_sa', name: 'Đậu hũ chiên sả', category: 'fresh', buy: 3000, sell: 6000, color: 0xe8c870, unlock: 43 },
  // GĐ1706: Gà xào sả — món mặn thứ 3 của sả (trồng được GĐ1704). Mở 52 = cấp gà nguyên con.
  { id: 'ga_xao_sa', name: 'Gà xào sả', category: 'fresh', buy: 16000, sell: 32000, color: 0xd9a441, unlock: 52 },
  { id: 'bo_xao_sa', name: 'Bò xào sả', category: 'fresh', buy: 22000, sell: 45000, color: 0x9c4a2f, unlock: 54 },
  { id: 'goi_buoi_tom', name: 'Gỏi bưởi tôm', category: 'fresh', buy: 11000, sell: 22000, color: 0xf2a7a0, unlock: 42 },
  { id: 'mit_chien_gion', name: 'Mít chiên giòn', category: 'fresh', buy: 7500, sell: 15000, color: 0xe8b34a, unlock: 39 },
  { id: 'goi_xoai_tom_kho', name: 'Gỏi xoài tôm khô', category: 'fresh', buy: 7500, sell: 15000, color: 0xc9d65a, unlock: 37 },
  { id: 'nhan_da_xay', name: 'Nhãn đá xay', category: 'fresh', buy: 7500, sell: 15000, color: 0xe9e2b0, unlock: 41 },
  { id: 'vai_da_xay', name: 'Vải đá xay', category: 'fresh', buy: 7500, sell: 15000, color: 0xf3c6cf, unlock: 43 },
  { id: 'che_gac', name: 'Chè gấc', category: 'fresh', buy: 7000, sell: 14000, color: 0xe2452d, unlock: 44 },
  { id: 'kem_sua_de', name: 'Kem sữa dê', category: 'fresh', buy: 6500, sell: 13000, color: 0xf7f1e3, unlock: 45 },
  // GĐ1429: Trứng xào cà chua — lối ra ĐẦU TIÊN của cà chua.
  { id: 'trung_xao_ca_chua', name: 'Trứng xào cà chua', category: 'fresh', buy: 4000, sell: 8000, color: 0xe85a3a, unlock: 45 },
  { id: 'dau_hu_sot_ca_chua', name: 'Đậu hũ sốt cà chua', category: 'fresh', buy: 3500, sell: 7000, color: 0xd9603b, unlock: 54 },
  // GĐ1429: Rau cải xào tỏi — lối ra ĐẦU TIÊN của rau cải.
  { id: 'rau_cai_xao_toi', name: 'Rau cải xào tỏi', category: 'fresh', buy: 4000, sell: 7000, color: 0x5aa04a, unlock: 47 },
  { id: 'rau_muong_xao_toi', name: 'Rau muống xào tỏi', category: 'fresh', buy: 4000, sell: 7000, color: 0x3f8f3a, unlock: 55 },
  { id: 'kho_qua_xao_trung', name: 'Khổ qua xào trứng', category: 'fresh', buy: 5000, sell: 9000, color: 0x9fbf4a, unlock: 56 },
  { id: 'dau_hu_nhoi_thit', name: 'Đậu hũ nhồi thịt', category: 'fresh', buy: 6000, sell: 11000, color: 0xc8703a, unlock: 57 },
  { id: 'thit_luoc', name: 'Thịt luộc', category: 'fresh', buy: 5000, sell: 8000, color: 0xe8c8b8, unlock: 58 },
  { id: 'bap_cai_luoc', name: 'Bắp cải luộc', category: 'fresh', buy: 3000, sell: 5000, color: 0xb8d89a, unlock: 59 },
  // GĐ1429: Bò xào giá — lối ra ĐẦU TIÊN của giá đỗ.
  { id: 'bo_xao_gia', name: 'Bò xào giá', category: 'fresh', buy: 8000, sell: 14000, color: 0x9a6a4a, unlock: 49 },
  // GĐ1429: Nước ép dưa leo cà rốt — lối ra ĐẦU TIÊN của dưa leo.
  { id: 'nuoc_ep_dua_leo_ca_rot', name: 'Nước ép dưa leo cà rốt', category: 'drink', buy: 4000, sell: 8000, color: 0xa0c860, unlock: 51 },
  // GĐ1429: Nước ép nho tím — lối ra ĐẦU TIÊN của nho tím.
  { id: 'nuoc_ep_nho_tim', name: 'Nước ép nho tím', category: 'drink', buy: 7000, sell: 12000, color: 0x6a2a7a, unlock: 53 },
  // GĐ1430: Há cảo hấp nóng — lối ra ĐẦU TIÊN của há cảo.
  { id: 'ha_cao_hap_nong', name: 'Há cảo hấp nóng', category: 'fresh', buy: 4000, sell: 8000, color: 0xf0e8d0, unlock: 55 },
  // GĐ1430: Khoai tây tươi chiên — lối ra ĐẦU TIÊN của khoai tây.
  { id: 'khoai_tay_tuoi_chien', name: 'Khoai tây tươi chiên', category: 'fresh', buy: 3000, sell: 5000, color: 0xf0d060, unlock: 57 },
  // GĐ1430: Trứng vịt luộc — lối ra ĐẦU TIÊN của trứng vịt.
  { id: 'trung_vit_luoc', name: 'Trứng vịt luộc', category: 'fresh', buy: 3000, sell: 5000, color: 0xe8e0d0, unlock: 37 },
  // GĐ1430: Gà xào hành tây — lối ra ĐẦU TIÊN của hành tây.
  { id: 'ga_xao_hanh_tay', name: 'Gà xào hành tây', category: 'fresh', buy: 5000, sell: 9000, color: 0xd8b080, unlock: 39 },
  // GĐ1430: Nấm kim châm xào ớt chuông — lối ra ĐẦU TIÊN của nấm kim châm.
  { id: 'nam_kim_cham_ot_chuong', name: 'Nấm kim châm xào ớt chuông', category: 'fresh', buy: 5000, sell: 9000, color: 0xe86040, unlock: 41 },
  // GĐ1431: Rau củ thập cẩm xào — lối ra ĐẦU TIÊN của rau củ đông lạnh.
  { id: 'rau_cu_thap_cam_xao', name: 'Rau củ thập cẩm xào', category: 'fresh', buy: 5000, sell: 9000, color: 0x8ac050, unlock: 43 },
  // GĐ1431: Sinh tố thanh long trắng — lối ra ĐẦU TIÊN của thanh long ruột trắng.
  { id: 'sinh_to_thanh_long_trang', name: 'Sinh tố thanh long trắng', category: 'drink', buy: 7000, sell: 12000, color: 0xf0f0e8, unlock: 45 },
  // GĐ1431: Bánh mì kẹp xà lách — lối ra ĐẦU TIÊN của xà lách.
  { id: 'banh_mi_kep_xa_lach', name: 'Bánh mì kẹp xà lách', category: 'fresh', buy: 6000, sell: 10000, color: 0xb8d080, unlock: 47 },
  // GĐ1431: Sinh tố kem hộp — lối ra ĐẦU TIÊN của kem hộp.
  { id: 'sinh_to_kem_hop', name: 'Sinh tố kem hộp', category: 'drink', buy: 7000, sell: 12000, color: 0xf8e8d8, unlock: 49 },
  // GĐ1431: Cơm nắm nướng — lối ra ĐẦU TIÊN của cơm nắm.
  { id: 'com_nam_nuong', name: 'Cơm nắm nướng', category: 'fresh', buy: 5000, sell: 9000, color: 0xd8b878, unlock: 51 },
  // GĐ1437: Xôi gà xé — lối ra ĐẦU TIÊN của thịt gà.
  { id: 'xoi_ga_xe', name: 'Xôi gà xé', category: 'fresh', buy: 4000, sell: 7000, color: 0xf0d8a0, unlock: 43 },
  // GĐ1437: Xôi chả lụa — lối ra ĐẦU TIÊN của chả lụa.
  { id: 'xoi_cha_lua', name: 'Xôi chả lụa', category: 'fresh', buy: 3500, sell: 6000, color: 0xf2e0b8, unlock: 44 },
  // GĐ1438: Cơm chiên lạp xưởng — lối ra ĐẦU TIÊN của lạp xưởng tươi bà Tám.
  { id: 'com_chien_lap_xuong', name: 'Cơm chiên lạp xưởng', category: 'fresh', buy: 11000, sell: 18000, color: 0xe0a070, unlock: 44 },
  // GĐ1439: Xôi chà bông — lối ra ĐẦU TIÊN của chà bông heo nhà làm.
  { id: 'xoi_cha_bong', name: 'Xôi chà bông', category: 'fresh', buy: 5000, sell: 8000, color: 0xd8a868, unlock: 46 },
  // GĐ1440: Xôi xoài cốt dừa — lối ra ĐẦU TIÊN của xoài vườn nhà.
  { id: 'xoi_xoai', name: 'Xôi xoài cốt dừa', category: 'fresh', buy: 6000, sell: 9500, color: 0xf2c14e, unlock: 45 },
  // GĐ1441: Cánh gà sốt cam — lối ra ĐẦU TIÊN của cam vườn nhà.
  { id: 'canh_ga_sot_cam', name: 'Cánh gà sốt cam', category: 'fresh', buy: 14000, sell: 22000, color: 0xe8862a, unlock: 46 },
  // GĐ1441: Ổi lắc chua ngọt — lối ra ĐẦU TIÊN của ổi vườn nhà.
  { id: 'oi_lac_muoi', name: 'Ổi lắc chua ngọt', category: 'fresh', buy: 6000, sell: 10000, color: 0x9ccc65, unlock: 41 },
  // GĐ1442: Tôm sốt chanh dây — lối ra ĐẦU TIÊN của chanh dây vườn nhà.
  { id: 'tom_sot_chanh_day', name: 'Tôm sốt chanh dây', category: 'fresh', buy: 24000, sell: 38000, color: 0xf0a830, unlock: 47 },
  // GĐ1442: Sữa chua chanh dây — lối ra ĐẦU TIÊN của chanh dây vườn nhà.
  { id: 'suachua_chanh_day', name: 'Sữa chua chanh dây', category: 'cold', buy: 7000, sell: 11000, color: 0xf7d774, unlock: 42 },
  // GĐ1443: Chè vải tươi hạt sen — lối ra ĐẦU TIÊN của vải thiều vườn nhà.
  { id: 'che_vai_tuoi', name: 'Chè vải tươi hạt sen', category: 'fresh', buy: 8000, sell: 13000, color: 0xf3e0e8, unlock: 43 },
  // GĐ1444: Bánh mì giò thủ — lối ra ĐẦU TIÊN của giò thủ bà Tám.
  { id: 'banh_mi_gio_thu', name: 'Bánh mì giò thủ', category: 'fresh', buy: 13000, sell: 22000, color: 0xd9b07a, unlock: 48 },
  // GĐ1449: Cá basa hấp chanh muối — lối ra ĐẦU TIÊN của chanh muối hàng xóm.
  { id: 'ca_hap_chanh_muoi', name: 'Cá basa hấp chanh muối', category: 'fresh', buy: 19000, sell: 32000, color: 0xe8dcb0, unlock: 44 },
  // GĐ1450: Cá viên chiên sốt me — lối ra ĐẦU TIÊN của me dầm bà Tám.
  { id: 'ca_vien_sot_me', name: 'Cá viên chiên sốt me', category: 'fresh', buy: 6500, sell: 11000, color: 0xb0703a, unlock: 43 },
  // GĐ1451: Bánh mì chả lụa bà Tám — lối ra ĐẦU TIÊN của chả lụa bà Tám.
  { id: 'banh_mi_cha_lua_ba_tam', name: 'Bánh mì chả lụa bà Tám', category: 'fresh', buy: 9000, sell: 15000, color: 0xe6c49a, unlock: 39 },
  // GĐ1452: Cá basa kho dưa muối — lối ra ĐẦU TIÊN của dưa muối hàng xóm.
  { id: 'ca_kho_dua_muoi', name: 'Cá basa kho dưa muối', category: 'fresh', buy: 12000, sell: 20000, color: 0xa07a3a, unlock: 33 },
  // GĐ1453: Bánh bao lạp xưởng — lối ra ĐẦU TIÊN của lạp xưởng bà Tám.
  { id: 'banh_bao_lap_xuong', name: 'Bánh bao lạp xưởng', category: 'fresh', buy: 10000, sell: 16000, color: 0xf5ece0, unlock: 45 },
  // GĐ1454: Thịt kho cà pháo — lối ra ĐẦU TIÊN của cà pháo muối.
  { id: 'thit_kho_ca_phao', name: 'Thịt kho cà pháo', category: 'fresh', buy: 11000, sell: 18000, color: 0x8a5a2a, unlock: 33 },
  // GĐ1456: Cánh gà chiên chanh muối — lối ra ĐẦU TIÊN của chanh muối hàng xóm.
  { id: 'canh_ga_chanh_muoi', name: 'Cánh gà chiên chanh muối', category: 'fresh', buy: 14000, sell: 22000, color: 0xd8a040, unlock: 52 },
  // GĐ1459: Cá basa chiên sốt me — lối ra ĐẦU TIÊN của me dầm bà Tám.
  { id: 'ca_basa_sot_me', name: 'Cá basa chiên sốt me', category: 'fresh', buy: 15000, sell: 24000, color: 0x9a5a2a, unlock: 55 },
  // GĐ1460: Cơm cháy chà bông — lối ra ĐẦU TIÊN của chà bông nhà làm.
  { id: 'com_chay_cha_bong', name: 'Cơm cháy chà bông', category: 'dry', buy: 9000, sell: 15000, color: 0xd8a050, unlock: 56 },
  // GĐ1461: Xôi lạp xưởng trứng — lối ra ĐẦU TIÊN của lạp xưởng bà Tám.
  { id: 'xoi_lap_xuong_trung', name: 'Xôi lạp xưởng trứng', category: 'fresh', buy: 7000, sell: 12000, color: 0xe8c890, unlock: 57 },
  // GĐ1463: Bánh cuốn lạp xưởng — lối ra ĐẦU TIÊN của bánh cuốn nhà làm.
  { id: 'banh_cuon_lap_xuong', name: 'Bánh cuốn lạp xưởng', category: 'fresh', buy: 13000, sell: 22000, color: 0xf0dcc8, unlock: 59 },
  // GĐ1465: Bánh tráng nướng chà bông — lối ra ĐẦU TIÊN của bánh tráng phơi sương.
  { id: 'banh_trang_nuong_cha_bong', name: 'Bánh tráng nướng chà bông', category: 'fresh', buy: 7000, sell: 12000, color: 0xe0b070, unlock: 61 },
  // GĐ1466: Lạp xưởng xào dưa muối — lối ra ĐẦU TIÊN của dưa muối hàng xóm.
  { id: 'lap_xuong_xao_dua_muoi', name: 'Lạp xưởng xào dưa muối', category: 'fresh', buy: 11000, sell: 18000, color: 0xb85a3a, unlock: 62 },
  // GĐ1467: Ô mai chanh muối me — lối ra ĐẦU TIÊN của me dầm bà Tám.
  { id: 'o_mai_chanh_me', name: 'Ô mai chanh muối me', category: 'dry', buy: 9000, sell: 15000, color: 0x8a6a2a, unlock: 63 },
  // GĐ1468: Bánh mì lạp xưởng nướng — lối ra ĐẦU TIÊN của lạp xưởng bà Tám.
  { id: 'banh_mi_lap_xuong', name: 'Bánh mì lạp xưởng nướng', category: 'fresh', buy: 12000, sell: 20000, color: 0xc85a3a, unlock: 64 },
  // GĐ1469: Chả lụa chiên sốt me — lối ra ĐẦU TIÊN của chả lụa bà Tám.
  { id: 'cha_lua_chien_me', name: 'Chả lụa chiên sốt me', category: 'fresh', buy: 8000, sell: 14000, color: 0xb87a40, unlock: 65 },
  // GĐ1471: Bánh đa cuốn chả lụa — lối ra ĐẦU TIÊN của bánh đa hàng xóm.
  { id: 'banh_da_cuon_cha_lua', name: 'Bánh đa cuốn chả lụa', category: 'fresh', buy: 8000, sell: 13000, color: 0xd8b878, unlock: 67 },
  // GĐ1472: Bánh cuốn chà bông — lối ra ĐẦU TIÊN của bánh cuốn nhà làm.
  { id: 'banh_cuon_cha_bong', name: 'Bánh cuốn chà bông', category: 'fresh', buy: 12000, sell: 20000, color: 0xf0dcb8, unlock: 68 },
  // GĐ1475: Giò thủ chiên giòn — lối ra ĐẦU TIÊN của giò thủ bà Tám.
  { id: 'gio_thu_chien_gion', name: 'Giò thủ chiên giòn', category: 'fresh', buy: 11000, sell: 18000, color: 0xc89060, unlock: 71 },
  // GĐ1476: Xôi chiên chà bông — lối ra ĐẦU TIÊN của chà bông nhà làm.
  { id: 'xoi_chien_cha_bong', name: 'Xôi chiên chà bông', category: 'fresh', buy: 7000, sell: 12000, color: 0xe8b860, unlock: 72 },
  // GĐ1477: Bánh tráng trộn me — lối ra ĐẦU TIÊN của bánh tráng phơi sương.
  { id: 'banh_trang_tron_me', name: 'Bánh tráng trộn me', category: 'fresh', buy: 6000, sell: 10000, color: 0xd89850, unlock: 73 },
  // GĐ1478: Bún xào lạp xưởng — lối ra ĐẦU TIÊN của lạp xưởng bà Tám.
  { id: 'mi_xao_lap_xuong', name: 'Mì xào lạp xưởng', category: 'fresh', buy: 9000, sell: 15000, color: 0xe0a050, unlock: 74 },
  // GĐ1479: Canh chua dưa muối cá basa — lối ra ĐẦU TIÊN của dưa muối hàng xóm.
  // GĐ1655: Cá kho thơm — món kho Nam Bộ, dùng thơm (nay trồng được ở trại) + cá + nước mắm hàng xóm.
  { id: 'ca_kho_thom', name: 'Cá kho thơm', category: 'fresh', buy: 13000, sell: 21000, color: 0xb8742a, unlock: 41 },
  // GĐ1662 — canh chua cá: món canh quốc dân, dùng thơm trại + cà chua
  { id: 'canh_chua_ca', name: 'Canh chua cá', category: 'fresh', buy: 13000, sell: 21000, color: 0xe0a040, unlock: 42 },
  { id: 'canh_chua_dua_muoi_ca', name: 'Canh chua dưa muối cá basa', category: 'fresh', buy: 12000, sell: 20000, color: 0xc8b860, unlock: 75 },
  // GĐ1483: Cháo tôm khô — lối ra ĐẦU TIÊN của tôm khô nhà phơi.
  { id: 'chao_tom_kho', name: 'Cháo tôm khô', category: 'fresh', buy: 13000, sell: 22000, color: 0xf2d9c0, unlock: 79 },
  // GĐ1484: Măng khô xào lạp xưởng — lối ra ĐẦU TIÊN của măng khô nhà phơi.
  { id: 'mang_kho_xao_lap_xuong', name: 'Măng khô xào lạp xưởng', category: 'fresh', buy: 15000, sell: 25000, color: 0xa8743a, unlock: 80 },
  // GĐ1485: Chả giò nấm mèo — lối ra ĐẦU TIÊN của nấm mèo khô.
  { id: 'cha_gio_nam_meo', name: 'Chả giò nấm mèo', category: 'fresh', buy: 4000, sell: 7000, color: 0xd99a4e, unlock: 81 },
  // GĐ1486: Xôi muối mè — lối ra ĐẦU TIÊN của mè rang nhà làm.
  { id: 'xoi_muoi_me', name: 'Xôi muối mè', category: 'fresh', buy: 8500, sell: 12000, color: 0xf3ecd8, unlock: 82 },
  // GĐ1487: Nem nướng cuốn — lối ra ĐẦU TIÊN của nem nướng bà Tám.
  { id: 'nem_nuong_cuon', name: 'Nem nướng cuốn', category: 'fresh', buy: 12000, sell: 20000, color: 0xd0884a, unlock: 83 },
  // GĐ1488: Cơm cá cơm rim — lối ra ĐẦU TIÊN của cá cơm khô bà Tám.
  { id: 'com_ca_com_rim', name: 'Cơm cá cơm rim', category: 'fresh', buy: 15000, sell: 25000, color: 0xd8b080, unlock: 84 },
  // GĐ1847: Cơm tép rim — lối ra ĐẦU TIÊN của tép rim nhà làm.
  { id: 'com_tep_rim', name: 'Cơm tép rim', category: 'fresh', buy: 14500, sell: 23000, color: 0xb88a8a, unlock: 88 },
  { id: 'chao_dau_phong', name: 'Cháo đậu phộng', category: 'fresh', buy: 12500, sell: 20500, color: 0xe6d2b0, unlock: 92 },
  { id: 'com_kho_ca_sac', name: 'Cơm khô cá sặc', category: 'fresh', buy: 14500, sell: 23500, color: 0xd9b88a, unlock: 93 },
  { id: 'com_mam_ca_linh', name: 'Cơm mắm cá linh', category: 'fresh', buy: 14500, sell: 23500, color: 0xd9b69a, unlock: 95 },
  { id: 'chao_nam_rom', name: 'Cháo nấm rơm', category: 'fresh', buy: 13000, sell: 21500, color: 0xe0d0b0, unlock: 101 },
  { id: 'chao_hat_sen', name: 'Cháo hạt sen', category: 'fresh', buy: 13500, sell: 22000, color: 0xeee6c0, unlock: 103 },
  { id: 'chao_dau_xanh', name: 'Cháo đậu xanh', category: 'fresh', buy: 12500, sell: 20500, color: 0xe0dca0, unlock: 105 },
  { id: 'chao_khoai_lang', name: 'Cháo khoai lang', category: 'fresh', buy: 12500, sell: 20500, color: 0xe8c890, unlock: 107 },
  { id: 'com_nghe', name: 'Cơm nghệ', category: 'fresh', buy: 14000, sell: 22500, color: 0xe8c860, unlock: 110 },
  { id: 'com_la_dua', name: 'Cơm lá dứa', category: 'fresh', buy: 14000, sell: 22500, color: 0xb8d8a0, unlock: 114 },
  { id: 'chao_gao_lut', name: 'Cháo gạo lứt', category: 'fresh', buy: 12500, sell: 20500, color: 0xe0cca8, unlock: 117 },
  { id: 'com_gac_bep', name: 'Cơm thịt gác bếp', category: 'fresh', buy: 14000, sell: 22500, color: 0xc8a888, unlock: 126 },
  { id: 'mam_co_ngo', name: 'Mâm cỗ đầu ngõ', category: 'fresh', buy: 100000, sell: 140000, color: 0xc0392b, unlock: 85 },
  // GĐ1409: Sữa chua granola — lối ra ĐẦU TIÊN của ngũ cốc granola: mẻ (granola 130k + sữa chua) → 14 cốc × 18k = 252k.
  { id: 'sua_chua_granola', name: 'Sữa chua granola', category: 'fresh', buy: 11000, sell: 18000, color: 0xe9d8b4, unlock: 68 },
  // GĐ1408: Cà phê phin sữa — lối ra ĐẦU TIÊN của cà phê xay nguyên chất: mẻ (cà phê xay 150k + sữa đặc 22k) = 172k → 25 ly × 12k = 300k.
  { id: 'ca_phe_phin_sua', name: 'Cà phê phin sữa', category: 'drink', buy: 8000, sell: 12000, color: 0x6f4e37, unlock: 64 },
  // GĐ1407: Trà atiso nấu — lối ra ĐẦU TIÊN của trà atiso túi: mẻ (atiso 38k + đường 17k) = 55k → 15 ly × 6k = 90k.
  { id: 'tra_atiso_nau', name: 'Trà atiso nấu', category: 'drink', buy: 4000, sell: 6000, color: 0x7a5c2e, unlock: 44 },
  // GĐ1406: Bánh mì nho — lối ra ĐẦU TIÊN của nho khô: mẻ (bột mì + nho khô) → 12 ổ × 10k = 120k.
  { id: 'banh_mi_nho', name: 'Bánh mì nho', category: 'fresh', buy: 6500, sell: 10000, color: 0xc89f6a, unlock: 42 },
  // GĐ1405: Sữa hạt điều — lối ra ĐẦU TIÊN của hạt điều rang muối: mẻ (hạt điều 78k + đường 17k) = 95k → 12 ly × 12k = 144k.
  { id: 'sua_hat_dieu', name: 'Sữa hạt điều', category: 'drink', buy: 8000, sell: 12000, color: 0xf5e6c8, unlock: 45 },
  // GĐ1404: Gà hấp rượu gạo — lối ra ĐẦU TIÊN của rượu gạo: mẻ (gà ta 130k + rượu gạo 45k) = 175k → 10 phần × 30k = 300k.
  { id: 'ga_hap_ruou', name: 'Gà hấp rượu gạo', category: 'fresh', buy: 19000, sell: 30000, color: 0xf3d9a4, unlock: 46 },
  // GĐ1401: Mì ý sốt thịt bằm — lối ra ĐẦU TIÊN của mì ý: mẻ (mì ý 22k + thịt heo 30k) = 52k → 8 dĩa × 15k = 120k.
  { id: 'mi_y_sot_bo', name: 'Mì ý sốt thịt bằm', category: 'fresh', buy: 9000, sell: 15000, color: 0xc0392b, unlock: 36 },
  // GĐ1400: Sinh tố dưa hấu — lối ra ĐẦU TIÊN của dưa hấu: mẻ (dưa 30k) = 30k → 10 ly × 8k = 80k.
  { id: 'sinh_to_dua_hau', name: 'Sinh tố dưa hấu', category: 'drink', buy: 5000, sell: 8000, color: 0xff6b81, unlock: 32 },
  // GĐ1399: Tương ớt nhà làm — lối ra ĐẦU TIÊN của ớt tươi: mẻ (ớt 20k + gia vị 8k) = 28k → 8 hũ × 6k = 48k.
  { id: 'tuong_ot_nha', name: 'Tương ớt nhà làm', category: 'dry', buy: 4000, sell: 6000, color: 0xc0392b, unlock: 71 },
  // GĐ1398: Cua hấp bia — lối ra ĐẦU TIÊN của cua biển sống: mẻ (cua 280k + bia chai 15k) = 295k → 12 phần × 36k = 432k.
  { id: 'cua_hap_bia', name: 'Cua hấp bia', category: 'fresh', buy: 25000, sell: 36000, color: 0xd35400, unlock: 55 },
  // GĐ1397: Tôm nướng muối ớt — lối ra ĐẦU TIÊN của tôm sú tươi: mẻ (tôm 190k + gia vị 8k) = 198k → 12 xiên × 26k = 312k.
  { id: 'tom_nuong', name: 'Tôm nướng muối ớt', category: 'fresh', buy: 16500, sell: 26000, color: 0xe8603c, unlock: 42 },
  // GĐ1394: Mực nướng sa tế — lối ra ĐẦU TIÊN của mực ống tươi: mẻ (mực 160k + gia vị 8k) = 168k → 12 xiên × 22k = 264k.
  { id: 'muc_nuong', name: 'Mực nướng sa tế', category: 'fresh', buy: 14000, sell: 22000, color: 0xd98a5a, unlock: 46 },
  // GĐ1391: Cháo lòng — món sáng Sài Gòn trứ danh (cháo trắng nấu lòng heo non):
  // mẻ (thịt heo tươi 95k + gạo 80k + hành phi 3k) = 178k → 25 chén × 14k = 350k, lãi 172k/mẻ.
  { id: 'chao_long', name: 'Cháo lòng', category: 'fresh', buy: 7000, sell: 14000, color: 0xe8d5c4, unlock: 36 },
  // GĐ1345: Giỏ quà Giáng sinh — lễ tặng quà lớn duy nhất còn thiếu giỏ (Tết/8-3/20-11/Trung thu đã có):
  // mẻ (rượu vang 120k + bánh kẹo 5k×4 + trà 20k×2) = 180k → 2 giỏ × 140k = 280k, lãi 100k/mẻ.
  { id: 'gio_qua_giang_sinh', name: 'Giỏ quà Giáng sinh', category: 'dry', buy: 70000, sell: 140000, color: 0x228b22, unlock: 36 },
  // GĐ1346: Giỏ quà Valentine — giỏ cặp đôi (mỹ phẩm + bánh + kẹo ngọt): mẻ (mỹ phẩm 80k + bánh 5k×4 +
  // kẹo mút 1k×8) = 108k → 2 giỏ × 90k = 180k, lãi 72k/mẻ.
  { id: 'gio_qua_valentine', name: 'Giỏ quà Valentine', category: 'dry', buy: 45000, sell: 90000, color: 0xe84393, unlock: 36 },

  // --- Nồi hấp (steamer) ---
  { id: 'banh_bao_hap', name: 'Bánh bao hấp nóng', category: 'fresh', buy: 4500, sell: 8600, color: 0xf5f6fa, unlock: 39 },
  // GĐ1094: Bánh flan — mẻ (ngỗng 280k + sữa đặc 22k + đường 17k) = 319k → 24 cái × 18k = 432k, lãi 113k/mẻ, nấu hời hơn bán nguyên liệu (398k < 432k)
  { id: 'banh_flan', name: 'Bánh flan', category: 'fresh', buy: 9000, sell: 18000, color: 0xe8b04a, unlock: 39 },
  // GĐ1094: Chả lụa hấp — mẻ (heo 30k×2 + trứng gà 25k) = 85k → 10 cây × 12k = 120k, lãi 35k/mẻ, nấu hời hơn bán nguyên liệu (109k < 120k)
  { id: 'cha_lua', name: 'Chả lụa hấp', category: 'fresh', buy: 6000, sell: 12000, color: 0xf0e6d2, unlock: 40 },
  // GĐ1322: Bánh cuốn chả lụa (suất) — combo bà Tám (bánh cuốn GĐ1321 + chả lụa quê) hấp chế biến thành phần:
  // mẻ (bánh cuốn 20k + chả lụa 27k + rau 10k) = 57k → 10 suất × 11k = 110k, lãi 53k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (91k < 110k). Khép chuỗi hàng xóm → bếp, mở 40 = đúng cấp bánh cuốn (> golden 30 → sim không đổi).
  { id: 'banh_cuon_cha_lua', name: 'Bánh cuốn chả lụa (suất)', category: 'fresh', buy: 6000, sell: 11000, color: 0xf0e6d2, unlock: 40 },
  { id: 'banh_gio', name: 'Bánh giò', category: 'fresh', buy: 5500, sell: 9000, color: 0xe8e0c0, unlock: 45 },
  { id: 'banh_bot_loc', name: 'Bánh bột lọc', category: 'fresh', buy: 6500, sell: 11000, color: 0xf0dcc0, unlock: 46 },
  { id: 'banh_khot', name: 'Bánh khọt', category: 'fresh', buy: 7000, sell: 12000, color: 0xe8c060, unlock: 47 },
  { id: 'banh_can', name: 'Bánh căn', category: 'fresh', buy: 6500, sell: 11000, color: 0xf2e2b0, unlock: 48 },
  { id: 'banh_beo', name: 'Bánh bèo chén', category: 'fresh', buy: 6000, sell: 10000, color: 0xf5f0e0, unlock: 49 },
  { id: 'bot_chien_trung', name: 'Bột chiên', category: 'fresh', buy: 7000, sell: 13000, color: 0xe0b050, unlock: 50 },
  { id: 'banh_chuoi_hap', name: 'Bánh chuối hấp', category: 'fresh', buy: 5500, sell: 9000, color: 0xf0d8a0, unlock: 51 },
  { id: 'banh_bo', name: 'Bánh bò', category: 'fresh', buy: 4500, sell: 7000, color: 0xfaf3e0, unlock: 52 },
  { id: 'bun_dau_mam_tom', name: 'Bún đậu mắm tôm', category: 'fresh', buy: 5000, sell: 15000, color: 0xe8c878, unlock: 53 },
  // GĐ1326: Mắm ruốc chưng thịt — món chưng trứ danh Huế của mắm ruốc hàng xóm + thịt heo chưng mặn béo ăn kèm cơm:
  // mẻ (thịt heo 30k×2 + mắm ruốc 36k + đường 17k) = 113k → 10 phần × 22k = 220k, lãi 107k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (153k < 220k). Khép chuỗi hàng xóm → nồi hấp, mở 40 (sau mốc golden 30 → sim không đổi).
  { id: 'mam_ruoc_chung_thit', name: 'Mắm ruốc chưng thịt', category: 'fresh', buy: 11000, sell: 22000, color: 0x9b4a2b, unlock: 40 },

  // --- Quây xôi (rice_station) ---
  { id: 'xoi_dau_xanh', name: 'Xôi đậu xanh', category: 'fresh', buy: 1400, sell: 2600, color: 0xf9ca24, unlock: 36 },
  { id: 'xoi_man', name: 'Xôi mặn', category: 'fresh', buy: 2900, sell: 5500, color: 0xf5cba7, unlock: 36 },
  { id: 'xoi_trung', name: 'Xôi trứng', category: 'fresh', buy: 1400, sell: 2600, color: 0xfadbd8, unlock: 36 },
  { id: 'xoi_dua', name: 'Xôi dừa', category: 'fresh', buy: 800, sell: 1400, color: 0xffffff, unlock: 36 },
  { id: 'xoi_thap_cam', name: 'Xôi thập cẩm', category: 'fresh', buy: 2900, sell: 5500, color: 0xe17055, unlock: 36 },
  { id: 'xoi_vo', name: 'Xôi vò', category: 'fresh', buy: 1500, sell: 2800, color: 0xf4d03f, unlock: 36 },
  { id: 'xoi_bap', name: 'Xôi bắp', category: 'fresh', buy: 1400, sell: 2600, color: 0xf9ca24, unlock: 36 },
  // GĐ1665 — xôi gấc: xôi đỏ ngày Tết/đám cưới từ gấc trại
  { id: 'xoi_gac', name: 'Xôi gấc', category: 'fresh', buy: 2000, sell: 3600, color: 0xd9301f, unlock: 43 },
  // GĐ1087: Xôi mít — xôi dừa thêm mít trộn, món ngọt đặc trưng miền Tây, dùng mít của nông trại (liên hệ nông trại → tiệm xôi)
  { id: 'xoi_mit', name: 'Xôi mít', category: 'fresh', buy: 1600, sell: 3000, color: 0xf8c471, unlock: 36 },
  // GĐ1321: Xôi nếp cẩm — món cẩm cao cấp của gạo nếp cẩm (mở cấp 70, sau mốc golden 30 → sim không đổi).
  // Mẻ (nếp cẩm 55k + đường 17k) = 72k → 40 phần × 5.7k = 228k, lãi 156k/mẻ, nấu hời hơn bán nguyên liệu (78k < 228k)
  { id: 'xoi_nep_cam', name: 'Xôi nếp cẩm', category: 'fresh', buy: 3000, sell: 5700, color: 0x8e44ad, unlock: 70 },
  // GĐ1323: Xôi khô tôm — đặc sản vùng (khô tôm mối lái dacsan GĐ1321) trộn nếp + hành phi + nước tương:
  // mẻ (khô tôm 42k + nếp 30k + hành phi 3k + nước tương 12k) = 87k → 40 phần × 4.5k = 180k, lãi 93k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (134k < 180k). Khép chuỗi mối lái → quây xôi, mở 42 = đúng cấp khô tôm.
  { id: 'xoi_kho_tom', name: 'Xôi khô tôm', category: 'fresh', buy: 2200, sell: 4500, color: 0xc9a227, unlock: 42 },
  // GĐ1323: Xôi lạp xưởng miền — đặc sản vùng (lạp xưởng miền mối lái GĐ1321) xé nhỏ trộn nếp, hành phi:
  // mẻ (lạp xưởng 46k + nếp 30k + hành phi 3k + nước tương 12k) = 91k → 40 phần × 4.2k = 168k, lãi 77k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (140k < 168k). Khép chuỗi mối lái → quây xôi, mở 44 = đúng cấp lạp xưởng.
  { id: 'xoi_lap_xuong', name: 'Xôi lạp xưởng miền', category: 'fresh', buy: 2100, sell: 4200, color: 0xa5462a, unlock: 44 },
  // GĐ1326: Xôi mắm tép — xôi rưới mắm tép nhà hàng xóm (đặc trưng miền Bắc), mặn béo quen thuộc:
  // mẻ (nếp 30k + mắm tép 14k + hành phi 3k + nước tương 12k) = 59k → 40 phần × 3.6k = 144k, lãi 85k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (84k < 144k). Khép chuỗi hàng xóm → quây xôi, mở 36 = đúng cấp hành phi (của xôi).
  { id: 'xoi_mam_tep', name: 'Xôi mắm tép', category: 'fresh', buy: 1800, sell: 3600, color: 0xc0705a, unlock: 36 },

  // --- Máy ép mía (sugarcane_press) ---
  { id: 'nuoc_mia', name: 'Nước mía', category: 'drink', buy: 4800, sell: 9100, color: 0x00b894, unlock: 25 },

  // --- Cơm (food_grill) ---
  { id: 'com_suon_nuong', name: 'Cơm sườn nướng', category: 'fresh', buy: 11600, sell: 22000, color: 0xd35400, unlock: 40 },
  { id: 'com_chien_trung', name: 'Cơm chiên trứng', category: 'fresh', buy: 4100, sell: 7800, color: 0xf5cba7, unlock: 40 },
  { id: 'canh_rau_thit', name: 'Canh rau thịt', category: 'fresh', buy: 6700, sell: 12700, color: 0x27ae60, unlock: 40 },
  // GĐ1094: Gà Đông Tảo nướng — mẻ (Đông Tảo 380k + rau 10k + muối 5k) = 395k → 3 phần × 180k = 540k, lãi 145k/mẻ, nấu hời hơn bán nguyên liệu (473k < 540k)
  { id: 'ga_dt_nuong', name: 'Gà Đông Tảo nướng', category: 'fresh', buy: 90000, sell: 180000, color: 0xb03a2e, unlock: 42 },
  // GĐ1659 — gà Đông Tảo hấp gừng: lối ra thứ hai của gà quý nhà trại, dùng gừng trại
  { id: 'ga_dt_hap_gung', name: 'Gà Đông Tảo hấp gừng', category: 'fresh', buy: 88000, sell: 172000, color: 0xe8c07a, unlock: 43 },

  // --- Combo ---
  { id: 'combo_xoi_doi', name: 'Suất Xôi Đôi', category: 'fresh', buy: 4300, sell: 8200, color: 0xe17055, unlock: 36 },
  { id: 'combo_nuoc_doi', name: 'Combo Hai Ly', category: 'drink', buy: 19600, sell: 37200, color: 0x74b9ff, unlock: 26 },

  // --- Giỏ quà ngày lễ (bàn gói quà; chỉ bán trong dịp, xem festival trong RECIPES) ---
  { id: 'gio_qua_tet', name: 'Giỏ quà Tết', category: 'dry', buy: 47000, sell: 89000, color: 0xc0392b, unlock: 28 },
  { id: 'gio_qua_83', name: 'Giỏ quà 8/3', category: 'dry', buy: 47000, sell: 89000, color: 0xe84393, unlock: 30 },
  { id: 'gio_qua_2011', name: 'Giỏ quà 20/11', category: 'dry', buy: 50000, sell: 95000, color: 0xf78fb3, unlock: 32 },
  { id: 'gio_qua_trung_thu', name: 'Giỏ quà Trung thu', category: 'dry', buy: 56000, sell: 106000, color: 0xd4a24c, unlock: 30 },

  // GĐ1941: Gắn lối ra nấu cho nguyên liệu nhà làm "hàng chết" (homemade.ts) còn món CHÍNH CÓ THẬT ngoài đời —
  // trước nay chúng chỉ bán thẳng. Mỗi món: mẻ lãi dương TÍNH TỪ GIÁ THẬT (value > cost & > bán thẳng nguyên liệu),
  // unlock > golden 30 → sim kinh tế mốc không đổi, unlock ≥ mọi nguyên liệu. Món & nguồn thực tế xem comment recipe.
  // Cà ri gà (hx_bot_ca_ri 80, ấm nước): thit_ga 130k + bột cà ri 32k + nước cốt dừa 10k = 172k → 40×7k = 280k, > bán thẳng 240k.
  { id: 'ca_ri_ga', name: 'Cà ri gà', category: 'fresh', buy: 3700, sell: 7000, color: 0xf0a030, unlock: 80 },
  // Hủ tiếu sa tế (hx_sate_tom 59, ấm nước): hủ tiếu 10k + sa tế 36k + thịt heo 30k = 76k → 16×7.5k = 120k, > bán thẳng 111k.
  { id: 'hu_tieu_sa_te', name: 'Hủ tiếu sa tế', category: 'fresh', buy: 3900, sell: 7500, color: 0xd35400, unlock: 59 },
  // Bún mắm nêm (hx_mam_nem 87, ấm nước): bún 12k + mắm nêm 31k + thịt heo 30k + thơm 10k = 83k → 16×8k = 128k, > bán thẳng 121k.
  { id: 'bun_mam_nem', name: 'Bún mắm nêm', category: 'fresh', buy: 4200, sell: 8000, color: 0xa0683a, unlock: 87 },
  // Gà nướng muối sả (hx_muoi_sa 81, bếp nướng): thịt gà 24k + sả 2k + muối sả 31k = 57k → 16×5.8k = 92.8k, > bán thẳng 85k.
  { id: 'ga_nuong_muoi_sa', name: 'Gà nướng muối sả', category: 'fresh', buy: 3000, sell: 5800, color: 0xd5aa6f, unlock: 81 },
  // Bánh cuốn tôm chua Huế (hx_tom_chua 67, nồi hấp): bột gạo 9k + tôm chua 33k = 42k → 16×4.5k = 72k, > bán thẳng 66k.
  { id: 'banh_cuon_tom_chua', name: 'Bánh cuốn tôm chua Huế', category: 'fresh', buy: 2400, sell: 4500, color: 0xd9704a, unlock: 67 },
  // Bánh mì ruốc (hx_ruoc_ca_loc 61, bếp nướng): bánh mì 8k + ruốc 45k = 53k → 16×6k = 96k, > bán thẳng 87k.
  { id: 'banh_mi_ruoc', name: 'Bánh mì ruốc', category: 'fresh', buy: 3200, sell: 6000, color: 0xb89a6a, unlock: 61 },
  // Chè đậu đen (hx_dau_den 73, ấm nước): đậu đen 31k + đường 17k = 48k → 16×5k = 80k, > bán thẳng 71k.
  { id: 'che_dau_den', name: 'Chè đậu đen', category: 'fresh', buy: 2600, sell: 5000, color: 0x2a2a30, unlock: 73 },
  // Chè mè đen (hx_me_den 75, ấm nước): mè đen 32k + đường 17k = 49k → 16×5k = 80k, > bán thẳng 72k.
  { id: 'che_me_den', name: 'Chè mè đen', category: 'fresh', buy: 2600, sell: 5000, color: 0x30282a, unlock: 75 },
  // Cá kho tương hột (hx_tuong_hot 78, ấm nước): cá lóc 70k + tương hột 31k = 101k → 20×8k = 160k, > bán thẳng 148k.
  { id: 'ca_kho_tuong', name: 'Cá kho tương hột', category: 'fresh', buy: 4200, sell: 8000, color: 0x7a4a22, unlock: 78 },
  // Xoài lắc muối tôm (hx_muoi_tom 71, máy xay): xoài 12k + muối tôm 31k = 43k → 8×9k = 72k, > bán thẳng 68k.
  { id: 'xoai_lac_muoi_tom', name: 'Xoài lắc muối tôm', category: 'fresh', buy: 4700, sell: 9000, color: 0xf2c14e, unlock: 71 },
  { id: 'ca_tim_nuong_mo_hanh', name: 'Cà tím nướng mỡ hành', category: 'fresh', buy: 4000, sell: 6000, color: 0x6a3a7a, unlock: 60 },
  { id: 'rau_muong_luoc', name: 'Rau muống luộc', category: 'fresh', buy: 3000, sell: 4000, color: 0x4f9f3a, unlock: 61 },
  { id: 'bap_luoc', name: 'Bắp luộc', category: 'fresh', buy: 3000, sell: 4000, color: 0xe8d050, unlock: 62 },
  { id: 'khoai_lang_luoc', name: 'Khoai lang luộc', category: 'fresh', buy: 3000, sell: 4000, color: 0xb0603a, unlock: 63 },
  { id: 'bong_cai_xao_toi', name: 'Bông cải xào tỏi', category: 'fresh', buy: 5000, sell: 8000, color: 0x3f8f4a, unlock: 64 },
  { id: 'bi_do_xao_toi', name: 'Bí đỏ xào tỏi', category: 'fresh', buy: 4000, sell: 6000, color: 0xe8902a, unlock: 65 },
  { id: 'canh_bi_do', name: 'Canh bí đỏ', category: 'fresh', buy: 5000, sell: 8000, color: 0xe8a040, unlock: 66 },
  { id: 'suon_ram', name: 'Sườn ram', category: 'fresh', buy: 7000, sell: 11000, color: 0xa0502a, unlock: 67 },
  { id: 'ga_luoc', name: 'Gà luộc', category: 'fresh', buy: 5000, sell: 8000, color: 0xf0d890, unlock: 68 },
  { id: 'tom_rim', name: 'Tôm rim', category: 'fresh', buy: 7000, sell: 11000, color: 0xd8502a, unlock: 69 },
  { id: 'muc_xao_hanh_tay', name: 'Mực xào hành tây', category: 'fresh', buy: 8000, sell: 13000, color: 0xe8d8c8, unlock: 70 },
  { id: 'thit_rang_chay_canh', name: 'Thịt rang cháy cạnh', category: 'fresh', buy: 6000, sell: 9000, color: 0xa8602a, unlock: 71 },
  { id: 'ca_thu_sot_ca', name: 'Cá thu sốt cà', category: 'fresh', buy: 7000, sell: 10000, color: 0xc8502a, unlock: 72 },
  { id: 'trung_luoc', name: 'Trứng luộc', category: 'fresh', buy: 3000, sell: 4000, color: 0xf4ecd8, unlock: 73 },
  { id: 'rau_cai_luoc', name: 'Rau cải luộc', category: 'fresh', buy: 3000, sell: 4000, color: 0x5aa04a, unlock: 74 },
  { id: 'dau_hu_chien', name: 'Đậu hũ chiên', category: 'fresh', buy: 3000, sell: 5000, color: 0xe8c060, unlock: 75 },
  { id: 'canh_cai', name: 'Canh cải', category: 'fresh', buy: 5000, sell: 8000, color: 0x6ab05a, unlock: 76 },
  { id: 'tom_luoc', name: 'Tôm luộc', category: 'fresh', buy: 8000, sell: 12000, color: 0xf07050, unlock: 77 },
  { id: 'bo_xao_hanh_tay', name: 'Bò xào hành tây', category: 'fresh', buy: 10000, sell: 16000, color: 0x8a4a2a, unlock: 78 },
  { id: 'gia_xao', name: 'Giá xào', category: 'fresh', buy: 3000, sell: 5000, color: 0xd8e8a0, unlock: 79 },
  { id: 'che_dau_do', name: 'Chè đậu đỏ', category: 'fresh', buy: 3000, sell: 5000, color: 0x8a2a3a, unlock: 80 },
  { id: 'suon_xao_chua_ngot', name: 'Sườn xào chua ngọt', category: 'fresh', buy: 9000, sell: 13000, color: 0xb84a2a, unlock: 81 },
  { id: 'khoai_tay_xao', name: 'Khoai tây xào', category: 'fresh', buy: 4000, sell: 6000, color: 0xe8c860, unlock: 83 },
  { id: 'muc_chien_nuoc_mam', name: 'Mực chiên nước mắm', category: 'fresh', buy: 9000, sell: 14000, color: 0xd8a050, unlock: 84 },
  { id: 'ca_thu_kho', name: 'Cá thu kho', category: 'fresh', buy: 7000, sell: 10000, color: 0x8a5a3a, unlock: 85 },
  { id: 'canh_chua_tom', name: 'Canh chua tôm', category: 'fresh', buy: 8000, sell: 10000, color: 0xe87a3a, unlock: 87 },
  { id: 'bo_luc_lac', name: 'Bò lúc lắc', category: 'fresh', buy: 10000, sell: 14000, color: 0x7a3a2a, unlock: 88 },
  { id: 'ca_ro_phi_kho', name: 'Cá rô phi kho', category: 'fresh', buy: 6000, sell: 9000, color: 0x7a5030, unlock: 89 },
  { id: 'canh_rau_muong', name: 'Canh rau muống', category: 'fresh', buy: 3000, sell: 4000, color: 0x5a9a4a, unlock: 90 },
  { id: 'cha_trung', name: 'Chả trứng', category: 'fresh', buy: 5000, sell: 7000, color: 0xe8b040, unlock: 92 },
  { id: 'nui_xao_bo', name: 'Nui xào bò', category: 'fresh', buy: 7000, sell: 10000, color: 0xd8803a, unlock: 93 },
  { id: 'mien_xao', name: 'Miến xào', category: 'fresh', buy: 6000, sell: 9000, color: 0xc8a070, unlock: 94 },
  { id: 'chao_thit_bam', name: 'Cháo thịt bằm', category: 'fresh', buy: 5000, sell: 10000, color: 0xf0e8d8, unlock: 95 },
  { id: 'chao_ca', name: 'Cháo cá', category: 'fresh', buy: 6000, sell: 12000, color: 0xf0e8c8, unlock: 97 },
  { id: 'com_chien_duong_chau', name: 'Cơm chiên Dương Châu', category: 'fresh', buy: 5000, sell: 9000, color: 0xe8b860, unlock: 98 },
  { id: 'bun_thit_nuong', name: 'Bún thịt nướng', category: 'fresh', buy: 12000, sell: 18000, color: 0xc8783a, unlock: 99 },
  { id: 'bun_cha', name: 'Bún chả', category: 'fresh', buy: 14000, sell: 20000, color: 0xa8603a, unlock: 101 },
  { id: 'chao_suon', name: 'Cháo sườn', category: 'fresh', buy: 6000, sell: 11000, color: 0xf0e0c8, unlock: 102 },
  { id: 'canh_trung_ca_chua', name: 'Canh trứng cà chua', category: 'fresh', buy: 5000, sell: 9000, color: 0xe8703a, unlock: 103 },
  { id: 'thit_kho_tieu', name: 'Thịt kho tiêu', category: 'fresh', buy: 12000, sell: 20000, color: 0x8b4a2b, unlock: 104 },
  { id: 'ga_xao_gung', name: 'Gà xào gừng', category: 'fresh', buy: 12000, sell: 20000, color: 0xd9a441, unlock: 105 },
  { id: 'canh_bap_cai', name: 'Canh bắp cải', category: 'fresh', buy: 10000, sell: 17000, color: 0xa8d08d, unlock: 106 },
  { id: 'ga_kho_sa', name: 'Gà kho sả', category: 'fresh', buy: 12000, sell: 21000, color: 0xc58a3a, unlock: 107 },
  { id: 'canh_ga_chien', name: 'Cánh gà chiên', category: 'fresh', buy: 12000, sell: 20000, color: 0xd98a2b, unlock: 108 },
  { id: 'ca_chua_nhoi_thit', name: 'Cà chua nhồi thịt', category: 'fresh', buy: 10000, sell: 18000, color: 0xd94a3a, unlock: 109 },
  { id: 'trung_duc_thit', name: 'Trứng đúc thịt', category: 'fresh', buy: 9000, sell: 16000, color: 0xe8c040, unlock: 110 },
  { id: 'ga_rang_gung', name: 'Gà rang gừng', category: 'fresh', buy: 12000, sell: 21000, color: 0xb8782f, unlock: 111 },
  { id: 'tom_rang', name: 'Tôm rang', category: 'fresh', buy: 14000, sell: 24000, color: 0xe0602a, unlock: 112 },
  { id: 'muc_xao_chua_ngot', name: 'Mực xào chua ngọt', category: 'fresh', buy: 14000, sell: 24000, color: 0xe88a5a, unlock: 113 },
  { id: 'suon_nuong', name: 'Sườn nướng', category: 'fresh', buy: 14000, sell: 24000, color: 0xa0522d, unlock: 114 },
  { id: 'bo_xao_ca_chua', name: 'Bò xào cà chua', category: 'fresh', buy: 14000, sell: 24000, color: 0xc8402a, unlock: 115 },
  { id: 'ga_chien_gion', name: 'Gà chiên giòn', category: 'fresh', buy: 14000, sell: 24000, color: 0xd9952b, unlock: 116 },
  { id: 'muc_nhoi_thit', name: 'Mực nhồi thịt', category: 'fresh', buy: 15000, sell: 26000, color: 0xe8b080, unlock: 117 },
  { id: 'com_chien_hai_san', name: 'Cơm chiên hải sản', category: 'fresh', buy: 8000, sell: 14000, color: 0xf0c860, unlock: 118 },
  { id: 'mi_xao_bo', name: 'Mì xào bò', category: 'fresh', buy: 12000, sell: 21000, color: 0xd8a050, unlock: 119 },
  { id: 'tom_chien_xu', name: 'Tôm chiên xù', category: 'fresh', buy: 14000, sell: 24000, color: 0xe8a840, unlock: 120 },
  { id: 'mi_xao_hai_san', name: 'Mì xào hải sản', category: 'fresh', buy: 14000, sell: 24000, color: 0xe0b050, unlock: 121 },
  { id: 'com_chien_bo', name: 'Cơm chiên bò', category: 'fresh', buy: 8000, sell: 14000, color: 0xd8a860, unlock: 122 },
  { id: 'ga_xao_nam', name: 'Gà xào nấm', category: 'fresh', buy: 14000, sell: 24000, color: 0xa87850, unlock: 123 },
  { id: 'chao_tom', name: 'Cháo tôm', category: 'fresh', buy: 6000, sell: 11000, color: 0xf0d0b0, unlock: 124 },
  { id: 'chao_bo', name: 'Cháo bò', category: 'fresh', buy: 6500, sell: 12000, color: 0xe8c8a8, unlock: 125 },
  { id: 'ca_thu_nuong', name: 'Cá thu nướng', category: 'fresh', buy: 15000, sell: 26000, color: 0x8a6a4a, unlock: 126 },
  { id: 'trung_kho', name: 'Trứng kho', category: 'fresh', buy: 6000, sell: 11000, color: 0xa0602a, unlock: 127 },
  { id: 'ga_hap_hanh', name: 'Gà hấp hành', category: 'fresh', buy: 15000, sell: 26000, color: 0xf0e0a0, unlock: 128 },
  { id: 'dua_leo_xao_trung', name: 'Dưa leo xào trứng', category: 'fresh', buy: 6000, sell: 11000, color: 0xb8d870, unlock: 129 },
  { id: 'bong_cai_luoc', name: 'Bông cải luộc', category: 'fresh', buy: 7000, sell: 12000, color: 0x4a9a4a, unlock: 130 },
  { id: 'bo_xao_kho_qua', name: 'Bò xào khổ qua', category: 'fresh', buy: 14000, sell: 24000, color: 0x6a9a4a, unlock: 131 },
  { id: 'bo_xao_rau_muong', name: 'Bò xào rau muống', category: 'fresh', buy: 14000, sell: 24000, color: 0x4a8a3a, unlock: 132 },
  { id: 'khoai_lang_chien', name: 'Khoai lang chiên', category: 'fresh', buy: 6000, sell: 11000, color: 0xe89a30, unlock: 133 },
  { id: 'ca_kho_tieu', name: 'Cá kho tiêu', category: 'fresh', buy: 15000, sell: 26000, color: 0x6a4020, unlock: 134 },
  { id: 'suon_kho', name: 'Sườn kho', category: 'fresh', buy: 14000, sell: 24000, color: 0x8a4a2a, unlock: 135 },
  { id: 'ga_chien_nuoc_mam', name: 'Gà chiên nước mắm', category: 'fresh', buy: 15000, sell: 26000, color: 0xc8782a, unlock: 136 },
];

// ──────────────────────────────────────────────
// RECIPE LIST
// ──────────────────────────────────────────────

export const RECIPES: Recipe[] = [
  // --- Bếp nướng (food_grill) ---
  { id: 'recipe_banh_mi_trung', name: 'Bánh mì trứng nướng', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 5 }, { productId: 'trung', quantity: 1 }],
    outputId: 'banh_mi_trung_nuong', outputQty: 5, durationMin: 15, unlock: 38, reputationGain: 2 },
  // GĐ1336: Bánh mì thịt nướng — biểu tượng bánh mì Sài Gòn: `banhmi` vốn chỉ có bản trứng, bản THỊT nướng
  // ở bếp nướng: mẻ (bánh mì 8k×5 + thịt heo 30k + hành phi 1.5k×2=3k) = 73k → 5 bánh × 25k = 125k, lãi 52k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (118k < 125k). Mở 38 = đúng cấp bánh mì (> golden 30 → sim không đổi).
  { id: 'recipe_banh_mi_thit', name: 'Bánh mì thịt nướng', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 5 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'banh_mi_thit', outputQty: 5, durationMin: 15, unlock: 38, reputationGain: 2 },
  { id: 'recipe_xuc_xich', name: 'Xúc xích nướng', station: 'food_grill',
    inputs: [{ productId: 'xucxich', quantity: 2 }],
    outputId: 'xuc_xich_nuong', outputQty: 10, durationMin: 12, unlock: 22, reputationGain: 1 },
  { id: 'recipe_com_hop_ga', name: 'Cơm hộp gà', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'thit', quantity: 5 }, { productId: 'rau', quantity: 3 }],
    outputId: 'com_hop_ga', outputQty: 50, durationMin: 25, unlock: 30, reputationGain: 3 },
  { id: 'recipe_banh_trang', name: 'Bánh tráng trộn', station: 'food_grill',
    inputs: [{ productId: 'banhtrang', quantity: 3 }, { productId: 'traicay', quantity: 1 }],
    outputId: 'banh_trang_tron', outputQty: 6, durationMin: 10, unlock: 28, reputationGain: 2 },
  { id: 'recipe_com_suon', name: 'Cơm sườn nướng', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'thit', quantity: 8 }, { productId: 'rau', quantity: 2 }],
    outputId: 'com_suon_nuong', outputQty: 50, durationMin: 30, unlock: 40, reputationGain: 4 },
  { id: 'recipe_com_chien', name: 'Cơm chiên trứng', station: 'fryer',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'trung', quantity: 5 }],
    outputId: 'com_chien_trung', outputQty: 50, durationMin: 20, unlock: 40, reputationGain: 3 },
  // GĐ1094: Gà Đông Tảo nướng — món nướng của giống gà quý nhà trại (Đông Tảo mở cấp 30, thịt đắt gấp
  // chục gà thường). Mở 42 > mốc golden 30 → sim không đổi.
  { id: 'recipe_ga_dt_nuong', name: 'Gà Đông Tảo nướng', station: 'food_grill',
    inputs: [{ productId: 'thit_ga_dt', quantity: 1 }, { productId: 'rau', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'ga_dt_nuong', outputQty: 3, durationMin: 30, unlock: 42, reputationGain: 4 },
  { id: 'recipe_ga_dt_hap_gung', name: 'Gà Đông Tảo hấp gừng', station: 'hot_kettle',
    inputs: [{ productId: 'thit_ga_dt', quantity: 1 }, { productId: 'x_gung', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'ga_dt_hap_gung', outputQty: 3, durationMin: 30, unlock: 43, reputationGain: 4 },
  { id: 'recipe_canh', name: 'Canh rau thịt', station: 'hot_kettle',
    inputs: [{ productId: 'rau', quantity: 2 }, { productId: 'thit', quantity: 1 }],
    outputId: 'canh_rau_thit', outputQty: 12, durationMin: 18, unlock: 40, reputationGain: 3 },
  // GĐ1322: Bóp gỏi khô bò — khép chuỗi "đặc sản vùng (khô bò mối lái) → bếp nướng". Mở 50 = đúng cấp khô bò (sau mốc golden 30).
  { id: 'recipe_bo_gio_kho_bo', name: 'Bóp gỏi khô bò', station: 'food_grill',
    inputs: [{ productId: 'rg_kho_bo', quantity: 1 }, { productId: 'rau', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'bo_gio_kho_bo', outputQty: 8, durationMin: 20, unlock: 50, reputationGain: 2 },
  // GĐ1328: Bánh tráng nướng — khép chuỗi "hàng xóm (bánh tráng phơi sương GĐ1077 + tương ớt GĐ1321) → bếp nướng".
  // Đồ nhà hàng xóm vốn chỉ bán thẳng làm đồ khô giờ có LỐI RA BẾP (món ăn vặt). Mở 36 (sau mốc golden 30 → sim không đổi).
  { id: 'recipe_banh_trang_nuong', name: 'Bánh tráng nướng trứng', station: 'food_grill',
    inputs: [{ productId: 'hx_banh_trang', quantity: 1 }, { productId: 'trung', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }, { productId: 'hx_tuong_ot', quantity: 1 }],
    outputId: 'banh_trang_nuong', outputQty: 8, durationMin: 15, unlock: 36, reputationGain: 2 },
  // GĐ1328: Bánh đa trộn — khép chuỗi "bà Tám (bánh đa GĐ1085) + cà pháo muối hàng xóm GĐ1077 → bếp nướng".
  // Đồ nhà bà Tám/hàng xóm giờ có thêm LỐI RA BẾP (món trộn quen thuộc); nhồi cà pháo muối — vốn chỉ bán thẳng. Mở 38 (sau mốc golden 30).
  { id: 'recipe_banh_da_tron', name: 'Bánh đa trộn', station: 'food_grill',
    inputs: [{ productId: 'hx_banh_da', quantity: 1 }, { productId: 'hx_ca_phao', quantity: 1 }, { productId: 'hx_tuong_ot', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }],
    outputId: 'banh_da_tron', outputQty: 8, durationMin: 20, unlock: 38, reputationGain: 2 },

  // --- Ấm nước (hot_kettle) ---
  { id: 'recipe_tra_gung', name: 'Trà gừng nóng', station: 'hot_kettle',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'nuoc', quantity: 4 }],
    outputId: 'tra_gung_nong', outputQty: 5, durationMin: 10, unlock: 23, reputationGain: 1 },
  { id: 'recipe_mi_trung', name: 'Mì trứng nấu sẵn', station: 'hot_kettle',
    inputs: [{ productId: 'mi', quantity: 10 }, { productId: 'trung', quantity: 1 }],
    outputId: 'mi_trung_nong', outputQty: 10, durationMin: 8, unlock: 21, reputationGain: 2 },
  { id: 'recipe_che_dau_xanh', name: 'Chè đậu xanh', station: 'hot_kettle',
    inputs: [{ productId: 'dau_xanh', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_dau_xanh', outputQty: 6, durationMin: 15, unlock: 22, reputationGain: 2 },
  // GĐ1089: Chè bưởi — món chè của bưởi nông trại (x_buoi mở cấp 38 nhưng chưa có lối ra bếp),
  // khép chuỗi trồng → nấu → bán như GĐ1088 (chanh dây). Mở 38 = đúng cấp mở bưởi.
  { id: 'recipe_che_buoi', name: 'Chè bưởi', station: 'hot_kettle',
    inputs: [{ productId: 'x_buoi', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_buoi', outputQty: 6, durationMin: 18, unlock: 38, reputationGain: 2 },
  // GĐ1091: Chè nhãn — món chè của nhãn nông trại (x_nhan mở cấp 32 nhưng chưa có lối ra bếp),
  // khép chuỗi trồng → nấu → bán như GĐ1089. Mở 36 ≥ cấp nhãn 32 → tự cung được trước khi mở món.
  { id: 'recipe_che_nhan', name: 'Chè nhãn', station: 'hot_kettle',
    inputs: [{ productId: 'x_nhan', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_nhan', outputQty: 6, durationMin: 15, unlock: 36, reputationGain: 2 },
  // GĐ1321: Chè hạt sen — món chè thanh mát (hạt sen mở cấp 74). Mở 74 sau mốc golden sim 30 → không đổi RNG mốc.
  { id: 'recipe_che_hat_sen', name: 'Chè hạt sen', station: 'hot_kettle',
    inputs: [{ productId: 'hat_sen', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_hat_sen', outputQty: 8, durationMin: 18, unlock: 74, reputationGain: 2 },
  // GĐ1324: Chè vải — đặc sản nhà hàng xóm (vải thiều sấy GĐ1083) thành nguyên liệu ấm nước. Mở 38 (sau mốc golden 30).
  { id: 'recipe_che_vai', name: 'Chè vải', station: 'hot_kettle',
    inputs: [{ productId: 'hx_vai_say', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_vai', outputQty: 8, durationMin: 15, unlock: 38, reputationGain: 2 },
  // GĐ1331: Thịt kho tương Bần — món kho cổ truyền Hưng Yên của tương Bần nhà hàng xóm (hx_tuong_ban GĐ1077):
  // mẻ (tương 12k + thịt 30k×2 + đường 17k + hành phi 1.5k×2) = 92k → 10 suất × 22k = 220k, lãi 128k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (121k < 220k). Mở 36 (sau mốc golden 30 → sim không đổi).
  { id: 'recipe_thit_tuong_ban', name: 'Thịt kho tương Bần', station: 'hot_kettle',
    inputs: [{ productId: 'hx_tuong_ban', quantity: 1 }, { productId: 'x_thit_heo', quantity: 2 }, { productId: 'x_duong', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'thit_tuong_ban', outputQty: 10, durationMin: 25, unlock: 36, reputationGain: 3 },
  // GĐ1331: Cá kho tộ — món kho đồng bằng của nước mắm cá cơm nhà ủ (hx_nuoc_mam GĐ1077) + cá + gừng:
  // mẻ (cá 50k + nước mắm 30k + đường 17k + gừng 7k) = 104k → 6 nồi × 38k = 228k, lãi 124k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (151k < 228k). Mở 32 (sau mốc golden 30 → sim không đổi).
  { id: 'recipe_ca_kho_to', name: 'Cá kho tộ', station: 'hot_kettle',
    inputs: [{ productId: 'ca', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }, { productId: 'x_duong', quantity: 1 }, { productId: 'x_gung', quantity: 1 }],
    outputId: 'ca_kho_to', outputQty: 6, durationMin: 25, unlock: 32, reputationGain: 3 },
  // GĐ1335: Phở bò — món quốc hồn quốc túy: phở gói + thịt nấu thành tô bò nóng ở ấm nước (trước chỉ bán
  // phở gói khô): mẻ (phở 8k + thịt 60k + hành phi 3k) = 71k → 10 tô × 15k = 150k, lãi 79k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (75.5k < 150k). Mở 36 (sau mốc golden 30 → sim không đổi); không rau khóa ranking.
  { id: 'recipe_pho_bo', name: 'Phở bò', station: 'hot_kettle',
    inputs: [{ productId: 'pho', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'pho_bo', outputQty: 10, durationMin: 18, unlock: 36, reputationGain: 3 },
  // GĐ1337: Bún bò Huế — món bún cay trứ danh Huế: bún tươi mới thêm (bun 33) + thịt nấu ở ấm nước:
  // mẻ (bún 12k + thịt 60k + hành phi 3k) = 75k → 10 tô × 18k = 180k, lãi 105k/mẻ, nấu hời hơn bán thẳng
  // nguyên liệu (108k < 180k). Mở 36 ≥ mọi nguyên liệu (33/30/36) (> golden 30 → sim không đổi).
  { id: 'recipe_bun_bo_hue', name: 'Bún bò Huế', station: 'hot_kettle',
    inputs: [{ productId: 'bun', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'bun_bo_hue', outputQty: 10, durationMin: 20, unlock: 36, reputationGain: 3 },
  // GĐ1338: Mì Quảng — món mì vàng đậm đà Quảng Nam: mì sợi + thịt nấu nước dùng đậm ở ấm nước:
  // mẻ (mì 3k + thịt 60k + hành phi 3k) = 66k → 10 tô × 17k = 170k, lãi 104k/mẻ, nấu hời hơn bán thẳng
  // nguyên liệu (95k < 170k). Mở 36 ≥ mọi nguyên liệu (1/30/36) (> golden 30 → sim không đổi).
  { id: 'recipe_mi_quang', name: 'Mì Quảng', station: 'hot_kettle',
    inputs: [{ productId: 'mi', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'mi_quang', outputQty: 10, durationMin: 18, unlock: 36, reputationGain: 3 },
  // GĐ1339: Gà kho gừng — món kho gia đình trứ danh: gà nguyên con + gừng + nước mắm nhà ủ (lối ra thứ 2 của
  // hx_nuoc_mam) kho lửa nhỏ ở ấm nước: mẻ (gà 130k + gừng 7k + nước mắm 30k) = 167k → 8 phần × 45k = 360k,
  // lãi 193k/mẻ, nấu hời hơn bán thẳng nguyên liệu (233k < 360k). Mở 52 = đúng cấp gà (> golden 30 → sim không đổi).
  { id: 'recipe_ga_kho_gung', name: 'Gà kho gừng', station: 'hot_kettle',
    inputs: [{ productId: 'thit_ga', quantity: 1 }, { productId: 'x_gung', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'ga_kho_gung', outputQty: 8, durationMin: 25, unlock: 52, reputationGain: 3 },
  // GĐ1094: Hột vịt lộn — món ăn vặt đường phố của trứng vịt trại (vịt mở cấp 16 nhưng chưa có lối ra bếp);
  // 1 vỉ 10 quả + rau răm + muối. Mở 34 > mốc golden 30 → sim không đổi.
  { id: 'recipe_hot_vit_lon', name: 'Hột vịt lộn rau răm', station: 'hot_kettle',
    inputs: [{ productId: 'trung_vit', quantity: 1 }, { productId: 'rau', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'hot_vit_lon', outputQty: 10, durationMin: 12, unlock: 34, reputationGain: 2 },
  { id: 'recipe_hot_vit_muoi', name: 'Hột vịt muối', station: 'hot_kettle',
    inputs: [{ productId: 'trung_vit', quantity: 1 }, { productId: 'x_muoi', quantity: 2 }],
    outputId: 'hot_vit_muoi', outputQty: 10, durationMin: 15, unlock: 44, reputationGain: 2 },
  { id: 'recipe_trung_ngong_luoc', name: 'Trứng ngỗng luộc', station: 'hot_kettle',
    inputs: [{ productId: 'trung_goos', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'trung_ngong_luoc', outputQty: 10, durationMin: 15, unlock: 45, reputationGain: 3 },

  // --- Máy xay (blender) ---
  { id: 'recipe_sinh_to', name: 'Sinh tố trái cây', station: 'blender',
    inputs: [{ productId: 'traicay', quantity: 1 }, { productId: 'suachua', quantity: 1 }],
    outputId: 'sinh_to_trai_cay', outputQty: 4, durationMin: 8, unlock: 28, reputationGain: 2 },
  // GĐ1938: Sữa đậu nành tự xay (có thật): đậu nành hạt xay + đường, máy xay. Mở 34.
  { id: 'recipe_sua_dau_nanh_xay', name: 'Sữa đậu nành tự xay', station: 'blender',
    inputs: [{ productId: 'x_dau_nanh_hat', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sua_dau_nanh_xay', outputQty: 10, durationMin: 10, unlock: 34, reputationGain: 2 },
  { id: 'recipe_kem', name: 'Kem trái cây tự làm', station: 'blender',
    inputs: [{ productId: 'traicay', quantity: 1 }, { productId: 'suachua', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'kem_trai_cay', outputQty: 5, durationMin: 12, unlock: 28, reputationGain: 3 },
  // GĐ1094: Sữa chua dê — món xay của sữa dê trại (dê mở cấp 27 nhưng chưa có lối ra bếp; sữa dẻ đắt gấp
  // rưỡi sữa bò, hợp khách sành). Mở 40 > mốc golden 30 → sim không đổi.
  { id: 'recipe_sua_chua_de', name: 'Sữa chua dê', station: 'blender',
    inputs: [{ productId: 'sua_de', quantity: 1 }, { productId: 'traicay', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sua_chua_de', outputQty: 6, durationMin: 20, unlock: 40, reputationGain: 3 },
  // GĐ1340: Sữa chua trái cây — món mát trứ danh Đà Lạt, làm dày trạm máy xay (trước chỉ 3 món):
  // mẻ (sữa chua 5k×2 + trái cây 25k + đường 17k) = 52k → 6 hũ × 14k = 84k, lãi 32k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (75k < 84k). Mở 36 ≥ mọi nguyên liệu (19/28/1) (> golden 30 → sim không đổi).
  { id: 'recipe_sua_chua_trai_cay', name: 'Sữa chua trái cây', station: 'blender',
    inputs: [{ productId: 'suachua', quantity: 2 }, { productId: 'traicay', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sua_chua_trai_cay', outputQty: 6, durationMin: 15, unlock: 36, reputationGain: 2 },
  // GĐ1341: Hủ tiếu nam vang — món hủ tiếu Sa Đéc trứ danh: hủ tiếu mới thêm (hut_tieu 34) + thịt + hành phi
  // nấu ở ấm nước: mẻ (hủ tiếu 10k + thịt 60k + hành phi 3k) = 73k → 10 tô × 18k = 180k, lãi 107k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (105k < 180k). Mở 36 ≥ mọi nguyên liệu (34/30/36) (> golden 30 → sim không đổi).
  { id: 'recipe_hut_tieu_nam_vang', name: 'Hủ tiếu nam vang', station: 'hot_kettle',
    inputs: [{ productId: 'hut_tieu', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'hut_tieu_nam_vang', outputQty: 10, durationMin: 18, unlock: 36, reputationGain: 3 },
  // GĐ1342: Gà ta nướng muối ớt — món nướng đồng quê trứ danh: gà ta làm sẵn (meat 34) ướp muối nướng vàng ở
  // bếp nướng: mẻ (gà 130k + muối 5k + hành phi 3k) = 138k → 6 phần × 42k = 252k, lãi 114k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (190k < 252k). Mở 36 ≥ mọi nguyên liệu (34/1/36) (> golden 30 → sim không đổi).
  { id: 'recipe_ga_ta_nuong_muoi', name: 'Gà ta nướng muối ớt', station: 'food_grill',
    inputs: [{ productId: 'ga_ta_tuoi', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'ga_ta_nuong_muoi', outputQty: 6, durationMin: 20, unlock: 36, reputationGain: 3 },
  // GĐ1342: Cá lóc nướng muối — món đồng bằng sông nước: cá lóc tươi (meat 33) xiên nướng muối:
  // mẻ (cá lóc 70k + muối 5k + hành phi 3k) = 78k → 6 con × 28k = 168k, lãi 90k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (110k < 168k). Mở 36 ≥ mọi nguyên liệu (33/1/36) (> golden 30 → sim không đổi).
  { id: 'recipe_ca_loc_nuong_muoi', name: 'Cá lóc nướng muối', station: 'food_grill',
    inputs: [{ productId: 'ca_loc_tuoi', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'ca_loc_nuong_muoi', outputQty: 6, durationMin: 18, unlock: 36, reputationGain: 2 },
  // GĐ1343: Thịt kho trứng (thịt kho tàu) — món kho Tết trứ danh: thịt heo tươi + trứng + nước cốt dừa kho ở
  // ấm nước: mẻ (heo tươi 95k + trứng 25k + nước cốt dừa 10k) = 130k → 8 phần × 30k = 240k, lãi 110k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (177k < 240k). Mở 36 ≥ mọi nguyên liệu (32/11/30) (> golden 30 → sim không đổi).
  { id: 'recipe_thit_kho_trung', name: 'Thịt kho trứng', station: 'hot_kettle',
    inputs: [{ productId: 'thit_heo_tuoi', quantity: 1 }, { productId: 'trung', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }],
    outputId: 'thit_kho_trung', outputQty: 8, durationMin: 25, unlock: 36, reputationGain: 3 },
  // GĐ1343: Cá rô phi chiên — món cá đồng chiên giòn: cá rô phi tươi (meat 35) vào chảo chiên:
  // mẻ (cá rô 55k + hành phi 3k) = 58k → 6 con × 18k = 108k, lãi 50k/mẻ, nấu hời hơn bán thẳng
  // nguyên liệu (83k < 108k). Mở 36 ≥ mọi nguyên liệu (35/36) (> golden 30 → sim không đổi).
  { id: 'recipe_ca_ro_phi_chien', name: 'Cá rô phi chiên', station: 'fryer',
    inputs: [{ productId: 'ca_ro_phi_tuoi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'ca_ro_phi_chien', outputQty: 6, durationMin: 15, unlock: 36, reputationGain: 2 },
  // GĐ1343: Bò kho — món bò đậm đà ăn với bún: thịt bò tươi (meat 38) + bún + gừng nấu ở ấm nước:
  // mẻ (bò 210k + bún 12k + gừng 7k) = 229k → 8 tô × 45k = 360k, lãi 131k/mẻ, nấu hời hơn bán thẳng
  // nguyên liệu (314k < 360k). Mở 38 = đúng cấp bò tươi (> golden 30 → sim không đổi).
  { id: 'recipe_bo_kho', name: 'Bò kho', station: 'hot_kettle',
    inputs: [{ productId: 'thit_bo_tuoi', quantity: 1 }, { productId: 'bun', quantity: 1 }, { productId: 'x_gung', quantity: 1 }],
    outputId: 'bo_kho', outputQty: 8, durationMin: 25, unlock: 38, reputationGain: 3 },
  // GĐ1344: Thịt kho dưa — món kho Nam Bộ trứ danh: thịt heo kho cùng dưa muối chua giòn nhà hàng xóm
  // (hx_dua_muoi — lối ra bếp đầu tiên của nguồn cung này) ở ấm nước: mẻ (thịt heo 30k + dưa muối 7k +
  // hành phi 3k) = 40k → 8 phần × 15k = 120k, lãi 80k/mẻ, nấu hời hơn bán thẳng nguyên liệu (54.5k < 120k).
  // Mở 36 ≥ mọi nguyên liệu (30/14/36) (> golden 30 → sim không đổi).
  { id: 'recipe_thit_kho_dua', name: 'Thịt kho dưa', station: 'hot_kettle',
    inputs: [{ productId: 'x_thit_heo', quantity: 1 }, { productId: 'hx_dua_muoi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'thit_kho_dua', outputQty: 8, durationMin: 22, unlock: 36, reputationGain: 2 },
  // GĐ1350: Bánh bao kim sa — bánh bao cao cấp trứ danh: bột mì gói nhân lòng đỏ trứng muối chảy + sữa đặc hấp ở
  // nồi hấp: mẻ (bột mì 18k×2 + trứng muối 30k + sữa đặc 22k) = 88k → 10 bánh × 18k = 180k, lãi 92k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (121k < 180k). Mở 52 = đúng cấp trứng muối (> golden 30 → sim không đổi).
  { id: 'recipe_banh_bao_kim_sa', name: 'Bánh bao kim sa', station: 'steamer',
    inputs: [{ productId: 'botmi', quantity: 2 }, { productId: 'trung_muoi', quantity: 1 }, { productId: 'x_sua_dac', quantity: 1 }],
    outputId: 'banh_bao_kim_sa', outputQty: 10, durationMin: 20, unlock: 52, reputationGain: 3 },
  // GĐ1351: Chả cá Lã Vọng — món Hà Nội trứ danh: chả cá thác lác nướng than hoa (bếp nướng) tẩm nước mắm nhà ủ
  // rưới mỡ hành: mẻ (chả cá 120k + nước mắm 30k + hành phi 3k) = 153k → 6 phần × 55k = 330k, lãi 177k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (220k < 330k). Mở 76 = đúng cấp chả cá (> golden 30 → sim không đổi).
  { id: 'recipe_cha_ca_la_vong', name: 'Chả cá Lã Vọng', station: 'food_grill',
    inputs: [{ productId: 'cha_ca', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'cha_ca_la_vong', outputQty: 6, durationMin: 22, unlock: 76, reputationGain: 4 },
  // GĐ1352: Cá basa chiên sả — cá basa phi lên (ca_basa 72) tẩm sả gừng vào chảo chiên:
  // mẻ (basa 85k + gừng 7k + hành phi 3k) = 95k → 6 con × 32k = 192k, lãi 97k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (136k < 192k). Mở 72 = đúng cấp basa (> golden 30 → sim không đổi).
  { id: 'recipe_ca_basa_chien_sa', name: 'Cá basa chiên sả', station: 'fryer',
    inputs: [{ productId: 'ca_basa', quantity: 1 }, { productId: 'x_sa', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }], // GĐ1690: chiên sả dùng sả thay gừng
    outputId: 'ca_basa_chien_sa', outputQty: 6, durationMin: 15, unlock: 72, reputationGain: 3 },
  // GĐ1352: Sò điệp nướng mỡ hành — sò điệp đông lạnh (so_diep 67) nướng vỏ rưới mỡ hành ở bếp nướng:
  // mẻ (sò điệp 180k + hành phi 3k) = 183k → 6 vỏ × 50k = 300k, lãi 117k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (255k < 300k). Mở 67 = đúng cấp sò điệp (> golden 30 → sim không đổi).
  { id: 'recipe_so_diep_nuong_mo_hanh', name: 'Sò điệp nướng mỡ hành', station: 'food_grill',
    inputs: [{ productId: 'so_diep', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'so_diep_nuong_mo_hanh', outputQty: 6, durationMin: 15, unlock: 67, reputationGain: 3 },
  // GĐ1353: Bò Nhật nướng muối — thăn bò Nhật (thit_bo_nhat 69) nướng muối kiểu teppanyaki ở bếp nướng:
  // mẻ (bò 450k + muối 5k + hành phi 3k) = 458k → 6 phần × 130k = 780k, lãi 322k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (632k < 780k). Mở 69 = đúng cấp bò Nhật (> golden 30 → sim không đổi).
  { id: 'recipe_bo_nhat_nuong_muoi', name: 'Bò Nhật nướng muối', station: 'food_grill',
    inputs: [{ productId: 'thit_bo_nhat', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'bo_nhat_nuong_muoi', outputQty: 6, durationMin: 18, unlock: 69, reputationGain: 4 },
  // GĐ1355: Cháo gà — món ăn sáng dịu trứ danh: gạo nấu cháo cùng gà nguyên con xé, rắc hành phi ở ấm nước:
  // mẻ (gạo 80k + gà 130k + hành phi 3k) = 213k → 30 chén × 15k = 450k, lãi 237k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (280k < 450k). Mở 52 = đúng cấp gà (> golden 30 → sim không đổi).
  { id: 'recipe_chao_ga', name: 'Cháo gà', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'thit_ga', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'chao_ga', outputQty: 30, durationMin: 25, unlock: 52, reputationGain: 3 },
  // GĐ1355: Bánh mì pate — bánh mì Sài Gòn bản pate béo bùi (pate gan hộp 62 — lối ra đầu tiên):
  // mẻ (bánh mì 8k×5 + pate 55k + hành phi 3k) = 98k → 5 bánh × 32k = 160k, lãi 62k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (158k < 160k). Mở 62 = đúng cấp pate (> golden 30 → sim không đổi).
  { id: 'recipe_banh_mi_pate', name: 'Bánh mì pate', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 5 }, { productId: 'pate', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'banh_mi_pate', outputQty: 5, durationMin: 12, unlock: 62, reputationGain: 3 },
  // GĐ1357: Yến chưng đường phèn — món bồi bổ xa xỉ trứ danh: tổ yến hũ chưng cách thủy cùng đường phèn ở
  // nồi hấp: mẻ (yến 700k + đường 17k) = 717k → 6 chén × 180k = 1080k, lãi 363k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (971k < 1080k). Mở 66 = đúng cấp yến (> golden 30 → sim không đổi).
  { id: 'recipe_yen_chung', name: 'Yến chưng đường phèn', station: 'steamer',
    inputs: [{ productId: 'to_yen', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'yen_chung', outputQty: 6, durationMin: 30, unlock: 66, reputationGain: 5 },
  // GĐ1358: Bánh mì jambon phô mai — bản bánh mì premium cuối-game: jambon nhập + phô mai kẹp bánh mì tươi
  // nướng ở bếp nướng: mẻ (jambon 90k + bánh mì 40k + phô mai 25k + hành phi 3k) = 158k → 5 bánh × 55k = 275k,
  // lãi 117k/mẻ, nấu hời hơn bán thẳng nguyên liệu (244k < 275k). Mở 62 ≥ jambon 61 (> golden 30 → sim không đổi).
  { id: 'recipe_banh_mi_jambon', name: 'Bánh mì jambon phô mai', station: 'food_grill',
    inputs: [{ productId: 'jambon', quantity: 1 }, { productId: 'banhmi', quantity: 5 }, { productId: 'phomai', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'banh_mi_jambon', outputQty: 5, durationMin: 12, unlock: 62, reputationGain: 3 },
  // GĐ1363: Hộp quà trà bánh quy — giỏ biếu premium LUÔN CÓ SẴN (không festival — gói mọi lúc, khác 6 giỏ
  // dịp lễ), khép lối ra của bánh quy nhập (banh_quy_nhap 65) gói cùng trà ở gift_wrap:
  // mẻ (bánh quy 120k + trà 20k×2) = 160k → 2 hộp × 120k = 240k, lãi 80k/mẻ, gói hời hơn bán thẳng
  // nguyên liệu (228k < 240k). Mở 65 = đúng cấp bánh quy (> golden 30 → sim không đổi).
  { id: 'recipe_hop_qua_tra_banh_quy', name: 'Hộp quà trà bánh quy', station: 'gift_wrap',
    inputs: [{ productId: 'banh_quy_nhap', quantity: 1 }, { productId: 'tra', quantity: 2 }],
    outputId: 'hop_qua_tra_banh_quy', outputQty: 2, durationMin: 10, unlock: 65, reputationGain: 3 },
  // GĐ1389: Bánh chưng tự gói — món Tết trứ danh: nếp xanh nhân đậu xanh thịt heo gói lá dong vuông ở
  // gift_wrap trong đúng dịp Tết (khác x_banh_chung mua sỉ): mẻ (nếp 30k + đậu xanh 15k + thịt heo 30k)
  // = 75k → 10 bánh × 15k = 150k, lãi 75k/mẻ, gói hời hơn bán thẳng nguyên liệu (102k < 150k).
  // Mở 31 > golden 30 → sim không đổi; ngoài dịp Tết không gói được như các giỏ lễ.
  { id: 'recipe_banh_chung_tu', name: 'Bánh chưng tự gói', station: 'gift_wrap',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'dau_xanh', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }],
    outputId: 'banh_chung_tu', outputQty: 10, durationMin: 30, unlock: 31, reputationGain: 3, festival: 'tet' },
  // GĐ1390: Gỏi cuốn — món ăn lành trứ danh: tôm luộc gói bánh tráng cuộn mỏng chấm tương (luộc tôm ở
  // ấm nước): mẻ (bánh tráng 5k×2 + tôm đông lạnh 90k) = 100k → 12 cuốn × 14k = 168k, lãi 68k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (146k < 168k). Mở 44 ≥ mọi nguyên liệu (1/43) (> golden 30 → sim không đổi).
  { id: 'recipe_goi_cuon', name: 'Gỏi cuốn', station: 'hot_kettle',
    inputs: [{ productId: 'banhtrang', quantity: 2 }, { productId: 'hai_san', quantity: 1 }],
    outputId: 'goi_cuon', outputQty: 12, durationMin: 15, unlock: 44, reputationGain: 2 },
  // GĐ1414: Bò bít tết ở chảo chiên (áp chảo). Mở 50 = cấp thịt bò Úc (> golden 30).
  { id: 'recipe_bo_bit_tet', name: 'Bò bít tết', station: 'fryer',
    inputs: [{ productId: 'thitbo', quantity: 1 }, { productId: 'x_trung_ga', quantity: 1 }],
    outputId: 'bo_bit_tet', outputQty: 10, durationMin: 15, unlock: 50, reputationGain: 3 },
  // GĐ1413: Bánh pía nướng nóng ở bếp nướng. Mở 40 = cấp bánh pía (> golden 30).
  { id: 'recipe_banh_pia_nuong', name: 'Bánh pía nướng nóng', station: 'food_grill',
    inputs: [{ productId: 'banh_pia', quantity: 1 }],
    outputId: 'banh_pia_nuong', outputQty: 4, durationMin: 6, unlock: 40, reputationGain: 1 },
  // GĐ1412: Trà thảo mộc nấu ở bếp nồi nấu. Mở 59 = cấp trà thảo mộc (> golden 30).
  { id: 'recipe_tra_thao_moc_nau', name: 'Trà thảo mộc nấu', station: 'hot_kettle',
    inputs: [{ productId: 'tra_thao_moc', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'tra_thao_moc_nau', outputQty: 12, durationMin: 15, unlock: 59, reputationGain: 2 },
  // GĐ1411: Gà nướng mật ong ở bếp nướng. Mở 82 = cấp mật ong rừng (> golden 30).
  { id: 'recipe_ga_nuong_mat_ong', name: 'Gà nướng mật ong', station: 'food_grill',
    inputs: [{ productId: 'ga_ta_tuoi', quantity: 1 }, { productId: 'mat_ong_rung', quantity: 1 }],
    outputId: 'ga_nuong_mat_ong', outputQty: 12, durationMin: 25, unlock: 82, reputationGain: 4 },
  // GĐ1410: Mì xào trứng ở chảo chiên (xào = chảo, không phải nồi). Mở 40 = cấp mì tươi (> golden 30).
  { id: 'recipe_mi_xao_trung', name: 'Mì xào trứng', station: 'fryer',
    inputs: [{ productId: 'mi_tuoi', quantity: 1 }, { productId: 'x_trung_ga', quantity: 1 }, { productId: 'x_rau_muong', quantity: 1 }],
    outputId: 'mi_xao_trung', outputQty: 4, durationMin: 8, unlock: 40, reputationGain: 2 },
  // GĐ1415: Hột vịt lộn luộc ở bếp nồi nấu. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_hot_vit_luoc', name: 'Hột vịt lộn luộc', station: 'hot_kettle',
    inputs: [{ productId: 'hotvit', quantity: 10 }],
    outputId: 'hot_vit_luoc', outputQty: 10, durationMin: 10, unlock: 35, reputationGain: 1 },
  // GĐ1415: Bánh mì bơ tỏi ở bếp nướng. Mở 63 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_mi_bo_toi', name: 'Bánh mì bơ tỏi', station: 'food_grill',
    inputs: [{ productId: 'x_banh_mi', quantity: 10 }, { productId: 'bo_sua', quantity: 1 }, { productId: 'x_toi', quantity: 1 }], // GĐ1691: bơ tỏi cần tỏi
    outputId: 'banh_mi_bo_toi', outputQty: 10, durationMin: 10, unlock: 63, reputationGain: 2 },
  // GĐ1416: Sữa yến mạch đường đen ở máy xay. Mở 73 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sua_yen_mach_xay', name: 'Sữa yến mạch đường đen', station: 'blender',
    inputs: [{ productId: 'sua_yeu', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sua_yen_mach_xay', outputQty: 8, durationMin: 8, unlock: 73, reputationGain: 2 },
  // GĐ1416: Sữa hạt mắc ca ở máy xay. Mở 86 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sua_hat_macca', name: 'Sữa hạt mắc ca', station: 'blender',
    inputs: [{ productId: 'hat_macca', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sua_hat_macca', outputQty: 20, durationMin: 12, unlock: 86, reputationGain: 3 },
  // GĐ1416: Chè yến chưng đường phèn ở bếp nồi nấu. Mở 96 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_che_yen', name: 'Chè yến chưng đường phèn', station: 'hot_kettle',
    inputs: [{ productId: 'yen_sao', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_yen', outputQty: 40, durationMin: 30, unlock: 96, reputationGain: 5 },
  // GĐ1417: Kem chiên ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_kem_chien', name: 'Kem chiên', station: 'fryer',
    inputs: [{ productId: 'kem', quantity: 10 }, { productId: 'x_trung_ga', quantity: 1 }],
    outputId: 'kem_chien', outputQty: 10, durationMin: 8, unlock: 35, reputationGain: 2 },
  // GĐ1417: Bánh bao hấp nóng ở nồi hấp. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_bao_dong_lanh_hap', name: 'Bánh bao hấp từ đông lạnh', station: 'steamer',
    inputs: [{ productId: 'banhbao', quantity: 10 }],
    outputId: 'banh_bao_dong_lanh_hap', outputQty: 10, durationMin: 12, unlock: 35, reputationGain: 1 },
  // GĐ1935: Bánh giò (món điểm tâm Hà Nội có thật): bột gạo + thịt heo + mộc nhĩ gói lá, hấp. Mở 45.
  { id: 'recipe_banh_gio', name: 'Bánh giò', station: 'steamer',
    inputs: [{ productId: 'x_bot_gao', quantity: 2 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_nam_meo_kho', quantity: 1 }],
    outputId: 'banh_gio', outputQty: 10, durationMin: 20, unlock: 45, reputationGain: 2 },
  // GĐ1936: Bánh bột lọc (món Huế có thật): bột năng + tôm tươi + hành lá, hấp. Mở 46.
  { id: 'recipe_banh_bot_loc', name: 'Bánh bột lọc', station: 'steamer',
    inputs: [{ productId: 'x_bot_nang', quantity: 2 }, { productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'banh_bot_loc', outputQty: 10, durationMin: 20, unlock: 46, reputationGain: 2 },
  // GĐ1937: Bánh khọt (món Vũng Tàu có thật): bột gạo + tôm tươi + hành lá, chiên khuôn. Mở 47.
  { id: 'recipe_banh_khot', name: 'Bánh khọt', station: 'fryer',
    inputs: [{ productId: 'x_bot_gao', quantity: 2 }, { productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'banh_khot', outputQty: 10, durationMin: 15, unlock: 47, reputationGain: 2 },
  // GĐ1951 (sửa GĐ chuẩn hóa): Bánh căn Phan Rang/Nha Trang — đổ bột gạo + trứng vào khuôn đất nung đậy nắp trên than (KHÔNG chiên ngập dầu) → bếp nướng. Mở 48.
  { id: 'recipe_banh_can', name: 'Bánh căn', station: 'food_grill',
    inputs: [{ productId: 'x_bot_gao', quantity: 2 }, { productId: 'trung', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'banh_can', outputQty: 10, durationMin: 15, unlock: 48, reputationGain: 2 },
  // GĐ1952: Bánh bèo chén (món Huế có thật): bột gạo + bột năng hấp chén, rắc tôm chấy (tôm tươi giã rang) + mỡ hành (hành phi nhà làm thay), chan nước mắm. Mở 49.
  { id: 'recipe_banh_beo', name: 'Bánh bèo chén', station: 'steamer',
    inputs: [{ productId: 'x_bot_gao', quantity: 2 }, { productId: 'x_bot_nang', quantity: 1 }, { productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 1 }],
    outputId: 'banh_beo', outputQty: 12, durationMin: 20, unlock: 49, reputationGain: 2 },
  // GĐ1953: Bột chiên (Sài Gòn gọi tắt; quà vặt Sài Gòn có thật): bột gạo + bột năng hấp cắt miếng, chiên với trứng + hành lá. Mở 50.
  { id: 'recipe_bot_chien_trung', name: 'Bột chiên', station: 'fryer',
    inputs: [{ productId: 'x_bot_gao', quantity: 2 }, { productId: 'x_bot_nang', quantity: 1 }, { productId: 'trung', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'bot_chien_trung', outputQty: 8, durationMin: 15, unlock: 50, reputationGain: 2 },
  // GĐ1954: Bánh chuối hấp (món Nam Bộ có thật): chuối + bột năng hấp, rưới nước cốt dừa đường. Mở 51.
  { id: 'recipe_banh_chuoi_hap', name: 'Bánh chuối hấp', station: 'steamer',
    inputs: [{ productId: 'x_chuoi', quantity: 2 }, { productId: 'x_bot_nang', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'banh_chuoi_hap', outputQty: 10, durationMin: 25, unlock: 51, reputationGain: 2 },
  // GĐ1955: Bánh bò (ngoài chợ gọi tắt, vốn là bánh hấp; bánh quê có thật): bột gạo ủ + đường + nước cốt dừa, hấp nở rỗ tổ ong. Mở 52.
  { id: 'recipe_banh_bo', name: 'Bánh bò', station: 'steamer',
    inputs: [{ productId: 'x_bot_gao', quantity: 2 }, { productId: 'x_duong', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }],
    outputId: 'banh_bo', outputQty: 12, durationMin: 25, unlock: 52, reputationGain: 2 },
  // GĐ1956: Bún đậu mắm tôm (món Hà Nội có thật): bún tươi + đậu hũ chiên vàng + chén mắm tôm. Mở 53.
  { id: 'recipe_bun_dau_mam_tom', name: 'Bún đậu mắm tôm', station: 'fryer',
    inputs: [{ productId: 'x_bun_tuoi', quantity: 2 }, { productId: 'x_dau_hu', quantity: 2 }, { productId: 'x_mam_tom', quantity: 1 }],
    outputId: 'bun_dau_mam_tom', outputQty: 8, durationMin: 15, unlock: 53, reputationGain: 2 },
  // GĐ1417: Sinh tố sữa chua nếp ở máy xay. Mở 43 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_sua_chua_nep', name: 'Sinh tố sữa chua nếp', station: 'blender',
    inputs: [{ productId: 'sua_chua_hop', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_sua_chua_nep', outputQty: 6, durationMin: 6, unlock: 43, reputationGain: 1 },
  // GĐ1418: Cánh gà chiên nước mắm ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_canh_ga_chien_mam', name: 'Cánh gà chiên nước mắm', station: 'fryer',
    inputs: [{ productId: 'ga_ta_tuoi', quantity: 1 }, { productId: 'nuocmam', quantity: 1 }],
    outputId: 'canh_ga_chien_mam', outputQty: 10, durationMin: 15, unlock: 35, reputationGain: 3 },
  // GĐ1418: Trà mứt gừng ngày Tết ở bếp nồi nấu. Mở 50 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_tra_mut_gung', name: 'Trà mứt gừng ngày Tết', station: 'hot_kettle',
    inputs: [{ productId: 'mut_tet', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'tra_mut_gung', outputQty: 12, durationMin: 12, unlock: 50, reputationGain: 2 },
  // GĐ1419: Trứng chiên dầu (suất) ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_trung_chien_dau', name: 'Trứng chiên dầu (suất)', station: 'fryer',
    inputs: [{ productId: 'x_trung_ga', quantity: 20 }, { productId: 'dauan', quantity: 1 }],
    outputId: 'trung_chien_dau', outputQty: 20, durationMin: 10, unlock: 35, reputationGain: 2 },
  // GĐ1419: Sinh tố sữa hạt ở máy xay. Mở 41 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_sua_hat', name: 'Sinh tố sữa hạt', station: 'blender',
    inputs: [{ productId: 'sua_hat', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_sua_hat', outputQty: 8, durationMin: 6, unlock: 41, reputationGain: 1 },
  // GĐ1420: Cà phê hòa tan sữa đá ở quầy pha. Mở 44 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_phe_hoa_tan_da', name: 'Cà phê hòa tan sữa đá', station: 'drink_counter',
    inputs: [{ productId: 'ca_phe_lon', quantity: 1 }, { productId: 'x_sua_dac', quantity: 1 }],
    outputId: 'ca_phe_hoa_tan_da', outputQty: 20, durationMin: 30, unlock: 44, reputationGain: 2 },
  // GĐ1420: Sinh tố kem ở máy xay. Mở 45 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_kem', name: 'Sinh tố kem', station: 'blender',
    inputs: [{ productId: 'kem_cay_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_kem', outputQty: 10, durationMin: 6, unlock: 45, reputationGain: 1 },
  // GĐ1421: Khoai tây chiên giòn ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_khoai_tay_chien_gion', name: 'Khoai tây chiên giòn', station: 'fryer',
    inputs: [{ productId: 'x_khoai_tay_chien', quantity: 1 }],
    outputId: 'khoai_tay_chien_gion', outputQty: 6, durationMin: 6, unlock: 35, reputationGain: 1 },
  // GĐ1421: Gà viên chiên ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ga_vien_chien', name: 'Gà viên chiên', station: 'fryer',
    inputs: [{ productId: 'x_ga_vien_dong_lanh', quantity: 1 }],
    outputId: 'ga_vien_chien', outputQty: 6, durationMin: 6, unlock: 37, reputationGain: 1 },
  // GĐ1421: Cá basa chiên giòn ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_basa_chien_gion', name: 'Cá basa chiên giòn', station: 'fryer',
    inputs: [{ productId: 'x_ca_basa', quantity: 1 }, { productId: 'x_trung_ga', quantity: 1 }],
    outputId: 'ca_basa_chien_gion', outputQty: 6, durationMin: 10, unlock: 39, reputationGain: 2 },
  // GĐ1421: Pizza nướng nóng (miếng) ở bếp nướng. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_pizza_nuong_nong', name: 'Pizza nướng nóng (miếng)', station: 'food_grill',
    inputs: [{ productId: 'x_pizza_dong_lanh', quantity: 1 }],
    outputId: 'pizza_nuong_nong', outputQty: 6, durationMin: 8, unlock: 41, reputationGain: 1 },
  // GĐ1422: Mực khoanh chiên giòn ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_muc_khoanh_chien', name: 'Mực khoanh chiên giòn', station: 'fryer',
    inputs: [{ productId: 'x_muc_khoanh_dong_lanh', quantity: 1 }, { productId: 'x_bot_chien', quantity: 1 }], // GĐ1689: chiên giòn cần bột chiên
    outputId: 'muc_khoanh_chien', outputQty: 6, durationMin: 8, unlock: 43, reputationGain: 1 },
  // GĐ1422: Cánh gà nướng ở bếp nướng. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_canh_ga_nuong_mat', name: 'Cánh gà nướng mật ong', station: 'food_grill',
    inputs: [{ productId: 'x_canh_ga', quantity: 1 }, { productId: 'x_mat_ong', quantity: 1 }], // GĐ1687: nướng mật ong
    outputId: 'canh_ga_nuong_mat', outputQty: 10, durationMin: 12, unlock: 45, reputationGain: 2 },
  // GĐ1422: Chả cá thác lác chiên ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_cha_ca_thac_lac_chien', name: 'Chả cá thác lác chiên', station: 'fryer',
    inputs: [{ productId: 'x_cha_ca_thac_lat', quantity: 1 }],
    outputId: 'cha_ca_thac_lac_chien', outputQty: 6, durationMin: 8, unlock: 47, reputationGain: 1 },
  // GĐ1422: Cá hồi phi lê nướng ở bếp nướng. Mở 45 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_hoi_phi_le_nuong', name: 'Cá hồi phi lê nướng', station: 'food_grill',
    inputs: [{ productId: 'x_ca_hoi_tuoi', quantity: 1 }],
    outputId: 'ca_hoi_phi_le_nuong', outputQty: 6, durationMin: 12, unlock: 45, reputationGain: 3 },
  // GĐ1423: Sinh tố bơ ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_bo_sap', name: 'Sinh tố bơ', station: 'blender',
    inputs: [{ productId: 'x_bo', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_bo_sap', outputQty: 5, durationMin: 6, unlock: 49, reputationGain: 1 },
  // GĐ1423: Nước ép thơm ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nuoc_ep_thom', name: 'Nước ép thơm', station: 'blender',
    inputs: [{ productId: 'x_thom', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'nuoc_ep_thom', outputQty: 4, durationMin: 6, unlock: 51, reputationGain: 1 },
  // GĐ1423: Sinh tố đu đủ ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_du_du', name: 'Sinh tố đu đủ', station: 'blender',
    inputs: [{ productId: 'x_du_du', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_du_du', outputQty: 4, durationMin: 6, unlock: 53, reputationGain: 1 },
  // GĐ1423: Sinh tố thanh long tím ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_thanh_long', name: 'Sinh tố thanh long tím', station: 'blender',
    inputs: [{ productId: 'x_thanh_long_tim', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_thanh_long', outputQty: 5, durationMin: 6, unlock: 55, reputationGain: 1 },
  // GĐ1424: Canh sườn bí đỏ ở bếp nồi nấu. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_canh_suon_bi_do', name: 'Canh sườn bí đỏ', station: 'hot_kettle',
    inputs: [{ productId: 'x_suon_heo', quantity: 1 }, { productId: 'x_bi_do', quantity: 1 }],
    outputId: 'canh_suon_bi_do', outputQty: 6, durationMin: 20, unlock: 57, reputationGain: 2 },
  // GĐ1424: Canh khổ qua nhồi thịt ở bếp nồi nấu. Mở 37 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_canh_kho_qua_nhoi', name: 'Canh khổ qua nhồi thịt', station: 'hot_kettle',
    inputs: [{ productId: 'x_kho_qua', quantity: 1 }, { productId: 'x_thit_xay', quantity: 1 }],
    outputId: 'canh_kho_qua_nhoi', outputQty: 6, durationMin: 20, unlock: 37, reputationGain: 2 },
  // GĐ1424: Bò xào bông cải ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_bo_xao_bong_cai', name: 'Bò xào bông cải', station: 'fryer',
    inputs: [{ productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_bong_cai_xanh', quantity: 1 }],
    outputId: 'bo_xao_bong_cai', outputQty: 6, durationMin: 10, unlock: 35, reputationGain: 2 },
  // GĐ1424: Cá thu chiên ở chảo chiên. Mở 37 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_thu_chien', name: 'Cá thu chiên', station: 'fryer',
    inputs: [{ productId: 'x_ca_thu_tuoi', quantity: 1 }],
    outputId: 'ca_thu_chien', outputQty: 5, durationMin: 10, unlock: 37, reputationGain: 2 },
  // GĐ1425: Tôm hấp nước dừa ở nồi hấp. Mở 37 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_tom_tuoi_hap', name: 'Tôm hấp nước dừa', station: 'steamer',
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_nuoc_dua_hop', quantity: 1 }], // GĐ1684: hấp nước dừa cần nước dừa
    outputId: 'tom_tuoi_hap', outputQty: 7, durationMin: 10, unlock: 37, reputationGain: 2 },
  // GĐ1425: Mực hấp gừng ở nồi hấp. Mở 41 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_muc_hap_gung', name: 'Mực hấp gừng', station: 'steamer',
    inputs: [{ productId: 'x_muc_tuoi', quantity: 1 }, { productId: 'x_gung', quantity: 1 }], // GĐ1682: hấp gừng cần gừng
    outputId: 'muc_hap_gung', outputQty: 6, durationMin: 10, unlock: 41, reputationGain: 2 },
  // GĐ1425: Cá rô phi chiên xù ở chảo chiên. Mở 39 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_ro_phi_chien_xu', name: 'Cá rô phi chiên xù', station: 'fryer',
    inputs: [{ productId: 'x_ca_ro_phi', quantity: 1 }, { productId: 'x_bot_chien', quantity: 1 }], // GĐ1688: chiên xù cần bột chiên
    outputId: 'ca_ro_phi_chien_xu', outputQty: 6, durationMin: 10, unlock: 39, reputationGain: 2 },
  // GĐ1425: Ức gà nướng ở bếp nướng. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_uc_ga_nuong', name: 'Ức gà nướng', station: 'food_grill',
    inputs: [{ productId: 'x_uc_ga', quantity: 1 }],
    outputId: 'uc_ga_nuong', outputQty: 5, durationMin: 10, unlock: 37, reputationGain: 2 },
  // GĐ1425: Nấm bào ngư xào tỏi ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nam_bao_ngu_xao_toi', name: 'Nấm bào ngư xào tỏi', station: 'fryer',
    inputs: [{ productId: 'x_nam_bao_ngu', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'nam_bao_ngu_xao_toi', outputQty: 4, durationMin: 10, unlock: 39, reputationGain: 2 },
  // GĐ1426: Cà tím xào mỡ hành ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_tim_mo_hanh', name: 'Cà tím xào mỡ hành', station: 'fryer',
    inputs: [{ productId: 'x_ca_tim', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'ca_tim_mo_hanh', outputQty: 4, durationMin: 10, unlock: 41, reputationGain: 1 },
  // GĐ1426: Khoai lang nướng ở bếp nướng. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_khoai_lang_nuong_than', name: 'Khoai lang nướng', station: 'food_grill',
    inputs: [{ productId: 'x_khoai_lang_tuoi', quantity: 1 }],
    outputId: 'khoai_lang_nuong_than', outputQty: 4, durationMin: 10, unlock: 43, reputationGain: 1 },
  // GĐ1426: Bắp ngọt nướng mỡ hành ở bếp nướng. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_bap_ngot_nuong', name: 'Bắp ngọt nướng mỡ hành', station: 'food_grill',
    inputs: [{ productId: 'x_bap', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }], // GĐ1680: mỡ hành cần hành lá
    outputId: 'bap_ngot_nuong', outputQty: 3, durationMin: 10, unlock: 45, reputationGain: 1 },
  // GĐ1426: Chè khoai môn ở bếp nồi nấu. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_che_khoai_mon', name: 'Chè khoai môn', station: 'hot_kettle',
    inputs: [{ productId: 'x_khoai_mon', quantity: 1 }, { productId: 'x_duong', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }], // GĐ1681: chè khoai môn nấu nước cốt dừa
    outputId: 'che_khoai_mon', outputQty: 8, durationMin: 10, unlock: 47, reputationGain: 1 },
  // GĐ1426: Bắp cải xào cà rốt ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_bap_cai_xao_ca_rot', name: 'Bắp cải xào cà rốt', station: 'fryer',
    inputs: [{ productId: 'x_bap_cai', quantity: 1 }, { productId: 'x_ca_rot', quantity: 1 }],
    outputId: 'bap_cai_xao_ca_rot', outputQty: 4, durationMin: 10, unlock: 49, reputationGain: 1 },
  // GĐ1427: Cá hồi hấp xì dầu ở nồi hấp. Mở 47 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_hoi_hap_xi_dau', name: 'Cá hồi hấp xì dầu', station: 'steamer',
    inputs: [{ productId: 'x_ca_hoi_dong_lanh', quantity: 1 }, { productId: 'x_nuoc_tuong', quantity: 1 }], // GĐ1685: hấp xì dầu cần nước tương
    outputId: 'ca_hoi_hap_xi_dau', outputQty: 6, durationMin: 10, unlock: 47, reputationGain: 2 },
  // GĐ1427: Chả mực chiên ở chảo chiên. Mở 37 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_cha_muc_chien', name: 'Chả mực chiên', station: 'fryer',
    inputs: [{ productId: 'x_cha_muc', quantity: 1 }],
    outputId: 'cha_muc_chien', outputQty: 6, durationMin: 10, unlock: 37, reputationGain: 2 },
  // GĐ1427: Lẩu viên thập cẩm (phần) ở bếp nồi nấu. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_lau_vien_thap_cam', name: 'Lẩu viên thập cẩm (phần)', station: 'hot_kettle',
    inputs: [{ productId: 'x_vien_tha_lau', quantity: 1 }],
    outputId: 'lau_vien_thap_cam', outputQty: 5, durationMin: 10, unlock: 51, reputationGain: 2 },
  // GĐ1427: Bò viên nước lèo ở bếp nồi nấu. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_bo_vien_nuoc_leo', name: 'Bò viên nước lèo', station: 'hot_kettle',
    inputs: [{ productId: 'x_bo_vien', quantity: 1 }],
    outputId: 'bo_vien_nuoc_leo', outputQty: 6, durationMin: 10, unlock: 53, reputationGain: 2 },
  // GĐ1427: Cá viên chiên nước mắm ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_vien_chien_mam', name: 'Cá viên chiên nước mắm', station: 'fryer',
    inputs: [{ productId: 'x_ca_vien', quantity: 1 }, { productId: 'nuocmam', quantity: 1 }], // GĐ1686/1693: nước mắm (mã gộp nuocmam)
    outputId: 'ca_vien_chien_mam', outputQty: 9, durationMin: 10, unlock: 55, reputationGain: 2 },
  // GĐ1428: Nước ép táo ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nuoc_ep_tao', name: 'Nước ép táo', station: 'blender',
    inputs: [{ productId: 'x_tao', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'nuoc_ep_tao', outputQty: 5, durationMin: 6, unlock: 57, reputationGain: 1 },
  // GĐ1428: Sinh tố na ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_na', name: 'Sinh tố na', station: 'blender',
    inputs: [{ productId: 'x_na', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_na', outputQty: 5, durationMin: 6, unlock: 35, reputationGain: 1 },
  // GĐ1428: Nước măng cụt dầm ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nuoc_mang_cut', name: 'Nước măng cụt dầm', station: 'blender',
    inputs: [{ productId: 'x_mang_cut', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'nuoc_mang_cut', outputQty: 6, durationMin: 6, unlock: 37, reputationGain: 1 },
  // GĐ1428: Nước ép nho xanh ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nuoc_ep_nho_xanh', name: 'Nước ép nho xanh', station: 'blender',
    inputs: [{ productId: 'x_nho_xanh', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'nuoc_ep_nho_xanh', outputQty: 7, durationMin: 6, unlock: 39, reputationGain: 1 },
  // GĐ1428: Chôm chôm dầm đá ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nuoc_chom_chom', name: 'Chôm chôm dầm đá', station: 'blender',
    inputs: [{ productId: 'x_chom_chom', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'nuoc_chom_chom', outputQty: 5, durationMin: 6, unlock: 41, reputationGain: 1 },
  // GĐ1429: Đậu hũ chiên sả ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_dau_hu_chien_sa', name: 'Đậu hũ chiên sả', station: 'fryer',
    inputs: [{ productId: 'x_dau_hu', quantity: 4 }, { productId: 'x_sa', quantity: 1 }], // GĐ1683: chiên sả cần sả
    outputId: 'dau_hu_chien_sa', outputQty: 6, durationMin: 8, unlock: 43, reputationGain: 1 },
  // GĐ1706: Gà xào sả ở chảo chiên: mẻ (gà 175k + sả 2 + nước mắm) ≈ 207k bán thẳng → 8 phần × 32k = 256k.
  { id: 'recipe_ga_xao_sa', name: 'Gà xào sả', station: 'fryer',
    inputs: [{ productId: 'thit_ga', quantity: 1 }, { productId: 'x_sa', quantity: 2 }, { productId: 'nuocmam', quantity: 1 }],
    outputId: 'ga_xao_sa', outputQty: 8, durationMin: 15, unlock: 52, reputationGain: 2 },
  // GĐ1717: Bò xào sả — bò tươi 285k + sả 2 + nước mắm ≈ 309k bán thẳng → 8 × 45k = 360k.
  { id: 'recipe_bo_xao_sa', name: 'Bò xào sả', station: 'fryer',
    inputs: [{ productId: 'thit_bo_tuoi', quantity: 1 }, { productId: 'x_sa', quantity: 2 }, { productId: 'nuocmam', quantity: 1 }],
    outputId: 'bo_xao_sa', outputQty: 8, durationMin: 15, unlock: 54, reputationGain: 2 },
  // GĐ1728: Gỏi bưởi tôm — lối ra thứ 3 cho bưởi trại: bưởi 2 + tôm tươi + nước mắm ≈ 134k → 8 × 22k = 176k.
  { id: 'recipe_goi_buoi_tom', name: 'Gỏi bưởi tôm', station: 'steamer',
    inputs: [{ productId: 'x_buoi', quantity: 2 }, { productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'nuocmam', quantity: 1 }],
    outputId: 'goi_buoi_tom', outputQty: 8, durationMin: 12, unlock: 42, reputationGain: 2 },
  // GĐ1730: Mít chiên giòn — lối ra bếp thứ 2 cho mít trại: mít 3 + dầu ăn ≈ 124k → 10 × 15k = 150k.
  { id: 'recipe_mit_chien_gion', name: 'Mít chiên giòn', station: 'fryer',
    inputs: [{ productId: 'x_mit', quantity: 3 }, { productId: 'dauan', quantity: 1 }],
    outputId: 'mit_chien_gion', outputQty: 10, durationMin: 10, unlock: 39, reputationGain: 2 },
  // GĐ1734: Gỏi xoài tôm khô — lối ra bếp thứ 2 cho xoài trại: xoài 2 + tôm khô + nước mắm ≈ 96k → 8 × 15k = 120k.
  { id: 'recipe_goi_xoai_tom_kho', name: 'Gỏi xoài tôm khô', station: 'steamer',
    inputs: [{ productId: 'x_xoai', quantity: 2 }, { productId: 'x_tom_kho', quantity: 1 }, { productId: 'nuocmam', quantity: 1 }],
    outputId: 'goi_xoai_tom_kho', outputQty: 8, durationMin: 8, unlock: 37, reputationGain: 2 },
  // GĐ1736: Nhãn đá xay — lối ra bếp thứ 2 cho nhãn trại: nhãn 2 + đường + đá ≈ 94k → 8 × 15k = 120k.
  { id: 'recipe_nhan_da_xay', name: 'Nhãn đá xay', station: 'blender',
    inputs: [{ productId: 'x_nhan', quantity: 2 }, { productId: 'x_duong', quantity: 1 }, { productId: 'x_nuoc_da', quantity: 1 }],
    outputId: 'nhan_da_xay', outputQty: 8, durationMin: 6, unlock: 41, reputationGain: 2 },
  // GĐ1737: Vải đá xay — lối ra bếp thứ 2 cho vải trại: vải 2 + đường + đá ≈ 90k → 8 × 15k = 120k.
  { id: 'recipe_vai_da_xay', name: 'Vải đá xay', station: 'blender',
    inputs: [{ productId: 'x_vai', quantity: 2 }, { productId: 'x_duong', quantity: 1 }, { productId: 'x_nuoc_da', quantity: 1 }],
    outputId: 'vai_da_xay', outputQty: 8, durationMin: 6, unlock: 43, reputationGain: 2 },
  // GĐ1741: Chè gấc — lối ra bếp thứ 2 cho gấc trại (sau xôi gấc): gấc + đường ≈ 59k → 6 × 14k = 84k.
  { id: 'recipe_che_gac', name: 'Chè gấc', station: 'hot_kettle',
    inputs: [{ productId: 'x_gac', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_gac', outputQty: 6, durationMin: 18, unlock: 44, reputationGain: 2 },
  // GĐ1744: Kem sữa dê — lối ra bếp thứ 2 cho sữa dê trại (sau sữa chua dê): sữa dê + đường ≈ 81k → 8 × 13k = 104k.
  { id: 'recipe_kem_sua_de', name: 'Kem sữa dê', station: 'blender',
    inputs: [{ productId: 'sua_de', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'kem_sua_de', outputQty: 8, durationMin: 12, unlock: 45, reputationGain: 2 },
  // GĐ1429: Trứng xào cà chua ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_trung_xao_ca_chua', name: 'Trứng xào cà chua', station: 'fryer',
    inputs: [{ productId: 'x_ca_chua', quantity: 1 }, { productId: 'x_trung_ga', quantity: 4 }],
    outputId: 'trung_xao_ca_chua', outputQty: 4, durationMin: 8, unlock: 45, reputationGain: 1 },
  // GĐ1966: Đậu hũ sốt cà chua — món cơm nhà/cơm bình dân cả nước: đậu hũ chiên vàng rồi rim sốt cà chua
  // trong chảo (fryer). Hành lá rắc trên chưa bắt buộc (bỏ qua, không thay thế).
  { id: 'recipe_dau_hu_sot_ca_chua', name: 'Đậu hũ sốt cà chua', station: 'fryer',
    inputs: [{ productId: 'x_dau_hu', quantity: 4 }, { productId: 'x_ca_chua', quantity: 1 }],
    outputId: 'dau_hu_sot_ca_chua', outputQty: 6, durationMin: 10, unlock: 54, reputationGain: 1 },
  // GĐ1429: Rau cải xào tỏi ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_rau_cai_xao_toi', name: 'Rau cải xào tỏi', station: 'fryer',
    inputs: [{ productId: 'x_rau_cai', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'rau_cai_xao_toi', outputQty: 4, durationMin: 8, unlock: 47, reputationGain: 1 },
  // GĐ1967: Rau muống xào tỏi — món rau quốc dân cả nước: rau muống xào lửa lớn với tỏi phi (chảo, fryer).
  { id: 'recipe_rau_muong_xao_toi', name: 'Rau muống xào tỏi', station: 'fryer',
    inputs: [{ productId: 'x_rau_muong', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'rau_muong_xao_toi', outputQty: 4, durationMin: 6, unlock: 55, reputationGain: 1 },
  // GĐ1968: Khổ qua xào trứng — cơm nhà cả nước: khổ qua thái lát xào chín rồi đập trứng đảo (chảo, fryer).
  { id: 'recipe_kho_qua_xao_trung', name: 'Khổ qua xào trứng', station: 'fryer',
    inputs: [{ productId: 'x_kho_qua', quantity: 1 }, { productId: 'x_trung_ga', quantity: 3 }],
    outputId: 'kho_qua_xao_trung', outputQty: 4, durationMin: 8, unlock: 56, reputationGain: 1 },
  // GĐ1969: Đậu hũ nhồi thịt — cơm nhà Bắc/Nam: đậu hũ khoét nhồi thịt xay, chiên vàng rồi rim sốt cà (chảo, fryer).
  // Sốt cà chua không bắt buộc (nhiều nhà rán chấm nước mắm) — không thêm nguyên liệu.
  { id: 'recipe_dau_hu_nhoi_thit', name: 'Đậu hũ nhồi thịt', station: 'fryer',
    inputs: [{ productId: 'x_dau_hu', quantity: 4 }, { productId: 'x_thit_xay', quantity: 1 }],
    outputId: 'dau_hu_nhoi_thit', outputQty: 8, durationMin: 14, unlock: 57, reputationGain: 2 },
  // GĐ1970: Thịt luộc — cơm nhà cả nước: thịt heo (ba chỉ/nạc vai) luộc nồi nước, thái lát chấm mắm (hot_kettle).
  { id: 'recipe_thit_luoc', name: 'Thịt luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_thit_heo', quantity: 1 }],
    outputId: 'thit_luoc', outputQty: 6, durationMin: 20, unlock: 58, reputationGain: 1 },
  // GĐ1971: Bắp cải luộc — rau luộc cơm nhà cả nước (chấm trứng/nước mắm), luộc nồi nước (hot_kettle).
  { id: 'recipe_bap_cai_luoc', name: 'Bắp cải luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_bap_cai', quantity: 1 }],
    outputId: 'bap_cai_luoc', outputQty: 4, durationMin: 8, unlock: 59, reputationGain: 1 },
  // GĐ1429: Bò xào giá ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_bo_xao_gia', name: 'Bò xào giá', station: 'fryer',
    inputs: [{ productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_gia_do', quantity: 1 }],
    outputId: 'bo_xao_gia', outputQty: 6, durationMin: 8, unlock: 49, reputationGain: 1 },
  // GĐ1429: Nước ép dưa leo cà rốt ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nuoc_ep_dua_leo_ca_rot', name: 'Nước ép dưa leo cà rốt', station: 'blender',
    inputs: [{ productId: 'x_dua_leo', quantity: 1 }, { productId: 'x_ca_rot', quantity: 1 }],
    outputId: 'nuoc_ep_dua_leo_ca_rot', outputQty: 4, durationMin: 8, unlock: 51, reputationGain: 1 },
  // GĐ1429: Nước ép nho tím ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nuoc_ep_nho_tim', name: 'Nước ép nho tím', station: 'blender',
    inputs: [{ productId: 'x_nho_tim', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'nuoc_ep_nho_tim', outputQty: 7, durationMin: 8, unlock: 53, reputationGain: 1 },
  // GĐ1430: Há cảo hấp nóng ở nồi hấp. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ha_cao_hap_nong', name: 'Há cảo hấp nóng', station: 'steamer',
    inputs: [{ productId: 'x_ha_cao', quantity: 1 }],
    outputId: 'ha_cao_hap_nong', outputQty: 6, durationMin: 8, unlock: 55, reputationGain: 1 },
  // GĐ1430: Khoai tây tươi chiên ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_khoai_tay_tuoi_chien', name: 'Khoai tây tươi chiên', station: 'fryer',
    inputs: [{ productId: 'x_khoai_tay', quantity: 1 }],
    outputId: 'khoai_tay_tuoi_chien', outputQty: 3, durationMin: 8, unlock: 57, reputationGain: 1 },
  // GĐ1430: Trứng vịt luộc ở bếp nồi nấu. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_trung_vit_luoc', name: 'Trứng vịt luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_trung_vit', quantity: 6 }],
    outputId: 'trung_vit_luoc', outputQty: 6, durationMin: 8, unlock: 37, reputationGain: 1 },
  // GĐ1430: Gà xào hành tây ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ga_xao_hanh_tay', name: 'Gà xào hành tây', station: 'fryer',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_hanh_tay', quantity: 1 }],
    outputId: 'ga_xao_hanh_tay', outputQty: 6, durationMin: 8, unlock: 39, reputationGain: 1 },
  // GĐ1430: Nấm kim châm xào ớt chuông ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nam_kim_cham_ot_chuong', name: 'Nấm kim châm xào ớt chuông', station: 'fryer',
    inputs: [{ productId: 'x_nam_kim_cham', quantity: 1 }, { productId: 'x_ot_chuong', quantity: 1 }],
    outputId: 'nam_kim_cham_ot_chuong', outputQty: 4, durationMin: 8, unlock: 41, reputationGain: 1 },
  // GĐ1431: Rau củ thập cẩm xào ở chảo chiên. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_rau_cu_thap_cam_xao', name: 'Rau củ thập cẩm xào', station: 'fryer',
    inputs: [{ productId: 'x_rau_cu_dong_lanh', quantity: 1 }, { productId: 'x_bap_non_dong_lanh', quantity: 1 }],
    outputId: 'rau_cu_thap_cam_xao', outputQty: 5, durationMin: 8, unlock: 43, reputationGain: 1 },
  // GĐ1431: Sinh tố thanh long trắng ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_thanh_long_trang', name: 'Sinh tố thanh long trắng', station: 'blender',
    inputs: [{ productId: 'x_thanh_long_trang', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_thanh_long_trang', outputQty: 4, durationMin: 8, unlock: 45, reputationGain: 1 },
  // GĐ1431: Bánh mì kẹp xà lách ở bếp nướng. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_mi_kep_xa_lach', name: 'Bánh mì kẹp xà lách', station: 'food_grill',
    inputs: [{ productId: 'x_banh_mi', quantity: 4 }, { productId: 'x_xa_lach', quantity: 1 }],
    outputId: 'banh_mi_kep_xa_lach', outputQty: 4, durationMin: 8, unlock: 47, reputationGain: 1 },
  // GĐ1431: Sinh tố kem hộp ở máy xay. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_sinh_to_kem_hop', name: 'Sinh tố kem hộp', station: 'blender',
    inputs: [{ productId: 'x_kem_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sinh_to_kem_hop', outputQty: 7, durationMin: 8, unlock: 49, reputationGain: 1 },
  // GĐ1431: Cơm nắm nướng ở bếp nướng. Mở 35 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_com_nam_nuong', name: 'Cơm nắm nướng', station: 'food_grill',
    inputs: [{ productId: 'x_com_nam', quantity: 1 }],
    outputId: 'com_nam_nuong', outputQty: 2, durationMin: 8, unlock: 51, reputationGain: 1 },
  // GĐ1437: Xôi gà xé ở quây xôi. Mở 43 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_xoi_ga_xe', name: 'Xôi gà xé', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 1 }],
    outputId: 'xoi_ga_xe', outputQty: 30, durationMin: 15, unlock: 43, reputationGain: 3 },
  // GĐ1437: Xôi chả lụa ở quây xôi. Mở 44 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_xoi_cha_lua', name: 'Xôi chả lụa', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'x_cha_lua', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 1 }],
    outputId: 'xoi_cha_lua', outputQty: 30, durationMin: 15, unlock: 44, reputationGain: 3 },
  // GĐ1438: Cơm chiên lạp xưởng ở chảo chiên. Mở 44 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_com_chien_lap_xuong', name: 'Cơm chiên lạp xưởng', station: 'fryer',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'hx_lap_xuong', quantity: 1 }, { productId: 'x_trung_ga', quantity: 1 }],
    outputId: 'com_chien_lap_xuong', outputQty: 15, durationMin: 15, unlock: 44, reputationGain: 3 },
  // GĐ1439: Xôi chà bông ở quây xôi. Mở 46 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_xoi_cha_bong', name: 'Xôi chà bông', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'hx_cha_bong', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 1 }],
    outputId: 'xoi_cha_bong', outputQty: 30, durationMin: 15, unlock: 46, reputationGain: 3 },
  // GĐ1440: Xôi xoài cốt dừa ở quây xôi. Mở 45 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_xoi_xoai', name: 'Xôi xoài cốt dừa', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'x_xoai', quantity: 2 }, { productId: 'x_dua_cot_hop', quantity: 1 }],
    outputId: 'xoi_xoai', outputQty: 30, durationMin: 15, unlock: 45, reputationGain: 3 },
  // GĐ1441: Cánh gà sốt cam ở chảo chiên. Mở 46 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_canh_ga_sot_cam', name: 'Cánh gà sốt cam', station: 'fryer',
    inputs: [{ productId: 'x_canh_ga', quantity: 1 }, { productId: 'x_cam', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'canh_ga_sot_cam', outputQty: 12, durationMin: 18, unlock: 46, reputationGain: 3 },
  // GĐ1441: Ổi lắc chua ngọt ở máy xay. Mở 41 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_oi_lac_muoi', name: 'Ổi lắc chua ngọt', station: 'blender',
    inputs: [{ productId: 'x_oi', quantity: 3 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'oi_lac_muoi', outputQty: 10, durationMin: 8, unlock: 41, reputationGain: 2 },
  // GĐ1442: Tôm sốt chanh dây ở chảo chiên. Mở 47 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_tom_sot_chanh_day', name: 'Tôm sốt chanh dây', station: 'fryer',
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_chanh_day', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'tom_sot_chanh_day', outputQty: 6, durationMin: 15, unlock: 47, reputationGain: 3 },
  // GĐ1442: Sữa chua chanh dây ở máy xay. Mở 42 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_suachua_chanh_day', name: 'Sữa chua chanh dây', station: 'blender',
    inputs: [{ productId: 'suachua', quantity: 6 }, { productId: 'x_chanh_day', quantity: 2 }],
    outputId: 'suachua_chanh_day', outputQty: 10, durationMin: 8, unlock: 42, reputationGain: 2 },
  // GĐ1443: Chè vải tươi hạt sen ở bếp nồi. Mở 43 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_che_vai_tuoi', name: 'Chè vải tươi hạt sen', station: 'hot_kettle',
    inputs: [{ productId: 'x_vai', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_vai_tuoi', outputQty: 8, durationMin: 15, unlock: 43, reputationGain: 2 },
  // GĐ1444: Bánh mì giò thủ ở bếp nướng. Mở 48 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_mi_gio_thu', name: 'Bánh mì giò thủ', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 6 }, { productId: 'hx_gio_thu', quantity: 1 }],
    outputId: 'banh_mi_gio_thu', outputQty: 12, durationMin: 10, unlock: 48, reputationGain: 3 },
  // GĐ1449: Cá basa hấp chanh muối ở nồi hấp. Mở 44 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_hap_chanh_muoi', name: 'Cá basa hấp chanh muối', station: 'steamer',
    inputs: [{ productId: 'x_ca_basa', quantity: 2 }, { productId: 'hx_chanh_muoi', quantity: 1 }],
    outputId: 'ca_hap_chanh_muoi', outputQty: 6, durationMin: 25, unlock: 44, reputationGain: 3 },
  // GĐ1450: Cá viên chiên sốt me ở chảo chiên. Mở 43 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_vien_sot_me', name: 'Cá viên chiên sốt me', station: 'fryer',
    inputs: [{ productId: 'x_ca_vien', quantity: 3 }, { productId: 'hx_me_dam', quantity: 1 }],
    outputId: 'ca_vien_sot_me', outputQty: 14, durationMin: 15, unlock: 43, reputationGain: 3 },
  // GĐ1451: Bánh mì chả lụa bà Tám ở bếp nướng. Mở 39 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_mi_cha_lua_ba_tam', name: 'Bánh mì chả lụa bà Tám', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 6 }, { productId: 'hx_cha_lua', quantity: 1 }],
    outputId: 'banh_mi_cha_lua_ba_tam', outputQty: 12, durationMin: 12, unlock: 39, reputationGain: 3 },
  // GĐ1452: Cá basa kho dưa muối ở bếp nồi. Mở 33 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_kho_dua_muoi', name: 'Cá basa kho dưa muối', station: 'hot_kettle',
    inputs: [{ productId: 'x_ca_basa', quantity: 1 }, { productId: 'hx_dua_muoi', quantity: 2 }],
    outputId: 'ca_kho_dua_muoi', outputQty: 5, durationMin: 20, unlock: 33, reputationGain: 2 },
  // GĐ1453: Bánh bao lạp xưởng ở nồi hấp. Mở 45 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_bao_lap_xuong', name: 'Bánh bao lạp xưởng', station: 'steamer',
    inputs: [{ productId: 'botmi', quantity: 3 }, { productId: 'hx_lap_xuong', quantity: 1 }],
    outputId: 'banh_bao_lap_xuong', outputQty: 12, durationMin: 25, unlock: 45, reputationGain: 3 },
  // GĐ1454: Thịt kho cà pháo ở bếp nồi. Mở 33 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_thit_kho_ca_phao', name: 'Thịt kho cà pháo', station: 'hot_kettle',
    inputs: [{ productId: 'x_thit_heo', quantity: 1 }, { productId: 'hx_ca_phao', quantity: 2 }],
    outputId: 'thit_kho_ca_phao', outputQty: 4, durationMin: 20, unlock: 33, reputationGain: 2 },
  // GĐ1456: Cánh gà chiên chanh muối ở chảo chiên. Mở 52 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_canh_ga_chanh_muoi', name: 'Cánh gà chiên chanh muối', station: 'fryer',
    inputs: [{ productId: 'x_canh_ga', quantity: 2 }, { productId: 'hx_chanh_muoi', quantity: 1 }],
    outputId: 'canh_ga_chanh_muoi', outputQty: 8, durationMin: 15, unlock: 52, reputationGain: 3 },
  // GĐ1459: Cá basa chiên sốt me ở chảo chiên. Mở 55 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_basa_sot_me', name: 'Cá basa chiên sốt me', station: 'fryer',
    inputs: [{ productId: 'x_ca_basa', quantity: 2 }, { productId: 'hx_me_dam', quantity: 1 }],
    outputId: 'ca_basa_sot_me', outputQty: 7, durationMin: 15, unlock: 55, reputationGain: 3 },
  // GĐ1460: Cơm cháy chà bông ở chảo chiên. Mở 56 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_com_chay_cha_bong', name: 'Cơm cháy chà bông', station: 'fryer',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'hx_cha_bong', quantity: 1 }],
    outputId: 'com_chay_cha_bong', outputQty: 16, durationMin: 20, unlock: 56, reputationGain: 3 },
  // GĐ1461: Xôi lạp xưởng trứng ở quây xôi. Mở 57 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_xoi_lap_xuong_trung', name: 'Xôi lạp xưởng trứng', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'hx_lap_xuong', quantity: 1 }, { productId: 'x_trung_ga', quantity: 2 }],
    outputId: 'xoi_lap_xuong_trung', outputQty: 16, durationMin: 20, unlock: 57, reputationGain: 3 },
  // GĐ1463: Bánh cuốn lạp xưởng ở nồi hấp. Mở 59 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_cuon_lap_xuong', name: 'Bánh cuốn lạp xưởng', station: 'steamer',
    inputs: [{ productId: 'hx_banh_cuon', quantity: 2 }, { productId: 'hx_lap_xuong', quantity: 1 }],
    outputId: 'banh_cuon_lap_xuong', outputQty: 8, durationMin: 15, unlock: 59, reputationGain: 3 },
  // GĐ1465: Bánh tráng nướng chà bông ở bếp nướng. Mở 61 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_trang_nuong_cha_bong', name: 'Bánh tráng nướng chà bông', station: 'food_grill',
    inputs: [{ productId: 'hx_banh_trang', quantity: 2 }, { productId: 'hx_cha_bong', quantity: 1 }, { productId: 'x_trung_ga', quantity: 4 }],
    outputId: 'banh_trang_nuong_cha_bong', outputQty: 14, durationMin: 12, unlock: 61, reputationGain: 3 },
  // GĐ1466: Lạp xưởng xào dưa muối ở bếp nồi. Mở 62 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_lap_xuong_xao_dua_muoi', name: 'Lạp xưởng xào dưa muối', station: 'hot_kettle',
    inputs: [{ productId: 'hx_lap_xuong', quantity: 1 }, { productId: 'hx_dua_muoi', quantity: 3 }],
    outputId: 'lap_xuong_xao_dua_muoi', outputQty: 8, durationMin: 12, unlock: 62, reputationGain: 3 },
  // GĐ1467: Ô mai chanh muối me ở bếp nồi. Mở 63 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_o_mai_chanh_me', name: 'Ô mai chanh muối me', station: 'hot_kettle',
    inputs: [{ productId: 'hx_chanh_muoi', quantity: 1 }, { productId: 'hx_me_dam', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'o_mai_chanh_me', outputQty: 10, durationMin: 30, unlock: 63, reputationGain: 3 },
  // GĐ1468: Bánh mì lạp xưởng nướng ở bếp nướng. Mở 64 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_mi_lap_xuong', name: 'Bánh mì lạp xưởng nướng', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 6 }, { productId: 'hx_lap_xuong', quantity: 1 }, { productId: 'hx_dua_muoi', quantity: 1 }],
    outputId: 'banh_mi_lap_xuong', outputQty: 12, durationMin: 12, unlock: 64, reputationGain: 3 },
  // GĐ1469: Chả lụa chiên sốt me ở chảo chiên. Mở 65 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_cha_lua_chien_me', name: 'Chả lụa chiên sốt me', station: 'fryer',
    inputs: [{ productId: 'hx_cha_lua', quantity: 2 }, { productId: 'hx_me_dam', quantity: 1 }],
    outputId: 'cha_lua_chien_me', outputQty: 10, durationMin: 12, unlock: 65, reputationGain: 3 },
  // GĐ1471: Bánh đa cuốn chả lụa ở bếp nướng. Mở 67 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_da_cuon_cha_lua', name: 'Bánh đa cuốn chả lụa', station: 'food_grill',
    inputs: [{ productId: 'hx_banh_da', quantity: 2 }, { productId: 'hx_cha_lua', quantity: 1 }],
    outputId: 'banh_da_cuon_cha_lua', outputQty: 10, durationMin: 10, unlock: 67, reputationGain: 3 },
  // GĐ1472: Bánh cuốn chà bông ở nồi hấp. Mở 68 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_cuon_cha_bong', name: 'Bánh cuốn chà bông', station: 'steamer',
    inputs: [{ productId: 'hx_banh_cuon', quantity: 2 }, { productId: 'hx_cha_bong', quantity: 1 }],
    outputId: 'banh_cuon_cha_bong', outputQty: 10, durationMin: 12, unlock: 68, reputationGain: 3 },
  // GĐ1475: Giò thủ chiên giòn ở chảo chiên. Mở 71 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_gio_thu_chien_gion', name: 'Giò thủ chiên giòn', station: 'fryer',
    inputs: [{ productId: 'hx_gio_thu', quantity: 1 }, { productId: 'botmi', quantity: 1 }, { productId: 'x_trung_ga', quantity: 2 }],
    outputId: 'gio_thu_chien_gion', outputQty: 8, durationMin: 12, unlock: 71, reputationGain: 3 },
  // GĐ1476: Xôi chiên chà bông ở chảo chiên. Mở 72 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_xoi_chien_cha_bong', name: 'Xôi chiên chà bông', station: 'fryer',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'hx_cha_bong', quantity: 1 }],
    outputId: 'xoi_chien_cha_bong', outputQty: 14, durationMin: 20, unlock: 72, reputationGain: 3 },
  // GĐ1477: Bánh tráng trộn me ở bếp nồi. Mở 73 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_banh_trang_tron_me', name: 'Bánh tráng trộn me', station: 'hot_kettle',
    inputs: [{ productId: 'hx_banh_trang', quantity: 2 }, { productId: 'hx_me_dam', quantity: 1 }, { productId: 'x_trung_ga', quantity: 2 }],
    outputId: 'banh_trang_tron_me', outputQty: 12, durationMin: 10, unlock: 73, reputationGain: 3 },
  // GĐ1478: Mì xào lạp xưởng ở chảo chiên (sửa từ bún→mì cho đúng món Mì xào: lạp xưởng xào mì gói phổ biến,
  // xào bún tươi dễ rã/bết). Mở 74 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_mi_xao_lap_xuong', name: 'Mì xào lạp xưởng', station: 'fryer',
    inputs: [{ productId: 'mi', quantity: 2 }, { productId: 'hx_lap_xuong', quantity: 1 }, { productId: 'x_trung_ga', quantity: 4 }],
    outputId: 'mi_xao_lap_xuong', outputQty: 10, durationMin: 20, unlock: 74, reputationGain: 3 },
  // GĐ1479: Canh chua dưa muối cá basa ở bếp nồi. Mở 75 (> golden 30, ≥ cấp nguyên liệu).
  // GĐ1655: Cá kho thơm ở bếp nồi nấu. Mở 41 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_ca_kho_thom', name: 'Cá kho thơm', station: 'hot_kettle',
    inputs: [{ productId: 'ca', quantity: 1 }, { productId: 'x_thom', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'ca_kho_thom', outputQty: 8, durationMin: 18, unlock: 41, reputationGain: 2 },
  { id: 'recipe_canh_chua_ca', name: 'Canh chua cá', station: 'hot_kettle',
    inputs: [{ productId: 'ca', quantity: 1 }, { productId: 'x_thom', quantity: 1 }, { productId: 'x_ca_chua', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'canh_chua_ca', outputQty: 9, durationMin: 20, unlock: 42, reputationGain: 3 },
  { id: 'recipe_canh_chua_dua_muoi_ca', name: 'Canh chua dưa muối cá basa', station: 'hot_kettle',
    inputs: [{ productId: 'x_ca_basa', quantity: 2 }, { productId: 'hx_dua_muoi', quantity: 2 }, { productId: 'hx_me_dam', quantity: 1 }],
    outputId: 'canh_chua_dua_muoi_ca', outputQty: 11, durationMin: 20, unlock: 75, reputationGain: 3 },
  // GĐ1483: Cháo tôm khô ở nồi nước. Mở 79 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_chao_tom_kho', name: 'Cháo tôm khô', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_tom_kho', quantity: 1 }],
    outputId: 'chao_tom_kho', outputQty: 14, durationMin: 30, unlock: 79, reputationGain: 3 },
  // GĐ1484: Măng khô xào lạp xưởng ở chảo chiên. Mở 80 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_mang_kho_xao_lap_xuong', name: 'Măng khô xào lạp xưởng', station: 'fryer',
    inputs: [{ productId: 'hx_mang_kho', quantity: 1 }, { productId: 'hx_lap_xuong', quantity: 1 }],
    outputId: 'mang_kho_xao_lap_xuong', outputQty: 8, durationMin: 25, unlock: 80, reputationGain: 3 },
  // GĐ1485: Chả giò nấm mèo ở chảo chiên. Mở 81 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_cha_gio_nam_meo', name: 'Chả giò nấm mèo', station: 'fryer',
    inputs: [{ productId: 'hx_nam_meo', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'hx_banh_trang', quantity: 1 }],
    outputId: 'cha_gio_nam_meo', outputQty: 30, durationMin: 30, unlock: 81, reputationGain: 3 },
  // GĐ1486: Xôi muối mè ở bếp xôi cơm. Mở 82 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_xoi_muoi_me', name: 'Xôi muối mè', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 2 }, { productId: 'hx_me_rang', quantity: 1 }],
    outputId: 'xoi_muoi_me', outputQty: 14, durationMin: 30, unlock: 82, reputationGain: 3 },
  // GĐ1487: Nem nướng cuốn ở bếp nướng. Mở 83 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_nem_nuong_cuon', name: 'Nem nướng cuốn', station: 'food_grill',
    inputs: [{ productId: 'hx_nem_nuong', quantity: 1 }, { productId: 'hx_banh_trang', quantity: 1 }],
    outputId: 'nem_nuong_cuon', outputQty: 8, durationMin: 25, unlock: 83, reputationGain: 3 },
  // GĐ1488: Cơm cá cơm rim ở bếp xôi cơm. Mở 84 (> golden 30, ≥ cấp nguyên liệu).
  { id: 'recipe_com_ca_com_rim', name: 'Cơm cá cơm rim', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_ca_kho', quantity: 1 }],
    outputId: 'com_ca_com_rim', outputQty: 12, durationMin: 30, unlock: 84, reputationGain: 3 },
  // GĐ1847: Cơm tép rim ở bếp xôi cơm. Mở 88 (> golden 30, ≥ cấp tép rim 60).
  { id: 'recipe_com_tep_rim', name: 'Cơm tép rim', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_tep_rim', quantity: 1 }],
    outputId: 'com_tep_rim', outputQty: 12, durationMin: 30, unlock: 88, reputationGain: 3 },
  // GĐ1850: Cháo đậu phộng ở nồi nước. Mở 92 (> golden 30, ≥ nguyên liệu 63).
  { id: 'recipe_chao_dau_phong', name: 'Cháo đậu phộng', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_dau_phong_rang', quantity: 1 }],
    outputId: 'chao_dau_phong', outputQty: 14, durationMin: 30, unlock: 92, reputationGain: 3 },
  // GĐ1851: Cơm khô cá sặc ở bếp xôi cơm. Mở 93 (> golden 30, ≥ nguyên liệu 64).
  { id: 'recipe_com_kho_ca_sac', name: 'Cơm khô cá sặc', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_kho_ca_sac', quantity: 1 }],
    outputId: 'com_kho_ca_sac', outputQty: 12, durationMin: 30, unlock: 93, reputationGain: 3 },
  // GĐ1853: Cơm mắm cá linh ở bếp xôi cơm. Mở 95 (> golden 30, ≥ nguyên liệu 66).
  { id: 'recipe_com_mam_ca_linh', name: 'Cơm mắm cá linh', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_mam_ca_linh', quantity: 1 }],
    outputId: 'com_mam_ca_linh', outputQty: 12, durationMin: 30, unlock: 95, reputationGain: 3 },
  // GĐ1857: Cháo nấm rơm ở nồi nước. Mở 101 (> golden 30, ≥ nguyên liệu 70).
  { id: 'recipe_chao_nam_rom', name: 'Cháo nấm rơm', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_nam_rom', quantity: 1 }],
    outputId: 'chao_nam_rom', outputQty: 14, durationMin: 30, unlock: 101, reputationGain: 3 },
  // GĐ1859: Cháo hạt sen ở nồi nước. Mở 103 (> golden 30, ≥ nguyên liệu 72).
  { id: 'recipe_chao_hat_sen', name: 'Cháo hạt sen', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_hat_sen', quantity: 1 }],
    outputId: 'chao_hat_sen', outputQty: 14, durationMin: 30, unlock: 103, reputationGain: 3 },
  // GĐ1861: Cháo đậu xanh ở nồi nước. Mở 105 (> golden 30, ≥ nguyên liệu 74).
  { id: 'recipe_chao_dau_xanh', name: 'Cháo đậu xanh', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_dau_xanh_ca', quantity: 1 }],
    outputId: 'chao_dau_xanh', outputQty: 14, durationMin: 30, unlock: 105, reputationGain: 3 },
  // GĐ1863: Cháo khoai lang ở nồi nước. Mở 107 (> golden 30, ≥ nguyên liệu 76).
  { id: 'recipe_chao_khoai_lang', name: 'Cháo khoai lang', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_khoai_say', quantity: 1 }],
    outputId: 'chao_khoai_lang', outputQty: 14, durationMin: 30, unlock: 107, reputationGain: 3 },
  // GĐ1866: Cơm nghệ ở bếp xôi cơm. Mở 110 (> golden 30, ≥ nguyên liệu 79).
  { id: 'recipe_com_nghe', name: 'Cơm nghệ', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_bot_nghe', quantity: 1 }],
    outputId: 'com_nghe', outputQty: 12, durationMin: 30, unlock: 110, reputationGain: 3 },
  // GĐ1870: Cơm lá dứa ở bếp xôi cơm. Mở 114 (> golden 30, ≥ nguyên liệu 84).
  { id: 'recipe_com_la_dua', name: 'Cơm lá dứa', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_la_dua', quantity: 1 }],
    outputId: 'com_la_dua', outputQty: 12, durationMin: 30, unlock: 114, reputationGain: 3 },
  // GĐ1873: Cháo gạo lứt ở nồi nước. Mở 117 (> golden 30, ≥ nguyên liệu 88).
  { id: 'recipe_chao_gao_lut', name: 'Cháo gạo lứt', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_gao_lut_rang', quantity: 1 }],
    outputId: 'chao_gao_lut', outputQty: 14, durationMin: 30, unlock: 117, reputationGain: 3 },
  { id: 'recipe_com_gac_bep', name: 'Cơm thịt gác bếp', station: 'rice_station',
    inputs: [{ productId: 'gao', quantity: 2 }, { productId: 'hx_gac_bep', quantity: 1 }],
    outputId: 'com_gac_bep', outputQty: 12, durationMin: 30, unlock: 126, reputationGain: 3 },
  // GĐ1523: Mâm cỗ đầu ngõ — món CUỐI CHUỖI (mục C#4 TONG-HOP Xóm "mâm cỗ = 5 món làm sẵn"): bày 5 món tự nấu
  // (cháo, măng xào, xôi, nem cuốn, cơm cá cơm ≈ 105k giá lẻ) thành 1 mâm 140k + uy tín cao. Mở 85 (> golden 30,
  // tránh mốc soát biên 82/86/91/96/100), biên nhập 100k → 1,4.
  { id: 'recipe_mam_co_ngo', name: 'Mâm cỗ đầu ngõ', station: 'gift_wrap',
    inputs: [{ productId: 'xoi_lap_xuong_trung', quantity: 1 }, { productId: 'mang_kho_xao_lap_xuong', quantity: 1 }, { productId: 'xoi_muoi_me', quantity: 1 }, { productId: 'nem_nuong_cuon', quantity: 1 }, { productId: 'com_ca_com_rim', quantity: 1 }],
    outputId: 'mam_co_ngo', outputQty: 1, durationMin: 15, unlock: 85, reputationGain: 6 },
  // GĐ1409: Sữa chua granola ở máy xay: lãi dương, hời hơn bán thẳng nguyên liệu. Mở 68 = cấp granola (> golden 30).
  { id: 'recipe_sua_chua_granola', name: 'Sữa chua granola', station: 'blender',
    inputs: [{ productId: 'ngu_coc', quantity: 1 }, { productId: 'suachua', quantity: 1 }],
    outputId: 'sua_chua_granola', outputQty: 14, durationMin: 12, unlock: 68, reputationGain: 3 },
  // GĐ1408: Cà phê phin sữa ở quầy pha: mẻ 172k → 300k, lãi 128k/mẻ, hời hơn bán thẳng nguyên liệu. Mở 64 = cấp cà phê xay (> golden 30).
  { id: 'recipe_ca_phe_phin_sua', name: 'Cà phê phin sữa', station: 'drink_counter',
    inputs: [{ productId: 'ca_phe_xay', quantity: 1 }, { productId: 'x_sua_dac', quantity: 1 }],
    outputId: 'ca_phe_phin_sua', outputQty: 25, durationMin: 20, unlock: 64, reputationGain: 2 },
  // GĐ1407: Trà atiso nấu nồi kiểu Đà Lạt: mẻ 55k → 90k, lãi 35k/mẻ, hời hơn bán thẳng (76k < 90k). Mở 44 (> golden 30).
  { id: 'recipe_tra_atiso_nau', name: 'Trà atiso nấu', station: 'hot_kettle',
    inputs: [{ productId: 'tra_atiso', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'tra_atiso_nau', outputQty: 15, durationMin: 20, unlock: 44, reputationGain: 2 },
  // GĐ1406: Bánh mì nho nướng lò ở bếp nướng: lãi dương, hời hơn bán thẳng nguyên liệu. Mở 42 = cấp nho khô (> golden 30).
  { id: 'recipe_banh_mi_nho', name: 'Bánh mì nho', station: 'food_grill',
    inputs: [{ productId: 'botmi', quantity: 1 }, { productId: 'nho_kho', quantity: 1 }],
    outputId: 'banh_mi_nho', outputQty: 12, durationMin: 20, unlock: 42, reputationGain: 2 },
  // GĐ1405: Sữa hạt điều ở máy xay: mẻ 95k → 144k, lãi 49k/mẻ, hời hơn bán thẳng (129k < 144k). Mở 45 ≥ 45/1 (> golden 30).
  { id: 'recipe_sua_hat_dieu', name: 'Sữa hạt điều', station: 'blender',
    inputs: [{ productId: 'hat_dieu_muoi', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sua_hat_dieu', outputQty: 12, durationMin: 10, unlock: 45, reputationGain: 2 },
  // GĐ1404: Gà hấp rượu gạo ở nồi hấp: mẻ 175k → 300k, lãi 125k/mẻ, hời hơn bán thẳng (243k < 300k). Mở 46 ≥ 34/46 (> golden 30).
  { id: 'recipe_ga_hap_ruou', name: 'Gà hấp rượu gạo', station: 'steamer',
    inputs: [{ productId: 'ga_ta_tuoi', quantity: 1 }, { productId: 'ruou_gao', quantity: 1 }],
    outputId: 'ga_hap_ruou', outputQty: 10, durationMin: 25, unlock: 46, reputationGain: 3 },
  // GĐ1401: Mì ý sốt thịt bằm ở bếp nồi nấu: mẻ 52k → 120k, lãi 68k/mẻ, hời hơn bán thẳng (70k < 120k). Mở 36 ≥ 12/30 (> golden 30).
  { id: 'recipe_mi_y_sot_bo', name: 'Mì ý sốt thịt bằm', station: 'hot_kettle',
    inputs: [{ productId: 'miy', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }],
    outputId: 'mi_y_sot_bo', outputQty: 8, durationMin: 18, unlock: 36, reputationGain: 3 },
  // GĐ1400: Sinh tố dưa hấu ở máy xay: mẻ 30k → 80k, lãi 50k/mẻ, hời hơn bán thẳng (45k < 80k). Mở 32 ≥ dưa 29 (> golden 30).
  { id: 'recipe_sinh_to_dua_hau', name: 'Sinh tố dưa hấu', station: 'blender',
    inputs: [{ productId: 'dua', quantity: 1 }],
    outputId: 'sinh_to_dua_hau', outputQty: 10, durationMin: 8, unlock: 32, reputationGain: 2 },
  // GĐ1399: Tương ớt nhà làm ở bếp nồi nấu: mẻ 28k → 48k, lãi 20k/mẻ, hời hơn bán thẳng (42k < 48k). Mở 71 (> golden 30).
  { id: 'recipe_tuong_ot_nha', name: 'Tương ớt nhà làm', station: 'hot_kettle',
    inputs: [{ productId: 'ot_hien', quantity: 1 }, { productId: 'giavi', quantity: 1 }],
    outputId: 'tuong_ot_nha', outputQty: 8, durationMin: 20, unlock: 71, reputationGain: 2 },
  // GĐ1398: Cua hấp bia ở nồi hấp: mẻ 295k → 432k, lãi 137k/mẻ, hời hơn bán thẳng (401k < 432k). Mở 55 (> golden 30).
  { id: 'recipe_cua_hap_bia', name: 'Cua hấp bia', station: 'steamer',
    inputs: [{ productId: 'cua_bien_tuoi', quantity: 1 }, { productId: 'bia_chai', quantity: 1 }],
    outputId: 'cua_hap_bia', outputQty: 12, durationMin: 20, unlock: 55, reputationGain: 4 },
  // GĐ1397: Tôm nướng muối ớt ở bếp nướng: mẻ 198k → 312k, lãi 114k/mẻ, hời hơn bán thẳng (272k < 312k). Mở 42 (> golden 30).
  { id: 'recipe_tom_nuong', name: 'Tôm nướng muối ớt', station: 'food_grill',
    inputs: [{ productId: 'tom_su_tuoi', quantity: 1 }, { productId: 'giavi', quantity: 1 }],
    outputId: 'tom_nuong', outputQty: 12, durationMin: 18, unlock: 42, reputationGain: 3 },
  // GĐ1394: Mực nướng sa tế ở bếp nướng: mẻ 168k → 264k, lãi 96k/mẻ, hời hơn bán thẳng nguyên liệu (232k < 264k).
  // Mở 46 ≥ mọi nguyên liệu (46/7), > golden 30 → sim không đổi.
  { id: 'recipe_muc_nuong', name: 'Mực nướng sa tế', station: 'food_grill',
    inputs: [{ productId: 'muc_ong_tuoi', quantity: 1 }, { productId: 'giavi', quantity: 1 }],
    outputId: 'muc_nuong', outputQty: 12, durationMin: 18, unlock: 46, reputationGain: 3 },
  // GĐ1391: Cháo lòng — món sáng Sài Gòn trứ danh: lòng heo non nấu cháo trắng rắc hành ở ấm nước:
  // mẻ (thịt heo tươi 95k + gạo 80k + hành phi 3k) = 178k → 25 chén × 14k = 350k, lãi 172k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (235k < 350k). Mở 36 ≥ mọi nguyên liệu (32/12/36) (> golden 30 → sim không đổi).
  { id: 'recipe_chao_long', name: 'Cháo lòng', station: 'hot_kettle',
    inputs: [{ productId: 'thit_heo_tuoi', quantity: 1 }, { productId: 'gao', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'chao_long', outputQty: 25, durationMin: 22, unlock: 36, reputationGain: 3 },
  // GĐ1364: Bánh canh tôm — món sợi bánh canh dai trứ danh: tôm đông lạnh nấu ngọt nước cùng bột gạo vo sợi
  // ở ấm nước: mẻ (tôm 90k + bột gạo 9k + hành phi 3k) = 102k → 8 tô × 22k = 176k, lãi 74k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (148k < 176k). Mở 44 = đúng cấp tôm (> golden 30 → sim không đổi).
  { id: 'recipe_banh_canh_tom', name: 'Bánh canh tôm', station: 'hot_kettle',
    inputs: [{ productId: 'hai_san', quantity: 1 }, { productId: 'x_bot_gao', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'banh_canh_tom', outputQty: 8, durationMin: 20, unlock: 44, reputationGain: 3 },
  // GĐ1365: Cá hồi áp chảo — món cao cấp kiểu Nhật trứ danh: cá hồi phi lê áp chảo da giòn ăn cùng hành phi
  // ở bếp nướng: mẻ (cá hồi 320k + hành phi 3k + muối 5k) = 328k → 6 phần × 90k = 540k, lãi 212k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (445k < 540k). Mở 53 = đúng cấp cá hồi (> golden 30 → sim không đổi).
  { id: 'recipe_ca_hoi_ap_chao', name: 'Cá hồi áp chảo', station: 'fryer',
    inputs: [{ productId: 'ca_hoi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'ca_hoi_ap_chao', outputQty: 6, durationMin: 15, unlock: 53, reputationGain: 4 },
  // GĐ1366: Mực khô nướng — món nhậu trứ danh bên mâm bia: mực khô nướng than đập dập ăn cùng muối ớt
  // ở bếp nướng: mẻ (mực 120k + hành phi 3k + muối 5k) = 128k → 6 con × 32k = 192k, lãi 64k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (180k < 192k). Mở 49 = đúng cấp mực (> golden 30 → sim không đổi).
  { id: 'recipe_muc_kho_nuong', name: 'Mực khô nướng', station: 'food_grill',
    inputs: [{ productId: 'muc_kho', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'muc_kho_nuong', outputQty: 6, durationMin: 12, unlock: 49, reputationGain: 2 },
  // GĐ1367: Lạp xưởng nướng — món nướng đường phố trứ danh: lạp xưởng (lap_xuong 44) nướng vàng phồng rắc
  // hành phi ở bếp nướng: mẻ (lạp xưởng 72k + hành phi 3k + muối 5k) = 80k → 10 cây × 13k = 130k, lãi 50k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (112k < 130k). Mở 44 = đúng cấp lạp xưởng (> golden 30 → sim không đổi).
  { id: 'recipe_lap_xuong_nuong', name: 'Lạp xưởng nướng', station: 'food_grill',
    inputs: [{ productId: 'lap_xuong', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'lap_xuong_nuong', outputQty: 10, durationMin: 12, unlock: 44, reputationGain: 2 },
  // GĐ1367: Cừu nướng — món nướng phương Tây cao cấp: thịt cừu (thit_cu 56) ướp muối nướng ở bếp nướng:
  // mẻ (cừu 250k + muối 5k + hành phi 3k) = 258k → 6 phần × 70k = 420k, lãi 162k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (362k < 420k). Mở 56 = đúng cấp cừu (> golden 30 → sim không đổi).
  { id: 'recipe_cuu_nuong', name: 'Cừu nướng', station: 'food_grill',
    inputs: [{ productId: 'thit_cu', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'cuu_nuong', outputQty: 6, durationMin: 20, unlock: 56, reputationGain: 4 },
  // GĐ1368: Gà xào hạt điều — món xào Hoa-Việt trứ danh: gà xào hành tây cùng hạt điều rang giòn ở ấm nước:
  // mẻ (gà nguyên con 130k + hạt điều 60k + hành phi 3k) = 193k → 6 phần × 45k = 270k, lãi 77k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (265k < 270k). Mở 52 = đúng cấp gà (> golden 30 → sim không đổi).
  { id: 'recipe_ga_xao_hat_dieu', name: 'Gà xào hạt điều', station: 'hot_kettle',
    inputs: [{ productId: 'thit_ga', quantity: 1 }, { productId: 'hat', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'ga_xao_hat_dieu', outputQty: 6, durationMin: 18, unlock: 52, reputationGain: 3 },
  // GĐ1369: Bún xào tôm khô — món xào đồng bằng đậm đà: bún tươi xào cùng tôm khô gói ở ấm nước:
  // mẻ (bún 12k + tôm khô 65k + hành phi 3k) = 80k → 8 tô × 17k = 136k, lãi 56k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (115k < 136k). Mở 47 = đúng cấp tôm khô (> golden 30 → sim không đổi).
  // GĐ1369: Cháo yến mạch — món sáng lành mạnh kiểu phương Tây: yến mạch hộp nấu cùng sữa tươi ở ấm nước:
  // mẻ (yến mạch 45k + sữa tươi 28k) = 73k → 6 chén × 18k = 108k, lãi 35k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (103k < 108k). Mở 40 = đúng cấp yến mạch (> golden 30 → sim không đổi).
  { id: 'recipe_chao_yen_mach', name: 'Cháo yến mạch', station: 'hot_kettle',
    inputs: [{ productId: 'yen_mach', quantity: 1 }, { productId: 'sua_tuoi', quantity: 1 }],
    outputId: 'chao_yen_mach', outputQty: 6, durationMin: 15, unlock: 40, reputationGain: 2 },
  // GĐ1370: Bò hầm rượu vang — món hầm Pháp trứ danh (bœuf bourguignon): thịt bò tươi hầm mềm cùng rượu vang
  // đỏ nhập ở nồi hấp: mẻ (bò 210k + vang 450k + hành phi 3k) = 663k → 6 phần × 180k = 1080k, lãi 417k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (910k < 1080k). Mở 58 = đúng cấp vang (> golden 30 → sim không đổi).
  { id: 'recipe_bo_ham_vang', name: 'Bò hầm rượu vang', station: 'hot_kettle',
    inputs: [{ productId: 'thit_bo_tuoi', quantity: 1 }, { productId: 'ruou_vang_nhap', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'bo_ham_vang', outputQty: 6, durationMin: 30, unlock: 58, reputationGain: 5 },
  // GĐ1375: Chuối chiên — món ăn vặt quốc dân: chuối nông trại chấm bột mì chiên vàng giòn ở chảo chiên:
  // mẻ (chuối 12k + bột mì 18k + hành phi 3k) = 33k → 10 que × 6k = 60k, lãi 27k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (49k < 60k). Mở 36 ≥ mọi nguyên liệu (22/1/36) (> golden 30 → sim không đổi).
  { id: 'recipe_chuoi_chien', name: 'Chuối chiên', station: 'fryer',
    inputs: [{ productId: 'x_chuoi', quantity: 1 }, { productId: 'botmi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'chuoi_chien', outputQty: 10, durationMin: 12, unlock: 36, reputationGain: 2 },
  // GĐ1376: Kem dừa — món kem Đà Lạt trứ danh: kem tươi dừa đánh lạnh cùng sữa tươi ở máy xay:
  // mẻ (sữa tươi 28k + nước cốt dừa 10k + đường 17k) = 55k → 8 hũ × 20k = 160k, lãi 105k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (100k < 160k). Mở 38 ≥ mọi nguyên liệu (25/30/1) (> golden 30 → sim không đổi).
  { id: 'recipe_kem_dua', name: 'Kem dừa', station: 'blender',
    inputs: [{ productId: 'sua_tuoi', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'kem_dua', outputQty: 8, durationMin: 18, unlock: 38, reputationGain: 3 },
  // GĐ1377: Bánh mì que — đặc sản Nha Trang trứ danh: que bánh mì mỏng giòn nướng nhồi pate que cay ở
  // bếp nướng: mẻ (bánh mì 8k×4 + hành phi 3k) = 35k → 20 que × 4k = 80k, lãi 45k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (65k < 80k). Mở 38 ≥ mọi nguyên liệu (38/36) (> golden 30 → sim không đổi).
  { id: 'recipe_banh_mi_que', name: 'Bánh mì que', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 4 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'banh_mi_que', outputQty: 20, durationMin: 12, unlock: 38, reputationGain: 2 },
  // GĐ1379: Bánh da lợn — bánh dân gian trứ danh: bột gạo trộn cốt dừa hấp lớp xanh lá dứa - trắng cốt dừa
  // ở nồi hấp: mẻ (bột gạo 9k + nước cốt dừa 10k + đường 17k) = 36k → 12 miếng × 6k = 72k, lãi 36k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (48k < 72k). Mở 38 ≥ mọi nguyên liệu (24/30/1) (> golden 30 → sim không đổi).
  { id: 'recipe_banh_da_lon', name: 'Bánh da lợn', station: 'steamer',
    inputs: [{ productId: 'x_bot_gao', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'banh_da_lon', outputQty: 12, durationMin: 18, unlock: 38, reputationGain: 2 },
  // GĐ1380: Chè trôi nước — bánh trôi chảy dân gian trứ danh: viên nếp nhân đường nấu trôi nước ngọt chan
  // cốt dừa ở ấm nước: mẻ (nếp 30k + đường 17k + nước cốt dừa 10k) = 57k → 12 viên × 9k = 108k, lãi 51k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (77k < 108k). Mở 38 ≥ mọi nguyên liệu (1/1/30) (> golden 30 → sim không đổi).
  { id: 'recipe_che_troi_nuoc', name: 'Chè trôi nước', station: 'hot_kettle',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'x_duong', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_gung', quantity: 1 }],
    outputId: 'che_troi_nuoc', outputQty: 12, durationMin: 18, unlock: 38, reputationGain: 2 },
  // GĐ1381: Chè Thái — chè trái cây thập cẩm trứ danh: trái cây trộn sữa tươi lạnh chan nước đường ở
  // ấm nước: mẻ (trái cây 25k + sữa tươi 28k + đường 17k) = 70k → 6 chén × 22k = 132k, lãi 62k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (97k < 132k). Mở 40 ≥ mọi nguyên liệu (28/25/1) (> golden 30 → sim không đổi).
  { id: 'recipe_che_thai', name: 'Chè Thái', station: 'hot_kettle',
    inputs: [{ productId: 'traicay', quantity: 1 }, { productId: 'sua_tuoi', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_thai', outputQty: 6, durationMin: 15, unlock: 40, reputationGain: 2 },
  // GĐ1383: Chè bắp — chè ngọt dân gian trứ danh: hạt bắp nếp nấu dẻo chan nước cốt dừa ở ấm nước:
  // mẻ (bắp 8k + nếp 30k + cốt dừa 10k + đường 17k) = 65k → 8 chén × 16k = 128k, lãi 63k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (89k < 128k). Mở 40 ≥ mọi nguyên liệu (1/1/30/1) (> golden 30 → sim không đổi).
  { id: 'recipe_che_bap', name: 'Chè bắp', station: 'hot_kettle',
    inputs: [{ productId: 'bap', quantity: 1 }, { productId: 'nep', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_bap', outputQty: 8, durationMin: 18, unlock: 40, reputationGain: 2 },
  { id: 'recipe_che_chuoi', name: 'Chè chuối', station: 'hot_kettle',
    inputs: [{ productId: 'x_chuoi', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_chuoi', outputQty: 8, durationMin: 18, unlock: 44, reputationGain: 2 },
  // GĐ1384: Bún mắm — món nước miền Tây trứ danh: bún tươi nấu nước lèo mắm ruốc đậm đà cùng thịt heo ở
  // ấm nước: mẻ (bún 12k + mắm ruốc 36k + thịt heo 30k + hành phi 3k) = 81k → 8 tô × 18k = 144k, lãi 63k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (117k < 144k). Mở 40 ≥ mọi nguyên liệu (33/34/30/36) (> golden 30 → sim không đổi).
  { id: 'recipe_bun_mam', name: 'Bún mắm', station: 'hot_kettle',
    inputs: [{ productId: 'bun', quantity: 1 }, { productId: 'hx_mam_ruoc', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'bun_mam', outputQty: 8, durationMin: 20, unlock: 40, reputationGain: 3 },
  // GĐ1385: Cơm hến — món Huế dân dã trứ danh: cơm trắng trộn nghêu xào cay chan nước lèo ở ấm nước:
  // mẻ (gạo 80k + nghêu 45k + hành phi 3k) = 128k → 30 phần × 12k = 360k, lãi 232k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (170k < 360k). Mở 57 = đúng cấp nghêu (> golden 30 → sim không đổi).
  { id: 'recipe_com_hen', name: 'Cơm hến', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'ngheu', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'com_hen', outputQty: 30, durationMin: 22, unlock: 57, reputationGain: 3 },
  // GĐ1386: Xôi chiên phồng — đặc sản mộc mạc trứ danh: viên xôi nếp áo bột mì chiên phồng giòn ở bếp nướng
  // (trạm bếp nướng — không rice_station nên không đụng kinh tế tiệm xôi): mẻ (nếp 30k + bột mì 18k +
  // hành phi 3k) = 51k → 12 viên × 8k = 96k, lãi 45k/mẻ, nấu hời hơn bán thẳng nguyên liệu (73k < 96k).
  // Mở 38 ≥ mọi nguyên liệu (1/1/36) (> golden 30 → sim không đổi).
  { id: 'recipe_xoi_chien_phong', name: 'Xôi chiên phồng', station: 'fryer',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'botmi', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'xoi_chien_phong', outputQty: 12, durationMin: 15, unlock: 38, reputationGain: 2 },
  // GĐ1387: Bánh khúc — đặc sản đồng bằng trứ danh: vỏ nếp trộn bắp xanh hấp chín, nhân đậu xanh đánh dẻo ở
  // nồi hấp: mẻ (nếp 30k + đậu xanh 15k + bắp 8k) = 53k → 10 cái × 10k = 100k, lãi 47k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (76k < 100k). Mở 38 ≥ mọi nguyên liệu (1/1/1) (> golden 30 → sim không đổi).
  { id: 'recipe_banh_khuc', name: 'Bánh khúc', station: 'steamer',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'dau_xanh', quantity: 1 }, { productId: 'bap', quantity: 1 }],
    outputId: 'banh_khuc', outputQty: 10, durationMin: 20, unlock: 38, reputationGain: 2 },

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
    outputId: 'tra_dao_cam_sa', outputQty: 6, durationMin: 10, unlock: 28, reputationGain: 3 },
  // GĐ1923: lối ra THỨ HAI của ô mai mơ nhà làm (bà Tám) — ra quầy pha, không chỉ nấu cháo.
  { id: 'recipe_tra_o_mai_mo', name: 'Trà ô mai mơ', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'hx_mut_mo', quantity: 1 }],
    outputId: 'tra_o_mai_mo', outputQty: 6, durationMin: 10, unlock: 168, reputationGain: 3 },
  { id: 'recipe_tra_o_mai_me', name: 'Trà ô mai me', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'hx_o_mai_me', quantity: 1 }],
    outputId: 'tra_o_mai_me', outputQty: 6, durationMin: 10, unlock: 169, reputationGain: 3 },
  { id: 'recipe_tra_o_mai_sau', name: 'Trà ô mai sấu', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'hx_o_mai_sau', quantity: 1 }],
    outputId: 'tra_o_mai_sau', outputQty: 6, durationMin: 10, unlock: 170, reputationGain: 3 },
  { id: 'recipe_tra_o_mai_quat', name: 'Trà ô mai quất', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'hx_o_mai_quat', quantity: 1 }],
    outputId: 'tra_o_mai_quat', outputQty: 6, durationMin: 10, unlock: 171, reputationGain: 3 },
  { id: 'recipe_tra_o_mai_dao', name: 'Trà ô mai đào', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'hx_o_mai_dao', quantity: 1 }],
    outputId: 'tra_o_mai_dao', outputQty: 6, durationMin: 10, unlock: 172, reputationGain: 3 },
  { id: 'recipe_tra_o_mai_cam', name: 'Trà ô mai cam', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'hx_o_mai_cam', quantity: 1 }],
    outputId: 'tra_o_mai_cam', outputQty: 6, durationMin: 10, unlock: 173, reputationGain: 3 },
  { id: 'recipe_tra_o_mai_xoai', name: 'Trà ô mai xoài', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'hx_o_mai_xoai', quantity: 1 }],
    outputId: 'tra_o_mai_xoai', outputQty: 6, durationMin: 10, unlock: 174, reputationGain: 3 },
  { id: 'recipe_tra_o_mai_man', name: 'Trà ô mai mận', station: 'drink_counter',
    inputs: [{ productId: 'tra', quantity: 1 }, { productId: 'hx_o_mai_man', quantity: 1 }],
    outputId: 'tra_o_mai_man', outputQty: 6, durationMin: 10, unlock: 178, reputationGain: 3 },
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
    outputId: 'ca_vien_chien', outputQty: 10, durationMin: 15, unlock: 32, reputationGain: 2 },
  // GĐ1324: Nem chua rán — đặc sản nhà bà Tám (nem chua GĐ1085) thành nguyên liệu chảo chiên, món ăn vặt.
  { id: 'recipe_nem_chua_ran', name: 'Nem chua rán', station: 'fryer',
    inputs: [{ productId: 'hx_nem_chua', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'nem_chua_ran', outputQty: 8, durationMin: 12, unlock: 36, reputationGain: 2 },
  // GĐ1332: Bánh xèo — món bánh xèo giòn trứ danh (nhồi thịt, rắc hành phi — bột gạo + nước cốt dừa) nấu ở chảo
  // chiên: mẻ (bột gạo 9k + nước cốt dừa 10k + thịt 30k + hành phi 1.5k×2) = 52k → 6 cái × 19k = 114k, lãi 62k/mẻ.
  // Mở 36 (sau mốc golden 30 → sim không đổi); không dùng rau/nông sản khóa ranking → farmKitchenValue không đổi.
  { id: 'recipe_banh_xeo', name: 'Bánh xèo', station: 'fryer',
    inputs: [{ productId: 'x_bot_gao', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'banh_xeo', outputQty: 6, durationMin: 15, unlock: 36, reputationGain: 2 },
  // GĐ1333: Chả giò chiên — `cha` (chả giò đông lạnh) rán vàng giòn ở chảo chiên: mẻ (chả giò 35k + hành phi 3k + muối 5k)
  // = 43k → 8 × 16k = 128k, lãi 85k/mẻ. Mở 36 (sau mốc golden 30 → sim không đổi); không rau/nông sản khóa → farmKitchenValue không đổi.
  { id: 'recipe_cha_gio_chien', name: 'Chả giò chiên', station: 'fryer',
    inputs: [{ productId: 'cha', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'cha_gio_chien', outputQty: 8, durationMin: 12, unlock: 36, reputationGain: 2 },

  // --- Nồi hấp (steamer) ---
  { id: 'recipe_banh_bao', name: 'Bánh bao hấp nóng', station: 'steamer',
    inputs: [{ productId: 'botmi', quantity: 2 }, { productId: 'thit', quantity: 2 }, { productId: 'trung', quantity: 1 }],
    outputId: 'banh_bao_hap', outputQty: 40, durationMin: 20, unlock: 39, reputationGain: 3 },
  // GĐ1094: Bánh flan — món hấp của trứng ngỗng trại (ngỗng mở cấp 18 nhưng chưa có lối ra bếp; trứng ngỗng
  // to gấp ba gà nên 1 quả làm một mẻ flan nhỏ). Mở 39 = đúng cấp mở nồi hấp.
  { id: 'recipe_banh_flan', name: 'Bánh flan', station: 'steamer',
    inputs: [{ productId: 'trung_goos', quantity: 1 }, { productId: 'x_sua_dac', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'banh_flan', outputQty: 24, durationMin: 25, unlock: 39, reputationGain: 3 },
  // GĐ1094: Chả lụa hấp — món hấp của thịt heo nhà (heo xuất chuồng mở cấp 20 nhưng chưa có lối ra bếp).
  { id: 'recipe_cha_lua', name: 'Chả lụa hấp', station: 'steamer',
    inputs: [{ productId: 'x_thit_heo', quantity: 2 }, { productId: 'trung', quantity: 1 }],
    outputId: 'cha_lua', outputQty: 10, durationMin: 25, unlock: 40, reputationGain: 3 },
  // GĐ1322: Bánh cuốn chả lụa (suất) — khép chuỗi "hàng xóm (bánh cuốn bà Tám GĐ1321 + chả lụa quê) → nồi hấp".
  // Mở 40 = đúng cấp bánh cuốn (sau mốc golden 30).
  { id: 'recipe_banh_cuon_cha_lua', name: 'Bánh cuốn chả lụa (suất)', station: 'steamer',
    inputs: [{ productId: 'hx_banh_cuon', quantity: 1 }, { productId: 'hx_cha_lua', quantity: 1 }, { productId: 'rau', quantity: 1 }],
    outputId: 'banh_cuon_cha_lua', outputQty: 10, durationMin: 20, unlock: 40, reputationGain: 2 },
  // GĐ1326: Mắm ruốc chưng thịt — món chưng Huế của mắm ruốc hàng xóm (hx_mam_ruoc GĐ1083) + thịt heo. Mở 40 (sau mốc golden 30).
  { id: 'recipe_mam_ruoc_chung_thit', name: 'Mắm ruốc chưng thịt', station: 'steamer',
    inputs: [{ productId: 'hx_mam_ruoc', quantity: 1 }, { productId: 'x_thit_heo', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'mam_ruoc_chung_thit', outputQty: 10, durationMin: 25, unlock: 40, reputationGain: 3 },

  // --- Quây xôi (rice_station) ---
  // 6 món xôi theo công thức chuẩn món ăn VN (khách quen bắt lỗi nguyên liệu sai ngành): đậu xanh/bắp/dừa
  // đều rưới nước cốt dừa + đường, món dừa thêm dừa nạo rắc mặt; mặn & thập cẩm có lạp xưởng + hành phi
  // + nước tương. Nguyên liệu (đường, nước cốt dừa, dừa nạo, lạp xưởng, hành phi) mở ≤ cấp 36 khớp quây xôi.
  { id: 'recipe_xoi_dau_xanh', name: 'Xôi đậu xanh', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'dau_xanh', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'xoi_dau_xanh', outputQty: 40, durationMin: 15, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_man', name: 'Xôi mặn', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'x_lap_xuong', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 1 }, { productId: 'x_nuoc_tuong', quantity: 1 }],
    outputId: 'xoi_man', outputQty: 40, durationMin: 15, unlock: 36, reputationGain: 3 },
  { id: 'recipe_xoi_trung', name: 'Xôi trứng', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'trung', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 1 }],
    outputId: 'xoi_trung', outputQty: 40, durationMin: 12, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_dua', name: 'Xôi dừa', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }, { productId: 'x_dua_nao', quantity: 1 }],
    outputId: 'xoi_dua', outputQty: 40, durationMin: 12, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_thap_cam', name: 'Xôi thập cẩm', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'thit', quantity: 1 }, { productId: 'trung', quantity: 1 }, { productId: 'x_lap_xuong', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 1 }, { productId: 'x_nuoc_tuong', quantity: 1 }],
    outputId: 'xoi_thap_cam', outputQty: 40, durationMin: 15, unlock: 36, reputationGain: 3 },
  { id: 'recipe_xoi_vo', name: 'Xôi vò', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'dau_xanh', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'xoi_vo', outputQty: 40, durationMin: 12, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_bap', name: 'Xôi bắp', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'bap', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'xoi_bap', outputQty: 40, durationMin: 12, unlock: 36, reputationGain: 2 },
  { id: 'recipe_xoi_gac', name: 'Xôi gấc', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'x_gac', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'xoi_gac', outputQty: 40, durationMin: 15, unlock: 43, reputationGain: 2 },
  { id: 'recipe_xoi_mit', name: 'Xôi mít', station: 'rice_station',
    inputs: [{ productId: 'nep', quantity: 1 }, { productId: 'x_mit', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'xoi_mit', outputQty: 40, durationMin: 12, unlock: 36, reputationGain: 2 },
  // GĐ1321: Xôi nếp cẩm — món cẩm cao cấp (gạo nếp cẩm mở cấp 70). Mở 70 sau mốc golden sim 30 → không đổi RNG mốc.
  { id: 'recipe_xoi_nep_cam', name: 'Xôi nếp cẩm', station: 'rice_station',
    inputs: [{ productId: 'nep_cam', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'xoi_nep_cam', outputQty: 40, durationMin: 12, unlock: 70, reputationGain: 2 },
  // GĐ1323: Xôi khô tôm — đặc sản vùng (khô tôm mối lái GĐ1321) thành nguyên liệu quây xôi. Mở 42 = đúng cấp khô tôm (sau mốc golden 30).
  { id: 'recipe_xoi_kho_tom', name: 'Xôi khô tôm', station: 'rice_station',
    inputs: [{ productId: 'rg_kho_tom', quantity: 1 }, { productId: 'nep', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }, { productId: 'x_nuoc_tuong', quantity: 1 }],
    outputId: 'xoi_kho_tom', outputQty: 40, durationMin: 15, unlock: 42, reputationGain: 2 },
  // GĐ1323: Xôi lạp xưởng miền — đặc sản vùng (lạp xưởng miền mối lái GĐ1321) thành nguyên liệu quây xôi. Mở 44 = đúng cấp lạp xưởng (sau mốc golden 30).
  { id: 'recipe_xoi_lap_xuong', name: 'Xôi lạp xưởng miền', station: 'rice_station',
    inputs: [{ productId: 'rg_lap_xuong', quantity: 1 }, { productId: 'nep', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }, { productId: 'x_nuoc_tuong', quantity: 1 }],
    outputId: 'xoi_lap_xuong', outputQty: 40, durationMin: 15, unlock: 44, reputationGain: 2 },
  // GĐ1326: Xôi mắm tép — đặc sản mắm tép nhà hàng xóm (hx_mam_tep GĐ1077) thành nguyên liệu quây xôi. Mở 34 (sau mốc golden 30).
  { id: 'recipe_xoi_mam_tep', name: 'Xôi mắm tép', station: 'rice_station',
    inputs: [{ productId: 'hx_mam_tep', quantity: 1 }, { productId: 'nep', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }, { productId: 'x_nuoc_tuong', quantity: 1 }],
    outputId: 'xoi_mam_tep', outputQty: 40, durationMin: 15, unlock: 36, reputationGain: 2 },

  // --- Máy ép mía (sugarcane_press) ---
  { id: 'recipe_nuoc_mia', name: 'Nước mía', station: 'sugarcane_press',
    inputs: [{ productId: 'mia', quantity: 4 }],
    outputId: 'nuoc_mia', outputQty: 10, durationMin: 6, unlock: 25, reputationGain: 1 },
  // GĐ1359: Nước mía chanh — món hè giải nhiệt kinh điển: mía ép cùng chanh không hạt + đường ở máy ép mía:
  // mẻ (mía 12k×4 + chanh 10k + đường 17k) = 75k → 10 ly × 13k = 130k, lãi 55k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (107k < 130k). Mở 36 ≥ mọi nguyên liệu (1/22/1) (> golden 30 → sim không đổi).
  { id: 'recipe_nuoc_mia_chanh', name: 'Nước mía chanh', station: 'sugarcane_press',
    inputs: [{ productId: 'mia', quantity: 4 }, { productId: 'x_chanh_khong_hat', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'nuoc_mia_chanh', outputQty: 10, durationMin: 8, unlock: 36, reputationGain: 2 },
  // GĐ1360: Bánh mì chà bông — bản bánh mì dân dã quen thuộc: chà bông hũ rắc dày cùng hành phi nướng ở
  // bếp nướng: mẻ (bánh mì 8k×5 + chà bông 32k + hành phi 3k) = 75k → 5 bánh × 26k = 130k, lãi 55k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (126k < 130k). Mở 42 = đúng cấp chà bông (> golden 30 → sim không đổi).
  { id: 'recipe_banh_mi_cha_bong', name: 'Bánh mì chà bông', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 5 }, { productId: 'cha_bong', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'banh_mi_cha_bong', outputQty: 5, durationMin: 12, unlock: 42, reputationGain: 2 },
  // GĐ1360: Sữa chua nếp cẩm — món tráng miệng Đà Lạt trứ danh: nếp cẩm nấu dẻo trộn sữa chua xay lạnh
  // ở máy xay: mẻ (nếp cẩm 55k + sữa chua 5k×2 + đường 17k) = 82k → 6 hũ × 22k = 132k, lãi 50k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (115k < 132k). Mở 70 = đúng cấp nếp cẩm (> golden 30 → sim không đổi).
  { id: 'recipe_sua_chua_nep_cam', name: 'Sữa chua nếp cẩm', station: 'blender',
    inputs: [{ productId: 'nep_cam', quantity: 1 }, { productId: 'suachua', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'sua_chua_nep_cam', outputQty: 6, durationMin: 15, unlock: 70, reputationGain: 3 },

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
  // GĐ1345: Giỏ quà Giáng sinh — lễ tặng quà lớn duy nhất còn thiếu giỏ: giỏ premium đầu tiên có rượu vang
  // (ruou 35) + bánh kẹo + trà, gói trong đúng dịp giang_sinh: mẻ (rượu 120k + bánh 5k×4 + trà 20k×2) = 180k
  // → 2 giỏ × 140k = 280k, lãi 100k/mẻ, gói hời hơn bán thẳng nguyên liệu (262k < 280k).
  // Mở 36 ≥ mọi nguyên liệu (1/1/35) (> golden 30 → sim không đổi; ngoài dịp lễ không gói được như các giỏ khác).
  { id: 'recipe_gio_giang_sinh', name: 'Giỏ quà Giáng sinh', station: 'gift_wrap',
    inputs: [{ productId: 'ruou', quantity: 1 }, { productId: 'banh', quantity: 4 }, { productId: 'tra', quantity: 2 }],
    outputId: 'gio_qua_giang_sinh', outputQty: 2, durationMin: 12, unlock: 36, reputationGain: 3, festival: 'giang_sinh' },
  // GĐ1346: Giỏ quà Valentine — giỏ cặp đôi: mỹ phẩm (mypham 34) + bánh kẹo + kẹo mút ngọt ngào, gói trong
  // đúng dịp valentine: mẻ (mỹ phẩm 80k + bánh 5k×4 + kẹo mút 1k×8) = 108k → 2 giỏ × 90k = 180k, lãi 72k/mẻ,
  // gói hời hơn bán thẳng nguyên liệu (168k < 180k). Mở 36 ≥ mọi nguyên liệu (1/1/3) (> golden 30 → sim không đổi).
  { id: 'recipe_gio_valentine', name: 'Giỏ quà Valentine', station: 'gift_wrap',
    inputs: [{ productId: 'mypham', quantity: 1 }, { productId: 'banh', quantity: 4 }, { productId: 'keomut', quantity: 8 }],
    outputId: 'gio_qua_valentine', outputQty: 2, durationMin: 10, unlock: 36, reputationGain: 3, festival: 'valentine' },

  // GĐ1941: Khép lối ra nấu cho 10 nguyên liệu nhà làm "hàng chết" (homemade.ts) — mỗi món CHÍNH CÓ THẬT ngoài đời
  // (đã tra cứu: Wikipedia tiếng Việt + nguồn ẩm thực), dùng nguyên liệu đó làm thành phần chủ đạo.
  // Mỗi recipe: unlock = cấp nguyên liệu chính (> golden 30 → sim không đổi), unlock ≥ mọi nguyên liệu,
  // mẻ lãi dương TÍNH TỪ GIÁ THẬT luôn hơn bán thẳng nguyên liệu (xem giá trị ở COOKED_PRODUCTS).
  // Cà ri gà — món chính miền Nam (nước cốt dừa + bột cà ri), khép lối ra bột cà ri nhà rang (hx_bot_ca_ri 80).
  { id: 'recipe_ca_ri_ga', name: 'Cà ri gà', station: 'hot_kettle',
    inputs: [{ productId: 'thit_ga', quantity: 1 }, { productId: 'hx_bot_ca_ri', quantity: 1 }, { productId: 'x_dua_cot_hop', quantity: 1 }],
    outputId: 'ca_ri_ga', outputQty: 40, durationMin: 20, unlock: 80, reputationGain: 2 },
  // Hủ tiếu sa tế — món Sài Gòn (hủ tiếu + sa tế tôm + thịt), khép lối ra sa tế tôm nhà làm (hx_sate_tom 59).
  { id: 'recipe_hu_tieu_sa_te', name: 'Hủ tiếu sa tế', station: 'hot_kettle',
    inputs: [{ productId: 'hut_tieu', quantity: 1 }, { productId: 'hx_sate_tom', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }],
    outputId: 'hu_tieu_sa_te', outputQty: 16, durationMin: 14, unlock: 59, reputationGain: 2 },
  // Bún mắm nêm — đặc sản Đà Nẵng/Huế (bún + mắm nêm pha + thịt + khóm), khép lối ra mắm nêm nhà pha (hx_mam_nem 87).
  { id: 'recipe_bun_mam_nem', name: 'Bún mắm nêm', station: 'hot_kettle',
    inputs: [{ productId: 'bun', quantity: 1 }, { productId: 'hx_mam_nem', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_thom', quantity: 1 }],
    outputId: 'bun_mam_nem', outputQty: 16, durationMin: 15, unlock: 87, reputationGain: 2 },
  // Gà nướng muối sả — thịt gà ướp muối sả + sả quấn nướng, khép lối ra muối sả nhà làm (hx_muoi_sa 81).
  // Chú ý: tên món chứa "sả" → bắt buộc có nguyên liệu x_sa (luật GĐ1692 recipeNameIngredients).
  { id: 'recipe_ga_nuong_muoi_sa', name: 'Gà nướng muối sả', station: 'food_grill',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_sa', quantity: 1 }, { productId: 'hx_muoi_sa', quantity: 1 }],
    outputId: 'ga_nuong_muoi_sa', outputQty: 16, durationMin: 15, unlock: 81, reputationGain: 2 },
  // Bánh cuốn tôm chua Huế — đặc sản cố đô (bánh ướt cuốn tôm chua), khép lối ra tôm chua Huế nhà ủ (hx_tom_chua 67).
  { id: 'recipe_banh_cuon_tom_chua', name: 'Bánh cuốn tôm chua Huế', station: 'steamer',
    inputs: [{ productId: 'x_bot_gao', quantity: 1 }, { productId: 'hx_tom_chua', quantity: 1 }],
    outputId: 'banh_cuon_tom_chua', outputQty: 16, durationMin: 12, unlock: 67, reputationGain: 2 },
  // Bánh mì ruốc — ruốc cá lóc rắc lên bánh mì nướng giòn, khép lối ra ruốc cá lóc nhà làm (hx_ruoc_ca_loc 61).
  { id: 'recipe_banh_mi_ruoc', name: 'Bánh mì ruốc', station: 'food_grill',
    inputs: [{ productId: 'banhmi', quantity: 1 }, { productId: 'hx_ruoc_ca_loc', quantity: 1 }],
    outputId: 'banh_mi_ruoc', outputQty: 16, durationMin: 10, unlock: 61, reputationGain: 2 },
  // Chè đậu đen — món ngọt truyền thống (đậu đen rang nấu đường), khép lối ra đậu đen rang (hx_dau_den 73).
  { id: 'recipe_che_dau_den', name: 'Chè đậu đen', station: 'hot_kettle',
    inputs: [{ productId: 'hx_dau_den', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_dau_den', outputQty: 16, durationMin: 15, unlock: 73, reputationGain: 2 },
  // Chè mè đen — tráng miệng Sài Gòn (ẩm thực người Hoa), khép lối ra mè đen xay (hx_me_den 75).
  { id: 'recipe_che_me_den', name: 'Chè mè đen', station: 'hot_kettle',
    inputs: [{ productId: 'hx_me_den', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_me_den', outputQty: 16, durationMin: 15, unlock: 75, reputationGain: 2 },
  // Cá kho tương hột — món kho Nam Bộ (cá lóc kho tương hột), khép lối ra tương hột Bến Tre nhà ủ (hx_tuong_hot 78).
  { id: 'recipe_ca_kho_tuong', name: 'Cá kho tương hột', station: 'hot_kettle',
    inputs: [{ productId: 'ca_loc_tuoi', quantity: 1 }, { productId: 'hx_tuong_hot', quantity: 1 }],
    outputId: 'ca_kho_tuong', outputQty: 20, durationMin: 20, unlock: 78, reputationGain: 2 },
  // Xoài lắc muối tôm — món vặt đường phố (xoài lắc muối tôm Tây Ninh), khép lối ra muối tôm nhà rang (hx_muoi_tom 71).
  { id: 'recipe_xoai_lac_muoi_tom', name: 'Xoài lắc muối tôm', station: 'blender',
    inputs: [{ productId: 'x_xoai', quantity: 1 }, { productId: 'hx_muoi_tom', quantity: 1 }],
    outputId: 'xoai_lac_muoi_tom', outputQty: 8, durationMin: 8, unlock: 71, reputationGain: 2 },
  // GĐ1972: Cà tím nướng mỡ hành — Nam Bộ: cà tím nướng than cháy vỏ, xé, rưới mỡ hành (mỡ hành → hành lá phi thay, không có mỡ heo riêng).
  { id: 'recipe_ca_tim_nuong_mo_hanh', name: 'Cà tím nướng mỡ hành', station: 'food_grill',
    inputs: [{ productId: 'x_ca_tim', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'ca_tim_nuong_mo_hanh', outputQty: 4, durationMin: 12, unlock: 60, reputationGain: 1 },
  // GĐ1973: Rau muống luộc — cơm nhà miền Bắc: luộc nồi nước, chấm nước mắm/tương, nước luộc vắt chanh (hot_kettle).
  { id: 'recipe_rau_muong_luoc', name: 'Rau muống luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_rau_muong', quantity: 1 }],
    outputId: 'rau_muong_luoc', outputQty: 3, durationMin: 6, unlock: 61, reputationGain: 1 },
  // GĐ1974: Bắp luộc — quà vặt cả nước: bắp ngọt luộc nguyên trái trong nồi nước (hot_kettle).
  { id: 'recipe_bap_luoc', name: 'Bắp luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_bap', quantity: 1 }],
    outputId: 'bap_luoc', outputQty: 3, durationMin: 20, unlock: 62, reputationGain: 1 },
  // GĐ1975: Khoai lang luộc — quà sáng cả nước: khoai lang luộc nguyên củ trong nồi nước (hot_kettle).
  { id: 'recipe_khoai_lang_luoc', name: 'Khoai lang luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_khoai_lang_tuoi', quantity: 1 }],
    outputId: 'khoai_lang_luoc', outputQty: 4, durationMin: 20, unlock: 63, reputationGain: 1 },
  // GĐ1976: Bông cải xào tỏi — cơm nhà cả nước: bông cải xanh xào lửa lớn với tỏi phi (chảo, fryer).
  { id: 'recipe_bong_cai_xao_toi', name: 'Bông cải xào tỏi', station: 'fryer',
    inputs: [{ productId: 'x_bong_cai_xanh', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'bong_cai_xao_toi', outputQty: 5, durationMin: 8, unlock: 64, reputationGain: 1 },
  // GĐ1977: Bí đỏ xào tỏi — cơm nhà cả nước: bí đỏ thái miếng xào với tỏi phi (chảo, fryer).
  { id: 'recipe_bi_do_xao_toi', name: 'Bí đỏ xào tỏi', station: 'fryer',
    inputs: [{ productId: 'x_bi_do', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'bi_do_xao_toi', outputQty: 5, durationMin: 8, unlock: 65, reputationGain: 1 },
  // GĐ1978: Canh bí đỏ — cơm nhà cả nước: bí đỏ nấu với thịt bằm trong nồi nước (hot_kettle).
  { id: 'recipe_canh_bi_do', name: 'Canh bí đỏ', station: 'hot_kettle',
    inputs: [{ productId: 'x_bi_do', quantity: 1 }, { productId: 'x_thit_xay', quantity: 1 }],
    outputId: 'canh_bi_do', outputQty: 8, durationMin: 15, unlock: 66, reputationGain: 1 },
  // GĐ1979: Sườn ram — cơm nhà Nam/Trung: sườn chặt miếng chiên săn rồi ram nước mắm đường trong chảo (fryer); nước mắm/đường là gia vị bếp, không tính.
  { id: 'recipe_suon_ram', name: 'Sườn ram', station: 'fryer',
    inputs: [{ productId: 'x_suon_heo', quantity: 1 }],
    outputId: 'suon_ram', outputQty: 5, durationMin: 20, unlock: 67, reputationGain: 1 },
  // GĐ1980: Gà luộc — cơm nhà/cúng cả nước: gà luộc trong nồi nước, chặt miếng chấm muối tiêu chanh (hot_kettle).
  { id: 'recipe_ga_luoc', name: 'Gà luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }],
    outputId: 'ga_luoc', outputQty: 5, durationMin: 25, unlock: 68, reputationGain: 1 },
  // GĐ1981: Tôm rim — cơm nhà cả nước: tôm rim nước mắm đường trong chảo tới săn đỏ (fryer); gia vị bếp không tính.
  { id: 'recipe_tom_rim', name: 'Tôm rim', station: 'fryer',
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }],
    outputId: 'tom_rim', outputQty: 6, durationMin: 15, unlock: 69, reputationGain: 1 },
  // GĐ1982: Mực xào hành tây — cơm nhà/quán nhậu cả nước: mực khoanh xào lửa lớn với hành tây (chảo, fryer).
  { id: 'recipe_muc_xao_hanh_tay', name: 'Mực xào hành tây', station: 'fryer',
    inputs: [{ productId: 'x_muc_tuoi', quantity: 1 }, { productId: 'x_hanh_tay', quantity: 1 }],
    outputId: 'muc_xao_hanh_tay', outputQty: 6, durationMin: 10, unlock: 70, reputationGain: 1 },
  // GĐ1984: Thịt rang cháy cạnh — cơm nhà miền Bắc: ba chỉ thái mỏng rang tới cháy cạnh với hành khô, nước mắm (chảo, fryer).
  { id: 'recipe_thit_rang_chay_canh', name: 'Thịt rang cháy cạnh', station: 'fryer',
    inputs: [{ productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_hanh_kho', quantity: 1 }],
    outputId: 'thit_rang_chay_canh', outputQty: 6, durationMin: 15, unlock: 71, reputationGain: 1 },
  // GĐ1985: Cá thu sốt cà — cơm nhà cả nước: cá thu chiên vàng rồi rim sốt cà chua (chảo, fryer).
  { id: 'recipe_ca_thu_sot_ca', name: 'Cá thu sốt cà', station: 'fryer',
    inputs: [{ productId: 'x_ca_thu_tuoi', quantity: 1 }, { productId: 'x_ca_chua', quantity: 1 }],
    outputId: 'ca_thu_sot_ca', outputQty: 6, durationMin: 15, unlock: 72, reputationGain: 1 },
  // GĐ1986: Trứng luộc — cơm nhà cả nước: trứng gà luộc nồi nước, ăn kèm rau luộc chấm nước mắm (hot_kettle).
  { id: 'recipe_trung_luoc', name: 'Trứng luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_trung_ga', quantity: 4 }],
    outputId: 'trung_luoc', outputQty: 4, durationMin: 10, unlock: 73, reputationGain: 1 },
  // GĐ1987: Rau cải luộc — cơm nhà cả nước: rau cải luộc nồi nước, chấm nước mắm (hot_kettle).
  { id: 'recipe_rau_cai_luoc', name: 'Rau cải luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_rau_cai', quantity: 1 }],
    outputId: 'rau_cai_luoc', outputQty: 3, durationMin: 6, unlock: 74, reputationGain: 1 },
  // GĐ1988: Đậu hũ chiên — cơm nhà cả nước (miền Bắc gọi đậu rán): đậu hũ chiên vàng trong chảo nhiều dầu (fryer), chấm nước mắm.
  { id: 'recipe_dau_hu_chien', name: 'Đậu hũ chiên', station: 'fryer',
    inputs: [{ productId: 'x_dau_hu', quantity: 4 }],
    outputId: 'dau_hu_chien', outputQty: 6, durationMin: 8, unlock: 75, reputationGain: 1 },
  // GĐ1989: Canh cải — cơm nhà cả nước: rau cải nấu thịt bằm trong nồi nước (hot_kettle).
  { id: 'recipe_canh_cai', name: 'Canh cải', station: 'hot_kettle',
    inputs: [{ productId: 'x_rau_cai', quantity: 1 }, { productId: 'x_thit_xay', quantity: 1 }],
    outputId: 'canh_cai', outputQty: 8, durationMin: 12, unlock: 76, reputationGain: 1 },
  // GĐ1990: Tôm luộc — cơm nhà cả nước: tôm luộc nồi nước tới đỏ, chấm muối tiêu chanh (hot_kettle).
  { id: 'recipe_tom_luoc', name: 'Tôm luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }],
    outputId: 'tom_luoc', outputQty: 6, durationMin: 8, unlock: 77, reputationGain: 1 },
  // GĐ1991: Bò xào hành tây — cơm nhà cả nước: thịt bò thái mỏng xào lửa lớn với hành tây (chảo, fryer).
  { id: 'recipe_bo_xao_hanh_tay', name: 'Bò xào hành tây', station: 'fryer',
    inputs: [{ productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_hanh_tay', quantity: 1 }],
    outputId: 'bo_xao_hanh_tay', outputQty: 6, durationMin: 8, unlock: 78, reputationGain: 1 },
  // GĐ1992: Giá xào — cơm nhà cả nước: giá đỗ xào nhanh lửa lớn với hành lá (chảo, fryer).
  { id: 'recipe_gia_xao', name: 'Giá xào', station: 'fryer',
    inputs: [{ productId: 'x_gia_do', quantity: 2 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'gia_xao', outputQty: 4, durationMin: 5, unlock: 79, reputationGain: 1 },
  // GĐ1993: Chè đậu đỏ — chè cả nước: đậu đỏ ninh nhừ với đường trong nồi (hot_kettle); nước cốt dừa rưới tùy nơi, không bắt buộc.
  { id: 'recipe_che_dau_do', name: 'Chè đậu đỏ', station: 'hot_kettle',
    inputs: [{ productId: 'x_dau_do', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'che_dau_do', outputQty: 10, durationMin: 40, unlock: 80, reputationGain: 1 },
  // GĐ1994: Sườn xào chua ngọt — cơm nhà cả nước: sườn chiên săn rồi đảo sốt chua ngọt (tương cà, giấm, đường) trong chảo (fryer).
  { id: 'recipe_suon_xao_chua_ngot', name: 'Sườn xào chua ngọt', station: 'fryer',
    inputs: [{ productId: 'x_suon_heo', quantity: 1 }, { productId: 'x_tuong_ca', quantity: 1 }, { productId: 'x_giam', quantity: 1 }],
    outputId: 'suon_xao_chua_ngot', outputQty: 6, durationMin: 20, unlock: 81, reputationGain: 1 },
  // GĐ1995: Khoai tây xào — cơm nhà cả nước: khoai tây thái sợi/lát xào với hành tây (chảo, fryer).
  { id: 'recipe_khoai_tay_xao', name: 'Khoai tây xào', station: 'fryer',
    inputs: [{ productId: 'x_khoai_tay', quantity: 1 }, { productId: 'x_hanh_tay', quantity: 1 }],
    outputId: 'khoai_tay_xao', outputQty: 5, durationMin: 10, unlock: 83, reputationGain: 1 },
  // GĐ1996: Mực chiên nước mắm — cơm nhà/quán nhậu cả nước: mực chiên săn rồi đảo nước mắm tỏi trong chảo (fryer); nước mắm = nước mắm nhà ủ.
  { id: 'recipe_muc_chien_nuoc_mam', name: 'Mực chiên nước mắm', station: 'fryer',
    inputs: [{ productId: 'x_muc_tuoi', quantity: 1 }, { productId: 'x_toi', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'muc_chien_nuoc_mam', outputQty: 10, durationMin: 12, unlock: 84, reputationGain: 1 },
  // GĐ1997: Cá thu kho — cơm nhà miền Trung/Nam: cá thu kho nước mắm đường tới keo (hot_kettle = kho); gia vị bếp không tính.
  { id: 'recipe_ca_thu_kho', name: 'Cá thu kho', station: 'hot_kettle',
    inputs: [{ productId: 'x_ca_thu_tuoi', quantity: 1 }],
    outputId: 'ca_thu_kho', outputQty: 5, durationMin: 30, unlock: 85, reputationGain: 1 },
  // GĐ1998: Canh chua tôm — Nam Bộ: tôm nấu canh chua với thơm, cà chua (me chua → bỏ, game chưa có me tươi; vị chua từ thơm + cà).
  { id: 'recipe_canh_chua_tom', name: 'Canh chua tôm', station: 'hot_kettle',
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_thom', quantity: 1 }, { productId: 'x_ca_chua', quantity: 1 }],
    outputId: 'canh_chua_tom', outputQty: 10, durationMin: 15, unlock: 87, reputationGain: 1 },
  // GĐ1999: Bò lúc lắc — Sài Gòn: thịt bò cắt hạt lựu xào lửa lớn lắc chảo với ớt chuông, hành tây (fryer).
  { id: 'recipe_bo_luc_lac', name: 'Bò lúc lắc', station: 'fryer',
    inputs: [{ productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_ot_chuong', quantity: 1 }, { productId: 'x_hanh_tay', quantity: 1 }],
    outputId: 'bo_luc_lac', outputQty: 8, durationMin: 10, unlock: 88, reputationGain: 1 },
  // GĐ2000: Cá rô phi kho — cơm nhà cả nước: cá rô phi kho nước mắm đường tới keo (hot_kettle = kho); gia vị bếp không tính.
  { id: 'recipe_ca_ro_phi_kho', name: 'Cá rô phi kho', station: 'hot_kettle',
    inputs: [{ productId: 'x_ca_ro_phi', quantity: 1 }],
    outputId: 'ca_ro_phi_kho', outputQty: 5, durationMin: 30, unlock: 89, reputationGain: 1 },
  // GĐ2001: Canh rau muống — cơm nhà miền Bắc: rau muống nấu canh với cà chua (sấu → cà chua thay, game chưa có sấu).
  { id: 'recipe_canh_rau_muong', name: 'Canh rau muống', station: 'hot_kettle',
    inputs: [{ productId: 'x_rau_muong', quantity: 1 }, { productId: 'x_ca_chua', quantity: 1 }],
    outputId: 'canh_rau_muong', outputQty: 6, durationMin: 8, unlock: 90, reputationGain: 1 },
  // GĐ2002: Chả trứng — Sài Gòn (ăn kèm cơm tấm): trứng đánh với thịt xay hấp chín rồi phết lòng đỏ (steamer); miến/mộc nhĩ thêm tùy nơi, không bắt buộc.
  { id: 'recipe_cha_trung', name: 'Chả trứng', station: 'steamer',
    inputs: [{ productId: 'x_trung_ga', quantity: 4 }, { productId: 'x_thit_xay', quantity: 1 }],
    outputId: 'cha_trung', outputQty: 10, durationMin: 25, unlock: 92, reputationGain: 1 },
  // GĐ2003: Nui xào bò — Sài Gòn: nui luộc rồi xào với thịt bò, cà chua trong chảo (fryer).
  { id: 'recipe_nui_xao_bo', name: 'Nui xào bò', station: 'fryer',
    inputs: [{ productId: 'x_nui_kho', quantity: 1 }, { productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_ca_chua', quantity: 1 }],
    outputId: 'nui_xao_bo', outputQty: 10, durationMin: 15, unlock: 93, reputationGain: 1 },
  // GĐ2004: Miến xào — cả nước (cỗ/cơm nhà): miến dong ngâm mềm xào với thịt, cà rốt (chảo, fryer); mộc nhĩ thêm tùy nơi.
  { id: 'recipe_mien_xao', name: 'Miến xào', station: 'fryer',
    inputs: [{ productId: 'x_mien_dong', quantity: 1 }, { productId: 'x_thit_xay', quantity: 1 }, { productId: 'x_ca_rot', quantity: 1 }],
    outputId: 'mien_xao', outputQty: 10, durationMin: 12, unlock: 94, reputationGain: 1 },
  // GĐ2005: Cháo thịt bằm — cả nước (cháo sáng/cháo ốm): gạo ninh nhừ với thịt heo bằm, rắc hành lá (hot_kettle).
  { id: 'recipe_chao_thit_bam', name: 'Cháo thịt bằm', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'x_thit_xay', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'chao_thit_bam', outputQty: 30, durationMin: 25, unlock: 95, reputationGain: 1 },
  // GĐ2006: Cháo cá — cả nước: gạo ninh nhừ với cá (cá lóc/cá chép → cá basa phi lê thay, game chưa có cá lóc tươi), rắc hành (hot_kettle).
  { id: 'recipe_chao_ca', name: 'Cháo cá', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'x_ca_basa', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'chao_ca', outputQty: 30, durationMin: 25, unlock: 97, reputationGain: 1 },
  // GĐ2007: Cơm chiên Dương Châu — quán cơm chiên cả nước: cơm chiên với trứng, lạp xưởng, cà rốt (đậu Hà Lan/tôm thêm tùy quán) trong chảo (fryer).
  { id: 'recipe_com_chien_duong_chau', name: 'Cơm chiên Dương Châu', station: 'fryer',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'x_trung_ga', quantity: 5 }, { productId: 'x_lap_xuong', quantity: 2 }, { productId: 'x_ca_rot', quantity: 1 }],
    outputId: 'com_chien_duong_chau', outputQty: 40, durationMin: 20, unlock: 98, reputationGain: 1 },
  // GĐ2008: Bún thịt nướng — Sài Gòn: thịt heo ướp nướng than, ăn với bún tươi, rau sống, nước mắm chua ngọt (food_grill).
  { id: 'recipe_bun_thit_nuong', name: 'Bún thịt nướng', station: 'food_grill',
    inputs: [{ productId: 'x_bun_tuoi', quantity: 2 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_xa_lach', quantity: 1 }],
    outputId: 'bun_thit_nuong', outputQty: 8, durationMin: 20, unlock: 99, reputationGain: 1 },
  // GĐ2009: Bún chả — Hà Nội: chả viên (thịt xay) + chả miếng (ba chỉ) nướng than hoa, ăn với bún và nước chấm (food_grill).
  { id: 'recipe_bun_cha', name: 'Bún chả', station: 'food_grill',
    inputs: [{ productId: 'x_bun_tuoi', quantity: 2 }, { productId: 'x_thit_xay', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }],
    outputId: 'bun_cha', outputQty: 10, durationMin: 25, unlock: 101, reputationGain: 1 },
  // GĐ2010: Cháo sườn — Hà Nội (cháo sáng): gạo ninh nhừ với sườn heo, rắc hành (hot_kettle); quẩy ăn kèm tùy nơi.
  { id: 'recipe_chao_suon', name: 'Cháo sườn', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'x_suon_heo', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'chao_suon', outputQty: 30, durationMin: 30, unlock: 102, reputationGain: 1 },
  // GĐ2011: Canh trứng cà chua — cơm nhà cả nước: cà chua xào mềm, đổ nước sôi, đánh trứng thả vào, rắc hành (hot_kettle).
  { id: 'recipe_canh_trung_ca_chua', name: 'Canh trứng cà chua', station: 'hot_kettle',
    inputs: [{ productId: 'x_trung_ga', quantity: 2 }, { productId: 'x_ca_chua', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'canh_trung_ca_chua', outputQty: 6, durationMin: 15, unlock: 103, reputationGain: 1 },
  // GĐ2012: Thịt kho tiêu — Nam Bộ: ba chỉ kho nước mắm đường tới keo, rắc nhiều tiêu hạt (hot_kettle); thịt heo thường thay ba chỉ.
  { id: 'recipe_thit_kho_tieu', name: 'Thịt kho tiêu', station: 'hot_kettle',
    inputs: [{ productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_tieu_hat', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'thit_kho_tieu', outputQty: 6, durationMin: 35, unlock: 104, reputationGain: 1 },
  // GĐ2013: Gà xào gừng — cơm nhà cả nước: gà chặt miếng xào lửa lớn với gừng thái sợi, hành (fryer).
  { id: 'recipe_ga_xao_gung', name: 'Gà xào gừng', station: 'fryer',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_gung', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'ga_xao_gung', outputQty: 6, durationMin: 20, unlock: 105, reputationGain: 1 },
  // GĐ2015: Canh bắp cải — cơm nhà cả nước: bắp cải thái nấu với thịt heo bằm, nêm hành (hot_kettle).
  { id: 'recipe_canh_bap_cai', name: 'Canh bắp cải', station: 'hot_kettle',
    inputs: [{ productId: 'x_bap_cai', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'canh_bap_cai', outputQty: 6, durationMin: 20, unlock: 106, reputationGain: 1 },
  // GĐ2016: Gà kho sả — Nam Bộ: gà chặt ướp sả băm, kho nước mắm đường tới săn (hot_kettle).
  { id: 'recipe_ga_kho_sa', name: 'Gà kho sả', station: 'hot_kettle',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_sa', quantity: 2 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'ga_kho_sa', outputQty: 6, durationMin: 30, unlock: 107, reputationGain: 1 },
  // GĐ2017: Cánh gà chiên — quán ăn cả nước: cánh gà ướp tỏi chiên ngập dầu tới giòn (fryer); dùng cánh gà đông lạnh.
  { id: 'recipe_canh_ga_chien', name: 'Cánh gà chiên', station: 'fryer',
    inputs: [{ productId: 'x_canh_ga', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'canh_ga_chien', outputQty: 5, durationMin: 20, unlock: 108, reputationGain: 1 },
  // GĐ2018: Cà chua nhồi thịt — cơm nhà miền Bắc: cà chua khoét ruột nhồi thịt băm, áp chảo rồi rim sốt cà (fryer).
  { id: 'recipe_ca_chua_nhoi_thit', name: 'Cà chua nhồi thịt', station: 'fryer',
    inputs: [{ productId: 'x_ca_chua', quantity: 2 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'ca_chua_nhoi_thit', outputQty: 6, durationMin: 25, unlock: 109, reputationGain: 1 },
  // GĐ2019: Trứng đúc thịt — cơm nhà miền Bắc: trứng đánh trộn thịt băm, hành, chiên dày hai mặt (fryer).
  { id: 'recipe_trung_duc_thit', name: 'Trứng đúc thịt', station: 'fryer',
    inputs: [{ productId: 'x_trung_ga', quantity: 3 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'trung_duc_thit', outputQty: 6, durationMin: 15, unlock: 110, reputationGain: 1 },
  // GĐ2020: Gà rang gừng — cơm nhà miền Bắc: gà chặt rang săn với gừng và nước mắm tới cạn khô (fryer).
  { id: 'recipe_ga_rang_gung', name: 'Gà rang gừng', station: 'fryer',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_gung', quantity: 2 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'ga_rang_gung', outputQty: 6, durationMin: 25, unlock: 111, reputationGain: 1 },
  // GĐ2021: Tôm rang — cơm nhà miền Bắc: tôm để vỏ rang săn với nước mắm đường tới đỏ, hành (fryer).
  { id: 'recipe_tom_rang', name: 'Tôm rang', station: 'fryer',
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'tom_rang', outputQty: 6, durationMin: 20, unlock: 112, reputationGain: 1 },
  // GĐ2022: Mực xào chua ngọt — cơm nhà cả nước: mực xào lửa lớn với cà chua, thơm (fryer).
  { id: 'recipe_muc_xao_chua_ngot', name: 'Mực xào chua ngọt', station: 'fryer',
    inputs: [{ productId: 'x_muc_tuoi', quantity: 1 }, { productId: 'x_ca_chua', quantity: 1 }, { productId: 'x_thom', quantity: 1 }],
    outputId: 'muc_xao_chua_ngot', outputQty: 6, durationMin: 20, unlock: 113, reputationGain: 1 },
  // GĐ2023: Sườn nướng — Sài Gòn (cơm tấm): sườn ướp tỏi sả nước mắm đường, nướng than (food_grill).
  { id: 'recipe_suon_nuong', name: 'Sườn nướng', station: 'food_grill',
    inputs: [{ productId: 'x_suon_heo', quantity: 1 }, { productId: 'x_toi', quantity: 1 }, { productId: 'x_sa', quantity: 1 }],
    outputId: 'suon_nuong', outputQty: 5, durationMin: 25, unlock: 114, reputationGain: 1 },
  // GĐ2024: Bò xào cà chua — cơm nhà cả nước: bò thái mỏng xào nhanh, đảo cà chua chín mềm (fryer).
  { id: 'recipe_bo_xao_ca_chua', name: 'Bò xào cà chua', station: 'fryer',
    inputs: [{ productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_ca_chua', quantity: 2 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'bo_xao_ca_chua', outputQty: 6, durationMin: 20, unlock: 115, reputationGain: 1 },
  // GĐ2025: Gà chiên giòn — quán cả nước: gà lăn bột chiên giòn, chiên ngập dầu (fryer).
  { id: 'recipe_ga_chien_gion', name: 'Gà chiên giòn', station: 'fryer',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_bot_chien', quantity: 1 }],
    outputId: 'ga_chien_gion', outputQty: 5, durationMin: 20, unlock: 116, reputationGain: 1 },
  // GĐ2027: Mực nhồi thịt — cơm nhà cả nước: ống mực nhồi thịt băm, chiên vàng rồi rim sốt (fryer); bỏ miến/nấm mèo trong nhân.
  { id: 'recipe_muc_nhoi_thit', name: 'Mực nhồi thịt', station: 'fryer',
    inputs: [{ productId: 'x_muc_tuoi', quantity: 1 }, { productId: 'x_thit_heo', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'muc_nhoi_thit', outputQty: 5, durationMin: 25, unlock: 117, reputationGain: 1 },
  // GĐ2028: Cơm chiên hải sản — quán cả nước: cơm chiên với tôm, mực, trứng lửa lớn (fryer).
  { id: 'recipe_com_chien_hai_san', name: 'Cơm chiên hải sản', station: 'fryer',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_muc_tuoi', quantity: 1 }, { productId: 'x_trung_ga', quantity: 2 }],
    outputId: 'com_chien_hai_san', outputQty: 20, durationMin: 25, unlock: 118, reputationGain: 1 },
  // GĐ2029: Mì xào bò — quán cả nước: mì trứng trụng rồi xào với bò, hành tây (fryer).
  { id: 'recipe_mi_xao_bo', name: 'Mì xào bò', station: 'fryer',
    inputs: [{ productId: 'x_mi_trung_kho', quantity: 1 }, { productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_hanh_tay', quantity: 1 }],
    outputId: 'mi_xao_bo', outputQty: 6, durationMin: 20, unlock: 119, reputationGain: 1 },
  // GĐ2030: Tôm chiên xù — quán cả nước: tôm nhúng trứng lăn bột chiên xù, chiên ngập dầu (fryer); bột chiên giòn thay bột chiên xù.
  { id: 'recipe_tom_chien_xu', name: 'Tôm chiên xù', station: 'fryer',
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_bot_chien', quantity: 1 }, { productId: 'x_trung_ga', quantity: 1 }],
    outputId: 'tom_chien_xu', outputQty: 6, durationMin: 20, unlock: 120, reputationGain: 1 },
  // GĐ2031: Mì xào hải sản — quán cả nước: mì trứng trụng xào lửa lớn với tôm, mực (fryer).
  { id: 'recipe_mi_xao_hai_san', name: 'Mì xào hải sản', station: 'fryer',
    inputs: [{ productId: 'x_mi_trung_kho', quantity: 1 }, { productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_muc_tuoi', quantity: 1 }],
    outputId: 'mi_xao_hai_san', outputQty: 8, durationMin: 20, unlock: 121, reputationGain: 1 },
  // GĐ2032: Cơm chiên bò — quán cả nước: cơm chiên trứng lửa lớn với bò thái mỏng (fryer).
  { id: 'recipe_com_chien_bo', name: 'Cơm chiên bò', station: 'fryer',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_trung_ga', quantity: 2 }],
    outputId: 'com_chien_bo', outputQty: 20, durationMin: 25, unlock: 122, reputationGain: 1 },
  // GĐ2033: Gà xào nấm — cơm nhà cả nước: gà thái miếng xào với nấm, hành (fryer); dùng nấm hương khô ngâm nở.
  { id: 'recipe_ga_xao_nam', name: 'Gà xào nấm', station: 'fryer',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_nam_huong_kho', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'ga_xao_nam', outputQty: 6, durationMin: 20, unlock: 123, reputationGain: 1 },
  // GĐ2034: Cháo tôm — cả nước: gạo ninh nhừ, tôm băm xào thơm cho vào, rắc hành (hot_kettle).
  { id: 'recipe_chao_tom', name: 'Cháo tôm', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'chao_tom', outputQty: 30, durationMin: 30, unlock: 124, reputationGain: 1 },
  // GĐ2035: Cháo bò — Sài Gòn: gạo ninh nhừ, thả bò băm chín tới, rắc hành tiêu (hot_kettle).
  { id: 'recipe_chao_bo', name: 'Cháo bò', station: 'hot_kettle',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_hanh_la', quantity: 1 }],
    outputId: 'chao_bo', outputQty: 30, durationMin: 30, unlock: 125, reputationGain: 1 },
  // GĐ2036: Cá thu nướng — miền Trung: cá thu cắt khúc ướp sả, nước mắm, nướng than (food_grill).
  { id: 'recipe_ca_thu_nuong', name: 'Cá thu nướng', station: 'food_grill',
    inputs: [{ productId: 'x_ca_thu_tuoi', quantity: 1 }, { productId: 'x_sa', quantity: 1 }],
    outputId: 'ca_thu_nuong', outputQty: 5, durationMin: 25, unlock: 126, reputationGain: 1 },
  // GĐ2037: Trứng kho — cơm nhà cả nước: trứng luộc bóc vỏ kho nước mắm đường tới thấm màu (hot_kettle).
  { id: 'recipe_trung_kho', name: 'Trứng kho', station: 'hot_kettle',
    inputs: [{ productId: 'x_trung_ga', quantity: 4 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'trung_kho', outputQty: 8, durationMin: 25, unlock: 127, reputationGain: 1 },
  // GĐ2038: Gà hấp hành — cả nước: gà ướp gừng hấp chín, rưới hành lá chần dầu nóng (steamer).
  { id: 'recipe_ga_hap_hanh', name: 'Gà hấp hành', station: 'steamer',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'x_hanh_la', quantity: 2 }, { productId: 'x_gung', quantity: 1 }],
    outputId: 'ga_hap_hanh', outputQty: 5, durationMin: 30, unlock: 128, reputationGain: 1 },
  // GĐ2039: Dưa leo xào trứng — cơm nhà cả nước: dưa leo thái lát xào nhanh rồi đảo trứng (fryer).
  { id: 'recipe_dua_leo_xao_trung', name: 'Dưa leo xào trứng', station: 'fryer',
    inputs: [{ productId: 'x_dua_leo', quantity: 1 }, { productId: 'x_trung_ga', quantity: 2 }],
    outputId: 'dua_leo_xao_trung', outputQty: 6, durationMin: 15, unlock: 129, reputationGain: 1 },
  // GĐ2040: Bông cải luộc — cơm nhà cả nước: bông cải xanh luộc nồi nước, chấm nước mắm/kho quẹt (hot_kettle).
  { id: 'recipe_bong_cai_luoc', name: 'Bông cải luộc', station: 'hot_kettle',
    inputs: [{ productId: 'x_bong_cai_xanh', quantity: 1 }],
    outputId: 'bong_cai_luoc', outputQty: 4, durationMin: 10, unlock: 130, reputationGain: 1 },
  // GĐ2041: Bò xào khổ qua — cơm nhà cả nước: khổ qua thái lát xào tỏi, đảo bò thái mỏng (fryer).
  { id: 'recipe_bo_xao_kho_qua', name: 'Bò xào khổ qua', station: 'fryer',
    inputs: [{ productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_kho_qua', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'bo_xao_kho_qua', outputQty: 6, durationMin: 20, unlock: 131, reputationGain: 1 },
  // GĐ2042: Bò xào rau muống — cơm nhà cả nước: rau muống xào tỏi lửa lớn với bò thái mỏng (fryer).
  { id: 'recipe_bo_xao_rau_muong', name: 'Bò xào rau muống', station: 'fryer',
    inputs: [{ productId: 'x_thit_bo', quantity: 1 }, { productId: 'x_rau_muong', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'bo_xao_rau_muong', outputQty: 6, durationMin: 15, unlock: 132, reputationGain: 1 },
  // GĐ2043: Khoai lang chiên — quà vặt cả nước: khoai lang thái lăn bột chiên giòn ngập dầu (fryer).
  { id: 'recipe_khoai_lang_chien', name: 'Khoai lang chiên', station: 'fryer',
    inputs: [{ productId: 'x_khoai_lang_tuoi', quantity: 1 }, { productId: 'x_bot_chien', quantity: 1 }],
    outputId: 'khoai_lang_chien', outputQty: 5, durationMin: 15, unlock: 133, reputationGain: 1 },
  // GĐ2044: Cá kho tiêu — Nam Bộ: cá cắt khúc kho nước mắm đường tới keo, nhiều tiêu (hot_kettle); cá basa thay cá lóc/cá bông lau.
  { id: 'recipe_ca_kho_tieu', name: 'Cá kho tiêu', station: 'hot_kettle',
    inputs: [{ productId: 'x_ca_basa', quantity: 1 }, { productId: 'x_tieu_hat', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }],
    outputId: 'ca_kho_tieu', outputQty: 6, durationMin: 30, unlock: 134, reputationGain: 1 },
  // GĐ2045: Sườn kho — cơm nhà cả nước: sườn heo chặt khúc kho nước mắm đường với hành khô tới săn (hot_kettle).
  { id: 'recipe_suon_kho', name: 'Sườn kho', station: 'hot_kettle',
    inputs: [{ productId: 'x_suon_heo', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }, { productId: 'x_hanh_kho', quantity: 1 }],
    outputId: 'suon_kho', outputQty: 6, durationMin: 35, unlock: 135, reputationGain: 1 },
  // GĐ2046: Gà chiên nước mắm — quán cả nước: gà chặt chiên giòn rồi đảo nước mắm tỏi đường (fryer).
  { id: 'recipe_ga_chien_nuoc_mam', name: 'Gà chiên nước mắm', station: 'fryer',
    inputs: [{ productId: 'x_thit_ga', quantity: 1 }, { productId: 'hx_nuoc_mam', quantity: 1 }, { productId: 'x_toi', quantity: 1 }],
    outputId: 'ga_chien_nuoc_mam', outputQty: 6, durationMin: 20, unlock: 136, reputationGain: 1 },
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
  { id: 'hot_kettle', name: 'Bếp nồi nấu', icon: '🍲', description: 'Nấu phở, bún, cháo, món kho, chè', unlock: 21, recipeCount: RECIPES.filter(r => r.station === 'hot_kettle').length },
  { id: 'food_grill', name: 'Bếp nướng', icon: '🔥', description: 'Bánh mì, xiên nướng, cá & gà nướng', unlock: 21, recipeCount: RECIPES.filter(r => r.station === 'food_grill').length },
  { id: 'blender', name: 'Máy xay sinh tố', icon: '🍹', description: 'Sinh tố, nước ép, sữa hạt', unlock: 25, recipeCount: RECIPES.filter(r => r.station === 'blender').length },
  { id: 'drink_counter', name: 'Quầy pha', icon: '☕', description: 'Cà phê, trà sữa, bạc xỉu', unlock: 25, recipeCount: RECIPES.filter(r => r.station === 'drink_counter').length },
  { id: 'fryer', name: 'Chảo chiên', icon: '🍳', description: 'Món chiên, xào, áp chảo', unlock: 26, recipeCount: RECIPES.filter(r => r.station === 'fryer').length },
  { id: 'sugarcane_press', name: 'Máy ép mía', icon: '🥤', description: 'Nước mía tươi', unlock: 25, recipeCount: RECIPES.filter(r => r.station === 'sugarcane_press').length },
  { id: 'steamer', name: 'Nồi hấp', icon: '♨️', description: 'Bánh bao, há cảo, hải sản hấp', unlock: 39, recipeCount: RECIPES.filter(r => r.station === 'steamer').length },
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
