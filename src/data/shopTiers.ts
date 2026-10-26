/** Các mốc mở rộng tiệm: tiệm nhỏ → siêu thị. */
export interface ShopTier {
  name: string;
  width: number;
  depth: number;
  unlock: number;
  price: number;
}

export const SHOP_TIERS: ShopTier[] = [
  // Chỉ nới chiều ngang khi cân lại: chiều sâu đổi sẽ làm lệch đồ đã đặt trong bản lưu cũ.
  // Bậc mở dày ở cấp 6–30 để tiền có chỗ tiêu (kệ, tủ đông, quầy phụ, trạm nấu đều cần mặt bằng).
  { name: 'Tiệm nhỏ đầu ngõ', width: 8, depth: 5, unlock: 1, price: 0 },
  { name: 'Tiệm nới rộng', width: 10, depth: 6, unlock: 6, price: 500000 },
  { name: 'Tạp hóa lớn', width: 12, depth: 8, unlock: 13, price: 2500000 },
  { name: 'Mini mart', width: 15, depth: 10, unlock: 30, price: 7000000 },
  { name: 'Siêu thị tạp hóa', width: 18, depth: 12, unlock: 45, price: 16000000 },
];

/** Mặt tiền tiệm luôn nằm ở z này (sát vỉa hè); tiệm mở rộng về phía sau. */
export const SHOP_FRONT_Z = 1;
export const SHOP_CENTER_X = 4;

/**
 * Tiền nhà mỗi ngày theo bậc tiệm: chi phí cố định tạo áp lực tối ưu mặt bằng.
 * Nhẹ ở tiệm nhỏ, đáng kể khi lên siêu thị (20k → 50k → 140k → 290k → 500k).
 */
export const rentOf = (tier: number) => 20000 + tier * tier * 30000;

/**
 * Chi phí vận hành theo doanh thu (điện, nước, bảo trì): % doanh thu mỗi ngày, trừ ở bảng tổng kết.
 * Nhỏ ở doanh thu thấp, nhưng lớn dần theo quy mô — để cuối game tiền vào không vượt xa tiền ra
 * (tiền thuê là chi phí cố định duy nhất trước đây nên siêu thị dễ "tràn tiền").
 */
export const OPERATING_REVENUE_RATE = 0.02;

export interface Swatch {
  name: string;
  color: number;
}

export const WALL_COLORS: Swatch[] = [
  { name: 'Vàng kem', color: 0xfff3b0 },
  { name: 'Trắng', color: 0xf5f5f5 },
  { name: 'Xanh mint', color: 0xb8e6d2 },
  { name: 'Hồng phấn', color: 0xf8c8d0 },
  { name: 'Xanh da trời', color: 0xbcd9f2 },
  { name: 'Gạch đỏ', color: 0xc0604a },
];

export const FLOOR_COLORS: Swatch[] = [
  { name: 'Gạch be', color: 0xd8cfc0 },
  { name: 'Sàn gỗ', color: 0xa9744f },
  { name: 'Gạch xám', color: 0x9aa0a6 },
  { name: 'Gạch trắng', color: 0xeeeeee },
  { name: 'Gạch xanh', color: 0x7fb3a8 },
];

export const ROOF_COLORS: Swatch[] = [
  { name: 'Xanh lá', color: 0x1e8449 },
  { name: 'Đỏ ngói', color: 0xb03a2e },
  { name: 'Xanh dương', color: 0x2e86c1 },
  { name: 'Cam', color: 0xe67e22 },
  { name: 'Xám', color: 0x566573 },
];

export const PAINT_PRICE = 50000;

export interface ShopStyle {
  wall: number;
  floor: number;
  roof: number;
}
