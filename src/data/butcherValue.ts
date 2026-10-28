/**
 * GĐ149 "Quầy thịt cá có người bán không?" — đưa hộp đen nhu cầu thịt cá ra con số khách/tiền.
 *
 * Quầy thịt cá tươi (`meat_counter`, 650.000đ, mở cấp 32, furniture.ts:75) là một khoản đầu tư
 * lớn nhưng NẾU không có người bán thịt cá trực ca thì khách chỉ mua ~35% nhu cầu thịt cá
 * (`NO_BUTCHER_DEMAND`, meat.ts:13) — một tổn thất lặp hằng ngày, im lặng, KHÔNG hiện ở đâu trong UI.
 * Được áp tại customers.ts:389 trong `weightedPick` cho TỪNG món thịt: trọng số × `meatDemandFactor`:
 *   factor = 0.35 (không có người bán) hoặc 1 + 0.12×sao (BUTCHER_DEMAND_PER_STAR, meat.ts:17-20).
 *
 * Mô hình tiền (THÀNH THẬT, không nói quá — đúng nguyên tắc GĐ148): doanh thu thịt cá thực R hôm nay
 * sinh ra ở hệ số cầu F. Nếu hệ số được nâng lên F' thì thu thêm gần đúng `R × (F'/F − 1)` (tỉ lệ theo
 * cầu, giả định kệ/kho theo kịp). Uplift đáng mục tiêu nhất = lên người bán 5★ (`maxFactor = 1.6`),
 * vì chính là lý do thuê/bồi dưỡng người bán thịt cá. Chỉ là ước lượng, ghi là "~".
 *
 * THUẦN đọc: chỉ import hằng số + hàm có sẵn (meatDemandFactor, isMeat, SHIFTS), không đổi state/save/
 * kinh tế/SAVE_VERSION. Mọi số liệu đều đọc từ state sẵn (staff[], byItem, analytics).
 */
import { BUTCHER_DEMAND_PER_STAR, NO_BUTCHER_DEMAND, isMeat } from './meat';
import type { Staff } from './staff';
import type { AnalyticsState } from './analytics';

/** Hệ số cầu thịt cá của một người bán 5★ (mốc mục tiêu — thuê/bồi dưỡng hết mực). */
export const MAX_BUTCHER_STAR = 5;
export const MAX_BUTCHER_FACTOR = 1 + BUTCHER_DEMAND_PER_STAR * MAX_BUTCHER_STAR; // 1.6

/** Phần trăm dòng thịt cá "đã qua" (qty hoặc revenue) một ngày, theo người bán thịt cá trực. */
export interface ButcherValue {
  /** Có người bán thịt cá trực ca ngày hôm nay không (ca sáng/chiều/cả ngày — ca đêm không tính). */
  present: boolean;
  /** Sao người bán thịt cá giỏi nhất trực ca ngày hôm nay (0 = không ai). */
  skill: number;
  /** Hệ số cầu hiện tại: 0.35 (không ai) hoặc 1 + 0.12×sao. */
  factor: number;
  /** Hệ số cầu mục tiêu (người bán 5★): 1.6. */
  maxFactor: number;
  /** Phần trăm nhu cầu thịt cá chiếm được so với người bán 5★: 100×factor/maxFactor. */
  pct: number;
}

/**
 * Trạng thái người bán thịt cá "hôm nay" theo đội hình đang có.
 * Dùng max-sao trong số người bán thịt cá xếp CA NGÀY (không tính ca đêm).
 */
export function butcherValueToday(staff: Pick<Staff, 'role' | 'skill' | 'shift'>[]): ButcherValue {
  let skill = 0;
  for (const st of staff) {
    if (st.role !== 'butcher') continue;
    if (st.shift === 'night') continue; // ca đêm không phục vụ quầy thịt cá ban ngày
    if (st.skill > skill) skill = st.skill;
  }
  const factor = skill <= 0 ? NO_BUTCHER_DEMAND : 1 + BUTCHER_DEMAND_PER_STAR * skill;
  return {
    present: skill > 0,
    skill,
    factor,
    maxFactor: MAX_BUTCHER_FACTOR,
    pct: Math.round((100 * factor) / MAX_BUTCHER_FACTOR),
  };
}

/** Doanh thu + số món thịt cá từ sổ bán theo món (DayStats.byItem). */
export function meatFromByItem(
  byItem: Record<string, { qty: number; revenue: number; cost: number }> | undefined,
): { revenue: number; qty: number } {
  let revenue = 0;
  let qty = 0;
  for (const [id, l] of Object.entries(byItem ?? {})) {
    if (!isMeat(id)) continue;
    revenue += l.revenue;
    qty += l.qty;
  }
  return { revenue, qty };
}

/** Doanh thu trung bình/ngày của thịt cá trong `days` ngày gần nhất (từ sổ phân tích). */
export function recentMeatRevenue(analytics: AnalyticsState | undefined, days = 7): { revenue: number; qty: number } {
  const byDay: Record<number, { revenue: number; qty: number }> = {};
  for (const [id0, recs] of Object.entries(analytics?.items ?? {})) {
    const id: string = id0;
    if (!isMeat(id)) continue;
    for (const r of recs) {
      const d = byDay[r.day] ?? { revenue: 0, qty: 0 };
      d.revenue += r.revenue;
      d.qty += r.qty;
      byDay[r.day] = d;
    }
  }
  // lấy `days` ngày có dòng gần nhất
  const recentDays = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, days);
  let revenue = 0;
  let qty = 0;
  for (const d of recentDays) {
    revenue += byDay[d].revenue;
    qty += byDay[d].qty;
  }
  const n = Math.max(1, recentDays.length);
  return { revenue: Math.round(revenue / n), qty: Math.round(qty / n) };
}

/**
 * Số tiền thịt cá tăng thêm gần đúng (~đ/ngày) nếu hệ số cầu lên người bán 5★ so với hiện tại.
 * `meatRevenue` là doanh thu thịt cá (hôm nay hoặc bình quân ngày). Trả 0 khi chưa có doanh thu thịt cá
 * hoặc đã đủ 5★.
 */
export function missedMeatRevenue(meatRevenue: number, value: ButcherValue): number {
  if (meatRevenue <= 0 || value.factor >= value.maxFactor) return 0;
  return Math.round(meatRevenue * (value.maxFactor / value.factor - 1));
}
