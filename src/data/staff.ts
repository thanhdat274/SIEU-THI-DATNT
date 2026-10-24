import type { CharacterArchetype } from '../render/characterModel';

export type StaffRole = 'cashier' | 'stocker' | 'cleaner' | 'courier' | 'guard' | 'manager' | 'bartender' | 'cook' | 'warehouse_mgr' | 'customer_care';
export type Shift = 'morning' | 'afternoon' | 'full' | 'night';

export interface RoleDef {
  name: string;
  icon: string;
  color: number;
  desc: string;
  /** Cấp mở khóa vai trò. */
  unlock: number;
  /** Lương mỗi ca nhân với hệ số này. */
  wageMul: number;
  /** Ngoại hình riêng; bỏ trống = theo thu ngân/xếp hàng. */
  archetype?: CharacterArchetype;
}

export const ROLES: Record<StaffRole, RoleDef> = {
  cashier: { name: 'Thu ngân', icon: '🧾', color: 0xc0392b, unlock: 4, wageMul: 1, desc: 'Đứng quầy tính tiền, tự mở cửa khi vào ca' },
  stocker: { name: 'Xếp hàng', icon: '📦', color: 0x16a085, unlock: 4, wageMul: 1, desc: 'Lấy hàng trong kho bày lên kệ khi kệ vơi' },
  cleaner: { name: 'Lao công', icon: '🧹', color: 0x8e44ad, unlock: 6, wageMul: 0.8, archetype: 'elder_woman', desc: 'Lau dọn chỗ bẩn; tiệm sạch thì khách ghé nhiều hơn' },
  courier: { name: 'Giao hàng', icon: '🛵', color: 0x00a651, unlock: 4, wageMul: 1.1, archetype: 'shipper', desc: 'Thuê để mở chế độ hàng xóm gọi điện đặt hàng giao tận nhà; tự chở đơn khách gọi điện và đơn tiệc đã nhận đi giao' },
  guard: { name: 'Bảo vệ', icon: '💂', color: 0x4b6043, unlock: 15, wageMul: 1.2, archetype: 'security_guard', desc: 'Đứng cửa canh trộm, bắt kẻ gian gần như chắc chắn' },
  manager: { name: 'Quản lý', icon: '📋', color: 0x2c3e50, unlock: 22, wageMul: 1.8, archetype: 'gentleman', desc: 'Sáng và trưa kiểm kho, món đã bán qua ít nhất một lần mà sắp hết thì tự đặt nhà cung cấp' },
  // ──────────────────────────────────────────────
  // NHÂN VIÊN MỚI – mở rộng từ 6 lên 10 vai trò
  // ──────────────────────────────────────────────
  bartender: { name: 'Pha chế', icon: '☕', color: 0xe17055, unlock: 18, wageMul: 1, archetype: 'barista', desc: 'Hiện làm phụ việc: bày hàng lên kệ khi kệ vơi (chưa có hiệu ứng riêng)' },
  cook: { name: 'Chế biến thực phẩm', icon: '🍳', color: 0xc0392b, unlock: 25, wageMul: 1.5, archetype: 'chef', desc: 'Đứng bếp ở trạm nấu: các món đang nấu xong nhanh hơn theo tay nghề (1★ không nhanh hơn, 5★ nhanh gấp rưỡi)' },
  warehouse_mgr: { name: 'Quản lý kho', icon: '📦', color: 0x636e72, unlock: 30, wageMul: 1, archetype: 'gentleman', desc: 'Hiện làm phụ việc: bày hàng lên kệ khi kệ vơi (chưa có hiệu ứng riêng)' },
  customer_care: { name: 'Chăm sóc khách', icon: '💬', color: 0x00b894, unlock: 35, wageMul: 1, archetype: 'office_lady', desc: 'Hiện làm phụ việc: bày hàng lên kệ khi kệ vơi (chưa có hiệu ứng riêng)' },
};

export const unlockedRoles = (level: number) => (Object.keys(ROLES) as StaffRole[]).filter((r) => ROLES[r].unlock <= level);

