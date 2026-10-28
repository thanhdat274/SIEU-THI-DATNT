/**
 * Báo cáo ca đêm cho TIỆM CHÍNH (GĐ65 "🌙 Ca đêm có đáng không"): lời/lỗ của việc mở cửa 24h.
 * Người chơi bỏ 15 triệu mua nâng cấp "Mở ca đêm 24h" (upgrades.ts, unlock cấp 55) để bán được
 * đắt hơn (+15%) nhưng trộm ×2 và nhân viên ca đêm lương ×1.5. Trước GĐ65, KHÔNG nơi nào trong UI
 * cho thấy "đêm qua kiếm được / rò tiền bao nhiêu" — khoản đầu tư lớn nhất mà vô hình.
 * Helper này đọc hai thứ đã sẵn: sổ theo giờ `stats.byHour` (doanh thu mỗi giờ, giờ ≥22 là đêm)
 * và nhân viên trong ca đêm (shift 'night', dailyWage đã nhân pay 1.5). THUẦN QUAN SÁT — không đổi
 * NIGHT_PRICE_MUL / NIGHT_WAGE_MUL / NIGHT_THEFT_MUL / kinh tế / state / save.
 * Chỉ import hằng số + dailyWage/hasSkill (không import module kinh doanh) → không có vòng lặp import.
 */
import { dailyWage, type Staff } from './staff';
import { hasSkill } from './titles';

/** Một giờ trong ngày (0–30h kéo dài) có thuộc ban đêm không. Ngày bắt đầu ở 6h (DAY_START), nối tiếp
 *  qua nửa đêm tới 30h (= 0h–6h hôm sau), nên mọi giờ đêm ghi trong sổ đều là giờ ≥22. */
export const isNightHour = (hour: number) => hour >= 22;

/** Tổng doanh thu kiếm trong khung đêm của một ngày — đọc từ `stats.byHour` (sổ theo giờ). */
export function nightRevenueToday(byHour: Record<number, { revenue: number }> | undefined): number {
  return Object.entries(byHour ?? {}).reduce((n, [h, line]) => (isNightHour(Number(h)) ? n + line.revenue : n), 0);
}

/** Tổng lương nhân viên CA ĐÊM phải trả cuối ngày (đã nhân pay 1.5 trong dailyWage + giảm good_boss),
 *  khớp đúng cách `wagesDue` (core/gameTypes) tính lương cho toàn đội. */
export function nightWageOf(staff: { shift: string; wage: number }[] | undefined, skills: readonly string[] | undefined): number {
  const raw = (staff ?? []).filter((st) => st.shift === 'night').reduce((sum, st) => sum + dailyWage(st as Staff), 0);
  return Math.round(raw * (hasSkill(skills ?? [], 'good_boss') ? 0.9 : 1));
}

export type NightVerdict = 'ok' | 'warn' | 'idle';

export interface NightPnl {
  /** Doanh thu đêm (giá đã +15%). */
  revenue: number;
  /** Lương ca đêm phải trả. */
  wages: number;
  /** revenue − wages. */
  net: number;
  /** 'idle' khi không mở ca đêm (chưa thuê ai / chưa bán đêm) → UI ẩn; 'ok' lời, 'warn' lỗ. */
  verdict: NightVerdict;
}

/** Lời/lỗ ca đêm gộp cho một ngày — đã đọc từ byHour + staff. 'idle' nếu cả hai đều 0. */
export function nightPnl(byHour: Record<number, { revenue: number }> | undefined, staff: { shift: string; wage: number }[] | undefined, skills: readonly string[] | undefined): NightPnl {
  const revenue = nightRevenueToday(byHour);
  const wages = nightWageOf(staff, skills);
  const net = revenue - wages;
  const verdict: NightVerdict = revenue === 0 && wages === 0 ? 'idle' : net > 0 ? 'ok' : 'warn';
  return { revenue, wages, net, verdict };
}
