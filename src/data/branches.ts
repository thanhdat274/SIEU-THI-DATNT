import { isWeekend } from './calendar';
import { COOKED_PRODUCT_IDS } from './recipes';
import { productById } from './products';
import type { FurnitureType } from './furniture';
import { SHIFTS, type Shift, type Staff, type StaffRole } from './staff';
import { isAlcohol } from './licenses';
import { CHIEF_COVER_MUL } from './careers';
import { simRng } from '../core/rand';

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

/**
 * Trạng thái hình ảnh của cửa hàng tiện lợi trong thế giới 3D (GĐ26) — cho khớp "chủ sở hữu":
 * cạnh quan trọng là không để một tiệm 24/7 mở sẵn trông hệt hệt dù người chơi chưa mua mặt bằng.
 *  - `hidden`: dưới cấp mở — chưa thấy gì.
 *  - `lot`   : đủ cấp mà chưa mua — mảnh đất trống rao bán.
 *  - `closed`: đã mua, đang đóng cửa — toà nhà hiện nhưng biển "ĐÓNG CỬA".
 *  - `open`  : đang mở — toà nhà + biển "MỞ CỬA 24/7" phát sáng.
 */
export type BranchStandState = 'hidden' | 'lot' | 'closed' | 'open';
export function branchStandState(level: number, bought: boolean, open: boolean): BranchStandState {
  if (open) return 'open';
  if (bought) return 'closed';
  if (level >= CONVENIENCE.unlock) return 'lot';
  return 'hidden';
}

/**
 * Khách mỗi giờ theo giờ trong ngày (0–23): đêm vẫn có khách, ít hơn ban ngày.
 * Tổng ~88 khách/ngày (chi nhánh xa tiệm chính, vắng hơn hẳn hẻm): cân bằng để lãi ròng chi nhánh
 * chiếm ~30–45% lãi ròng tổng ở cận cấp 26–40 — đáng đầu tư nhưng không lấn át tiệm chính
 * (bot playtest cũ 331 khách/ngày cho ~82% lãi ròng tổng dù doanh thu thô chỉ ~69%).
 */
const HOURLY = [2, 1, 1, 1, 1, 2, 4, 5, 4, 4, 4, 5, 5, 4, 4, 4, 4, 5, 6, 6, 5, 5, 4, 2];
export const branchTrafficAt = (minute: number) => HOURLY[Math.floor(((minute % 1440) + 1440) % 1440 / 60)];
/** Giờ đêm (22h–6h): không có bảo vệ thì dễ mất trộm. */
export const isBranchNight = (minute: number) => { const m = ((minute % 1440) + 1440) % 1440; return m >= 22 * 60 || m < 6 * 60; };
/** GĐ532: đêm cuối tuần dân đi chơi khuya ghé tiện lợi đông hơn. */
export const BRANCH_WEEKEND_NIGHT_MUL = 1.3;
export const branchWeekendMul = (day: number, minute: number) => (isWeekend(day) && isBranchNight(minute) ? BRANCH_WEEKEND_NIGHT_MUL : 1);

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
  /** GĐ206: chủ bật auto chuyển kho — tự chở hàng khi kệ vơi (không cần người giao/xếp/quản lý), trả phí xăng mỗi chuyến. */
  autoHaul?: boolean;
  /** GĐ207: ngưỡng kệ vơi (%) để auto chuyển kho nổ chuyến — thiếu thì mặc định HAUL_REFILL_BELOW, clamp 30–80%. */
  autoHaulBelow?: number;
  /** GĐ207: tối thiểu bao nhiêu phút giữa 2 chuyến auto — thiếu thì mặc định HAUL_TRIP_EVERY, clamp 120–720'. */
  autoHaulEvery?: number;
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
  /** Máy bán hàng tự động ngoài cửa: bật thì bán kể cả khi đóng cửa / không ai trực. */
  vendingEnabled?: boolean;
  /** Hàng đang nạp trong máy bán hàng tự động. */
  vendingStock?: Record<string, number>;
  /** Doanh thu từ máy bán hàng hôm nay. */
  vendingRevenueToday?: number;
  /** Khách đêm hôm nay theo nhóm (id nhóm → số khách). */
  groupToday?: Record<string, number>;
  /** Số món rượu bia bán đêm nay. */
  alcoholToday?: number;
  /** Ngày công an đã tuần tra đêm (mỗi đêm một lần). */
  patrolDay?: number;
  /** Nhận đơn app ban đêm (cần gian hàng app đã mở). */
  nightDelivery?: boolean;
  /** Đơn giao đêm và doanh thu (sau hoa hồng app) hôm nay. */
  deliveryToday?: number;
  deliveryRevenueToday?: number;
  /** Nâng cấp điện đã mua. */
  power?: PowerUpgradeId[];
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
  vendingEnabled: false, vendingStock: {}, vendingRevenueToday: 0,
});

