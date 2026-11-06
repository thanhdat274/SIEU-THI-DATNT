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
];

export const HOMEMADE_IDS: ReadonlySet<string> = new Set(HOMEMADE_PRODUCTS.map((h) => h.id));

export const NEIGHBOR2_IDS: ReadonlySet<string> = new Set(NEIGHBOR2_PRODUCTS.map((h) => h.id));

/** Toàn bộ "chỉ hàng xóm bán" (nhà hàng xóm + nhà bà Tám): các kênh cầu lọc bằng set này. */
export const NEIGHBOR_ONLY_IDS: ReadonlySet<string> = new Set([...HOMEMADE_IDS, ...NEIGHBOR2_IDS]);
