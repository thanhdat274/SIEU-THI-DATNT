import { daySalesProfit, type DayStats } from '../core/dayStats';
import type { QuestLog } from './quests';

/**
 * GĐ1178 — "Lãi bán hàng thật" vs "thưởng nhiệm vụ + kèo": nguồn thu hôm nay tách hai nửa.
 * Luật 10 kinh tế: bán hàng là nghề CHÍNH — lãi bán hàng thật phải dương, phần thưởng (nhiệm vụ + kèo)
 * không được lấn lãi bán hàng. Cả hai con số này game lưu/tính sẵn nhưng xưa nay KHÔNG cho người chơi
 * thấy ở tổng kết ngày — "Tiền vào − tiền ra" (`profit`) trừ cả tiền nhập kho nên ngày nào cũng âm,
 * không phản ánh sức bán thật. Helper THUẦN đọc: không đổi kinh tế/save/seed.
 */

export type SplitHealth = 'ok' | 'heavy' | 'loss';

export interface DayIncomeSplit {
  /** Lãi bán hàng THẬT hôm nay = lãi gộp sổ bán + lời dịch vụ − lương − tiền nhà (đúng công thức history.salesProfit). */
  salesProfit: number;
  /** Thưởng trong game đã ghi sổ questIncome hôm nay (nhiệm vụ ngày + chuyện + mục tiêu vòng NG+ + mốc Sổ tay Tiệm + mục tiêu cả hẻm dịp lễ). */
  quest: number;
  /** Kèo hôm nay đã trúng — đọc live questLog.bet (chỉ tính khi đặt và đúng ngày). */
  bet: number;
  /** Tổng thưởng (nhiệm vụ + kèo). */
  reward: number;
  /** Tỉ lệ reward / lãi bán thật — nhắc Luật 10; null khi không có lãi dương để so. */
  rewardShare: number | null;
  /** Sức khỏe nguồn thu: loss = lãi bán âm; heavy = thưởng ≥ lãi bán (lấn nghề chính); ok = bình thường. */
  health: SplitHealth;
}

export const incomeSplit = (stats: DayStats, questLog: QuestLog, day: number): DayIncomeSplit => {
  const salesProfit = daySalesProfit(stats) - (stats.wages ?? 0) - (stats.rent ?? 0);
  const quest = stats.questIncome ?? 0;
  const bet = questLog.bet && questLog.bet.day === day ? questLog.bet.bonus : 0;
  const reward = quest + bet;
  const rewardShare = salesProfit > 0 ? reward / salesProfit : null;
  let health: SplitHealth = 'ok';
  if (salesProfit < 0) health = 'loss';
  else if (reward > 0 && reward >= salesProfit) health = 'heavy';
  return { salesProfit, quest, bet, reward, rewardShare, health };
};
