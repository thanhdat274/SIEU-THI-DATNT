/**
 * Hệ 4 — CHIỀU SÂU "SOI SÁNG" NHƯỢNG QUYỀN (SPEC §4.5e, L8 GĐ2277). FranchiseTab đã hiện phí/đêm + sức khoẻ
 * + luật chung "3 tuần thiếu thì đóng" — nhưng chưa cho người chơi GÓC NHÌN TUẦN + ĐỘ AN TOÀN của từng điểm:
 *   - Thu nhập cả TUẦN (phí/đêm × 7) để so với công sức/tiền bỏ vào.
 *   - Còn bao nhiêu tuần thiếu nữa thì điểm ĐÓNG (mất 80tr setup) trước khi định "thôi nuôi điểm này".
 * THUẦN, tất định (không RNG): đọc FranchiseState + BRAND_FRANCHISE_SLOTS + franchiseIncome; không đổi
 * state/sim/save/kinh tế → golden không đụng (mọi mốc Hệ 4 ≥ 100).
 */
import {
  BRAND_FRANCHISE_CLOSE_WEEKS, BRAND_FRANCHISE_SLOTS, franchiseIncome,
  type BrandState, type FranchiseState,
} from './brand';
import { fmtNum } from '../core/format';

export interface FranchisePayoffRow {
  id: string;
  title: string;
  icon: string;
  size: number;
  weekly: number;
  health: number;
  missedWeeks: number;
  /** Thu nhập phí ~1 tuần (phí/đêm × 7). */
  incomeWeek: number;
  /** Còn mấy tuần thiếu liên tiếp nữa thì điểm đóng (0 = tuần sau thiếu là đóng). */
  weeksToClose: number;
  line: string;
}

export const fmt = (n: number) => fmtNum(n);

export function franchisePayoff(b: BrandState): { rows: FranchisePayoffRow[]; totalWeek: number; headline: string } {
  const rows: FranchisePayoffRow[] = b.franchises.map((f: FranchiseState) => {
    const def = BRAND_FRANCHISE_SLOTS.find((x) => x.id === f.id)!;
    const incomeWeek = franchiseIncome(f.health, b.rep, def.size, f.openedDay) * 7;
    const weeksToClose = Math.max(0, BRAND_FRANCHISE_CLOSE_WEEKS - f.missedWeeks);
    const line =
      `${def.icon} ${def.title}: thu ≈ ${fmt(incomeWeek)}/tuần · khoẻ ${f.health}/100 · hàng tuần ${def.weekly}đv` +
      (f.missedWeeks > 0 ? ` · đã thiếu ${f.missedWeeks} tuần — còn ${weeksToClose} tuần nữa là ĐÓNG` : '');
    return {
      id: f.id, title: def.title, icon: def.icon, size: def.size, weekly: def.weekly,
      health: f.health, missedWeeks: f.missedWeeks, incomeWeek, weeksToClose, line,
    };
  });
  const totalWeek = rows.reduce((n, r) => n + r.incomeWeek, 0);
  const headline =
    rows.length === 0
      ? 'Chưa mở điểm nhượng quyền nào.'
      : `Nhượng quyền: ~${fmt(totalWeek)}đ/tuần từ ${rows.length} điểm.`;
  return { rows, totalWeek, headline };
}
