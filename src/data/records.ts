import { productById } from './products';
import { comboById } from './combos';
import { OPERATING_REVENUE_RATE } from './shopTiers';

/** Sổ Kỷ lục: các cột mốc cá nhân cao nhất của tiệm — thuần đọc từ state đã lưu, KHÔNG đổi kinh tế/save. */

export interface GameRecords {
  bestRevenueDay: { day: number; value: number } | null;
  bestProfitDay: { day: number; value: number } | null;
  bestCustomersDay: { day: number; value: number } | null;
  totalRevenue: number;
  totalCustomers: number;
  daysTracked: number;
  favoriteProduct: { name: string; qty: number } | null;
  bestCombo: { name: string; hits: number } | null;
  level: number;
  prestigeBonus: number;
}

export interface RecordsInput {
  history: { day: number; revenue: number; profit: number; customers: number }[];
  soldEver: Record<string, number>;
  comboHitCount: Record<string, number>;
  level: number;
  prestigeBonus: number;
}

/** Rút ra kỷ lục từ lịch sử ngày (cửa sổ lăn), sổ bán mọi thời (soldEver) và số combo (comboHitCount). */
export function computeRecords(input: RecordsInput): GameRecords {
  let bestRevenueDay: GameRecords['bestRevenueDay'] = null;
  let bestProfitDay: GameRecords['bestProfitDay'] = null;
  let bestCustomersDay: GameRecords['bestCustomersDay'] = null;
  let totalRevenue = 0;
  let totalCustomers = 0;
  for (const d of input.history) {
    totalRevenue += d.revenue;
    totalCustomers += d.customers;
    if (!bestRevenueDay || d.revenue > bestRevenueDay.value) bestRevenueDay = { day: d.day, value: d.revenue };
    if (!bestProfitDay || d.profit > bestProfitDay.value) bestProfitDay = { day: d.day, value: d.profit };
    if (!bestCustomersDay || d.customers > bestCustomersDay.value) bestCustomersDay = { day: d.day, value: d.customers };
  }
  let favoriteProduct: GameRecords['favoriteProduct'] = null;
  for (const [id, q] of Object.entries(input.soldEver)) {
    if (q <= 0) continue;
    if (!favoriteProduct || q > favoriteProduct.qty) favoriteProduct = { name: productById(id)?.name ?? id, qty: q };
  }
  let bestCombo: GameRecords['bestCombo'] = null;
  for (const [id, hh] of Object.entries(input.comboHitCount)) {
    if (hh <= 0) continue;
    if (!bestCombo || hh > bestCombo.hits) bestCombo = { name: comboById(id)?.name ?? id, hits: hh };
  }
  return {
    bestRevenueDay,
    bestProfitDay,
    bestCustomersDay,
    totalRevenue,
    totalCustomers,
    daysTracked: input.history.length,
    favoriteProduct,
    bestCombo,
    level: input.level,
    prestigeBonus: input.prestigeBonus,
  };
}

/** So "hôm nay đang chạy" với kỷ lục ngày — nuôi feed "đang trên đà phá kỷ lục" (chỉ đọc, không đổi state). */
export interface RecordFeedLine {
  icon: string;
  label: string;
  /** Giá trị hôm nay (số đang chạy, chưa kết ngày). */
  today: number;
  /** Kỷ lục cá nhân cao nhất (null nếu chưa có ngày nào). */
  best: number | null;
  /** Còn thiếu bao nhiêu nữa là phá kỷ lục (0 nếu đã vượt). */
  remaining: number;
  /** Hôm nay đã vượt kỷ lục chưa. */
  beating: boolean;
  unit: 'money' | 'count';
}

/** Các trường DayStats cần để tính feed (khai kiểu thu gọn để data/ không vướng nhập core). */
export interface RecordDayInput {
  revenue: number;
  spent: number;
  wages?: number;
  rent?: number;
  customers: number;
}

export function recordFeedToday(stats: RecordDayInput, r: GameRecords): RecordFeedLine[] {
  // Lãi hôm nay: cùng phép lấy lãi tạm thời của giao diện (doanh thu − chi − lương − tiền nhà),
  // nhưng trừ LUÔN phí vận hành (điện/nước ~ % doanh thu) để con số so với kỷ lục ngày TRỌN VẸN
  // không bị phình to — hôm nay còn chưa cộng đơn online/ghi sổ nên mọi số đều nằm DƯỚI thật,
  // an toàn: không bao giờ báo "đã phá kỷ lục" khi chưa phá.
  const profit = stats.revenue - stats.spent - (stats.wages ?? 0) - (stats.rent ?? 0)
    - Math.round(stats.revenue * OPERATING_REVENUE_RATE);
  const line = (icon: string, label: string, today: number, best: number | null, unit: 'money' | 'count'): RecordFeedLine => ({
    icon, label, today, best, unit,
    remaining: best === null ? 0 : Math.max(0, best - today),
    beating: best !== null && today > best,
  });
  return [
    line('💰', 'Thu nhập hôm nay', stats.revenue, r.bestRevenueDay?.value ?? null, 'money'),
    line('💹', 'Lãi hôm nay', profit, r.bestProfitDay?.value ?? null, 'money'),
    line('🧑‍🤝‍🧑', 'Khách hôm nay', stats.customers, r.bestCustomersDay?.value ?? null, 'count'),
  ];
}
