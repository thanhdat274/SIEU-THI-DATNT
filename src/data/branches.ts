import { COOKED_PRODUCT_IDS } from './recipes';
import { productById } from './products';
import type { FurnitureType } from './furniture';
import { SHIFTS, type Shift, type Staff, type StaffRole } from './staff';

/** Cửa hàng tiện lợi 24/7: chi nhánh xa tiệm chính, chủ không đứng bán, nhân viên lo hết. */
export const CONVENIENCE = {
  name: 'Cửa hàng tiện lợi 24/7',
  /** Cấp mở khóa. */
  unlock: 10,
  /** Mua đứt mặt bằng + sửa sang (trả một lần, sở hữu luôn — không có tiền thuê hàng ngày). */
  openCost: 5_000_000,
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
  /** Ngày đã nhắc kho chung sắp cạn (nhắc một lần mỗi tối). */
  warnedDay?: number;
  /** Mức mệt của từng nhân viên (0–100). */
  fatigue?: Record<number, number>;
  /** Nhân viên được nghỉ (id → ngày nghỉ). */
  restDay?: Record<number, number>;
  /** Doanh thu từng giờ hôm nay (0–23). */
  hourly?: number[];
  /** Sự kiện đêm nay. */
  event?: BranchEvent | null;
  /** Ngày đã tung sự kiện đêm. */
  eventDay?: number;
  /** Quầy bị khách say quậy, tạm ngưng bán tới phút này. */
  blockedUntil?: number;
}

