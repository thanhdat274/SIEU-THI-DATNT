/**
 * GĐ159 — Đóng nốt 4 "hộp mờ nhẹ" còn sót từ audit tài chính 28/10 (sau GĐ155–158):
 *  1) Hụi: đã góp bao nhiêu trong vòng này. `contributed = daily × paidDays` là số CHÍNH XÁC, không phải ước —
 *     mỗi tối core/biz trừ đúng `daily` rồi mới `paidDays += 1`, và news vỡ hụi cũng tính mất "paidDays × daily".
 *  2) Phản công: bớt `hit` sức mạnh rival ≈ khách đông lại bao nhiêu % và bao nhiêu tiền/ngày.
 *     `rivalTrafficFactor` (data/biz) TUYẾN TÍNH theo sức mạnh (1 sức mạnh ≈ 0,25% khách, ×2 khi rival xả hàng,
 *     sàn 0.5) nên quy được sạch — gọi thẳng hàm thật với rival giả để công thức không bao giờ lệch.
 *  3) Khủng hoảng MXH: còn bao nhiêu ngày + xin lỗi cứu lại bao nhiêu khách. Hệ số thật: CRISIS_MUL 0.72 →
 *     APOLOGY_MUL 0.92, chênh đúng 0.20 khách bình thường mỗi ngày còn lại (buzz.until là ngày CUỐI còn hiệu lực).
 *  4) Máy bán hàng chi nhánh: hoàn vốn theo nhịp hôm nay. Lắp 400k (VENDING_COST); điện máy
 *     POWER_RATES.vending = 10k/ngày, còn ×0.65 nếu đã lắp nâng cấp 'efficient' (ước — hóa đơn điện TỔNG mới
 *     làm tròn 1000, phần máy riêng chỉ gần đúng).
 * THUẦN ĐỌC từ state/hằng số có sẵn — không đổi kinh tế/save; số nào là ƯỚC thì UI tự kèm "~".
 */
import { rivalTrafficFactor, type Hui } from './biz';
import { EFFICIENT_MUL, POWER_RATES, VENDING_COST } from './branches';
import { APOLOGY_MUL, CRISIS_MUL } from './social';

// ── 1) Hụi ──

export interface HuiRoundSummary {
  /** Tiền đã góp trong vòng này = daily × paidDays — chính xác, không phải ước. */
  contributed: number;
  /** Cả hột khi tới lượt hốt = daily × members. */
  pot: number;
  /** Số ngày góp còn lại tới hết vòng (sau khi hốt vẫn góp tiếp tới mãn vòng). */
  daysLeft: number;
  received: boolean;
}

export function huiRoundSummary(hui: Hui): HuiRoundSummary {
  return {
    contributed: hui.daily * hui.paidDays,
    pot: hui.daily * hui.members,
    daysLeft: Math.max(0, hui.members - hui.paidDays),
    received: hui.received,
  };
}

// ── 2) Phản công đối thủ ──

export interface CounterPayoff {
  /** Khách đông lại bao nhiêu % SO VỚI HIỆN TẠI khi rival bớt `hit` sức mạnh. */
  pctCustomers: number;
  /** ước tiền/ngày = bình quân doanh thu tiệm chính cửa sổ 7 ngày × pctCustomers
   *  (DayRecord.revenue là thu tiệm chính — đúng luồng khách mà rivalTrafficFactor tác động). */
  moneyPerDay: number;
}

/** rivalTrafficFactor với rival giả (hàm thật chỉ đọc strength + saleUntil) — khỏi mirror công thức tay. */
const trafficFactor = (strength: number, onSale: boolean) =>
  rivalTrafficFactor({ name: '', strength, openedDay: 0, ...(onSale ? { saleUntil: 2 } : {}) }, 2);

/**
 * `hit` ở đây là hit GỐC của đòn phản công; hit thật đêm nay có thể nặng thêm tới +3 nhờ streak
 * và đòn giá chỉ tính nếu bán đủ 30 món — nên UI phải coi kết quả là ước ("~").
 */
export function counterPayoff(strength: number, hit: number, onSale: boolean, avgRevenue7: number): CounterPayoff {
  const before = trafficFactor(strength, onSale);
  const after = trafficFactor(Math.max(0, strength - hit), onSale);
  const pctCustomers = before > 0 ? ((after - before) / before) * 100 : 0;
  return { pctCustomers, moneyPerDay: Math.round((avgRevenue7 * pctCustomers) / 100) };
}

/** Bình quân doanh thu cửa sổ `window` ngày gần nhất của history; thiếu ngày thì lấy phần có. */
export function recentAvgRevenue(history: ReadonlyArray<{ revenue: number }> | undefined, window = 7): number {
  const days = (history ?? []).slice(-window);
  if (!days.length) return 0;
  return days.reduce((n, d) => n + d.revenue, 0) / days.length;
}

// ── 3) Khủng hoảng MXH ──

export interface CrisisStatus {
  /** Còn bao nhiêu ngày khủng hoảng KỂ CẢ HÔM NAY (0 = đã hết — UI ẩn dòng). */
  daysLeft: number;
  /** Ngày cuối còn hiệu lực (activeBuzz còn tính ngày này). */
  until: number;
  /** Hệ số khách đang khủng hoảng / sau khi xin lỗi (hằng số thật của game). */
  crisisMul: number;
  apologyMul: number;
  /** Phần khách BÌNH THƯỜNG cứu lại mỗi ngày còn lại = APOLOGY − CRISIS (0.20 → "~20% khách"). */
  savedOfNormal: number;
}

export function crisisStatus(until: number, day: number): CrisisStatus {
  return {
    daysLeft: Math.max(0, until - day + 1),
    until,
    crisisMul: CRISIS_MUL,
    apologyMul: APOLOGY_MUL,
    savedOfNormal: APOLOGY_MUL - CRISIS_MUL,
  };
}

// ── 4) Máy bán hàng tự động chi nhánh ──

export interface VendingPayoff {
  /** Điện riêng CỦA MÁY mỗi ngày (10k; ×0.65 nếu lắp 'efficient'). */
  electricityPerDay: number;
  /** Ngày hoàn vốn theo nhịp doanh thu HÔM NAY (ceil — "sau ~N ngày"); null khi chưa đủ bù điện máy. */
  days: number | null;
}

/**
 * Hoàn vốn tính trên doanh thu − điện máy: là GROSS giá vốn (đúng quy ước "chưa phân bổ giá vốn
 * hàng đã nhập" từ GĐ153); trộm vặt đêm (VENDING_THEFT) làm hụt hàng chứ không đụng doanh thu.
 */
export function vendingPayoff(revenueToday: number, efficient: boolean): VendingPayoff {
  const electricityPerDay = Math.round(POWER_RATES.vending * (efficient ? EFFICIENT_MUL : 1));
  const net = revenueToday - electricityPerDay;
  return { electricityPerDay, days: net > 0 ? Math.ceil(VENDING_COST / net) : null };
}
