/**
 * GĐ218 "Tháng này lời bao nhiêu, món nào đang gánh gần hết?" — sổ lời theo danh mục.
 * Bảng sức khoẻ món (itemHealthList) đã liệt kê lời 30 ngày từng món + hạng ABC; chưa có con số
 * GỘP: tổng lời 30 ngày, món nào đóng góp nhiều nhất, lời có bị DỒN vào vài món (rủi ro tập trung —
 * đứt nguồn món đó là mất phần lớn lời) và các món đang ÂM. Helper này THUẦN ĐỌC từ ItemHealth đã
 * tin cậy, không đổi state/kinh tế. Nhịp ra quyết định: nên ưu tiên nhập/bày món gánh lời, đổi hoặc
 * bỏ món âm lâu ngày.
 */

import type { ItemHealth } from './analytics';

export interface ProfitMixTop {
  id: string;
  name: string;
  profit30: number;
  qty30: number;
  /** Phần lời tổng 30 ngày món này đóng góp (0–1). */
  share: number;
}

export interface ProfitMix {
  /** Lợi nhuận gộp 30 ngày (Σ revenue−cost, chưa trừ lương/thuê trạm). */
  totalProfit30: number;
  /** Top món theo lời 30 ngày (đầy đủ khi ≤5, còn lại lấy 5). */
  top: ProfitMixTop[];
  /** Phần lời tổng nằm trong top (0–1; 0 khi không hoặc có doanh thu). */
  topShare: number;
  /** Dấu hiệu rủi ro tập trung: tổng dương mà ≤2 món chiếm ≥60% lời. */
  fragile: boolean;
  /** Số món đang LỖ 30 ngày. */
  negativeCount: number;
  /** Tổng lỗ của các món âm (số dương = đang mất bao nhiêu). */
  negativeLoss30: number;
}

/** Gộp sổ lời danh mục từ bảng sức khoẻ món. `topN` mặc định 5. */
export function profitMix(list: ItemHealth[], topN = 5): ProfitMix {
  const totalProfit30 = list.reduce((n, h) => n + h.profit30, 0);
  const sorted = [...list].sort((a, b) => b.profit30 - a.profit30);
  const top = sorted.slice(0, topN)
    .filter((h) => h.profit30 > 0)
    .map((h) => ({
      id: h.id,
      name: h.name,
      profit30: h.profit30,
      qty30: h.qty30,
      share: totalProfit30 > 0 ? h.profit30 / totalProfit30 : 0,
    }));
  const topProfit = top.reduce((n, t) => n + t.profit30, 0);
  const topShare = totalProfit30 > 0 ? topProfit / totalProfit30 : 0;
  const negatives = list.filter((h) => h.profit30 < 0);
  return {
    totalProfit30,
    top,
    topShare,
    fragile: totalProfit30 > 0 && top.length > 0 && top.length <= 2 && topShare >= 0.6,
    negativeCount: negatives.length,
    negativeLoss30: Math.round(negatives.reduce((n, h) => n - h.profit30, 0)),
  };
}
