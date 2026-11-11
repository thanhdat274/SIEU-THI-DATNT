import type { Category } from './products';

/**
 * GĐ1086: ĐẶC SẢN VÙNG — nguồn cung "ngoài tạp hóa" (hướng GĐ1076/2 "cơ chế nhập hàng NGOÀI tạp hóa để đa dạng
 * hàng bán"). Mối lái vùng xa (`dacsan` trong suppliers.ts) mang đặc sản miền không có ở mối thông thường, giúp
 * người chơi đa dạng hoá giỏ hàng cuối game. KHÁC hàng xóm: các món này LÀ hàng hoá thường — được khách/đơn
 * online/điện thoại/chợ phiên đòi mua bình thường (KHÔNG lọc khỏi bể cầu), chỉ là KHÔNG nhập được ở mối chuẩn
 * nào ngoài mối lái (`supplierSells` loại ở các mối khác). Mở cấp ≥42 > mọi mốc sim chặt (golden L30) nên
 * không đổi RNG mốc. Chỉ dữ liệu; save không đổi (món chỉ xuất hiện khi người chơi nhập từ mối lái).
 *
 * GĐ1505 — chia ĐÚNG MIỀN (Bắc/Trung/Nam/Tây Nguyên) làm nền cho bảng hiệu vinh danh đặc sản (bản Việt hoá
 * hệ "cờ vinh danh ẩm thực" tham khảo: đủ bộ 1 vùng = bảng hiệu sáng + thưởng). Thêm 6 đặc sản mới cho đủ
 * mỗi miền ≥2 loại — vẫn biên ×1.70 chuẩn GĐ1321, unlock 42–52 > golden 30 → sim/autoplay không đổi.
 */
export type RegionName = 'Bắc' | 'Trung' | 'Nam' | 'Tây Nguyên';

export const REGION_PRODUCTS: {
  id: string; name: string; region: RegionName; category: Category; buy: number; sell: number; color: number; unlock: number;
}[] = [
  // ── miền Bắc ──
  { id: 'rg_tra_shan', name: 'Trà shan tuyết (gói)', region: 'Bắc', category: 'dry', buy: 30000, sell: 51000, color: 0x1e8449, unlock: 42 },
  { id: 'rg_com_lang', name: 'Cốm làng Vòng (hộp)', region: 'Bắc', category: 'dry', buy: 44000, sell: 74800, color: 0x82a84b, unlock: 44 },
  // ── miền Trung ──
  { id: 'rg_me_xung', name: 'Mè xửng Huế (bịch)', region: 'Trung', category: 'dry', buy: 38000, sell: 64600, color: 0xd4ac0d, unlock: 44 },
  { id: 'rg_nem_chua', name: 'Nem chua Thanh Hóa (gói)', region: 'Trung', category: 'dry', buy: 40000, sell: 68000, color: 0xd35400, unlock: 48 },
  // ── miền Nam (dày nhất — đúng thực tế đặc sản Nam Bộ) ──
  { id: 'rg_kho_tom', name: 'Khô tôm đặc sản (gói)', region: 'Nam', category: 'dry', buy: 42000, sell: 72000, color: 0xc9a227, unlock: 42 },
  { id: 'rg_lap_xuong', name: 'Lạp xưởng miền (cây)', region: 'Nam', category: 'dry', buy: 46000, sell: 78000, color: 0xa5462a, unlock: 44 },
  { id: 'rg_banh_pia', name: 'Bánh pía (hộp)', region: 'Nam', category: 'dry', buy: 52000, sell: 88000, color: 0xe67e22, unlock: 46 },
  // GĐ1321: thêm đặc sản vùng (mở rộng hướng 2 "nhập hàng NGOÀI tạp hóa") — biên ×1.70 như chuẩn, mở 48/50 sau mốc golden 30 → sim không đổi.
  { id: 'rg_banh_phong', name: 'Bánh phồng (bịch)', region: 'Nam', category: 'dry', buy: 54000, sell: 92000, color: 0xd48c5a, unlock: 48 },
  { id: 'rg_hat_dieu', name: 'Hạt điều Bình Phước (bịch)', region: 'Nam', category: 'dry', buy: 48000, sell: 81600, color: 0x8d6e63, unlock: 50 },
  // ── Tây Nguyên ──
  { id: 'rg_kho_bo', name: 'Khô bò (gói)', region: 'Tây Nguyên', category: 'dry', buy: 62000, sell: 106000, color: 0xb03a2e, unlock: 50 },
  { id: 'rg_mac_khen', name: 'Mắc khén (gói)', region: 'Tây Nguyên', category: 'dry', buy: 58000, sell: 98600, color: 0x6d4c41, unlock: 52 },
  // GĐ2211–2212: mở rộng mối lái vùng (hướng 2 GĐ1076 "nhập hàng NGOÀI tạp hóa") — 2 đặc sản thật, miễn trùng.
  // Biên chuẩn ×1.70 như GĐ1321, unlock 54/55 > mốc golden sim 30 (mọi mốc gold chặt ở L30) → sim/autoplay không đổi.
  // Khớp bất biến regionFlags GĐ1505: mỗi miền ≥2 loại, sell trong [1.6,1.8]×buy, unlock ≥42.
  // Bắc: Bánh cốm (gói) — cốm khô ép thành bánh thật (làng Vòng mùa thu), khác hẳn Cốm làng Vòng (thóc cốm tươi, rg_com_lang).
  { id: 'rg_banh_com', name: 'Bánh cốm (gói)', region: 'Bắc', category: 'dry', buy: 42000, sell: 71400, color: 0x9ac84b, unlock: 55 },
  // Trung: Kẹo cu đơ (gói) — đặc sản Nghệ An–Hà Tĩnh: đậu phộng + vừng + mật + gừng, kẹp bánh tráng nướng.
  { id: 'rg_keo_cu_do', name: 'Kẹo cu đơ (gói)', region: 'Trung', category: 'dry', buy: 40000, sell: 68000, color: 0xc0703a, unlock: 54 },
];

export const REGION_IDS: ReadonlySet<string> = new Set(REGION_PRODUCTS.map((h) => h.id));
