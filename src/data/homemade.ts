import type { Category } from './products';

/**
 * Món hàng xóm tự làm tại gia (GĐ1077, chiều sâu "nguồn cung ngoài mối chuẩn"): chỉ nhập được ở nhà hàng xóm
 * (`hangxom` trong suppliers.ts), không có ở đại lý/chợ/kho sỉ. Giá nhập cao hơn đồ công nghiệp cùng loại nhưng
 * biên lời dày và khách quen thích "đồ nhà làm" — người chơi đổi vị trí kệ/giá lấy hàng độc, không phải mua rẻ hơn.
 * Chỉ dữ liệu thuần; save không đổi (món mới chỉ xuất hiện trong kho khi người chơi nhập).
 */
export const HOMEMADE_PRODUCTS: { id: string; name: string; category: Category; buy: number; sell: number; color: number; unlock: number }[] = [
  { id: 'hx_dua_muoi', name: 'Dưa muối nhà làm', category: 'cold', buy: 7000, sell: 11500, color: 0x9bc53d, unlock: 14 },
  { id: 'hx_ca_phao', name: 'Cà pháo muối', category: 'cold', buy: 8000, sell: 13000, color: 0xb5d36a, unlock: 16 },
  { id: 'hx_mam_tep', name: 'Mắm tép (hũ)', category: 'dry', buy: 14000, sell: 22000, color: 0xc0705a, unlock: 18 },
  { id: 'hx_tuong_ban', name: 'Tương bần (chai)', category: 'dry', buy: 12000, sell: 19000, color: 0x8a4b22, unlock: 20 },
  { id: 'hx_banh_trang', name: 'Bánh tráng phơi sương', category: 'dry', buy: 10000, sell: 16000, color: 0xf3e5c0, unlock: 22 },
  { id: 'hx_nuoc_mam', name: 'Nước mắm cá cơm nhà ủ', category: 'dry', buy: 30000, sell: 47000, color: 0xb5651d, unlock: 28 },
  // GĐ1083: đặc sản cuối-game — hàng xóm có "mối ruột" sản phẩm tinh tế hơn, giá cao hơn hẳn,
  // mở ở cấp cao (≥34, trên mức golden sim 30 nên không đổi RNG mốc), vẫn biên ≥35%.
  { id: 'hx_mam_ruoc', name: 'Mắm ruốc Huế (hũ)', category: 'dry', buy: 36000, sell: 56000, color: 0x9b4a2b, unlock: 34 },
  { id: 'hx_vai_say', name: 'Vải thiều sấy (gói)', category: 'dry', buy: 42000, sell: 65000, color: 0xd23b3b, unlock: 38 },
  // GĐ1321: mở rộng nguồn cung hàng xóm (hướng 3) — tương ớt quê tự làm, biên 40%, mở 36 sau mốc golden 30 → sim không đổi.
  // Khớp bất biến GĐ1083: đặc sản mở ≥30 phải sell ≥50k & biên ≥35%.
  { id: 'hx_tuong_ot', name: 'Tương ớt quê (chai)', category: 'dry', buy: 30000, sell: 50000, color: 0xd63031, unlock: 36 },
  // GĐ1439: chà bông heo nhà làm (hướng 3) — sell ≥50k, biên ~35% (bất biến GĐ1083), mở 46; lối ra: Xôi chà bông.
  { id: 'hx_cha_bong', name: 'Chà bông heo nhà làm (hũ)', category: 'dry', buy: 55000, sell: 85000, color: 0xc89058, unlock: 46 },
  // GĐ1445: chanh muối hũ (hướng 3) — sell ≥50k, biên 36%, mở 40; lối ra: Nước chanh muối ở quán nước.
  { id: 'hx_chanh_muoi', name: 'Chanh muối nhà làm (hũ)', category: 'dry', buy: 32000, sell: 50000, color: 0xd9c94a, unlock: 40 },
  // GĐ1483: tôm khô nhà phơi (hướng 3) — sell ≥50k, biên ~36% (bất biến GĐ1083), mở 52 > golden 30; lối ra: Cháo tôm khô (nồi nước).
  { id: 'hx_tom_kho', name: 'Tôm khô nhà phơi (gói)', category: 'dry', buy: 58000, sell: 90000, color: 0xe0703a, unlock: 52 },
  // GĐ1484: măng khô nhà phơi (hướng 3) — sell ≥50k, biên ~36%, mở 53 > golden 30; lối ra: Măng khô xào lạp xưởng (chảo chiên).
  { id: 'hx_mang_kho', name: 'Măng khô nhà phơi (gói)', category: 'dry', buy: 45000, sell: 70000, color: 0xb08a4a, unlock: 53 },
  // GĐ1485: nấm mèo khô nhà phơi (hướng 3) — sell ≥50k, biên ~36%, mở 54 > golden 30; lối ra: Chả giò nấm mèo (chảo chiên).
  { id: 'hx_nam_meo', name: 'Nấm mèo khô nhà phơi (gói)', category: 'dry', buy: 35000, sell: 55000, color: 0x3a2a22, unlock: 54 },
  // GĐ1486: mè rang nhà làm (hướng 3) — sell ≥50k, biên ~36%, mở 55 > golden 30; lối ra: Xôi muối mè (bếp xôi cơm).
  { id: 'hx_me_rang', name: 'Mè rang nhà làm (hũ)', category: 'dry', buy: 32000, sell: 50000, color: 0xe8d6a0, unlock: 55 },
];