/** Save schema cũ có thể chứa object `branch` thiếu field mới (vd {open,shelf} không có staff) —
 * mặc định branch là null nên deep-merge không bù được; chuẩn hóa ở applySnapshot để UI không đọc undefined. */
export function normalizeBranch(b: Partial<BranchState> | null | undefined): BranchState | null {
  if (!b || typeof b !== 'object') return null;
  return { ...newBranch(), ...b };
}

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
/** Hệ số lương ca khi gọi người làm thay: có quản lý chi nhánh thăng từ trong ra thì rẻ hơn. */
export const coverMul = (b: Pick<BranchState, 'staff'>) => (b.staff.some((st) => st.rank === 'chief') ? CHIEF_COVER_MUL : COVER_WAGE_MUL);
/** Mất điện: hàng mát, đông lạnh, tươi sống, đồ nóng trên kệ hỏng mất phần này. */
export const BLACKOUT_LOSS = 0.6;
export const spoilsInBlackout = (id: string) => COOKED_PRODUCT_IDS.has(id) || ['cold', 'frozen', 'fresh', 'meat'].includes(productById(id).category);

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

/**
 * Cảnh báo chi nhánh 24/7 cần lên HUD (không phải mở panel mới thấy). Gộp theo trạng thái live,
 * ưu tiên "nguy hiểm" hơn "nhắc việc". Chỉ làm việc khi chi nhánh đã mở. Trả list rỗng nếu ổn.
 */
export function branchAlerts(b: BranchState, minute: number): { text: string; danger: boolean }[] {
  if (!b.open) return [];
  const out: { text: string; danger: boolean }[] = [];
  const min = ((minute % 1440) + 1440) % 1440;
  const night = isBranchNight(min);
  const crew = b.staff ?? [];
  const cashierLive = crew.some((s) => s.role === 'cashier' && onShift(s, min));
  const guardLive = crew.some((s) => s.role === 'guard' && onShift(s, min));
  const stocked = shelfTotal(b.shelf ?? {}) > 0;
  const manager = crew.some((s) => s.role === 'manager');
  const ev = b.event;

  // Sự kiện đêm đang/đã xảy ra
  if (ev?.kind === 'calloff' && !ev.covered && ev.done !== true) {
    const who = crew.find((s) => s.id === ev.staffId);
    out.push({ text: `📵 Chi nhánh: nhân viên ${who?.name ?? 'ca đêm'} xin nghỉ đột xuất — gọi người thay`, danger: !cashierLive });
  }
  if (ev?.kind === 'drunk' && ev.done) {
    out.push({ text: `🍺 Chi nhánh vừa có khách say quậy ${b.blockedUntil && min < b.blockedUntil ? '— quầy đang ngưng bán' : ''}`, danger: true });
  }
  if (ev?.kind === 'blackout' && ev.done) {
    out.push({ text: `⚡ Chi nhánh vừa mất điện làm hỏng hàng mát/đông/tươi`, danger: true });
  }
  // Thiếu người trực / hàng
  if (!cashierLive && !manager) out.push({ text: `🛒 Chi nhánh: không có thu ngân trực lúc này — khách bỏ về`, danger: true });
  if (!stocked) out.push({ text: `🕳️ Chi nhánh: kệ trống hàng — cần chở hàng từ kho chung`, danger: night });
  // Bảo vệ đêm khi nguy cơ trộm
  if (night && !guardLive && !manager) out.push({ text: `🌙 Chi nhánh ban đêm không bảo vệ — dễ mất trộm`, danger: true });
  return out;
}


