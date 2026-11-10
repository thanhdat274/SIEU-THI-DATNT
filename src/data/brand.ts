import type { ContractState } from '../core/gameTypes';
import { productById } from './products';

/**
 * Hệ 4 — NHÃN HÀNG RIÊNG (SPEC-CHIEU-SAU §4).
 * Từ cấp 100, những món nhà làm đã thành thạo được dán nhãn mang tên tiệm, sản xuất theo lô ở xưởng,
 * bỏ mối cho đại lý và tiệm nhượng quyền; việc cuối game là giữ uy tín một thương hiệu.
 * File này THUẦN (dữ liệu + helper), không đụng store/state; slice `slices/brand.ts` áp lên state.
 * Nhãn đặt trong `biz.brand` (save-safe qua MERGE_DEEP, R2 — mẫu biz.stance/biz.lifeEvent).
 */

/** Một dòng sản phẩm mang nhãn (slot). */
export interface BrandLine {
  productId: string;
  /** Ngày game dòng này được đưa vào nhãn (để tính "nhãn nguội" theo dòng?). */
  since: number;
  /** Số đơn vị đã đóng gói mang nhãn (thống kê, không phải tồn kho). */
  made: number;
  /** Số đơn vị đã bán ra mang nhãn. */
  sold: number;
}

/** Một điểm nhượng quyền bán hàng nhãn của tiệm. */
export interface FranchiseState {
  id: string;
  /** Ngày game mở điểm này. */
  openedDay: number;
  /** Sức khoẻ 0–100 (thiếu hàng thì giảm, khỏe thì tăng). */
  health: number;
  /** Số tuần thiếu hàng liên tiếp — 3 tuần thì điểm đóng. */
  missedWeeks: number;
}

/** Uy tín nhãn: bậc hiện hành (0–100) + cửa sổ lăn 14 ngày để trả lời "vì sao tụt" (R7). */
export interface BrandReplog { day: number; delta: number; why: string }

/** Một hợp đồng bỏ mối đại lý: chính là ContractState của hợp đồng thường, thêm `productId` dòng được chọn. */
export type BrandDeal = ContractState & { productId: string };

export interface BrandWorkshop {
  open: boolean;
  /** Số thợ đang làm (tối đa BRAND_WORKSHOP_MAX_STAFF). */
  staff: number;
  /** Bậc xưởng 0/1/2 — nâng bằng tiền (chưa dùng trong đợt đầu, mặc định 0). */
  tier: 0 | 1 | 2;
}

export interface BrandState {
  /** Tên nhãn người chơi đặt (≤ 24 ký tự như shopName). */
  name: string;
  /** Các dòng sản phẩm đang mang nhãn (≤ số slot mở theo cấp). */
  lines: BrandLine[];
  /** Số đơn vị đang trong kho mang nhãn (mẫu garden.homegrown). */
  stock: Record<string, number>;
  /** Uy tín 0–100. */
  rep: number;
  /** Uy tín cao nhất từng đạt (giữ qua NG+ để hiện hồ sơ tiệm, không có hiệu ứng). */
  maxRep: number;
  /** Cửa sổ lăn 14 ngày của biến thiên uy tín. */
  repLog: BrandReplog[];
  /** Xưởng đóng gói (mua mặt bằng cấp 100; null = chưa mở). */
  workshop: BrandWorkshop | null;
  /** Ngày gần nhất xưởng chạy — tính "nhãn nguội" (không sản xuất gì trong 14 ngày → −1/ngày). */
  lastPackDay: number;
  /** Các hợp đồng bỏ mối đang giữ (dealer id → deal; dùng khung ContractState). */
  deals: Record<string, BrandDeal>;
  /** Các điểm nhượng quyền đang mở. */
  franchises: FranchiseState[];
  /** Ngày game tới hạn nhập hàng cho từng điểm nhượng quyền (tuần). */
  franchiseDue: Record<string, number>;
}

// ───── Cấp mở & trần ─────

/** Cấp mở hệ Nhãn riêng (cũng là mốc unlockMap/unlockActs). */
export const BRAND_UNLOCK = 100;
/** Cấp mở xưởng đóng gói (cùng với nhãn). */
export const BRAND_WORKSHOP_UNLOCK = 100;
/** Cấp mở bỏ mối đại lý. */
export const BRAND_DEALER_UNLOCK = 110;
/** Cấp mở nhượng quyền. */
export const BRAND_FRANCHISE_UNLOCK = 150;

/** Các cấp mở số dòng (slot) nhãn: dòng 1 ở 100, thêm ở 115/130/145/160/180 → tối đa 6. */
export const BRAND_LINE_SLOTS = [100, 115, 130, 145, 160, 180];

