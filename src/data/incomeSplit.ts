import { daySalesProfit, type DayStats, type DayRecord } from '../core/dayStats';
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
/** GĐ1204: ngày ÂM lãi bán (`loss`) mà KHÔNG có nguyên nhân khách không mua (dịch vụ sạch, không ai chờ/bỏ
 *  vì giá/kệ) — lỗ thường từ biên giá mỏng hoặc chi phí cố định. Báo cáo đang chỉ nói "Coi lại giá bán" mà
 *  không cho nút (incomeLevers trả [] vì advice rỗng) — lại dính "hộp đen" GĐ1203 định diệt. Kê đúng lời khuyên
 *  đã hiện (giá bán) thành nút mở thẳng panel giá — lời thật, không bịa nguyên nhân. THUẦN đọc — không đổi kinh tế/save/seed. */
export const LOSS_FALLBACK_LEVER: IncomeLever = { icon: '💸', text: 'Soi giá bán — nới biên để lãi bán thật dương', action: 'prices' };
export function incomeLevers(health: SplitHealth, advice: IncomeLever[], max = 2): IncomeLever[] {
  if (health === 'ok') return [];
  if (health === 'loss' && advice.length === 0) return [LOSS_FALLBACK_LEVER];
  return advice.slice(0, max);
}

/**
 * GĐ1207 — Xu hướng lãi bán thật gần đây: đóng VÒNG PHẢN HỒI của Luật 10. Báo cáo biết kê nút sửa
 * (GĐ1203: nới giá/lương/kệ; GĐ1204: Soi giá) nhưng sau khi người chơi BẤM và chơi vài ngày, làm sao biết
 * sức bán thật đã cải thiện chưa? — thẻ chỉ cho 1 con số hôm nay, không chỉ HƯỚNG 7 ngày. Helper THUẦN đọc
 * này rút từ history (DayRecord[].salesProfit — chính là con số game lưu từ endDay, field optional cho van
 * cũ) ra hướng thay đổi: so trung bình nửa gần (≤7 ngày) vs nửa đầu; giữ ngưỡng 3% như riskTrendSummary để
 * không báo nhiễu ngày nhỏ. KHÔNG đổi state/kinh tế/save/seed.
 */
export interface SalesTrend {
  /** Số ngày có dữ liệu lãi bán thật trong cửa sổ history. */
  days: number;
  /** Lãi bán thật ngày gần nhất có số (0 nếu chưa ngày nào ghi). */
  last: number;
  /** Trung bình nửa đầu (các ngày trước nửa gần); 0 nếu chưa đủ để so. */
  prev: number;
  /** 'up' khi nửa gần ≥ nửa trước ×1.03; 'down' khi ≤ ×0.97; chưa đủ/dao động nhỏ → 'flat'. */
  dir: 'up' | 'down' | 'flat';
}

const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

export function salesTrend(history: DayRecord[]): SalesTrend {
  const xs = history.map((h) => h.salesProfit).filter((v): v is number => typeof v === 'number');
  const n = xs.length;
  if (n === 0) return { days: 0, last: 0, prev: 0, dir: 'flat' };
  const last = xs[n - 1];
  const cut = Math.max(0, n - 7); // nửa đầu: các ngày trước 7 ngày gần nhất
  const recent = xs.slice(cut);
  const earlier = xs.slice(0, cut);
  const prevVal = Math.round(avg(earlier));
  const recentAvg = avg(recent);
  let dir: SalesTrend['dir'] = 'flat';
  if (earlier.length > 0 && prevVal !== 0) {
    dir = recentAvg > prevVal * 1.03 ? 'up' : recentAvg < prevVal * 0.97 ? 'down' : 'flat';
  } else if (earlier.length === 0) {
    dir = 'flat'; // chưa đủ 2 nửa để nói xu hướng
  } else if (recentAvg > 0) {
    dir = 'up';
  } else if (recentAvg < 0) {
    dir = 'down';
  }
  return { days: n, last, prev: prevVal, dir };
}