// ── Hàng tiện lợi ──
/** Món khách đêm hay mua ở tiện lợi (mì ly, nước tăng lực, bao cao su, thuốc cảm, cơm nắm...). */
export const NIGHT_ITEMS = new Set(['mi', 'nuoc', 'x_mi_ly_tp', 'x_sting_dau', 'x_sting_nhan_sam', 'x_redbull_lon', 'x_bao_cao_su', 'x_thuoc_cam', 'x_com_nam', 'x_xuc_xich_nuong_tp']);
export const isNightItem = (id: string) => NIGHT_ITEMS.has(id);
/** Đồ nóng nấu ở bếp tiệm chính, chở sang bán đắt hơn. */
export const isHotFood = (id: string) => COOKED_PRODUCT_IDS.has(id);
export const HOT_FOOD_MUL = 1.3;
// ── Máy bán hàng tự động ──
/** Mua/lắp máy bán hàng tự động (một lần, giữ lâu dài). */
export const VENDING_COST = 400_000;
/** Sức chứa tối đa của máy. */
export const VENDING_CAP = 60;
/** Tỷ lệ khách qua đường rút hàng từ máy (kể cả khi đóng cửa). */
export const VENDING_OFFTAKE = 0.35;
/** Xác suất mỗi 10 phút ban đêm máy bị trộm vặt (không cần bảo vệ — máy đặt ngoài cửa). */
export const VENDING_THEFT = 0.04;
/** Những món ưa chạy trong máy (đồ cầm tay, ăn liền, nước). */
export const VENDING_ITEMS = new Set([
  'mi', 'nuoc', 'x_mi_ly_tp', 'x_com_nam', 'x_bao_cao_su', 'x_thuoc_cam',
  'x_sting_dau', 'x_sting_nhan_sam', 'x_redbull_lon', 'x_keo',
]);
export const vendingTotal = (v: Record<string, number>) => Object.values(v).reduce((n, q) => n + q, 0);

// ── Nhóm khách đêm ──
export interface NightGroup {
  id: string;
  icon: string;
  name: string;
  desc: string;
  /** Khoảng giờ [từ, đến, trọng số]; giờ ≥ 24 là sau nửa đêm. */
  ranges: [number, number, number][];
  /** Món nhóm này hay mua. */
  favorites: Set<string>;
  /** Số món một lượt mua [ít nhất, nhiều nhất]. */
  items: [number, number];
}