/**
 * GĐ1085: NHÀ BÀ TÁM — người hàng xóm thứ hai, "MỘT NGƯỜI CON VIỆT" cung đặc sản miền khác (hướng GĐ1076/1081:
 * "nhiều nguồn cung nguyên liệu tự làm tại gia của hàng xóm"). Bà Tám ủ/tẩm đặc sản riêng (chả lụa, nem chua,
 * bánh đa), chỉ nhập ở `hangxom2`, KHÔNG có ở mối chuẩn nào. Cùng thuộc "chỉ hàng xóm bán": lọc khỏi đơn
 * online/điện thoại/chợ phiên/khách-trừ-bày kệ (xem NEIGHBOR_ONLY_IDS). Mở cấp ≥34 (trên mốc golden sim 30).
 */
export const NEIGHBOR2_PRODUCTS: { id: string; name: string; category: Category; buy: number; sell: number; color: number; unlock: number }[] = [
  { id: 'hx_cha_lua', name: 'Chả lụa nhà bà Tám', category: 'fresh', buy: 27000, sell: 42000, color: 0xeecf9f, unlock: 34 },
  { id: 'hx_nem_chua', name: 'Nem chua (thanh)', category: 'fresh', buy: 9000, sell: 14000, color: 0xe8b87a, unlock: 36 },
  { id: 'hx_banh_da', name: 'Bánh đa (bì)', category: 'dry', buy: 14000, sell: 22000, color: 0xd9b36a, unlock: 38 },
  // GĐ1321: mở rộng đặc sản bà Tám (hướng 3) — bánh cuốn tay, biên ~1.65× như chuẩn, mở 40 sau mốc golden 30 → sim không đổi.
  { id: 'hx_banh_cuon', name: 'Bánh cuốn nhà làm (đĩa)', category: 'fresh', buy: 20000, sell: 33000, color: 0xf0e6d2, unlock: 40 },
  // GĐ1438: lạp xưởng tươi nhà bà Tám (hướng 3) — biên ~1.65×, mở 44 > golden 30; lối ra: Cơm chiên lạp xưởng (chảo chiên).
  { id: 'hx_lap_xuong', name: 'Lạp xưởng tươi bà Tám', category: 'cold', buy: 48000, sell: 79000, color: 0xb8323a, unlock: 44 },
  // GĐ1444: giò thủ bà Tám (hướng 3) — biên ~1.6×, mở 48; lối ra: Bánh mì giò thủ ở bếp nướng.
  { id: 'hx_gio_thu', name: 'Giò thủ bà Tám (khoanh)', category: 'cold', buy: 60000, sell: 96000, color: 0xd8c0a0, unlock: 48 },
  // GĐ1446: me chua dầm đường bà Tám (hướng 3) — mở 42; lối ra: Đá me ở quán nước.
  { id: 'hx_me_dam', name: 'Me dầm đường bà Tám (hũ)', category: 'dry', buy: 26000, sell: 42000, color: 0x8a5a2b, unlock: 42 },
  // GĐ1487: nem nướng bà Tám (hướng 3) — biên ~1.6×, mở 56; lối ra: Nem nướng cuốn (bếp nướng).
  { id: 'hx_nem_nuong', name: 'Nem nướng bà Tám (xâu)', category: 'cold', buy: 50000, sell: 80000, color: 0xc0603a, unlock: 56 },
  // GĐ1488: cá cơm khô bà Tám (hướng 3) — biên ~1.6×, mở 57; lối ra: Cơm cá cơm rim (bếp xôi cơm).
  { id: 'hx_ca_kho', name: 'Cá cơm khô bà Tám (gói)', category: 'dry', buy: 40000, sell: 64000, color: 0xc8a070, unlock: 57 },
  // GĐ1845: tỏi đen nhà ủ (hướng 3) — biên 1,6×, mở 58; lối ra: Cơm chiên tỏi đen (bếp xôi cơm).
  { id: 'hx_toi_den', name: 'Tỏi đen nhà ủ (hũ)', category: 'dry', buy: 55000, sell: 88000, color: 0x2b2420, unlock: 58 },
  // GĐ1846: sa tế tôm nhà làm — biên 1,6×, mở 59; lối ra: Cơm sa tế tôm (bếp xôi cơm).
  { id: 'hx_sate_tom', name: 'Sa tế tôm nhà làm (hũ)', category: 'dry', buy: 36000, sell: 58000, color: 0xb8401f, unlock: 59 },
  // GĐ1847: tép rim nhà làm — biên 1,6×, mở 60; lối ra: Cơm tép rim (bếp xôi cơm).
  { id: 'hx_tep_rim', name: 'Tép rim nhà làm (hũ)', category: 'dry', buy: 34000, sell: 54000, color: 0x9a5a6a, unlock: 60 },
  // GĐ1848: ruốc cá lóc nhà làm — biên 1,6×, mở 61; lối ra: Cháo ruốc cá lóc (nồi nước).
  { id: 'hx_ruoc_ca_loc', name: 'Ruốc cá lóc nhà làm (hũ)', category: 'dry', buy: 45000, sell: 72000, color: 0xb89a6a, unlock: 61 },
  // GĐ1849: muối ớt Tây Ninh nhà làm — biên 1,6×, mở 62; lối ra: Cơm muối ớt (bếp xôi cơm).
  { id: 'hx_muoi_ot', name: 'Muối ớt Tây Ninh nhà làm (hũ)', category: 'dry', buy: 32000, sell: 51000, color: 0xd9452b, unlock: 62 },
  // GĐ1850: đậu phộng muối nhà rang — biên 1,6×, mở 63; lối ra: Cháo đậu phộng (nồi nước).
  { id: 'hx_dau_phong_rang', name: 'Đậu phộng rang nhà làm (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xc89a5a, unlock: 63 },
  // GĐ1851: khô cá sặc nhà phơi — biên 1,6×, mở 64; lối ra: Cơm khô cá sặc (bếp xôi cơm).
  { id: 'hx_kho_ca_sac', name: 'Khô cá sặc nhà phơi (gói)', category: 'dry', buy: 38000, sell: 61000, color: 0xb8864a, unlock: 64 },
  // GĐ1852: hành phi nhà làm — biên 1,6×, mở 65; lối ra: Cháo hành phi (nồi nước).
  { id: 'hx_hanh_phi', name: 'Hành phi nhà làm (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xc8943a, unlock: 65 },
  // GĐ1853: mắm cá linh nhà ủ — biên 1,6×, mở 66; lối ra: Cơm mắm cá linh (bếp xôi cơm).
  { id: 'hx_mam_ca_linh', name: 'Mắm cá linh nhà ủ (hũ)', category: 'dry', buy: 34000, sell: 54000, color: 0x8a5a4a, unlock: 66 },
  // GĐ1854: tôm chua Huế nhà ủ — biên 1,6×, mở 67; lối ra: Cơm tôm chua (bếp xôi cơm).
  { id: 'hx_tom_chua', name: 'Tôm chua Huế nhà ủ (hũ)', category: 'dry', buy: 33000, sell: 53000, color: 0xd9704a, unlock: 67 },
  // GĐ1855: củ kiệu muối nhà làm — biên 1,6×, mở 68; lối ra: Cháo củ kiệu (nồi nước).
  { id: 'hx_cu_kieu', name: 'Củ kiệu muối nhà làm (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xe8dcb0, unlock: 68 },
  // GĐ1856: tương gừng nhà làm — biên 1,6×, mở 69; lối ra: Cơm tương gừng (bếp xôi cơm).
  { id: 'hx_tuong_gung', name: 'Tương gừng nhà làm (hũ)', category: 'dry', buy: 30000, sell: 50000, color: 0xc8a050, unlock: 69 },
  // GĐ1857: nấm rơm khô nhà phơi — biên 1,6×, mở 70; lối ra: Cháo nấm rơm (nồi nước).
  { id: 'hx_nam_rom', name: 'Nấm rơm khô nhà phơi (gói)', category: 'dry', buy: 40000, sell: 64000, color: 0x6a4a3a, unlock: 70 },
  // GĐ1858: muối tôm Tây Ninh nhà rang — biên 1,6×, mở 71; lối ra: Cơm muối tôm (bếp xôi cơm).
  { id: 'hx_muoi_tom', name: 'Muối tôm nhà rang (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xd98a6a, unlock: 71 },
  // GĐ1859: hạt sen sấy nhà làm — biên 1,6×, mở 72; lối ra: Cháo hạt sen (nồi nước).
  { id: 'hx_hat_sen', name: 'Hạt sen sấy nhà làm (gói)', category: 'dry', buy: 42000, sell: 67000, color: 0xe8e0b0, unlock: 72 },
  // GĐ1860: đậu đen rang nhà làm — biên 1,6×, mở 73; lối ra: Cơm đậu đen (bếp xôi cơm).
  { id: 'hx_dau_den', name: 'Đậu đen rang nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0x2a2a30, unlock: 73 },
  // GĐ1861: đậu xanh cà vỏ nhà làm — biên 1,6×, mở 74; lối ra: Cháo đậu xanh (nồi nước).
  { id: 'hx_dau_xanh_ca', name: 'Đậu xanh cà vỏ nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0xd8c860, unlock: 74 },
  // GĐ1862: mè đen xay nhà làm — biên 1,6×, mở 75; lối ra: Cơm mè đen (bếp xôi cơm).
  { id: 'hx_me_den', name: 'Mè đen xay nhà làm (hũ)', category: 'dry', buy: 32000, sell: 51000, color: 0x30282a, unlock: 75 },
  // GĐ1863: khoai lang sấy dẻo nhà làm — biên 1,6×, mở 76; lối ra: Cháo khoai lang (nồi nước).
  { id: 'hx_khoai_say', name: 'Khoai lang sấy dẻo nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0xd88a4a, unlock: 76 },
  // GĐ1864: bắp rang bơ nhà làm — biên 1,6×, mở 77; lối ra: Cơm bắp (bếp xôi cơm).
  { id: 'hx_bap_rang', name: 'Bắp rang bơ nhà làm (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xf0d870, unlock: 77 },
  // GĐ1865: tương hột Bến Tre nhà ủ — biên 1,6×, mở 78; lối ra: Cháo tương hột (nồi nước).
  { id: 'hx_tuong_hot', name: 'Tương hột nhà ủ (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0x7a4a22, unlock: 78 },
  // GĐ1866: bột nghệ nhà xay — biên 1,6×, mở 79; lối ra: Cơm nghệ (bếp xôi cơm).
  { id: 'hx_bot_nghe', name: 'Bột nghệ nhà xay (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xd8a020, unlock: 79 },
  // GĐ1867: bột cà ri nhà rang — biên 1,6×, mở 80; lối ra: Cháo cà ri (nồi nước).
  { id: 'hx_bot_ca_ri', name: 'Bột cà ri nhà rang (hũ)', category: 'dry', buy: 32000, sell: 51000, color: 0xd89a20, unlock: 80 },
  // GĐ1868: muối sả nhà làm — biên 1,6×, mở 81; lối ra: Cơm muối sả (bếp xôi cơm).
  { id: 'hx_muoi_sa', name: 'Muối sả nhà làm (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xb8c880, unlock: 81 },
  // GĐ1869: tỏi ớt ngâm nhà làm — biên 1,6×, mở 83; lối ra: Cháo tỏi ớt (nồi nước, kèm tỏi).
  { id: 'hx_toi_ot', name: 'Tỏi ớt ngâm nhà làm (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xd85a3a, unlock: 83 },
  // GĐ1870: lá dứa sấy nhà làm — biên 1,6×, mở 84; lối ra: Cơm lá dứa (bếp xôi cơm).
  { id: 'hx_la_dua', name: 'Lá dứa sấy nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0x5a9a4a, unlock: 84 },
  // GĐ1871: hạt điều rang muối nhà làm — biên 1,6×, mở 85; lối ra: Cháo hạt điều (nồi nước).
  { id: 'hx_hat_dieu', name: 'Hạt điều rang muối nhà làm (hũ)', category: 'dry', buy: 48000, sell: 77000, color: 0xe0b878, unlock: 85 },
  // GĐ1872: mắm nêm Đà Nẵng nhà pha — biên 1,6×, mở 87; lối ra: Cơm mắm nêm (bếp xôi cơm).
  { id: 'hx_mam_nem', name: 'Mắm nêm nhà pha (chai)', category: 'dry', buy: 31000, sell: 50000, color: 0xa0683a, unlock: 87 },
  // GĐ1873: bột gạo lứt rang nhà làm — biên 1,6×, mở 88; lối ra: Cháo gạo lứt (nồi nước).
  { id: 'hx_gao_lut_rang', name: 'Gạo lứt rang nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0xb89868, unlock: 88 },
  // GĐ1874: xoài sấy dẻo nhà làm — biên 1,6×, mở 89; lối ra: Xôi xoài sấy (bếp xôi cơm).
  { id: 'hx_xoai_say', name: 'Xoài sấy dẻo nhà làm (gói)', category: 'dry', buy: 35000, sell: 56000, color: 0xe8a830, unlock: 89 },
  { id: 'hx_chuoi_say', name: 'Chuối sấy giòn nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0xd8b840, unlock: 90 },
  { id: 'hx_dua_say', name: 'Dừa sấy giòn nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0xe8e0c0, unlock: 92 },
  { id: 'hx_mon_say', name: 'Khoai môn sấy nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0xb89ac8, unlock: 93 },
  { id: 'hx_cai_muoi', name: 'Cải muối nhà làm (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0x9ab860, unlock: 94 },
  { id: 'hx_ca_phao_ngam', name: 'Cà pháo ngâm mắm nhà làm (hũ)', category: 'dry', buy: 31000, sell: 50000, color: 0xc8d890, unlock: 95 },
  { id: 'hx_nam_huong_say', name: 'Nấm hương sấy nhà làm (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0x8a6a4a, unlock: 97 },
  { id: 'hx_muc_mot_nang', name: 'Mực một nắng nhà phơi (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0xd8a890, unlock: 98 },
  { id: 'hx_gac_bep', name: 'Thịt gác bếp nhà hun (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0x7a4a3a, unlock: 99 },
  { id: 'hx_ca_dua_kho', name: 'Khô cá dứa nhà phơi (gói)', category: 'dry', buy: 31000, sell: 50000, color: 0xc8b078, unlock: 101 },
  // GĐ1671: mứt gừng bà Tám (hướng 3) — mứt Tết nhà làm, biên 1.6×, mở 45 > golden 30; hút hàng dịp Tết.
  { id: 'hx_mut_gung', name: 'Mứt gừng bà Tám (hộp)', category: 'dry', buy: 40000, sell: 64000, color: 0xe8c860, unlock: 45 },
];

export const HOMEMADE_IDS: ReadonlySet<string> = new Set(HOMEMADE_PRODUCTS.map((h) => h.id));

export const NEIGHBOR2_IDS: ReadonlySet<string> = new Set(NEIGHBOR2_PRODUCTS.map((h) => h.id));

/** Toàn bộ "chỉ hàng xóm bán" (nhà hàng xóm + nhà bà Tám): các kênh cầu lọc bằng set này. */
export const NEIGHBOR_ONLY_IDS: ReadonlySet<string> = new Set([...HOMEMADE_IDS, ...NEIGHBOR2_IDS]);