export interface BranchEvent {
  kind: 'drunk' | 'blackout' | 'calloff';
  /** Phút xảy ra (theo đồng hồ ngày hiện tại, có thể quá 1440). */
  at: number;
  /** Nhân viên xin nghỉ (calloff). */
  staffId?: number;
  /** Đã gọi người làm thay. */
  covered?: boolean;
  done?: boolean;
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
export const BRANCH_ROLES: StaffRole[] = ['cashier', 'stocker', 'courier', 'guard', 'manager'];
/** Xác suất mỗi 10 phút ban đêm có kẻ trộm ghé. */
export const BRANCH_NIGHT_THEFT = 0.05;

/** Bán 24/7 nên chi nhánh chia 3 ca nối nhau, mỗi ca 8 tiếng. */
export const BRANCH_SHIFTS: Shift[] = ['morning', 'afternoon', 'night'];
export const BRANCH_SHIFT_NAME: Record<string, string> = { morning: 'Ca sáng 6h–14h', afternoon: 'Ca chiều 14h–22h', night: 'Ca đêm 22h–6h (×1.5 lương)' };
/** Giờ nhắc kho chung trước đêm. */
export const STOCK_WARN_AT = 20 * 60;

/** Số món chi nhánh ước bán từ 22h tới 6h sáng (khách đêm × ~1.5 món). */
export function nightNeed() {
  let n = 0;
  for (let h = 22; h < 30; h++) n += branchTrafficAt(h * 60) * 1.5;
  return Math.round(n);
}

// ── Sự kiện đêm ──
/** Giờ tung sự kiện đêm (một lần mỗi tối). */
export const EVENT_ROLL_AT = 21 * 60;
/** Xác suất mỗi đêm: nhân viên ca đêm xin nghỉ, khách say quậy, mất điện. */
export const EVENT_CHANCE = { calloff: 0.12, drunk: 0.12, blackout: 0.07 };
/** Khách say quậy mà không có bảo vệ: mất tiền đền đồ, quầy ngưng bán một lúc. */
export const DRUNK_DAMAGE = 300_000;
export const DRUNK_BLOCK = 60;
/** Gọi người làm thay ca: trả gấp đôi lương ca. */
export const COVER_WAGE_MUL = 2;
/** Mất điện: hàng mát, đông lạnh, tươi sống, đồ nóng trên kệ hỏng mất phần này. */
export const BLACKOUT_LOSS = 0.6;
export const spoilsInBlackout = (id: string) => COOKED_PRODUCT_IDS.has(id) || ['cold', 'frozen', 'fresh'].includes(productById(id).category);

// ── Tinh thần nhân viên ──
/** Mệt thêm mỗi ngày theo ca; nghỉ một ngày thì hồi hết. */
export const FATIGUE_PER_DAY: Record<Shift, number> = { morning: 8, afternoon: 8, full: 15, night: 22 };
/** Mệt từ mức này: bán chậm, khách bỏ về nhiều hơn. */
export const FATIGUE_SLOW = 70;
/** Mệt từ mức này: mỗi đêm có thể xin nghỉ việc. */
export const FATIGUE_QUIT = 90;
export const QUIT_CHANCE = 0.3;
/** Thu ngân mệt: mỗi khách có xác suất này bỏ về vì chờ lâu. */
export const TIRED_MISS = 0.25;
/** Thưởng nóng: tốn một ngày lương, giảm mệt từng này. */
export const BONUS_RELIEF = 35;
export const fatigueOf = (b: BranchState, id: number) => b.fatigue?.[id] ?? 0;
/** Nhân viên đang nghỉ hôm nay. */
export const restingOn = (b: BranchState, id: number, day: number) => b.restDay?.[id] === day;

// ── Quản lý cửa hàng ──
/** Có quản lý thì kệ vơi dưới tỉ lệ này là tự gọi xe, không cần chờ người giao hàng. */
export const MANAGER_REFILL_BELOW = 0.5;

/** Quản lý xếp ca: thu ngân xoay sáng → chiều → đêm (ai ít mệt nhận ca đêm), bảo vệ ưu tiên ca đêm. */
export function autoSchedule(staff: Staff[], fatigue: Record<number, number>): Staff[] {
  const plan = (role: StaffRole, shifts: Shift[]) => {
    const list = staff.filter((s) => s.role === role).sort((a, b) => (fatigue[a.id] ?? 0) - (fatigue[b.id] ?? 0));
    return new Map(list.map((s, i) => [s.id, shifts[i % shifts.length]]));
  };
  const maps = [
    plan('cashier', ['night', 'morning', 'afternoon']),
    plan('guard', ['night', 'morning', 'afternoon']),
    plan('stocker', ['morning', 'afternoon', 'night']),
    plan('courier', ['afternoon', 'morning', 'night']),
  ];
  return staff.map((s) => ({ ...s, shift: maps.map((m) => m.get(s.id)).find(Boolean) ?? s.shift }));
}

// ── Hàng tiện lợi ──
/** Món khách đêm hay mua ở tiện lợi (mì ly, nước tăng lực, bao cao su, thuốc cảm, cơm nắm...). */
const NIGHT_ITEMS = new Set(['mi', 'nuoc', 'x_mi_ly_tp', 'x_sting_dau', 'x_sting_nhan_sam', 'x_redbull_lon', 'x_bao_cao_su', 'x_thuoc_cam', 'x_com_nam', 'x_xuc_xich_nuong_tp']);
export const isNightItem = (id: string) => NIGHT_ITEMS.has(id);
/** Đồ nóng nấu ở bếp tiệm chính, chở sang bán đắt hơn. */
export const isHotFood = (id: string) => COOKED_PRODUCT_IDS.has(id);
export const HOT_FOOD_MUL = 1.3;
/** Trọng số khách chọn món: đêm ưu tiên món đêm, đồ nóng lúc nào cũng hút khách. */
export const itemWeight = (id: string, minute: number) => (isHotFood(id) ? 2.5 : 1) * (isBranchNight(minute) && isNightItem(id) ? 3 : 1);
/** Chọn ngẫu nhiên một món theo trọng số. */
export function pickWeighted(ids: string[], minute: number): string {
  const w = ids.map((id) => itemWeight(id, minute));
  let r = Math.random() * w.reduce((n, x) => n + x, 0);
  for (let i = 0; i < ids.length; i++) if ((r -= w[i]) <= 0) return ids[i];
  return ids[ids.length - 1];
}

/**
 * Bố trí cố định trong cửa hàng tiện lợi (toạ độ tính từ tâm tòa nhà, mặt tiền ở +z, cửa ở x = 0).
 * rot giống tiệm chính: 0 = mặt kệ nhìn ra +z (phía cửa), 2 = nhìn vào trong.
 */
export const BRANCH_LAYOUT: { type: FurnitureType; x: number; z: number; rot: number }[] = [
  { type: 'checkout', x: -5.6, z: 2.1, rot: 0 },
  // Dãy kệ siêu thị hai mặt giữa tiệm
  { type: 'bigShelf', x: 1.4, z: 0.6, rot: 0 }, { type: 'bigShelf', x: 4.0, z: 0.6, rot: 0 }, { type: 'bigShelf', x: 6.6, z: 0.6, rot: 0 },
  { type: 'bigShelf', x: 1.4, z: -0.05, rot: 2 }, { type: 'bigShelf', x: 4.0, z: -0.05, rot: 2 }, { type: 'bigShelf', x: 6.6, z: -0.05, rot: 2 },
  // Tủ mát dọc tường sau, tủ đông gần quầy
  { type: 'fridge', x: 0.2, z: -4.3, rot: 0 }, { type: 'fridge', x: 1.5, z: -4.3, rot: 0 }, { type: 'fridge', x: 2.8, z: -4.3, rot: 0 },
  { type: 'fridge', x: 4.1, z: -4.3, rot: 0 }, { type: 'fridge', x: 5.4, z: -4.3, rot: 0 }, { type: 'fridge', x: 6.7, z: -4.3, rot: 0 },
  { type: 'freezer', x: -5.9, z: -3.9, rot: 0 }, { type: 'freezer', x: -4.1, z: -3.9, rot: 0 },
  { type: 'bigShelf', x: -6.5, z: -1.2, rot: 1 },
];