export const NIGHT_GROUPS: NightGroup[] = [
  {
    id: 'driver', icon: '🚚', name: 'Tài xế đường dài', desc: 'Ghé giữa đêm: nước tăng lực, cà phê, mì ly, xúc xích nướng.',
    ranges: [[22, 27, 0.25]], items: [2, 3],
    favorites: new Set(['x_redbull_lon', 'x_sting_dau', 'x_sting_nhan_sam', 'x_ca_phe_lon', 'x_mi_ly_tp', 'x_xuc_xich_nuong_tp', 'nuoc']),
  },
  {
    id: 'worker', icon: '🏭', name: 'Công nhân tăng ca', desc: 'Đổ ra khi hết ca (21–23h, 5–6h): cơm nắm, mì, thuốc cảm, bia.',
    ranges: [[21, 23, 0.3], [29, 30, 0.3]], items: [1, 2],
    favorites: new Set(['mi', 'x_mi_ly_tp', 'x_com_nam', 'x_thuoc_cam', 'bia', 'nuoc']),
  },
  {
    id: 'student', icon: '📚', name: 'Sinh viên ôn thi', desc: 'Thức khuya 23h–2h: cà phê, nước tăng lực, bánh, kẹo.',
    ranges: [[23, 26, 0.25]], items: [1, 3],
    favorites: new Set(['x_ca_phe_lon', 'x_ca_phe_sua_lon', 'x_ca_phe_sua_chai', 'x_redbull_lon', 'x_banh_quy', 'x_keo', 'x_mi_ly_tp']),
  },
  {
    id: 'doctor', icon: '🩺', name: 'Bác sĩ trực đêm', desc: 'Từ bệnh viện qua mua 0–5h: cà phê, thuốc cảm, cơm nắm, khăn ướt.',
    ranges: [[24, 29, 0.2]], items: [1, 2],
    favorites: new Set(['x_thuoc_cam', 'x_ca_phe_sua_chai', 'x_com_nam', 'x_khan_uot', 'nuoc', 'x_ca_phe_lon']),
  },
  {
    id: 'drinker', icon: '🍻', name: 'Dân nhậu về khuya', desc: 'Mua bia rượu và mồi 22h–2h. Cần giấy phép bán rượu bia, và nên có bảo vệ.',
    ranges: [[22, 26, 0.25]], items: [2, 4],
    favorites: new Set(['bia', 'bia_chai', 'ruou_gao', 'x_xuc_xich_nuong_tp', 'x_banh_que']),
  },
];
export const nightGroupById = (id: string) => NIGHT_GROUPS.find((g) => g.id === id);

const weightIn = (g: NightGroup, hour: number) =>
  g.ranges.reduce((n, [from, to, w]) => n + ((hour >= from && hour < to) || (hour + 24 >= from && hour + 24 < to) ? w : 0), 0);

/** Một khách ghé giờ này thuộc nhóm đêm nào (undefined = khách thường). */
export function pickNightGroup(minute: number, rng: () => number = simRng()): NightGroup | undefined {
  const hour = Math.floor((((minute % 1440) + 1440) % 1440) / 60);
  const ws = NIGHT_GROUPS.map((g) => weightIn(g, hour));
  const total = ws.reduce((n, w) => n + w, 0);
  if (total <= 0 || rng() > Math.min(0.85, total)) return undefined;
  let r = rng() * total;
  for (let i = 0; i < ws.length; i++) if ((r -= ws[i]) <= 0) return NIGHT_GROUPS[i];
  return NIGHT_GROUPS[NIGHT_GROUPS.length - 1];
}

/** Khách nhóm chọn món ưa thích (nếu kệ có), không thì chọn như khách thường. */
export const GROUP_FAVORITE_BIAS = 0.75;
export function pickForGroup(pool: string[], minute: number, group?: NightGroup, rng: () => number = simRng()): string {
  if (group && rng() < GROUP_FAVORITE_BIAS) {
    const fav = pool.filter((id) => group.favorites.has(id));
    if (fav.length) return pickWeighted(fav, minute);
  }
  return pickWeighted(pool, minute);
}

// ── Rượu bia ban đêm ──
/** Rượu bia bán giờ đêm lời hơn. */
export const ALCOHOL_NIGHT_MUL = 1.15;
/** Bán rượu bia ban đêm mà không có bảo vệ trực: xác suất mỗi lượt khách say gây gổ. */
export const ALCOHOL_BRAWL_CHANCE = 0.05;
export const BRAWL_DAMAGE = 150_000;
export const BRAWL_BLOCK = 30;
/** Công an tuần tra đêm: xác suất mỗi đêm (kiểm tra giấy phép bán rượu bia nếu kệ có rượu). */
export const PATROL_CHANCE = 0.3;
export const PATROL_AT = 23 * 60;
export const hasAlcohol = (shelf: Record<string, number>) => Object.keys(shelf).some((id) => shelf[id] > 0 && isAlcohol(id));

