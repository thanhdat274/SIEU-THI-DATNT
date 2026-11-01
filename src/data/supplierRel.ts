/**
 * Mối quen lâu dài (GĐ67 "🤝 Mối quen lâu dài"): xây quan hệ với nhà cung cấp, thưởng hoàn tiền theo THÁNG.
 * Trước GĐ67, hệ nhập hàng thuần giao dịch — nhà cung cấp chỉ có discount/delay/volatility tĩnh, mua bao nhiêu
 * cũng không có hồ sơ quan hệ, người chơi chỉ tối ưu "mối nào RẺ hôm nay" (GĐ57). Đây thêm trục định kỳ THÁNG:
 * mua dồn về một mối qua cả ván → lên bậc mối quen; đạt cam kết doanh mua tháng ở mối đó → cuối tháng được hoàn.
 * THUẦN QUAN SÁT + phụ gia tách rời — KHÔNG đổi unitCost/orderTotal (kinh tế ngày giữ nguyên), chỉ import hằng
 * số/type (không cycle).
 */
import type { Supplier } from './suppliers';

/** Hồ sơ quan hệ một mối: doanh mua tích lũy CẢ VÁN và số đơn đã đặt. */
export interface SupplierRel {
  spent: number;
  orders: number;
}

/** Một bậc mối quen. `threshold` = doanh mua tích lũy cả ván để đạt bậc; `commit` = doanh mua THÁNG tối thiểu
 *  của mối đó để được hoàn; `rate` = % doanh mua tháng hoàn lại; `cap` = trần tiền hoàn mỗi tháng mỗi mối. */
export interface PartnerTier {
  level: number;
  name: string;
  icon: string;
  threshold: number;
  commit: number;
  rate: number;
  cap: number;
}

/** Bậc mối quen theo doanh mua tích lũy cả ván. Mốc thiết kế chạm được xuyên ván (người chơi lâu ngày đạt cao). */
export const PARTNER_TIERS: PartnerTier[] = [
  { level: 1, name: 'Mối quen', icon: '🤝', threshold: 3_000_000, commit: 1_500_000, rate: 0.01, cap: 150_000 },
  { level: 2, name: 'Mối thân', icon: '💼', threshold: 12_000_000, commit: 4_000_000, rate: 0.015, cap: 300_000 },
  { level: 3, name: 'Mối ruột', icon: '🔥', threshold: 30_000_000, commit: 9_000_000, rate: 0.02, cap: 600_000 },
  { level: 4, name: 'Đối tác', icon: '🏆', threshold: 70_000_000, commit: 18_000_000, rate: 0.025, cap: 1_000_000 },
  { level: 5, name: 'Đối tác vàng', icon: '👑', threshold: 150_000_000, commit: 36_000_000, rate: 0.03, cap: 1_500_000 },
];

const BASE_TIER: PartnerTier = { level: 0, name: 'Mối xa', icon: '🤝', threshold: 0, commit: 0, rate: 0, cap: 0 };

/** Bậc hiện tại theo doanh mua tích lũy cả ván. */
export const relTier = (life: number): PartnerTier =>
  PARTNER_TIERS.reduce<PartnerTier>((acc, t) => (life >= t.threshold ? t : acc), BASE_TIER);

/** Bậc kế tiếp (null khi đã max). */
export const nextTierOf = (life: number): PartnerTier | null =>
  PARTNER_TIERS.find((t) => life < t.threshold) ?? null;

/** Tiến độ % tới bậc kế (100 khi đã max). */
export function tierProgress(life: number) {
  const cur = relTier(life);
  const next = nextTierOf(life);
  const pct = next ? Math.min(100, Math.round(((life - cur.threshold) / (next.threshold - cur.threshold)) * 100)) : 100;
  return { cur, next, pct };
}

/** Cộng một đơn (tiền + số đơn) vào hồ sơ mối; không có hồ sơ thì tạo mới. Thuần. */
export const addRel = (rel: SupplierRel | undefined, spent: number): SupplierRel =>
  rel ? { spent: rel.spent + spent, orders: rel.orders + 1 } : { spent, orders: 1 };

/** Tiền hoàn cuối tháng cho một mối ở bậc hiện tại với doanh mua tháng `monthSpent`:
 *  0 nếu chưa đạt bậc 1 hoặc chưa đủ cam kết tháng; bằng `min(monthSpent × rate, cap)` khi đạt. */
export function monthlyRelRebate(life: number, monthSpent: number): number {
  const t = relTier(life);
  if (t.level === 0 || monthSpent < t.commit) return 0;
  return Math.min(Math.round(monthSpent * t.rate), t.cap);
}

export type { Supplier };
