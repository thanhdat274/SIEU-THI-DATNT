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
];

export const HOMEMADE_IDS: ReadonlySet<string> = new Set(HOMEMADE_PRODUCTS.map((h) => h.id));