// ── Giao hàng đêm qua app ──
/** Phụ phí giao đêm cộng vào giá món. */
export const NIGHT_DELIVERY_SURCHARGE = 0.25;
/** Số đơn đêm mỗi giờ khi app 5★ (nhân theo điểm app). */
export const NIGHT_DELIVERY_PER_HOUR = 2;
/** Shipper gặp sự cố ban đêm (ngã xe, lạc đường): mất đơn, không thu tiền. */
export const NIGHT_DELIVERY_MISHAP = 0.05;

// ── Điện ──
export type PowerUpgradeId = 'generator' | 'efficient';
export interface PowerUpgradeDef { id: PowerUpgradeId; icon: string; name: string; desc: string; price: number }
export const POWER_UPGRADES: PowerUpgradeDef[] = [
  { id: 'generator', icon: '⛽', name: 'Máy phát điện dự phòng', price: 1_800_000, desc: 'Mất điện chỉ hỏng ít hàng (còn 15% thiệt hại), nhưng tốn tiền dầu mỗi lần chạy máy.' },
  { id: 'efficient', icon: '🌱', name: 'Tủ mát/đông tiết kiệm điện', price: 2_500_000, desc: 'Hóa đơn điện mỗi ngày giảm 35%.' },
];
export const powerUpgradeById = (id: PowerUpgradeId) => POWER_UPGRADES.find((u) => u.id === id)!;
export const hasPower = (b: BranchState | null | undefined, id: PowerUpgradeId) => !!b?.power?.includes(id);
/** Máy phát điện: phần thiệt hại còn lại khi mất điện và tiền dầu mỗi lần. */
export const GENERATOR_LOSS_MUL = 0.25;
export const GENERATOR_FUEL = 80_000;
/** Hóa đơn điện mỗi ngày: nền + từng thiết bị chạy suốt 24h. */
export const POWER_RATES = { base: 40_000, fridge: 12_000, freezer: 18_000, hot: 8_000, vending: 10_000 };
export const EFFICIENT_MUL = 0.65;
export function branchPowerBill(b: BranchState): number {
  const count = (t: string) => BRANCH_LAYOUT.filter((f) => f.type === t).length;
  const raw = POWER_RATES.base + count('fridge') * POWER_RATES.fridge + count('freezer') * POWER_RATES.freezer
    + (count('fryer') + count('hot_kettle')) * POWER_RATES.hot + (b.vendingEnabled ? POWER_RATES.vending : 0);
  return Math.round((raw * (hasPower(b, 'efficient') ? EFFICIENT_MUL : 1)) / 1000) * 1000;
}

// ── Thực đơn theo ca ──
/** Đồ điểm tâm sáng (5h–11h): bánh mì, xôi, cà phê, cơm nắm, bánh bao. */
const BREAKFAST_ITEMS = new Set([
  'banh_mi_trung_nuong', 'ca_phe_sua_da', 'bac_xiu', 'ca_phe_trung',
  'banh_bao_hap', 'xoi_dau_xanh', 'xoi_man', 'xoi_trung', 'xoi_bap', 'x_com_nam',
]);
/** Đồ ăn nhanh trưa (11h–15h): cơm hộp, cơm phần, mì nấu sẵn, bánh tráng trộn. */
const LUNCH_ITEMS = new Set([
  'com_hop_ga', 'com_suon_nuong', 'com_chien_trung', 'mi_trung_nong', 'banh_trang_tron', 'x_com_nam',
]);
/** Nhân thêm theo bữa ăn trong ngày — tiện lợi 24/7 xoay thực đơn theo ca. */
export function mealFactor(id: string, minute: number): number {
  const m = ((minute % 1440) + 1440) % 1440;
  if (m >= 5 * 60 && m < 11 * 60 && BREAKFAST_ITEMS.has(id)) return 2.2;
  if (m >= 11 * 60 && m < 15 * 60 && LUNCH_ITEMS.has(id)) return 2.2;
  return 1;
}