/** Số dòng được mở theo cấp tiệm (0..6). */
export function brandLineSlots(level: number): number {
  let n = 0;
  for (const c of BRAND_LINE_SLOTS) if (level >= c) n += 1;
  return n;
}

/** Điều kiện một món được đưa vào nhãn: đã thông thạo (≥100 mẻ) và bán quen (≥500 đơn vị). */
export const BRAND_ENTRY_BATCHES = 100;
export const BRAND_ENTRY_SOLD = 500;
export const brandLineEligible = (batches: number, soldEver: number) =>
  batches >= BRAND_ENTRY_BATCHES && soldEver >= BRAND_ENTRY_SOLD;

// ───── Uy tín & bậc bán lẻ (§4.6) ─────

export interface BrandRepTier {
  /** rep tối thiểu của bậc. */
  min: number;
  /** rep tối đa (cận trên trước bậc kế; bậc cuối 100). */
  max: number;
  name: string;
  /** Phần trăng tăng giá bán lẻ hàng nhãn (0.05..0.25). */
  premium: number;
}

/** Bậc uy tín — giá bán lẻ hàng nhãn tăng theo bậc. */
export const BRAND_REP_TIERS: BrandRepTier[] = [
  { min: 0, max: 19, name: 'Nhãn mới', premium: 0.05 },
  { min: 20, max: 39, name: 'Có tiếng trong xóm', premium: 0.1 },
  { min: 40, max: 59, name: 'Có tiếng trong huyện', premium: 0.15 },
  { min: 60, max: 79, name: 'Đặc sản tỉnh', premium: 0.2 },
  { min: 80, max: 100, name: 'Thương hiệu quốc dân', premium: 0.25 },
];

export function brandRepTier(rep: number): BrandRepTier {
  return BRAND_REP_TIERS.find((t) => rep >= t.min && rep <= t.max)!;
}

/** Phần trăng giá bán lẻ hàng nhãn theo uy tín hiện hành. */
export const brandPremium = (rep: number) => brandRepTier(rep).premium;

// ───── Xưởng đóng gói (§4.5a) ─────

export const BRAND_WORKSHOP_COST = 60_000_000;
export const BRAND_WORKSHOP_MAX_STAFF = 3;
/** Phí bao bì = % giá bán gợi ý/đơn vị. */
export const BRAND_PACK_FEE = 0.08;
/** Công suất (đơn vị/đêm) mỗi thợ theo bậc xưởng. */
export const BRAND_WORKSHOP_CAPACITY = [20, 45, 80];
/** Lương thợ đóng gói mỗi đêm (đ). */
export const BRAND_WORKSHOP_WAGE = 150_000;

export const brandWorkshopCapacity = (w: { staff: number; tier: 0 | 1 | 2 }) =>
  w.staff * BRAND_WORKSHOP_CAPACITY[w.tier];

/** Kết quả một đêm chạy xưởng đóng gói (thuần, không đụng store). */
export interface BrandWorkshopResult {
  brand: BrandState;
  storage: Record<string, number>;
  homegrown: Record<string, number>;
  /** Tổng đơn vị đã đóng gói (0 nếu chưa mở xưởng / không thợ / hết hàng). */
  packed: number;
  /** Phí bao bì phải trả (8% giá bán gợi ý × số đơn vị, tròn trăm). */
  fee: number;
  /** Lương thợ đêm (staff × BRAND_WORKSHOP_WAGE). */
  wage: number;
  news: string[];
}

/**
 * Hệ 4 (SPEC §4.5a) — MỖI ĐÊM xưởng lấy hàng CHƯA NHÃN trong kho của các dòng (công suất = thợ × bậc),
 * đóng thành hàng MANG NHÃN (chuyển số đếm sang `brand.stock`), tốn phí bao bì + lương thợ.
 * Hàng nhà trồng/nhà làm khi đóng nhãn sẽ bỏ dấu nhà trồng (vì bán nhãn đã lấy premium cao hơn — §4.5b).
 */
