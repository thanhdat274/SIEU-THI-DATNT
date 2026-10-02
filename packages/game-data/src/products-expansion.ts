import type { Product, ProductCategory, StorageType } from '@game/shared';

/**
 * Mở rộng danh mục (hàng nhập khẩu, cao cấp, quà biếu và 6 nhóm mới) mở khóa từ cấp 5 đến 30.
 * Số liệu giá/độ phổ biến là provisional, chưa playtest. Hàng đắt có độ phổ biến thấp để không làm loãng nhu cầu hàng thiết yếu.
 * Cột: id, tên, nhóm, giá nhập, giá bán, sức chứa kệ, bảo quản, hạn dùng (ngày), cấp mở khóa, độ phổ biến, mô tả.
 */
type ExpansionRow = [string, string, ProductCategory, number, number, number, StorageType, number, number, number, string];

const ROWS: ExpansionRow[] = [
  // ── Mì ăn liền ──
  ['mi_ly_modern_bo_ham', 'Mì ly Modern bò hầm', 'instant_noodles', 9000, 14000, 16, 'ambient', 120, 5, 0.5, 'Mì ly tiện lợi, đổ nước sôi là có bữa khuya cho dân văn phòng.'],
  ['mi_tron_indomie', 'Mì trộn Indomie Mi Goreng', 'instant_noodles', 7000, 11000, 20, 'ambient', 150, 6, 0.5, 'Mì xào khô vị mặn ngọt, giới trẻ rất mê.'],
  ['mien_ga_phu_huong', 'Miến gà Phú Hương', 'instant_noodles', 6500, 10000, 20, 'ambient', 150, 6, 0.45, 'Miến dai ngon nấu nhanh, nước dùng vị gà thanh nhẹ.'],
  ['mi_shin_ramyun', 'Mì Shin Ramyun Hàn Quốc', 'instant_noodles', 14000, 22000, 18, 'ambient', 150, 8, 0.4, 'Mì cay Hàn Quốc nhập khẩu, nước dùng đậm đà bốc khói.'],
  ['mi_samyang_ga_cay', 'Mì Samyang gà cay', 'instant_noodles', 22000, 35000, 16, 'ambient', 150, 12, 0.35, 'Mì trộn gà siêu cay, thách thức vị giác.'],
  ['mi_udon_nhat', 'Mì Udon Nhật ăn liền', 'instant_noodles', 24000, 38000, 14, 'ambient', 150, 16, 0.25, 'Sợi udon to dai kèm nước dùng dashi kiểu Nhật.'],

  // ── Nước giải khát ──
  ['redbull_thai', 'Red Bull Thái lon', 'soft_drinks', 9000, 14000, 24, 'ambient', 240, 5, 0.5, 'Nước tăng lực quen thuộc của tài xế và dân làm đêm.'],
  ['tra_olong_tea_plus', 'Trà ô long Tea Plus', 'soft_drinks', 8000, 12500, 20, 'ambient', 180, 6, 0.5, 'Trà ô long ít đường, giải ngấy sau bữa ăn.'],
  ['ca_phe_lon_nescafe', 'Cà phê lon Nescafé', 'soft_drinks', 9500, 14500, 20, 'ambient', 240, 6, 0.5, 'Cà phê sữa đóng lon uống liền buổi sáng vội.'],
  ['nuoc_ep_tropicana', 'Nước ép Tropicana táo', 'soft_drinks', 14000, 21000, 16, 'ambient', 150, 7, 0.4, 'Nước ép trái cây đóng chai, vị táo ngọt thanh.'],
  ['nuoc_dua_vico', 'Nước dừa đóng hộp Vico', 'soft_drinks', 12000, 18000, 18, 'ambient', 180, 8, 0.4, 'Nước dừa xiêm đóng hộp, ngọt mát tự nhiên.'],
  ['soda_schweppes', 'Soda Schweppes nhập khẩu', 'soft_drinks', 13000, 20000, 18, 'ambient', 240, 9, 0.35, 'Soda chanh sủi bọt, pha chế hay uống thẳng đều hợp.'],
  ['monster_energy', 'Monster Energy lon', 'soft_drinks', 24000, 35000, 16, 'ambient', 240, 10, 0.35, 'Nước tăng lực cỡ lớn nhập khẩu cho game thủ.'],
  ['ramune_nhat', 'Soda Ramune Nhật Bản', 'soft_drinks', 22000, 34000, 14, 'ambient', 240, 14, 0.25, 'Chai bi thủy tinh độc đáo, uống là nhớ phim hoạt hình Nhật.'],
  ['tra_matcha_itoen', 'Trà xanh Matcha Itoen', 'soft_drinks', 25000, 38000, 14, 'ambient', 240, 18, 0.25, 'Trà matcha đóng chai nhập khẩu từ Nhật, hậu vị đậm.'],
  ['san_pellegrino_cam', 'San Pellegrino vị cam', 'soft_drinks', 28000, 42000, 12, 'ambient', 300, 20, 0.2, 'Nước khoáng có ga vị cam của Ý, hàng sang cho khách sành điệu.'],
  ['nuoc_nho_welchs', "Nước ép nho Welch's", 'soft_drinks', 38000, 56000, 12, 'ambient', 240, 24, 0.15, 'Nước ép nho nguyên chất nhập khẩu từ Mỹ.'],

  // ── Nước đóng chai ──
  ['nuoc_ion_kiem', 'Nước ion kiềm Alkaline', 'bottled_water', 14000, 21000, 20, 'ambient', 300, 8, 0.35, 'Nước ion kiềm pH cao, được dân tập gym ưa chuộng.'],
  ['nuoc_binh_20l', 'Bình nước tinh khiết 20 lít', 'bottled_water', 40000, 58000, 10, 'ambient', 365, 7, 0.35, 'Bình nước lớn cho gia đình và văn phòng, nặng nhưng bán đều.'],
  ['nuoc_evian', 'Nước khoáng Evian 500ml', 'bottled_water', 26000, 38000, 14, 'ambient', 365, 12, 0.2, 'Nước khoáng thiên nhiên từ dãy Alps, chai thanh lịch.'],
  ['nuoc_voss', 'Nước Voss Na Uy', 'bottled_water', 45000, 68000, 10, 'ambient', 365, 22, 0.12, 'Chai trụ thủy tinh sang trọng, hàng quà tặng cho người sành.'],

  // ── Kẹo, sô cô la, quà biếu ──
  ['keo_mentos', 'Kẹo Mentos cuộn', 'candy', 7000, 11000, 24, 'ambient', 300, 5, 0.5, 'Kẹo nhai bạc hà trái cây, cuộn nào cũng hết nhanh.'],
  ['keo_alpenliebe', 'Kẹo Alpenliebe caramel', 'candy', 22000, 32000, 18, 'ambient', 300, 5, 0.4, 'Túi kẹo caramel sữa béo ngậy cho ngày lễ.'],
  ['keo_deo_haribo', 'Kẹo dẻo Haribo', 'candy', 28000, 42000, 16, 'ambient', 300, 8, 0.35, 'Kẹo dẻo gấu đủ vị, trẻ con và người lớn đều mê.'],
  ['socola_ferrero', 'Sô cô la Ferrero Rocher hộp 8', 'candy', 85000, 125000, 10, 'ambient', 240, 10, 0.3, 'Hộp sô cô la hạt phỉ bọc vàng, quà tặng ý nghĩa.'],
  ['socola_toblerone', 'Sô cô la Toblerone', 'candy', 48000, 72000, 12, 'ambient', 240, 14, 0.25, 'Thanh sô cô la tam giác Thụy Sĩ nhân mật ong hạnh nhân.'],
  ['socola_lindt', 'Sô cô la Lindt Excellence', 'candy', 62000, 92000, 10, 'ambient', 240, 16, 0.2, 'Sô cô la đen cao cấp, vị đắng thanh đặc trưng.'],
  ['mut_tet_hop', 'Hộp mứt Tết thập cẩm', 'candy', 90000, 135000, 10, 'ambient', 120, 18, 0.25, 'Hộp mứt gừng, dừa, bí, quất đủ vị bày bàn thờ ngày Tết.'],
  ['hop_qua_banh_keo', 'Hộp quà bánh kẹo cao cấp', 'candy', 180000, 260000, 10, 'ambient', 180, 20, 0.2, 'Hộp quà biếu sang trọng gói sẵn, hợp tặng đối tác và người thân.'],

  // ── Bánh ăn vặt ──
  ['pringles', 'Khoai tây Pringles', 'snacks', 28000, 42000, 16, 'ambient', 240, 5, 0.45, 'Hộp khoai tây lát mỏng giòn tan, ăn là ghiền.'],
  ['banh_oreo', 'Bánh quy Oreo', 'snacks', 12000, 18000, 20, 'ambient', 240, 5, 0.5, 'Bánh quy sô cô la kẹp kem, vặn ra chấm sữa.'],
  ['lays_stax', "Snack Lay's Stax", 'snacks', 24000, 36000, 16, 'ambient', 240, 6, 0.4, 'Khoai tây lát xếp ống, nhiều vị lạ miệng.'],
  ['banh_pocky', 'Bánh que Pocky', 'snacks', 18000, 27000, 20, 'ambient', 240, 7, 0.4, 'Bánh que phủ sô cô la kiểu Nhật.'],
  ['banh_ritz_pho_mai', 'Bánh Ritz phô mai', 'snacks', 20000, 30000, 18, 'ambient', 240, 8, 0.4, 'Bánh quy mặn kẹp phô mai bùi béo.'],
  ['rong_bien_an_lien', 'Rong biển ăn liền Hàn Quốc', 'snacks', 26000, 39000, 18, 'ambient', 240, 9, 0.35, 'Rong biển sấy giòn rắc mè, ăn cơm hay ăn vặt đều ngon.'],
  ['trai_cay_say_gion', 'Trái cây sấy giòn', 'snacks', 42000, 62000, 14, 'ambient', 150, 9, 0.3, 'Mít, chuối, khoai môn sấy giòn không dầu mỡ.'],
  ['hat_dieu_rang_muoi', 'Hạt điều rang muối', 'snacks', 120000, 175000, 10, 'ambient', 150, 11, 0.3, 'Hạt điều Bình Phước rang củi, giòn béo thơm lừng.'],
  ['banh_quy_danisa', 'Bánh quy bơ Danisa hộp thiếc', 'snacks', 95000, 140000, 10, 'ambient', 240, 12, 0.3, 'Hộp thiếc xanh huyền thoại, nhà nào cũng có một hộp.'],
  ['kho_bo_mieng', 'Khô bò miếng', 'snacks', 90000, 135000, 10, 'ambient', 90, 13, 0.3, 'Khô bò cay ngọt dai thơm, nhâm nhi cuối tuần.'],
  ['hat_mac_ca_say', 'Hạt macca sấy', 'snacks', 150000, 220000, 10, 'ambient', 150, 16, 0.2, 'Hạt macca nứt vỏ béo bùi, loại hạt hạng sang.'],

  // ── Sữa và chế phẩm ──
  ['sua_tuoi_organic', 'Sữa tươi organic', 'milk', 11000, 16500, 12, 'cold', 8, 6, 0.4, 'Sữa tươi hữu cơ thanh trùng, vị ngọt thanh tự nhiên.'],
  ['sua_hat_oc_cho', 'Sữa hạt óc chó', 'milk', 14000, 21000, 14, 'ambient', 180, 8, 0.35, 'Sữa hạt thơm béo, dành cho người ăn kiêng.'],
  ['pho_mai_lat', 'Phô mai lát Con Bò Cười', 'milk', 38000, 55000, 12, 'cold', 60, 9, 0.35, 'Hộp phô mai lát kẹp bánh mì, trẻ con rất thích.'],
  ['sua_chua_hy_lap', 'Sữa chua Hy Lạp', 'milk', 14000, 21000, 12, 'cold', 14, 10, 0.3, 'Sữa chua đặc quánh nhiều đạm, ăn sáng no lâu.'],
  ['bo_lat_anchor', 'Bơ lạt Anchor', 'milk', 52000, 76000, 10, 'cold', 90, 14, 0.2, 'Bơ lạt New Zealand cho bánh mì và nấu ăn.'],
  ['sua_hat_oat', 'Sữa yến mạch Oatly', 'milk', 38000, 56000, 12, 'ambient', 180, 15, 0.2, 'Sữa yến mạch thuần thực vật, hợp người ăn chay.'],
  ['kem_tuoi_whipping', 'Kem tươi whipping 250ml', 'milk', 55000, 80000, 10, 'cold', 14, 17, 0.2, 'Kem tươi đánh bông làm bánh và pha chế.'],
  ['sua_bot_ensure_gold', 'Sữa bột Ensure Gold', 'milk', 340000, 450000, 10, 'ambient', 365, 20, 0.15, 'Lon sữa dinh dưỡng cho người lớn tuổi, quà biếu ông bà.'],

  // ── Bánh mì & bánh ngọt ──
  ['banh_croissant_bo', 'Bánh croissant bơ', 'bread', 12000, 20000, 10, 'ambient', 2, 6, 0.4, 'Bánh sừng bò nhiều lớp thơm bơ, ăn sáng cùng cà phê.'],
  ['banh_donut_duong', 'Bánh donut phủ đường', 'bread', 9000, 15000, 10, 'ambient', 2, 6, 0.4, 'Vòng bánh donut mềm xốp phủ đường lấp lánh.'],
  ['banh_su_kem', 'Bánh su kem', 'bread', 8000, 14000, 12, 'cold', 2, 7, 0.4, 'Vỏ bánh giòn nhân kem trứng béo ngậy.'],
  ['banh_sandwich_thit_nguoi', 'Bánh sandwich thịt nguội', 'bread', 16000, 26000, 10, 'cold', 2, 8, 0.4, 'Bánh sandwich kẹp thịt nguội rau tươi, bữa trưa nhanh gọn.'],
  ['banh_bong_lan_cuon', 'Bánh bông lan cuộn', 'bread', 18000, 28000, 10, 'ambient', 5, 9, 0.35, 'Bông lan cuộn kem bơ mềm mịn.'],
  ['banh_tart_trung', 'Bánh tart trứng', 'bread', 10000, 17000, 12, 'ambient', 2, 9, 0.35, 'Vỏ tart giòn nhân trứng sữa nướng thơm.'],
  ['banh_mi_nguyen_cam', 'Bánh mì nguyên cám', 'bread', 22000, 33000, 10, 'ambient', 5, 11, 0.3, 'Bánh mì cám ít đường cho người ăn kiêng.'],
  ['banh_gato_mini', 'Bánh gato kem mini', 'bread', 65000, 100000, 8, 'cold', 3, 15, 0.2, 'Bánh kem cỡ nhỏ cho sinh nhật bất chợt.'],

  // ── Trứng ──
  ['trung_cut_vi', 'Trứng cút (vỉ 20)', 'eggs', 14000, 21000, 16, 'cold', 14, 5, 0.4, 'Trứng cút luộc hay chiên, món nhậu và món ăn vặt.'],
  ['trung_ga_ta_hop', 'Trứng gà ta thả vườn (hộp 10)', 'eggs', 38000, 56000, 12, 'cold', 14, 8, 0.3, 'Trứng gà ta lòng đỏ sẫm, thơm béo.'],
  ['trung_vit_muoi', 'Trứng vịt muối (hộp 4)', 'eggs', 24000, 36000, 12, 'ambient', 30, 9, 0.3, 'Trứng vịt muối ăn cháo trắng hoặc làm bánh trung thu.'],
  ['trung_bac_thao', 'Trứng bắc thảo', 'eggs', 20000, 30000, 12, 'ambient', 45, 11, 0.2, 'Trứng bắc thảo nấu cháo thịt nạc, món lạ miệng.'],
  ['trung_ga_omega3', 'Trứng gà Omega 3 (hộp 10)', 'eggs', 48000, 70000, 10, 'cold', 14, 12, 0.25, 'Trứng giàu Omega 3 từ gà ăn hạt lanh.'],

  // ── Gia vị & thực phẩm khô nhập khẩu ──
  ['gia_vi_lau_thai', 'Gói gia vị lẩu Thái', 'cooking_ingredients', 14000, 21000, 16, 'ambient', 240, 6, 0.4, 'Gói gia vị nấu lẩu chua cay chuẩn vị Thái.'],
  ['gao_st25_5kg', 'Gạo ST25 túi 5kg', 'cooking_ingredients', 130000, 180000, 10, 'ambient', 240, 7, 0.4, 'Gạo ngon nhất thế giới, cơm dẻo thơm mùi lá dứa.'],
  ['nuoc_mam_phu_quoc_40', 'Nước mắm Phú Quốc 40°N', 'cooking_ingredients', 68000, 98000, 12, 'ambient', 365, 8, 0.3, 'Nước mắm nhỉ cá cơm đậm đà, loại để dành chấm.'],
  ['mi_y_barilla', 'Mì Ý Barilla spaghetti 500g', 'cooking_ingredients', 32000, 48000, 12, 'ambient', 365, 8, 0.3, 'Mì Ý khô nhập khẩu, luộc 9 phút là chín.'],
  ['ca_ngu_dong_hop', 'Cá ngừ đóng hộp ngâm dầu', 'cooking_ingredients', 38000, 56000, 14, 'ambient', 365, 8, 0.3, 'Cá ngừ ngâm dầu ô liu, trộn salad hoặc ăn với cơm.'],
  ['sot_ca_chua_y', 'Sốt cà chua Ý Bertolli', 'cooking_ingredients', 48000, 70000, 12, 'ambient', 300, 9, 0.25, 'Sốt cà chua basil để làm mì Ý tại nhà.'],
  ['dau_oliu_extra', 'Dầu ô liu extra virgin 250ml', 'cooking_ingredients', 95000, 140000, 10, 'ambient', 365, 10, 0.25, 'Dầu ô liu ép lạnh nhập khẩu, dùng cho salad và áp chảo.'],
  ['nuoc_tuong_kikkoman', 'Nước tương Kikkoman', 'cooking_ingredients', 52000, 76000, 12, 'ambient', 365, 10, 0.25, 'Xì dầu Nhật ủ lên men tự nhiên, chấm sushi cực ngon.'],
  ['thit_hop_spam', 'Thịt hộp Spam', 'cooking_ingredients', 62000, 90000, 12, 'ambient', 365, 11, 0.25, 'Hộp thịt heo nén kiểu Mỹ, chiên cơm hay kẹp bánh mì.'],
  ['mu_tat_wasabi', 'Mù tạt Wasabi tuýp', 'cooking_ingredients', 22000, 33000, 14, 'ambient', 300, 12, 0.2, 'Wasabi xanh cay nồng ăn kèm sashimi.'],
  ['mat_ong_rung_u_minh', 'Mật ong rừng U Minh', 'cooking_ingredients', 160000, 230000, 10, 'ambient', 365, 14, 0.2, 'Mật ong rừng tràm nguyên chất, vị thơm đậm.'],
  ['hat_chia_huu_co', 'Hạt chia hữu cơ', 'cooking_ingredients', 85000, 125000, 10, 'ambient', 365, 15, 0.2, 'Hạt chia giàu Omega, dùng cho sinh tố và chè.'],
  ['bot_matcha_nhat', 'Bột matcha Nhật', 'cooking_ingredients', 120000, 175000, 10, 'ambient', 300, 19, 0.15, 'Bột trà xanh Uji pha trà và làm bánh.'],
  ['yen_sao_chung_san', 'Hộp yến sào chưng sẵn', 'cooking_ingredients', 190000, 280000, 8, 'ambient', 180, 22, 0.12, 'Yến chưng đường phèn đóng hũ, quà bồi bổ cho người ốm.'],

  // ── Đồ gia dụng ──
  ['quat_mini_cam_tay', 'Quạt mini cầm tay', 'household', 48000, 72000, 14, 'ambient', 365, 6, 0.3, 'Quạt pin sạc nhỏ gọn, cứu cánh ngày nắng nóng.'],
  ['den_pin_sac_mini', 'Đèn pin sạc mini', 'household', 55000, 80000, 12, 'ambient', 365, 7, 0.3, 'Đèn pin LED sáng gắt dùng khi cúp điện.'],
  ['hop_nhua_thuc_pham', 'Bộ hộp nhựa đựng thực phẩm', 'household', 45000, 66000, 14, 'ambient', 365, 8, 0.3, 'Bộ hộp kín nhiều cỡ dùng được trong lò vi sóng.'],
  ['o_cam_da_nang', 'Ổ cắm điện đa năng', 'household', 85000, 125000, 12, 'ambient', 365, 9, 0.3, 'Ổ cắm 6 lỗ chống giật có công tắc riêng.'],
  ['binh_giu_nhiet_inox', 'Bình giữ nhiệt inox', 'household', 160000, 230000, 10, 'ambient', 365, 14, 0.25, 'Bình giữ nóng lạnh 12 tiếng, đi làm đi học đều tiện.'],
  ['may_say_toc_mini', 'Máy sấy tóc mini', 'household', 220000, 320000, 10, 'ambient', 365, 18, 0.2, 'Máy sấy tóc gấp gọn cho chị em.'],
  ['bo_noi_chao_chong_dinh', 'Bộ nồi chảo chống dính', 'household', 380000, 540000, 8, 'ambient', 365, 20, 0.15, 'Bộ 3 món chống dính dùng được trên bếp từ.'],
  ['quat_sac_tich_dien', 'Quạt sạc tích điện', 'household', 280000, 400000, 8, 'ambient', 365, 22, 0.15, 'Quạt tích điện chạy 8 tiếng không cần cắm.'],
  ['bo_ga_goi_cotton', 'Bộ ga gối cotton', 'household', 320000, 460000, 8, 'ambient', 365, 25, 0.12, 'Bộ ga giường cotton mềm mát.'],
  ['noi_com_dien_mini', 'Nồi cơm điện mini', 'household', 450000, 640000, 8, 'ambient', 365, 26, 0.12, 'Nồi cơm 1 lít cho người ở một mình hoặc sinh viên.'],

  // ── Chăm sóc cá nhân & mỹ phẩm (nhóm mới) ──
  ['dau_xa_dove', 'Dầu xả Dove phục hồi', 'personal_care', 62000, 90000, 12, 'ambient', 540, 5, 0.35, 'Dầu xả giúp tóc mềm mượt sau khi gội.'],
  ['bong_tay_trang', 'Bông tẩy trang', 'personal_care', 28000, 42000, 16, 'ambient', 720, 5, 0.35, 'Hộp bông cotton mềm dùng được cho da nhạy cảm.'],
  ['son_duong_moi', 'Son dưỡng môi Vaseline', 'personal_care', 42000, 62000, 14, 'ambient', 540, 6, 0.4, 'Son dưỡng ẩm môi, bán chạy mùa hanh khô.'],
  ['lan_khu_mui_nivea', 'Lăn khử mùi Nivea', 'personal_care', 58000, 85000, 12, 'ambient', 540, 7, 0.35, 'Lăn khử mùi khô thoáng cả ngày.'],
  ['nuoc_tay_trang_garnier', 'Nước tẩy trang Garnier', 'personal_care', 98000, 140000, 10, 'ambient', 540, 8, 0.3, 'Nước tẩy trang micellar làm sạch dịu nhẹ.'],
  ['dau_goi_thao_duoc', 'Dầu gội thảo dược', 'personal_care', 65000, 95000, 12, 'ambient', 540, 9, 0.35, 'Dầu gội bồ kết, gừng giúp tóc chắc khỏe.'],
  ['mat_na_giay_hop', 'Mặt nạ giấy dưỡng da (hộp 10)', 'personal_care', 95000, 140000, 10, 'ambient', 360, 10, 0.3, 'Hộp mặt nạ giấy cấp ẩm, chị em chuộng cuối tuần.'],
  ['son_li', 'Son lì', 'personal_care', 120000, 175000, 10, 'ambient', 540, 11, 0.25, 'Son lì lên màu chuẩn, bền màu cả ngày.'],
  ['gel_rua_mat_tri_mun', 'Gel rửa mặt trị mụn', 'personal_care', 110000, 160000, 10, 'ambient', 540, 12, 0.25, 'Gel làm sạch sâu cho da dầu mụn.'],
  ['nuoc_hoa_mini', 'Nước hoa mini 20ml', 'personal_care', 150000, 220000, 10, 'ambient', 720, 13, 0.2, 'Chai nước hoa nhỏ xinh hợp bỏ túi.'],
  ['serum_vitamin_c', 'Serum vitamin C', 'personal_care', 180000, 260000, 8, 'ambient', 360, 16, 0.2, 'Serum sáng da, mờ thâm.'],
  ['kem_nen_trang_diem', 'Kem nền trang điểm', 'personal_care', 220000, 320000, 8, 'ambient', 540, 17, 0.15, 'Kem nền che phủ tự nhiên cho ngày dài.'],
  ['may_cao_rau_dien', 'Máy cạo râu điện mini', 'personal_care', 260000, 380000, 8, 'ambient', 720, 20, 0.15, 'Máy cạo râu sạc USB, êm ái cho da nhạy cảm.'],
  ['nuoc_hoa_cao_cap_50ml', 'Nước hoa cao cấp 50ml', 'personal_care', 520000, 760000, 6, 'ambient', 720, 28, 0.1, 'Nước hoa hàng hiệu hương gỗ hoa, quà tặng đẳng cấp.'],

  // ── Đồ đông lạnh (nhóm mới) ──
  ['kem_hop_vinamilk', 'Kem hộp Vinamilk 450ml', 'frozen', 36000, 54000, 12, 'cold', 90, 5, 0.4, 'Hộp kem sữa nhiều vị cho cả nhà ăn tối.'],
  ['kem_oc_que_walls', "Kem ốc quế Wall's", 'frozen', 12000, 18000, 16, 'cold', 90, 5, 0.45, 'Kem ốc quế sô cô la giòn rụm.'],
  ['xuc_xich_cp', 'Xúc xích CP gói 5 cây', 'frozen', 32000, 48000, 14, 'cold', 90, 5, 0.45, 'Xúc xích heo tiệt trùng, chiên hay nướng đều ngon.'],
  ['ca_vien_dong_lanh', 'Cá viên đông lạnh', 'frozen', 36000, 54000, 14, 'cold', 90, 5, 0.45, 'Cá viên chiên bán vỉa hè, mua về thả lẩu.'],
  ['cha_gio_dong_lanh', 'Chả giò đông lạnh', 'frozen', 48000, 70000, 12, 'cold', 90, 6, 0.4, 'Chả giò cuốn sẵn, chiên giòn là xong món.'],
  ['bo_vien_dong_lanh', 'Bò viên đông lạnh', 'frozen', 42000, 62000, 12, 'cold', 90, 6, 0.4, 'Bò viên dai giòn nấu phở hoặc nhúng lẩu.'],
  ['banh_bao_dong_lanh', 'Bánh bao đông lạnh (gói 6)', 'frozen', 40000, 58000, 12, 'cold', 120, 6, 0.4, 'Bánh bao nhân thịt hấp 10 phút là ăn.'],
  ['hoanh_thanh_dong', 'Hoành thánh đông lạnh', 'frozen', 38000, 56000, 12, 'cold', 90, 7, 0.35, 'Hoành thánh nhân tôm thịt luộc nhanh.'],
  ['ga_nuggets_dong', 'Gà viên chiên nuggets', 'frozen', 52000, 76000, 12, 'cold', 120, 8, 0.4, 'Nuggets chiên giòn, món ưa thích của trẻ nhỏ.'],
  ['xuc_xich_duc', 'Xúc xích Đức', 'frozen', 55000, 80000, 12, 'cold', 90, 9, 0.3, 'Xúc xích Đức hun khói đậm vị.'],
  ['rau_cu_dong_hon_hop', 'Rau củ đông lạnh hỗn hợp', 'frozen', 34000, 50000, 12, 'cold', 180, 10, 0.3, 'Bắp, đậu, cà rốt cắt hạt lựu cho món chiên cơm.'],
  ['kem_mochi', 'Kem mochi', 'frozen', 45000, 66000, 10, 'cold', 60, 12, 0.3, 'Kem bọc bánh nếp dẻo kiểu Nhật.'],
  ['pizza_dong_lanh', 'Pizza đông lạnh 7 inch', 'frozen', 68000, 98000, 10, 'cold', 120, 14, 0.25, 'Chiếc pizza nhỏ nướng lò 12 phút.'],
  ['kem_haagen_dazs', 'Kem Häagen-Dazs hũ', 'frozen', 95000, 140000, 8, 'cold', 120, 15, 0.2, 'Hũ kem nhập khẩu béo mịn, hàng sang cho dịp đặc biệt.'],
  ['tom_dong_lanh_500g', 'Tôm đông lạnh 500g', 'frozen', 140000, 200000, 8, 'cold', 120, 18, 0.2, 'Tôm sú đã sơ chế, xếp khay tiện lợi.'],
  ['bo_my_dong_lanh', 'Bò Mỹ nhập khẩu đông lạnh 500g', 'frozen', 190000, 270000, 8, 'cold', 120, 24, 0.15, 'Bò Mỹ thái lát dùng nướng và nhúng lẩu.'],

  // ── Rau củ, thịt cá tươi cao cấp (bổ sung cho nhóm tươi sống) ──
  ['rau_mam_huu_co', 'Rau mầm hữu cơ', 'fresh_produce', 24000, 36000, 12, 'cold', 4, 5, 0.35, 'Rau mầm non mướt, trộn salad hoặc cuốn thịt.'],
  ['dau_tay_da_lat', 'Dâu tây Đà Lạt', 'fresh_produce', 90000, 130000, 10, 'cold', 4, 7, 0.3, 'Dâu tây đỏ mọng, mềm nên phải bán nhanh.'],
  ['bo_sap_dak_lak', 'Bơ sáp Đắk Lắk', 'fresh_produce', 55000, 80000, 12, 'ambient', 6, 8, 0.3, 'Bơ sáp dẻo thơm dùng làm sinh tố hay ăn trực tiếp.'],
  ['kiwi_xanh_nz', 'Kiwi xanh New Zealand', 'fresh_produce', 70000, 102000, 10, 'cold', 10, 9, 0.25, 'Kiwi chua ngọt giàu vitamin C.'],
  ['tao_envy_nz', 'Táo Envy New Zealand', 'fresh_produce', 90000, 130000, 10, 'cold', 12, 10, 0.25, 'Táo giòn ngọt, đóng gói từng quả.'],
  ['mang_tay_xanh', 'Măng tây xanh', 'fresh_produce', 85000, 125000, 10, 'cold', 5, 11, 0.2, 'Măng tây xanh nhập khẩu, xào tỏi là tuyệt.'],
  ['nho_do_my', 'Nho đỏ Mỹ nhập khẩu', 'fresh_produce', 120000, 175000, 10, 'cold', 10, 12, 0.25, 'Nho đỏ không hạt giòn ngọt.'],
  ['sau_rieng_ri6', 'Sầu riêng Ri6', 'fresh_produce', 130000, 190000, 8, 'ambient', 5, 13, 0.25, 'Sầu riêng cơm vàng hạt lép, thơm nức cả phố.'],
  ['rau_cu_huu_co_combo', 'Combo rau củ hữu cơ', 'fresh_produce', 60000, 88000, 10, 'cold', 5, 13, 0.25, 'Túi rau củ hữu cơ chọn lọc cho bữa cơm sạch.'],
  ['dua_luoi_nhat', 'Dưa lưới Nhật', 'fresh_produce', 120000, 175000, 8, 'ambient', 7, 16, 0.2, 'Dưa lưới Nhật ngọt mát, quà biếu thường gặp.'],
  ['cua_ca_mau', 'Cua Cà Mau', 'fresh_produce', 260000, 370000, 8, 'cold', 4, 17, 0.2, 'Cua gạch đầy chắc thịt, hấp bia thì nhất.'],
  ['ca_hoi_na_uy', 'Cá hồi Na Uy tươi 300g', 'fresh_produce', 220000, 310000, 8, 'cold', 5, 20, 0.2, 'Phi lê cá hồi tươi làm sashimi hay áp chảo.'],
  ['cherry_my', 'Cherry Mỹ', 'fresh_produce', 280000, 400000, 6, 'cold', 7, 22, 0.1, 'Cherry đỏ thẫm nhập khẩu, mùa nào cũng đắt hàng.'],
  ['tom_hum_baby', 'Tôm hùm baby', 'fresh_produce', 420000, 600000, 6, 'cold', 4, 26, 0.2, 'Tôm hùm nhỏ sống, hấp phô mai là món đại tiệc.'],
  ['bo_wagyu_a5', 'Bò Wagyu A5 200g', 'fresh_produce', 650000, 920000, 6, 'cold', 7, 30, 0.2, 'Thịt bò Nhật vân mỡ tan chảy, đỉnh cao ẩm thực.'],

  // ── Thuốc & vitamin (nhóm mới) ──
  ['paracetamol_vi', 'Thuốc hạ sốt Paracetamol', 'health', 8000, 12000, 16, 'ambient', 720, 5, 0.45, 'Vỉ thuốc hạ sốt giảm đau thông dụng.'],
  ['cao_sao_vang', 'Cù là Sao Vàng', 'health', 9000, 14000, 20, 'ambient', 720, 5, 0.4, 'Hộp cù là xoa bóp quen thuộc của mọi gia đình.'],
  ['dau_gio_xanh', 'Dầu gió xanh', 'health', 22000, 33000, 16, 'ambient', 720, 5, 0.4, 'Chai dầu gió thơm nồng trị cảm cúm, nhức đầu.'],
  ['siro_ho_bo_phe', 'Siro ho Bổ Phế', 'health', 35000, 52000, 12, 'ambient', 540, 5, 0.35, 'Siro thảo dược dịu cơn ho dai dẳng.'],
  ['vitamin_c_sui', 'Viên sủi Vitamin C', 'health', 38000, 56000, 14, 'ambient', 540, 5, 0.4, 'Tuýp viên sủi tăng đề kháng mùa giao thời.'],
  ['con_sat_khuan_70', 'Cồn sát khuẩn 70°', 'health', 15000, 23000, 16, 'ambient', 720, 5, 0.35, 'Chai cồn sát khuẩn vết thương và dụng cụ.'],
  ['oresol_bu_nuoc', 'Gói Oresol bù nước', 'health', 6000, 9500, 20, 'ambient', 720, 6, 0.35, 'Gói bù nước điện giải khi tiêu chảy, mất nước.'],
  ['bang_gac_y_te', 'Băng gạc y tế', 'health', 18000, 27000, 16, 'ambient', 720, 6, 0.3, 'Bộ băng gạc vô trùng sơ cứu tại nhà.'],
  ['mieng_dan_salonpas', 'Miếng dán giảm đau Salonpas', 'health', 28000, 42000, 16, 'ambient', 540, 6, 0.35, 'Miếng dán cơ nhức mỏi, dùng sau buổi tập.'],
  ['tra_thao_moc_giai_nhiet', 'Trà thảo mộc giải nhiệt', 'health', 28000, 42000, 14, 'ambient', 360, 7, 0.35, 'Trà thảo mộc mát gan, bán chạy ngày nắng.'],
  ['khau_trang_n95', 'Khẩu trang N95 hộp 10', 'health', 120000, 175000, 12, 'ambient', 720, 8, 0.25, 'Khẩu trang lọc bụi mịn chuẩn N95.'],
  ['nhiet_ke_dien_tu', 'Nhiệt kế điện tử', 'health', 95000, 140000, 10, 'ambient', 720, 9, 0.25, 'Nhiệt kế đo trán không chạm, nhà có trẻ nhỏ nên có.'],
  ['canxi_d3', 'Canxi + D3', 'health', 180000, 260000, 10, 'ambient', 540, 13, 0.2, 'Hộp canxi D3 cho người lớn tuổi và phụ nữ sau sinh.'],
  ['vitamin_tong_hop', 'Vitamin tổng hợp', 'health', 320000, 450000, 8, 'ambient', 540, 14, 0.15, 'Lọ vitamin tổng hợp nhập khẩu dùng hàng ngày.'],
  ['dau_ca_omega3', 'Dầu cá Omega-3', 'health', 280000, 390000, 8, 'ambient', 540, 16, 0.15, 'Viên dầu cá bổ não và tim mạch.'],
  ['collagen_nuoc', 'Collagen nước uống', 'health', 330000, 470000, 8, 'ambient', 540, 18, 0.12, 'Hộp collagen dạng ống uống, chị em chăm sóc làn da.'],
  ['may_do_huyet_ap', 'Máy đo huyết áp', 'health', 520000, 740000, 6, 'ambient', 1080, 22, 0.1, 'Máy đo huyết áp bắp tay điện tử cho người cao tuổi.'],
  ['sam_han_quoc_hop', 'Sâm Hàn Quốc hộp quà', 'health', 420000, 600000, 6, 'ambient', 720, 26, 0.08, 'Hộp sâm tươi Hàn Quốc, quà biếu sang trọng.'],

  // ── Đồ chơi & văn phòng phẩm (nhóm mới) ──
  ['but_bi_thien_long', 'Bút bi Thiên Long (hộp 20)', 'toys_stationery', 42000, 62000, 16, 'ambient', 1080, 5, 0.4, 'Hộp bút bi mực xanh trơn tru cho học sinh.'],
  ['vo_ke_ngang_loc', 'Vở kẻ ngang (lốc 10)', 'toys_stationery', 85000, 125000, 12, 'ambient', 1080, 5, 0.4, 'Lốc vở kẻ ngang giấy trắng, mùa tựu trường bán rất chạy.'],
  ['but_chi_2b', 'Bút chì 2B (hộp 12)', 'toys_stationery', 28000, 42000, 16, 'ambient', 1080, 5, 0.35, 'Bút chì gỗ 2B cho giờ viết và vẽ.'],
  ['sach_to_mau', 'Sách tô màu', 'toys_stationery', 22000, 34000, 16, 'ambient', 1080, 5, 0.35, 'Cuốn sách tô màu hình thú cho bé.'],
  ['keo_ho_dan', 'Keo hồ dán & kéo thủ công', 'toys_stationery', 18000, 27000, 16, 'ambient', 1080, 5, 0.3, 'Bộ keo dán và kéo an toàn cho bài thủ công.'],
  ['but_sap_mau_24', 'Bút sáp màu 24 màu', 'toys_stationery', 36000, 54000, 14, 'ambient', 1080, 6, 0.35, 'Hộp bút sáp 24 màu tươi sáng.'],
  ['day_nhay_the_duc', 'Dây nhảy thể dục', 'toys_stationery', 28000, 42000, 14, 'ambient', 1080, 6, 0.3, 'Dây nhảy tay cầm êm, trẻ em và người tập đều dùng.'],
  ['hop_but_vai', 'Hộp bút vải', 'toys_stationery', 38000, 58000, 14, 'ambient', 1080, 7, 0.3, 'Hộp bút vải họa tiết dễ thương.'],
  ['xe_mo_hinh_hot_wheels', 'Xe mô hình Hot Wheels', 'toys_stationery', 35000, 52000, 14, 'ambient', 1080, 7, 0.35, 'Xe hơi mô hình kim loại nhỏ xinh cho bé trai.'],
  ['bo_bai_uno', 'Bộ bài Uno', 'toys_stationery', 45000, 68000, 12, 'ambient', 1080, 8, 0.35, 'Bộ bài chơi cả nhà dịp cuối tuần.'],
  ['xep_hinh_puzzle_500', 'Xếp hình Puzzle 500 mảnh', 'toys_stationery', 90000, 135000, 10, 'ambient', 1080, 9, 0.25, 'Bộ xếp hình giúp thư giãn và rèn kiên nhẫn.'],
  ['lego_mini', 'Bộ xếp hình Lego mini', 'toys_stationery', 180000, 265000, 10, 'ambient', 1080, 10, 0.25, 'Hộp Lego nhỏ lắp được vài mô hình.'],
  ['gau_bong_teddy', 'Gấu bông Teddy', 'toys_stationery', 120000, 180000, 10, 'ambient', 1080, 10, 0.3, 'Gấu bông bông mềm, quà sinh nhật được ưa thích.'],
  ['bup_be_barbie', 'Búp bê Barbie', 'toys_stationery', 160000, 235000, 10, 'ambient', 1080, 11, 0.25, 'Búp bê thời trang kèm váy áo thay đổi.'],
  ['balo_hoc_sinh', 'Ba lô học sinh', 'toys_stationery', 220000, 320000, 8, 'ambient', 1080, 12, 0.25, 'Ba lô chống gù lưng cho học sinh tiểu học.'],
  ['bong_da_so_5', 'Bóng đá số 5', 'toys_stationery', 190000, 280000, 8, 'ambient', 1080, 13, 0.25, 'Quả bóng đá chuẩn thi đấu sân cỏ nhân tạo.'],
  ['may_tinh_casio_fx580', 'Máy tính Casio fx-580', 'toys_stationery', 480000, 680000, 6, 'ambient', 1080, 15, 0.15, 'Máy tính khoa học cho học sinh cấp 3 và sinh viên.'],
  ['robot_dieu_khien', 'Robot điều khiển từ xa', 'toys_stationery', 360000, 520000, 6, 'ambient', 1080, 20, 0.15, 'Robot biến hình điều khiển bằng tay cầm.'],
  ['mo_hinh_gundam', 'Mô hình Gundam', 'toys_stationery', 480000, 690000, 6, 'ambient', 1080, 24, 0.1, 'Mô hình lắp ráp Gundam dành cho người sưu tầm.'],

  // ── Bia rượu (nhóm mới, mở từ cấp 6) ──
  ['bia_333_lon', 'Bia 333 lon', 'alcohol', 9500, 14000, 24, 'ambient', 240, 6, 0.45, 'Lon bia quen thuộc của các bác sau giờ làm.'],
  ['bia_saigon_special', 'Bia Sài Gòn Special', 'alcohol', 12500, 18000, 24, 'ambient', 240, 6, 0.4, 'Bia lon vị êm, bán chạy ngày cuối tuần.'],
  ['bia_tiger_lon', 'Bia Tiger lon', 'alcohol', 13500, 19500, 24, 'ambient', 240, 6, 0.4, 'Bia Tiger lon bạc uống lạnh là nhất.'],
  ['bia_heineken_lon', 'Bia Heineken lon', 'alcohol', 15500, 22500, 24, 'ambient', 240, 7, 0.35, 'Bia nhập khẩu nhẹ, vị hoa bia rõ.'],
  ['ruou_nep_cam', 'Rượu nếp cẩm', 'alcohol', 65000, 95000, 10, 'ambient', 360, 9, 0.25, 'Rượu nếp cẩm ngọt dịu, ngày Tết bày mâm cỗ.'],
  ['ruou_soju_han', 'Rượu Soju Hàn Quốc', 'alcohol', 55000, 80000, 14, 'ambient', 540, 9, 0.3, 'Chai soju xanh mà các tín đồ phim Hàn nào cũng biết.'],
  ['thung_bia_tiger_24', 'Thùng bia Tiger 24 lon', 'alcohol', 310000, 430000, 8, 'ambient', 240, 10, 0.3, 'Thùng bia cho tiệc nhà, sắm Tết thường mua cả thùng.'],
  ['bia_craft_nhap', 'Bia craft nhập khẩu', 'alcohol', 35000, 52000, 12, 'ambient', 180, 12, 0.2, 'Bia thủ công hương cam thảo, hợp người thích thử vị lạ.'],
  ['ruou_vodka_ha_noi', 'Vodka Hà Nội', 'alcohol', 145000, 210000, 10, 'ambient', 720, 12, 0.25, 'Vodka truyền thống, nhậu bạn bè.'],
  ['ruou_vang_chile', 'Rượu vang đỏ Chile', 'alcohol', 180000, 265000, 8, 'ambient', 720, 14, 0.2, 'Rượu vang đỏ nhập khẩu, hợp bữa tối ấm cúng.'],
  ['ruou_sake_nhat', 'Rượu Sake Nhật', 'alcohol', 220000, 320000, 8, 'ambient', 720, 16, 0.15, 'Sake Nhật Bản trong veo, uống nóng hoặc lạnh.'],
  ['whisky_red_label', 'Whisky Johnnie Walker Red', 'alcohol', 480000, 690000, 6, 'ambient', 1080, 20, 0.15, 'Chai whisky Scotch phổ biến dùng pha cocktail.'],
  ['ruou_vang_bordeaux', 'Rượu vang Pháp Bordeaux', 'alcohol', 450000, 650000, 6, 'ambient', 1080, 22, 0.12, 'Vang Pháp lâu năm, quà tặng sang trọng.'],
  ['whisky_black_label', 'Whisky Johnnie Walker Black 12', 'alcohol', 780000, 1100000, 6, 'ambient', 1080, 26, 0.1, 'Whisky 12 năm, vị khói đậm thơm.'],
  ['cognac_hennessy_vs', 'Cognac Hennessy VS', 'alcohol', 1100000, 1550000, 4, 'ambient', 1080, 30, 0.08, 'Rượu cognac Pháp, món quà đại gia dịp Tết.'],
];

export const EXPANSION_PRODUCTS: Product[] = ROWS.map(([
  id, name, category, purchasePrice, baseSellingPrice, shelfCapacity, storageType, daysToSpoil, unlockLevel, basePopularity, description,
]) => ({
  id, name, category, purchasePrice, baseSellingPrice, shelfCapacity, storageType, unlockLevel,
  spriteId: `item_${id}`,
  expirationRules: { daysToSpoil },
  demandProfile: { basePopularity },
  description,
}));
