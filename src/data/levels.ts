import { FURNITURE } from './furniture';
import { GARDEN_UNLOCK, LAND_TIERS } from './garden';
import { PAYMENTS } from './payments';
import { PRODUCTS } from './products';
import { QUAN_NUOC_UNLOCK } from './quanNuoc';
import { SHOP_TIERS } from './shopTiers';

export const MAX_LEVEL = 200;

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

/** Danh hiệu mốc cấp cuối game (100–200): hiện trong lộ trình cấp, khớp thành tựu level_N ở bizAchievements. */
export const LEVEL_TITLES: Record<number, string> = {
  110: '🥇 Ông trùm chợ phường',
  120: '🏯 Vua tạp hóa quận',
  130: '🚀 Đế chế bán lẻ',
  140: '🌏 Thương hiệu toàn thành',
  150: '💎 Huyền thoại kim cương',
  160: '🗺️ Chuỗi cửa hàng liên tỉnh',
  170: '🏛️ Tượng đài thương nghiệp',
  180: '🌠 Ngôi sao Bắc Nam',
  190: '🔱 Bất tử phố thị',
  200: '👑 Thánh tạp hóa',
};

/** Một nhóm mở khóa ở một cấp, để gom bớt khi cấp mở quá nhiều (SPEC-TOI-UU T3-L5). */
export interface UnlockGroup { label: string; icon: string; items: string[] }

/** Các nhóm thứ mở khóa ở một cấp, giữ thứ tự ổn định. */
export function unlockGroups(level: number): UnlockGroup[] {
  const groups: UnlockGroup[] = [];
  const push = (label: string, icon: string, items: string[]) => {
    if (items.length) groups.push({ label, icon, items });
  };
  push('Món mới', '🛒', PRODUCTS.filter((p) => p.unlock === level).map((p) => p.name));
  push('Đồ nội thất', '🪑', FURNITURE.filter((f) => f.unlock === level && level > 1).map((f) => f.name));
  push('Mở rộng tiệm', '🏬', SHOP_TIERS.filter((t) => t.unlock === level && level > 1).map((t) => t.name));
  push('Tính năng', '✨', (Object.keys(FEATURES) as (keyof typeof FEATURES)[])
    .filter((k) => FEATURES[k] === level)
    .map((k) => FEATURE_NAMES[k]));
  push('Trang trại', '🚜', level === GARDEN_UNLOCK ? ['Trang trại đầu ngõ: trồng rau, nuôi gà lấy trứng'] : []);
  push('Mở rộng trang trại', '🌱', LAND_TIERS.filter((t, i) => i > 0 && t.unlock === level).map((t) => t.name));
  push('Thanh toán', '💳', PAYMENTS.filter((p) => p.unlock === level && level > 1).map((p) => `${p.icon} Thanh toán ${p.name}`));
  push('Danh hiệu', '🏅', LEVEL_TITLES[level] ? [`Danh hiệu ${LEVEL_TITLES[level]}`] : []);
  push('Quán nước', '🧋', level === QUAN_NUOC_UNLOCK ? ['Quán Nước Đầu Ngõ: xây quán nước ở đầu hẻm, nguyên liệu lấy từ kho'] : []);
  return groups;
}

/** Danh sách thứ mở khóa ở một cấp, để báo cho người chơi (mảng phẳng, giữ thứ tự nhóm). */
export function unlocksAt(level: number): string[] {
  return unlockGroups(level).flatMap((g) => g.items);
}