/** Trọng số khách chọn món: đêm ưu tiên món đêm, đồ nóng lúc nào cũng hút khách, sáng/trưa ưu tiên món điểm tâm và đồ ăn nhanh. */
export const itemWeight = (id: string, minute: number) =>
  (isHotFood(id) ? 2.5 : 1) * (isBranchNight(minute) && isNightItem(id) ? 3 : 1) * mealFactor(id, minute);
/** Chọn ngẫu nhiên một món theo trọng số. */
export function pickWeighted(ids: string[], minute: number): string {
  const w = ids.map((id) => itemWeight(id, minute));
  let r = simRng()() * w.reduce((n, x) => n + x, 0);
  for (let i = 0; i < ids.length; i++) if ((r -= w[i]) <= 0) return ids[i];
  return ids[ids.length - 1];
}

/**
 * Bố trí cố định trong cửa hàng tiện lợi (toạ độ tính từ tâm tòa nhà, mặt tiền ở +z, cửa ở x = 0).
 * rot giống tiệm chính: 0 = mặt kệ nhìn ra +z (phía cửa), 2 = nhìn vào trong.
 */
export const BRANCH_LAYOUT: { type: FurnitureType; x: number; z: number; rot: number }[] = [
  { type: 'checkout', x: -5.6, z: 2.1, rot: 0 },
  // Góc đồ nóng & đồ uống cạnh cửa (kiểu tiện lợi thật): mì ly ấm nước, xúc xích chiên, cà phê —
  // khách bắt đầu mua từ bây giờ (đồ nóng chở từ bếp tiệm chính sang, xem isHotFood)
  { type: 'fryer', x: 4.5, z: 3.9, rot: 2 },
  { type: 'hot_kettle', x: 5.5, z: 3.9, rot: 2 },
  { type: 'drink_counter', x: 6.8, z: 3.9, rot: 2 },
  // Bãi xe đẩy cạnh cửa, bàn gói quà sau quầy thu ngân, quầy rau quả dọc tường đông
  { type: 'cartStation', x: 2.4, z: 3.9, rot: 0 },
  { type: 'gift_wrap', x: -7.2, z: 0.7, rot: 1 },
  { type: 'produce', x: 7.3, z: 1.4, rot: 3 },
  // Dãy kệ siêu thị hai mặt giữa tiệm
  { type: 'bigShelf', x: 1.4, z: 0.6, rot: 0 }, { type: 'bigShelf', x: 4.0, z: 0.6, rot: 0 }, { type: 'bigShelf', x: 6.6, z: 0.6, rot: 0 },
  { type: 'bigShelf', x: 1.4, z: -0.05, rot: 2 }, { type: 'bigShelf', x: 4.0, z: -0.05, rot: 2 }, { type: 'bigShelf', x: 6.6, z: -0.05, rot: 2 },
  // Tủ mát dọc tường sau, tủ đông gần quầy
  { type: 'fridge', x: 0.2, z: -4.3, rot: 0 }, { type: 'fridge', x: 1.5, z: -4.3, rot: 0 }, { type: 'fridge', x: 2.8, z: -4.3, rot: 0 },
  { type: 'fridge', x: 4.1, z: -4.3, rot: 0 }, { type: 'fridge', x: 5.4, z: -4.3, rot: 0 }, { type: 'fridge', x: 6.7, z: -4.3, rot: 0 },
  { type: 'freezer', x: -5.9, z: -3.9, rot: 0 }, { type: 'freezer', x: -4.1, z: -3.9, rot: 0 },
  { type: 'bigShelf', x: -6.5, z: -1.2, rot: 1 },
];
