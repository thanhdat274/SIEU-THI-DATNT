import { StaffRole, StaffShift, STAFF_SHIFTS } from '@game/shared';
import { STAFF_SLOT_MILESTONES, staffSlotsAtLevel } from './progression';

export const STAFF_SLOTS_BY_LEVEL: Record<number, number> = { ...STAFF_SLOT_MILESTONES };

export const DEFAULT_HIRING_FEE = 50000;

export function getMaxStaffSlots(playerLevel: number): number {
  return staffSlotsAtLevel(playerLevel);
}

export interface RoleInfo {
  id: StaffRole;
  label: string;
  icon: string;
  description: string;
  primaryStat: 'accuracy' | 'speed';
}

export const STAFF_ROLE_INFO: Record<StaffRole, RoleInfo> = {
  cashier: {
    id: 'cashier',
    label: 'Thu ngân',
    icon: '🧾',
    description: 'Thanh toán hoá đơn tại quầy cho khách',
    primaryStat: 'accuracy',
  },
  refill: {
    id: 'refill',
    label: 'Bổ sung kệ',
    icon: '🧺',
    description: 'Vận chuyển hàng từ nhà kho châm vào kệ trưng bày',
    primaryStat: 'speed',
  },
  security: {
    id: 'security',
    label: 'Bảo vệ xe',
    icon: '🛵',
    description: 'Trông giữ xe bãi đỗ vỉa hè, giúp khách đi xe máy yên tâm mua sắm và tăng độ hài lòng',
    primaryStat: 'speed',
  },
};

export const CANDIDATE_NAMES: string[] = [
  'Anh Tuấn',
  'Chị Hằng',
  'Bé Ngọc',
  'Anh Khoa',
  'Chị Thảo',
  'Anh Phúc',
  'Cô Mai',
  'Anh Dũng',
  'Chị Vy',
  'Bé Hân',
  'Anh Long',
  'Chị Trang',
  'Anh Nam',
  'Chị Yến',
  'Anh Hiếu',
  'Chị My',
  'Chú Bình',
  'Cô Hoa',
  'Anh Minh',
  'Chị Linh',
  'Bé Trâm',
  'Anh Quân',
  'Chị Ngân',
  'Anh Huy',
];

export function isShiftWithinStoreHours(shift: StaffShift): boolean {
  const cfg = STAFF_SHIFTS[shift];
  return cfg !== undefined && cfg.startHour >= 6 && cfg.endHour <= 22;
}
