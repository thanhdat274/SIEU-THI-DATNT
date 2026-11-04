import { daySalesProfit, type DayStats } from '../core/dayStats';
import type { QuestLog } from './quests';

/**
 * GĐ1178 — "Lãi bán hàng thật" vs "thưởng nhiệm vụ + kèo": nguồn thu hôm nay tách hai nửa.
 * Luật 10 kinh tế: bán hàng là nghề CHÍNH — lãi bán hàng thật phải dương, phần thưởng (nhiệm vụ + kèo)
 * không được lấn lãi bán hàng. Cả hai con số này game lưu/tính sẵn nhưng xưa nay KHÔNG cho người chơi
 * thấy ở tổng kết ngày — "Tiền vào − tiền ra" (`profit`) trừ cả tiền nhập kho nên ngày nào cũng âm,
 * không phản ánh sức bán thật. Helper THUẦN đọc: không đổi kinh tế/save/seed.
 */

export type SplitHealth = 'ok' | 'tight' | 'heavy' | 'loss';

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
  /** Sức khỏe nguồn thu: loss = lãi bán âm; heavy = thưởng ≥ lãi bán (lấn nghề chính); tight = thưởng ≥ 80% lãi bán (sát kề); ok = bình thường. */
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
  // GĐ1198: đai "tight" — thưởng ≥ 80% lãi bán thật (nhưng chưa ≥ 100%) cảnh báo sớm hơn 'heavy',
  // vì dải này (Luật 10 — bán hàng là nghề chính) game cân bằng thực tế hay nằm ở đây (tỉ số ~0.96),
  // mà báo cáo cũ chỉ khuyên "bán hàng vẫn là nghề chính" khi thưởng đã gần bằng lãi bán — gần như gạt.
  else if (reward > 0 && reward >= 0.8 * salesProfit) health = 'tight';
  return { salesProfit, quest, bet, reward, rewardShare, health };
};

/**
 * GĐ1203 — nối CHẨN ĐOÁN Luật 10 → HÀNH ĐỘNG CỤ THỂ: khi sức khỏe nguồn thu là `loss`/`heavy`/`tight`
 * (lãi bán thật âm hoặc thưởng đang lấn nghề chính), lời khuyên "nới lãi bán lên" chỉ là nhắc trừu tượng —
 * người chơi không biết NÊN sửa gì. Các nguyên nhân khách không mua được (kệ trống khi kho còn / hết cả
 * kho / chê đắt / chờ quầy lâu) game ĐÃ tính ở `walkoutAdvice` (thẻ "Vì sao khách không mua được" ngay dưới),
 * nhưng chưa được gắn vào chính cảnh báo này — vậy lỗi "hộp đen" còn sót giữa chẩn đoán và phương thuốc.
 * Helper THUẦN đọc này chọn 1-2 nguyên nhân đứng đầu để báo cáo kê cạnh lời khuyên, bấm vào mở thẳng panel
 * sửa (arrange/order/prices/staff). `ok` (lãi bán ĐANG dẫn) thì không cần kê — tránh nhiễu. Không đổi kinh tế/save/seed.
 */
export type IncomeLever = { icon: string; text: string; action?: string };
export function incomeLevers(health: SplitHealth, advice: IncomeLever[], max = 2): IncomeLever[] {
  if (health === 'ok') return [];
  return advice.slice(0, max);
}