export function brandWorkshopDay(b: BrandState, storage: Record<string, number>, homegrown: Record<string, number>, day: number): BrandWorkshopResult {
  const news: string[] = [];
  const w = b.workshop;
  if (!w?.open || w.staff <= 0) {
    return { brand: b, storage, homegrown, packed: 0, fee: 0, wage: w?.staff ? w.staff * BRAND_WORKSHOP_WAGE : 0, news };
  }
  let capacity = brandWorkshopCapacity(w);
  const lines = b.lines.map((l) => ({ ...l }));
  const stock = { ...b.stock };
  const newStorage = { ...storage };
  const newHome = { ...homegrown };
  let packedTotal = 0;
  let fee = 0;
  for (const line of lines) {
    if (capacity <= 0) break;
    const avail = newStorage[line.productId] ?? 0;
    const n = Math.min(avail, capacity);
    if (n <= 0) continue;
    const after = avail - n;
    if (after > 0) newStorage[line.productId] = after; else delete newStorage[line.productId];
    stock[line.productId] = (stock[line.productId] ?? 0) + n;
    // đơn vị đã thành hàng nhãn → thôi mang dấu nhà trồng (bán nhãn lấy premium cao hơn — §4.5b)
    const hg = newHome[line.productId] ?? 0;
    if (hg > 0) { const drop = Math.min(hg, n); const left = hg - drop; if (left > 0) newHome[line.productId] = left; else delete newHome[line.productId]; }
    line.made += n;
    capacity -= n;
    packedTotal += n;
    fee += n * productById(line.productId).sell * BRAND_PACK_FEE;
  }
  fee = Math.round(fee / 100) * 100;
  const wage = w.staff * BRAND_WORKSHOP_WAGE;
  const brand = { ...b, lines, stock, lastPackDay: packedTotal > 0 ? day : b.lastPackDay };
  if (packedTotal > 0) news.push(`🏭 Xưởng đóng gói ${packedTotal} đơn vị hàng nhãn (thợ ${w.staff}, phí bao bì ${fee.toLocaleString('vi-VN')}đ)`);
  return { brand, storage: newStorage, homegrown: newHome, packed: packedTotal, fee, wage, news };
}

// ───── Bỏ mối đại lý (§4.5c) ─────

export interface BrandDealerDef {
  id: string;
  icon: string;
  title: string;
  /** Cấp mở. */
  unlock: number;
  /** Uy tín tối thiểu đại lý mới chịu ký. */
  rep: number;
  /** Chu kỳ giao (ngày). */
  periodDays: number;
  /** Số đơn vị hàng nhãn mỗi kỳ (người chơi chọn dòng khi nhận). */
  qty: number;
  /** Giá mua lại so với giá bán lẻ. */
  pricePerUnit: number;
}

export const BRAND_DEALERS: BrandDealerDef[] = [
  { id: 'sap_cho_huyen', icon: '🏬', title: 'Sạp chợ huyện', unlock: 110, rep: 20, periodDays: 5, qty: 40, pricePerUnit: 0.82 },
  { id: 'cua_hang_dac_san', icon: '🏮', title: 'Cửa hàng đặc sản phố cổ', unlock: 125, rep: 40, periodDays: 7, qty: 60, pricePerUnit: 0.9 },
  { id: 'chuoi_quan_com_tinh', icon: '🍚', title: 'Chuỗi quán cơm tỉnh', unlock: 140, rep: 55, periodDays: 4, qty: 80, pricePerUnit: 0.85 },
  { id: 'sieu_thi_thanh_pho', icon: '🏪', title: 'Siêu thị thành phố', unlock: 155, rep: 70, periodDays: 7, qty: 150, pricePerUnit: 0.88 },
  { id: 'dai_ly_xuat_tinh_xa', icon: '🚚', title: 'Đại lý xuất đi tỉnh xa', unlock: 170, rep: 85, periodDays: 10, qty: 300, pricePerUnit: 0.92 },
];

export const brandDealerById = (id: string) => BRAND_DEALERS.find((d) => d.id === id);

/** Đại lý đã mở khóa theo cấp tiệm + uy tín nhãn. */
export const brandDealersAvail = (level: number, rep: number) =>
  BRAND_DEALERS.filter((d) => d.unlock <= level && rep >= d.rep);

/** Giá một kỳ của một đại lý cho một dòng (Σ sell×qty×pricePerUnit). */
export function brandDealValue(dealer: BrandDealerDef, productId: string): number {
  return Math.round(productById(productId).sell * dealer.qty * dealer.pricePerUnit);
}

/** Ba kỳ hỏng liên tiếp → đại lý cắt hợp đồng; 30 ngày sau mới ký lại được. */
export const BRAND_DEAL_CUT_AFTER = 3;
export const BRAND_DEAL_REOPEN_DAYS = 30;

// ───── Nhượng quyền (§4.5e) ─────

export interface BrandFranchiseDef {
  id: string;
  icon: string;
  title: string;
  /** Cấp mở thêm suất. */
  unlock: number;
  /** Số đơn vị hàng nhãn điểm này cần mỗi tuần. */
  weekly: number;
  /** Quy mô (để tính phí nhượng quyền). */
  size: number;
}

