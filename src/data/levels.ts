import { FURNITURE } from './furniture';
import { GARDEN_UNLOCK, LAND_TIERS } from './garden';
import { PAYMENTS } from './payments';
import { PRODUCTS } from './products';
import { QUAN_NUOC_UNLOCK } from './quanNuoc';
import { SHOP_TIERS } from './shopTiers';

export const MAX_LEVEL = 100;

/** Tính năng mở khóa theo cấp. */
export const FEATURES = {
  prices: 3,
  staff: 4,
  impulse: 6,
  basket: 12,
} as const;

const FEATURE_NAMES: Record<keyof typeof FEATURES, string> = {
  prices: 'Bảng giá (tự chỉnh giá bán)',
  staff: 'Thuê nhân viên',
  impulse: 'Kệ hàng chớp nhoáng: khách xếp hàng mua kẹp thêm món nhỏ cạnh quầy thu ngân',
  basket: 'Giỏ xách cho khách (mua tối đa 4 món)',
};

/** XP cần để lên cấp tiếp theo (cấp 5 vào khoảng ngày 6–7). */
export const xpToNext = (level: number) => Math.round(35 * Math.pow(level, 1.25));

/** Số khách ghé tiệm mỗi ngày (trung bình). */
export const customersPerDay = (level: number) => 20 + level * 4;

/** Danh sách thứ mở khóa ở một cấp, để báo cho người chơi. */
export function unlocksAt(level: number): string[] {
  return [
    ...PRODUCTS.filter((p) => p.unlock === level).map((p) => p.name),
    ...FURNITURE.filter((f) => f.unlock === level && level > 1).map((f) => f.name),
    ...SHOP_TIERS.filter((t) => t.unlock === level && level > 1).map((t) => `Mở rộng tiệm: ${t.name}`),
    ...(Object.keys(FEATURES) as (keyof typeof FEATURES)[])
      .filter((k) => FEATURES[k] === level)
      .map((k) => FEATURE_NAMES[k]),
    ...(level === GARDEN_UNLOCK ? ['🚜 Trang trại đầu ngõ: trồng rau, nuôi gà lấy trứng'] : []),
    ...LAND_TIERS.filter((t, i) => i > 0 && t.unlock === level).map((t) => `Mở rộng trang trại: ${t.name}`),
    ...PAYMENTS.filter((p) => p.unlock === level && level > 1).map((p) => `${p.icon} Thanh toán ${p.name}`),
    ...(level === QUAN_NUOC_UNLOCK ? ['🧋 Quán Nước Đầu Ngõ: xây quán nước ở đầu hẻm, nguyên liệu lấy từ kho'] : []),
  ];
}
