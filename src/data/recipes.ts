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
  { id: 'banh_trang_nuong', name: 'Bánh tráng nướng', category: 'fresh', buy: 11000, sell: 22000, color: 0xe67e22, unlock: 36 },
  // GĐ1328: Bánh đa trộn — món trộn Hà Nội từ bánh đa bì bà Tám (GĐ1085) + cà pháo muối + tương ớt quê + thịt heo:
  // mẻ (bánh đa 14k + cà pháo 8k + tương ớt 30k + thịt 30k) = 82k → 8 phần × 24k = 192k, lãi 110k/mẻ,
  // nấu hời hơn bán thẳng nguyên liệu (123k < 192k). Khép chuỗi hàng xóm → bếp nướng, mở 38 (> golden 30 → sim không đổi).
  { id: 'banh_da_tron', name: 'Bánh đa trộn', category: 'fresh', buy: 12000, sell: 24000, color: 0xb5651d, unlock: 38 },

  // --- Ấm nước (hot_kettle) ---
  { id: 'tra_gung_nong', name: 'Trà gừng nóng', category: 'drink', buy: 7200, sell: 13700, color: 0xd4ac0d, unlock: 23 },
  { id: 'mi_trung_nong', name: 'Mì trứng nấu sẵn', category: 'fresh', buy: 5500, sell: 10500, color: 0xe67e22, unlock: 21 },
  { id: 'che_dau_xanh', name: 'Chè đậu xanh', category: 'fresh', buy: 7800, sell: 14900, color: 0xfadbd8, unlock: 22 },
  // GĐ1094: Hột vịt lộn — mẻ (vịt 32k + rau 10k + muối 5k) = 47k → 10 phần × 7k = 70k, lãi 23k/mẻ, nấu hời hơn bán nguyên liệu (68k < 70k)
  { id: 'hot_vit_lon', name: 'Hột vịt lộn', category: 'fresh', buy: 3500, sell: 7000, color: 0xd9b382, unlock: 34 },
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
  { id: 'recipe_com_chien', name: 'Cơm chiên trứng', station: 'food_grill',
    inputs: [{ productId: 'gao', quantity: 1 }, { productId: 'trung', quantity: 5 }],
    outputId: 'com_chien_trung', outputQty: 50, durationMin: 20, unlock: 40, reputationGain: 3 },
  // GĐ1094: Gà Đông Tảo nướng — món nướng của giống gà quý nhà trại (Đông Tảo mở cấp 30, thịt đắt gấp
  // chục gà thường). Mở 42 > mốc golden 30 → sim không đổi.
  { id: 'recipe_ga_dt_nuong', name: 'Gà Đông Tảo nướng', station: 'food_grill',
    inputs: [{ productId: 'thit_ga_dt', quantity: 1 }, { productId: 'rau', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'ga_dt_nuong', outputQty: 3, durationMin: 30, unlock: 42, reputationGain: 4 },
  { id: 'recipe_canh', name: 'Canh rau thịt', station: 'hot_kettle',
    inputs: [{ productId: 'rau', quantity: 2 }, { productId: 'thit', quantity: 1 }],
    outputId: 'canh_rau_thit', outputQty: 12, durationMin: 18, unlock: 40, reputationGain: 3 },
  // GĐ1322: Bóp gỏi khô bò — khép chuỗi "đặc sản vùng (khô bò mối lái) → bếp nướng". Mở 50 = đúng cấp khô bò (sau mốc golden 30).
  { id: 'recipe_bo_gio_kho_bo', name: 'Bóp gỏi khô bò', station: 'food_grill',
    inputs: [{ productId: 'rg_kho_bo', quantity: 1 }, { productId: 'rau', quantity: 2 }, { productId: 'x_duong', quantity: 1 }],
    outputId: 'bo_gio_kho_bo', outputQty: 8, durationMin: 20, unlock: 50, reputationGain: 2 },
  // GĐ1328: Bánh tráng nướng — khép chuỗi "hàng xóm (bánh tráng phơi sương GĐ1077 + tương ớt GĐ1321) → bếp nướng".
  // Đồ nhà hàng xóm vốn chỉ bán thẳng làm đồ khô giờ có LỐI RA BẾP (món ăn vặt). Mở 36 (sau mốc golden 30 → sim không đổi).
  { id: 'recipe_banh_trang_nuong', name: 'Bánh tráng nướng', station: 'food_grill',
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
  { id: 'recipe_hot_vit_lon', name: 'Hột vịt lộn', station: 'hot_kettle',
    inputs: [{ productId: 'trung_vit', quantity: 1 }, { productId: 'rau', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    outputId: 'hot_vit_lon', outputQty: 10, durationMin: 12, unlock: 34, reputationGain: 2 },

  // --- Máy xay (blender) ---
  { id: 'recipe_sinh_to', name: 'Sinh tố trái cây', station: 'blender',
    inputs: [{ productId: 'traicay', quantity: 1 }, { productId: 'suachua', quantity: 1 }],
    outputId: 'sinh_to_trai_cay', outputQty: 4, durationMin: 8, unlock: 28, reputationGain: 2 },
  { id: 'recipe_kem', name: 'Kem trái cây', station: 'blender',
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
    inputs: [{ productId: 'ca_basa', quantity: 1 }, { productId: 'x_gung', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'ca_basa_chien_sa', outputQty: 6, durationMin: 15, unlock: 72, reputationGain: 3 },
  // GĐ1352: Sò điệp nướng mỡ hành — sò điệp đông lạnh (so_diep 67) nướng vỏ rưới mỡ hành ở bếp nướng:
  // mẻ (sò điệp 180k + hành phi 3k) = 183k → 6 vỏ × 50k = 300k, lãi 117k/mẻ, nấu hời hơn
  // bán thẳng nguyên liệu (255k < 300k). Mở 67 = đúng cấp sò điệp (> golden 30 → sim không đổi).
  { id: 'recipe_so_diep_nuong_mo_hanh', name: 'Sò điệp nướng mỡ hành', station: 'food_grill',
    inputs: [{ productId: 'so_diep', quantity: 1 }, { productId: 'x_hanh_phi', quantity: 2 }],
    outputId: 'so_diep_nuong_mo_hanh', outputQty: 6, durationMin: 15, unlock: 67, reputationGain: 3 },

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