export const BRAND_FRANCHISE_SLOTS: BrandFranchiseDef[] = [
  { id: 'pho_co', icon: '🏮', title: 'Điểm phố cổ', unlock: 150, weekly: 40, size: 1 },
  { id: 'pho_huyen', icon: '🏘️', title: 'Điểm huyện lỵ', unlock: 170, weekly: 60, size: 1.6 },
  { id: 'thanh_pho', icon: '🏙️', title: 'Điểm thành phố', unlock: 190, weekly: 80, size: 2.4 },
];

/** Phí setup mở một điểm nhượng quyền. */
export const BRAND_FRANCHISE_SETUP = 80_000_000;
/** Uy tín tối thiểu để mở. */
export const BRAND_FRANCHISE_REP = 60;
/** Phí nhượng quyền đêm = % doanh thu mô phỏng của điểm (không mô phỏng khách). */
export const BRAND_FRANCHISE_RATE = 0.06;
/** Số tuần thiếu hàng liên tiếp thì điểm đóng. */
export const BRAND_FRANCHISE_CLOSE_WEEKS = 3;
/** Uy tín − mỗi tuần thiếu hàng. */
export const BRAND_FRANCHISE_MISS_REP = 3;
/** Uy tín + mỗi ngày một điểm khoẻ. */
export const BRAND_FRANCHISE_HEALTHY_REP = 0.2;

/**
 * Thu nhập phí nhượng quyền một đêm (cùng mẫu sapRongIncome — không mô phỏng khách):
 * base theo quy mô + uy tín nhãn, giảm theo điểm đang yếu (health), nhiễu tất định theo ngày để bớt máy móc.
 */
export function franchiseIncome(health: number, rep: number, size: number, day: number): number {
  const healthFactor = 0.5 + (health / 100) * 0.5; // yếu thì điểm cũng không có đông khách
  const repBoost = 1 + (rep / 100) * 0.5;
  const wobble = 0.85 + ((day * 7) % 31) / 100; // tất định, không RNG
  // ~quy mô: mỗi size 1 → ~150k/đêm ở rep/health tối đa
  return Math.round(150_000 * size * healthFactor * repBoost * wobble * BRAND_FRANCHISE_RATE * 40);
}

// ───── Cổng & helper thuần chung ─────

/** Tổng số đơn vị hàng nhãn trong kho của mọi dòng đang giữ. */
export const brandStockUnits = (b: BrandState): number =>
  Object.values(b.stock).reduce((n, q) => n + q, 0);

/** Nghĩa vụ hàng nhãn trong 7 ngày tới: các kỳ đại lý đến hạn + điểm nhượng quyền. */
export interface BrandObligation { type: 'deal' | 'franchise'; id: string; units: number; dueDay: number; label: string }

export function brandObligations(b: BrandState, day: number): BrandObligation[] {
  const out: BrandObligation[] = [];
  for (const [id, deal] of Object.entries(b.deals)) {
    if (deal.pending && deal.dueDay <= day + 7) {
      const def = brandDealerById(id);
      out.push({ type: 'deal', id, units: def?.qty ?? 0, dueDay: deal.dueDay, label: def?.title ?? id });
    }
  }
  for (const f of b.franchises) {
    const due = b.franchiseDue[f.id];
    if (due !== undefined && due <= day + 7) {
      const def = BRAND_FRANCHISE_SLOTS.find((s) => s.id === f.id);
      out.push({ type: 'franchise', id: f.id, units: def?.weekly ?? 0, dueDay: due, label: def?.title ?? f.id });
    }
  }
  return out.sort((a, b) => a.dueDay - b.dueDay);
}

/** 'runway' = số ngày còn đủ hàng nhãn nếu nuốt đều nghĩa vụ 7 ngày tới (đã đặt trước). 0 = thiếu, đỏ. */
export function brandRunway(b: BrandState, day: number): { stock: number; need: number; days: number } {
  const stock = brandStockUnits(b);
  const need = brandObligations(b, day).reduce((n, o) => n + o.units, 0);
  return { stock, need, days: need > 0 ? Math.floor(stock / need) * 7 : 7 };
}

/** Sửa uy tín (clamp 0–100), ghi repLog cửa sổ 14 ngày, cập nhật maxRep. Trả BrandState mới. */
export const BRAND_REPLOG_DAYS = 14;
export function applyBrandRep(b: BrandState, day: number, delta: number, why: string): BrandState {
  const rep = Math.max(0, Math.min(100, b.rep + delta));
  const repLog = [...b.repLog, { day, delta, why }].filter((e) => day - e.day < BRAND_REPLOG_DAYS);
  // maxRep là uy tín cao nhất từng đạt — ít nhất bằng rep hiện có (và giá trị vừa clamp).
  return { ...b, rep, maxRep: Math.max(b.maxRep, b.rep, rep), repLog };
}
