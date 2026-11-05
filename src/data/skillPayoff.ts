// ============================================================================
// Data: Kỹ năng chủ tiệm — bề mặt "điểm này đáng không, được gì" (GĐ1266)
// ----------------------------------------------------------------------------
// Cây kỹ năng (SkillsPanel, titles.ts SKILLS) là quyết định "nghề nghiệp" của CHÍNH người
// chơi: mỗi 5 cấp được 1 điểm, phải chọn phân bổ giữa các kỹ năng đổi TIỀN THẬT (lương, nhập,
// khách, món, hỏng hàng). Trước giờ MỌI kỹ năng chỉ hiện mô tả định tính + % nguyên bản —
// chỉ `sharp_eye` có dòng định lượng (counterfeitRisk); 8 kỹ năng còn lại chọn MÙ: không biết
// điểm này mua được bao nhiêu đ/ngày để so (hộp đen, Nguyên tắc a "mọi quyết định hằng ngày
// phải có dữ liệu phản hồi"). Helper này THUẦN — đọc HẰNG SỐ đã cân bằng + sổ người chơi đang có
// để trả MỘT dòng ngắn (≤90 ký tự) nêu con số thật: không đổi state/save/kinh tế (Luật 5 an toàn).
//
// Chỉ ra dòng khi có con số THẬT tính được từ dữ liệu đang có; không chế số mới, không bịa:
// - good_boss  : 10% Σ lương ca (đúng hằng số 0.9 ở gameTypes/endDay) → tiền bớt /ngày.
// - local_legend: 10% khách hôm nay (đúng 1.1 traffic ở customers.ts) → lượt khách thêm /ngày.
// - big_basket : +1 món với xác suất 0.5 (customers.ts:370) → doanh thu thêm ước /ngày.
// - fresh_keeper: hàng hỏng chậm 25% (stock.ts 0.75) → ước tiền hàng hỏng bớt /ngày (từ sổ đêm qua).
// - neat_shelves: kệ +20% sức chứa → phần lỡ vì kệ trống DÙ KHO CÒN hôm nay (shelfBuyHint kind 'shelf').
// - quick_hands : tính tiền nhanh 20% → nếu hôm nay có khách bỏ vì chờ quầy thì nhắc đúng (không bịa).
// Các kỹ năng còn lại (charm/master_manager/cool_pack/zero_waste/fast_cook/snack/drink...) để mô tả
// % nguyên bản — chưa có cách quy TIỀN trung thực theo sổ nên không nói quá (nguyên tắc trung thực,
// tránh nhiễu). Trả '' khi không có dữ liệu/không tính được (đừng ồn đầu ngày, giống todayLine).
// ============================================================================

import type { SkillId } from './titles';

export interface SkillPayoff {
  /** Có dữ liệu để nêu con số thật hay không (UI chỉ hiện dòng khi true). */
  ok: boolean;
  /** Một dòng ngắn tiếng Việt (≤90 ký tự) — rỗng khi !ok. */
  line: string;
}

/** Ngưỡng để kỹ năng "kê xếp" đáng nhắc: kệ trống dù kho còn lỡ từ chừng này lên mới hiện. */
export const SKILL_PAYOFF_MIN_LOSS = 50000;

const fmt = (n: number) => n.toLocaleString('vi-VN');

/**
 * GĐ1266 — con số thật cho một kỹ năng chủ tiệm, theo sổ người chơi đang có.
 * THUẦN: nhận dữ liệu có sẵn (caller trích từ store) — không đổi state/kinh tế/save (Luật 5).
 */
export function skillPayoff(
  id: SkillId,
  c: {
    /** Σ lương ca của nhân viên hiện có (đã tính dailyWage, CHƯA trừ good_boss — để ước khi học). */
    staffWageBill: number;
    /** Khách dự kiến hôm nay (trafficForecast(...).todayKhach). */
    todayKhach: number;
    /** Doanh thu hôm nay (stats.revenue). */
    revenueToday: number;
    /** Món bán hôm nay (stats.itemsSold). */
    itemsSoldToday: number;
    /** Khách ghé hôm nay (stats.customers). */
    customersToday: number;
    /** Khách bỏ về vì chờ quầy hôm nay (stats.missed.wait ?? 0). */
    waitMissed: number;
    /** Tiền hàng hỏng đêm qua (spoilNightReport(analytics, day-1)?.totalCost ?? 0). */
    yesterdaySpoil: number;
    /** Lãi bỏ lỡ hôm nay vì KỆ TRỐNG mà KHO CÒN (storeMissRevenue → rows inStorage>0). */
    shelfMissInStorageLoss: number;
  },
): SkillPayoff {
  switch (id) {
    case 'good_boss': {
      if (c.staffWageBill > 0) {
        const save = Math.round(c.staffWageBill * 0.1);
        return { ok: true, line: `💡 Bớt ~${fmt(save)}/ngày tiền lương.` };
      }
      return { ok: false, line: '' };
    }
    case 'local_legend': {
      if (c.todayKhach > 0) {
        const n = Math.round(c.todayKhach * 0.1);
        return { ok: true, line: `💡 Thêm ~${n} khách/ngày (10% người đi đường).` };
      }
      return { ok: false, line: '' };
    }
    case 'big_basket': {
      if (c.customersToday > 0 && c.itemsSoldToday > 0) {
        const avgPerItem = c.revenueToday / c.itemsSoldToday;
        const gain = Math.round(c.customersToday * 0.5 * avgPerItem);
        if (gain > 0) return { ok: true, line: `💡 Ước +${fmt(gain)}/ngày (khách hay lấy thêm 1 món).` };
      }
      return { ok: false, line: '' };
    }
    case 'fresh_keeper': {
      if (c.yesterdaySpoil > 0) {
        const save = Math.round(c.yesterdaySpoil * 0.25);
        return { ok: true, line: `💡 Bớt ~${fmt(save)}/ngày tiền hàng hỏng (đêm qua hỏng ${fmt(c.yesterdaySpoil)}đ).` };
      }
      return { ok: false, line: '' };
    }
    case 'neat_shelves': {
      if (c.shelfMissInStorageLoss >= SKILL_PAYOFF_MIN_LOSS) {
        return { ok: true, line: `💡 Hôm nay lỡ ~${fmt(c.shelfMissInStorageLoss)}đ vì kệ trống dù kho còn — thêm 20% chỗ bày.` };
      }
      return { ok: false, line: '' };
    }
    case 'quick_hands': {
      if (c.waitMissed > 0) {
        return { ok: true, line: `💡 Hôm nay ${c.waitMissed} khách bỏ vì chờ quầy — tính nhanh 20% giữ gần hết.` };
      }
      return { ok: false, line: '' };
    }
    default:
      return { ok: false, line: '' };
  }
}
