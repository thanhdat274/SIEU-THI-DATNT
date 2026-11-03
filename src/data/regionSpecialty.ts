import type { Category } from './products';

/**
 * GĐ1086: ĐẶC SẢN VÙNG — nguồn cung "ngoài tạp hóa" (hướng GĐ1076/2 "cơ chế nhập hàng NGOÀI tạp hóa để đa dạng
 * hàng bán"). Mối lái vùng xa (`dacsan` trong suppliers.ts) mang đặc sản miền không có ở mối thông thường, giúp
 * người chơi đa dạng hoá giỏ hàng cuối game. KHÁC hàng xóm: các món này LÀ hàng hoá thường — được khách/đơn
 * online/điện thoại/chợ phiên đòi mua bình thường (KHÔNG lọc khỏi bể cầu), chỉ là KHÔNG nhập được ở mối chuẩn
 * nào ngoài mối lái (`supplierSells` loại ở các mối khác). Mở cấp ≥42 > mọi mốc sim chặt (golden L30) nên
 * không đổi RNG mốc. Chỉ dữ liệu; save không đổi (món chỉ xuất hiện khi người chơi nhập từ mối lái).
 */
export const REGION_PRODUCTS: { id: string; name: string; category: Category; buy: number; sell: number; color: number; unlock: number }[] = [
  { id: 'rg_kho_tom', name: 'Khô tôm đặc sản (gói)', category: 'dry', buy: 42000, sell: 72000, color: 0xc9a227, unlock: 42 },
  { id: 'rg_lap_xuong', name: 'Lạp xưởng miền (cây)', category: 'dry', buy: 46000, sell: 78000, color: 0xa5462a, unlock: 44 },
  { id: 'rg_banh_pia', name: 'Bánh pía (hộp)', category: 'dry', buy: 52000, sell: 88000, color: 0xe67e22, unlock: 46 },
];

export const REGION_IDS: ReadonlySet<string> = new Set(REGION_PRODUCTS.map((h) => h.id));