/** Độ bẩn tối đa của tiệm (0 = sạch bóng). */
export const DIRT_MAX = 100;
/** Mỗi lượt khách vào tiệm làm bẩn thêm từng này. */
export const DIRT_PER_VISIT = 1.2;
/** Lượt khách ghé giảm tối đa bao nhiêu khi tiệm bẩn nhất. */
export const DIRT_VISIT_PENALTY = 0.4;
/** Hệ số khách ghé theo độ bẩn. */
export const dirtVisitFactor = (dirt: number) => 1 - (Math.min(dirt, DIRT_MAX) / DIRT_MAX) * DIRT_VISIT_PENALTY;
/** Lao công mỗi lần lau giảm từng này (nhân tốc độ theo sao). */
export const DIRT_PER_SWEEP = 6;
/** Xác suất bắt trộm khi có bảo vệ trực. */
export const GUARD_DETECT = 0.92;
/** Quản lý đặt hàng khi kho còn dưới từng này món. */
export const MANAGER_LOW_STOCK = 6;
/** Quản lý đặt thêm cho đủ từng này món. */
export const MANAGER_TARGET = 24;
/** Giờ quản lý kiểm kho (phút trong ngày). */
export const MANAGER_CHECKS = [7 * 60, 12 * 60];

export const SHIFTS: Record<Shift, { name: string; from: number; to: number; pay: number }> = {
  morning: { name: 'Ca sáng (6h–14h)', from: 6 * 60, to: 14 * 60, pay: 1 },
  // Ca chiều/nguyên ngày kéo tới 22h30 khớp giờ đóng cửa tiệm; còn khách chưa thanh toán thì ở lại dọn nốt
  afternoon: { name: 'Ca chiều (14h–22h30)', from: 14 * 60, to: 22 * 60 + 30, pay: 1 },
  full: { name: 'Cả ngày (6h–22h30)', from: 6 * 60, to: 22 * 60 + 30, pay: 1.6 },
  // Ca đêm nối qua nửa đêm: phút trong ngày chạy tiếp 24h–30h (= 0h–6h hôm sau), lương ×1.5
  night: { name: 'Ca đêm (22h–6h, ×1.5 lương)', from: 22 * 60, to: 30 * 60, pay: 1.5 },
};

export interface Staff {
  id: number;
  name: string;
  role: StaffRole;
  /** 1–5 sao: làm nhanh hơn. */
  skill: number;
  /** Lương một ca (đ). */
  wage: number;
  shift: Shift;
}

/** Lương phải trả mỗi ngày. */
export const dailyWage = (s: Staff) => Math.round(s.wage * SHIFTS[s.shift].pay);

/** Số nhân viên tối đa theo cấp (0 = chưa mở khóa). */
export const maxStaff = (level: number) => (level < 4 ? 0 : Math.min(20, 1 + Math.floor((level - 4) / 3)));

/** Hệ số tốc độ làm việc theo số sao (người chơi = 1). */
export const skillSpeed = (skill: number) => 0.6 + skill * 0.2;

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
const TEN = [
  'An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hùng', 'Lan', 'Linh', 'Minh',
  'Nam', 'Ngọc', 'Phúc', 'Quân', 'Thảo', 'Trang', 'Tuấn', 'Vy', 'Yến', 'Khoa',
];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Ứng viên mới mỗi sáng; cấp càng cao càng có người giỏi. */
export function generateCandidates(level: number, startId: number): Staff[] {
  // Luôn có 1 thu ngân + 1 xếp hàng; các suất còn lại ưu tiên vai trò mới mở
  const extra = unlockedRoles(level).filter((r) => r !== 'cashier' && r !== 'stocker');
  const allRoles = Object.keys(ROLES) as StaffRole[];
  const roles: StaffRole[] = ['cashier', 'stocker'];
  for (let i = 2; i < 6; i++) {
    if (extra.length && Math.random() < 0.75) {
      roles.push(pick(extra));
    } else if (allRoles.length > 2) {
      const otherRoles = allRoles.filter((r) => r !== 'cashier' && r !== 'stocker');
      roles.push(pick(otherRoles));
    }
  }
  return roles.map((role, i) => {
    const skill = Math.min(5, 1 + Math.floor(Math.random() * 3) + Math.floor(level / 15));
    return {
      id: startId + i,
      name: `${pick(HO)} ${pick(TEN)}`,
      role,
      skill,
      wage: Math.round(((8000 + skill * 8000) * ROLES[role].wageMul) / 1000) * 1000 + Math.round(Math.random() * 4) * 2000,
      shift: 'morning',
    };
  });
}
