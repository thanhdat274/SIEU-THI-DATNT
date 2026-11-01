/**
 * Nâng cấp thiết bị của tiệm, mua một lần là có vĩnh viễn — chỗ đốt tiền cho cuối game.
 * Hiệu ứng được áp ở chỗ dùng: camera ở khách trộm (agents/customers), máy POS ở tốc độ tính tiền (main).
 */
import type { BizState } from './biz';
import { NIGHT_UPGRADE_PRICE, NIGHT_UNLOCK } from './night';

export type UpgradeId = 'camera' | 'pos' | 'maintenance' | 'night';

export interface UpgradeDef {
  id: UpgradeId;
  icon: string;
  name: string;
  desc: string;
  price: number;
  unlock: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'camera', icon: '📹', name: 'Camera an ninh', price: 800000, unlock: 15,
    desc: 'Quét dọc quầy: bắt được trộm cả khi không ai đứng quầy, và kẻ gian né tiệm có camera (ít trộm hơn 30%).',
  },
  {
    id: 'maintenance', icon: '🔧', name: 'Hợp đồng bảo trì', price: 1800000, unlock: 18,
    desc: 'Thợ ghé mỗi sáng: kệ mòn được bảo trì miễn phí, kệ hỏng qua đêm sửa ngay với NỬA giá — không còn sáng nào lụi hụi đi sửa kệ.',
  },
  {
    id: 'pos', icon: '🖥️', name: 'Máy POS quét mã', price: 1500000, unlock: 20,
    desc: 'Quét mã tự động ở mọi quầy: tính tiền nhanh hơn 50%, khách chờ ít đi.',
  },
  {
    id: 'night', icon: '🌙', name: 'Mở ca đêm 24h', price: NIGHT_UPGRADE_PRICE, unlock: NIGHT_UNLOCK,
    desc: 'Tiệm mở cửa qua đêm: khách thưa nhưng giờ nào cũng có doanh thu, bán được đắt hơn buổi ngày (+15%). Đổi lại trộm hoạt động gấp đôi, nhân viên ca đêm đòi lương ×1.5, và ngủ sau nửa đêm thì hôm sau dậy trễ, mất buổi sáng đông khách.',
  },
];

export const upgradeById = (id: string) => UPGRADES.find((u) => u.id === id);

/** Tiệm đã mua nâng cấp nào đó chưa (save cũ không có mảng này thì coi như chưa). */
export const hasUpgrade = (b: BizState | undefined, id: UpgradeId) => !!b?.upgrades?.includes(id);
