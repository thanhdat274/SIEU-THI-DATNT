import { YEAR_DAYS } from './calendar';

/** GĐ82 — "📅 Tròn một năm — tổng kết năm vận hành (nhịp năm)".
 *  Game model đầy đủ năm (YEAR_DAYS=365, lễ/lặp mỗi năm) và có nhịp ngày/tuần/tháng/mùa, nhưng
 *  chưa có nhịp NĂM: không tổng kết, không thưởng "chơi trọn một năm", không nối 4 mùa lại.
 *  Helper này thuần đọc — chỉ phụ thuộc level + tally, không import store, không đổi kinh tế. */

export interface YearTally {
  /** Số năm (1 = năm đầu). */
  year: number;
  /** Ngày bắt đầu theo dõi (ngày 1 năm này hoặc ngày load save cũ). */
  startDay: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  /** Tổng sao gom từ các sự kiện mùa TRONG năm này (nối 4 mùa lại). */
  seasonStars: number;
}

export interface YearReport {
  year: number;
  startDay: number;
  endDay: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  seasonStars: number;
  /** Thưởng tròn năm (additive, gated chơi trọn một năm). */
  reward: number;
}

/** Số thứ tự năm vận hành: ngày 1..365 = năm 1, 366..730 = năm 2, … (khớp dayOfYear wrap của calendar). */
export const yearOf = (day: number) => Math.floor((day - 1) / YEAR_DAYS) + 1;
/** Ngày đầu tiên của một năm. */
export const yearStart = (year: number) => (year - 1) * YEAR_DAYS + 1;
/** Ngày cuối cùng của một năm. */
export const yearEnd = (year: number) => year * YEAR_DAYS;
/** Hôm nay là ngày cuối của năm (ngày mai sang năm mới). */
export const isYearEnd = (day: number) => yearOf(day + 1) === yearOf(day) + 1;

export const emptyYear = (startDay: number, year: number): YearTally => ({
  year, startDay, revenue: 0, profit: 0, customers: 0, unhappy: 0, seasonStars: 0,
});

/** Thưởng phụ gia tròn năm theo cấp (không đổi công thức — chỉ thêm mồi 365 ngày). */
export const yearReward = (level: number) => Math.round((250000 + level * 15000) / 1000) * 1000;

/** Khép một năm: giữ nguyên con số tích lũy + thưởng tròn năm. */
export function closeYear(t: YearTally, endDay: number, level: number): YearReport {
  return {
    year: t.year, startDay: t.startDay, endDay,
    revenue: t.revenue, profit: t.profit, customers: t.customers, unhappy: t.unhappy,
    seasonStars: t.seasonStars, reward: yearReward(level),
  };
}
