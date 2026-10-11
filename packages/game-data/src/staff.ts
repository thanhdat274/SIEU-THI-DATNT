import { StaffRole, StaffShift, StaffSpecialty, STAFF_SHIFTS } from '@game/shared';
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
  drink_staff: {
    id: 'drink_staff',
    label: 'Nhân viên quán nước',
    icon: '🍹',
    description: 'Phụ trách quán nước, hỗ trợ nấu nước, châm hàng và bảo trì quán',
    primaryStat: 'speed',
  },
  drink_security: {
    id: 'drink_security',
    label: 'Bảo vệ quán nước',
    icon: '🔒',
    description: 'Bảo vệ riêng quán nước, chống trộm cắp và hỗ trợ an ninh khu vực',
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

export interface StaffSpecialtyInfo {
  id: StaffSpecialty;
  label: string;
  icon: string;
  description: string;
  roles: readonly StaffRole[];
  /** Nhân với thời gian phục vụ một khách tại quầy (nhỏ hơn 1 = nhanh hơn). */
  checkoutTimeFactor?: number;
  /** Cộng vào chỉ số chính xác khi soi tiền giả. */
  detectAccuracyBonus?: number;
  /** Nhân với tốc độ di chuyển khi làm việc. */
  moveSpeedFactor?: number;
  /** Phụ phí lương mỗi ngày cho chuyên môn. */
  wageBonus: number;
}

export const STAFF_SPECIALTIES: Record<StaffSpecialty, StaffSpecialtyInfo> = {
  quick_hands: { id: 'quick_hands', label: 'Tay nhanh', icon: '⚡', description: 'Tính tiền nhanh hơn 20%, hàng khách không phải chờ lâu.', roles: ['cashier'], checkoutTimeFactor: 0.8, wageBonus: 5000 },
  sharp_eye: { id: 'sharp_eye', label: 'Mắt tinh', icon: '👁', description: 'Soi tiền giả tốt hơn hẳn người thường.', roles: ['cashier'], detectAccuracyBonus: 3, wageBonus: 5000 },
  swift_legs: { id: 'swift_legs', label: 'Chân nhanh', icon: '👟', description: 'Di chuyển bổ sung kệ nhanh hơn 25%.', roles: ['refill', 'drink_staff'], moveSpeedFactor: 1.25, wageBonus: 5000 },
  patrol_ace: { id: 'patrol_ace', label: 'Tuần tra giỏi', icon: '🔦', description: 'Đi tuần nhanh hơn 30%, phủ được nhiều khu hơn.', roles: ['security', 'drink_security'], moveSpeedFactor: 1.3, wageBonus: 5000 },
};

export const STAFF_SPECIALTY_IDS = Object.keys(STAFF_SPECIALTIES) as StaffSpecialty[];

export function staffSpecialtyInfo(member: { specialty?: StaffSpecialty }): StaffSpecialtyInfo | undefined {
  return member.specialty ? STAFF_SPECIALTIES[member.specialty] : undefined;
}
