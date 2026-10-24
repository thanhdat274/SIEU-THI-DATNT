import { SHIFTS, type Staff, type StaffRole } from './staff';

/** Cửa hàng tiện lợi 24/7: chi nhánh xa tiệm chính, chủ không đứng bán, nhân viên lo hết. */
export const CONVENIENCE = {
  name: 'Cửa hàng tiện lợi 24/7',
  /** Cấp mở khóa. */
  unlock: 10,
  /** Tiền cọc mặt bằng + sửa sang (trả một lần). */
  openCost: 12_000_000,
  /** Tiền thuê mặt bằng mỗi ngày (mặt bằng rộng cố định). */
  rent: 350_000,
  /** Mặt bằng cố định (m). */
  width: 16,
  depth: 10,
  /** Tâm tòa nhà: cuối bản đồ, mặt tiền nhìn ra con đường thứ hai (ROAD2_Z). */
  x: 60,
  z: -64,
  /** Tổng số món kệ chứa được — nhiều để bán xuyên đêm. */
  shelfCap: 900,
  /** Mỗi món bày tối đa từng này. */
  perItem: 40,
  /** Giá bán so với tiệm chính (tiện lợi bán đắt hơn chút). */
  priceMul: 1.1,
  /** Số nhân viên tối đa ở chi nhánh. */
  maxStaff: 8,
  /** Phí xăng mỗi chuyến xe chở hàng từ kho chung. */
  tripFee: 15_000,
  /** Mỗi bao nhiêu phút xe chở hàng một chuyến (khi có người giao/xếp hàng trực). */
  tripEvery: 120,
};

/** Đường thứ hai (chạy theo x tại z = ROAD2_Z), không chung đường với tiệm chính; nối với đường chính bằng hẻm dọc ở x = LANE_X. */
export const ROAD2_Z = -56;
export const LANE_X = 50;

/** Khách mỗi giờ theo giờ trong ngày (0–23): đêm vẫn có khách, ít hơn ban ngày. */
const HOURLY = [8, 6, 5, 4, 4, 6, 12, 18, 16, 14, 14, 18, 20, 16, 14, 14, 16, 20, 22, 22, 20, 18, 14, 10];
export const branchTrafficAt = (minute: number) => HOURLY[Math.floor(((minute % 1440) + 1440) % 1440 / 60)];
/** Giờ đêm (22h–6h): không có bảo vệ thì dễ mất trộm. */
export const isBranchNight = (minute: number) => { const m = ((minute % 1440) + 1440) % 1440; return m >= 22 * 60 || m < 6 * 60; };

export interface BranchState {
  open: boolean;
  /** Hàng đang bày ở chi nhánh. */
  shelf: Record<string, number>;
  staff: Staff[];
  /** Mốc phút đã mô phỏng tới (theo đồng hồ ngày hiện tại). */
  simAt: number;
  /** Phút chuyến xe gần nhất. */
  lastTrip: number;
  revenueToday: number;
  customersToday: number;
  lostToday: number;
  /** Khách tới mà quầy không ai trực / hết hàng. */
  missedToday: number;
}

export const newBranch = (): BranchState => ({
  open: false, shelf: {}, staff: [], simAt: 0, lastTrip: -999, revenueToday: 0, customersToday: 0, lostToday: 0, missedToday: 0,
});

/** Nhân viên `st` có trong ca lúc `minute` không (ca đêm nối qua nửa đêm). */
export function onShift(st: Staff, minute: number) {
  const m = ((minute % 1440) + 1440) % 1440;
  const sh = SHIFTS[st.shift];
  return (m >= sh.from && m < sh.to) || (m + 1440 >= sh.from && m + 1440 < sh.to);
}

/** Giờ trong ngày chưa có thu ngân trực (để nhắc chủ thuê thêm). */
export function uncoveredHours(staff: Staff[]): number[] {
  const cashiers = staff.filter((s) => s.role === 'cashier');
  const out: number[] = [];
  for (let h = 0; h < 24; h++) if (!cashiers.some((c) => onShift(c, h * 60 + 30))) out.push(h);
  return out;
}

export const shelfTotal = (shelf: Record<string, number>) => Object.values(shelf).reduce((n, q) => n + q, 0);

/** Vai trò chi nhánh cần: thu ngân, xếp hàng, giao hàng (chở hàng từ kho chung), bảo vệ. */
export const BRANCH_ROLES: StaffRole[] = ['cashier', 'stocker', 'courier', 'guard'];
/** Xác suất mỗi 10 phút ban đêm có kẻ trộm ghé. */
export const BRANCH_NIGHT_THEFT = 0.05;
