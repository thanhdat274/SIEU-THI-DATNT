/**
 * GĐ1189 "Tiền giả rò bao nhiêu? — Mắt tinh có đáng?" — soi giá trị thất thoát vì tiền giả + món
 * tiền kỹ năng Mắt tinh tiết kiệm.
 *
 * Trước GĐ1189 chưa nơi nào cho con số "mỗi ngày tiền giả lọt ~bao nhiêu" — khác hẳn anh em kẻ trộm
 * có thẻ rò rỉ + hoàn vốn camera (GĐ236). Người chơi chỉ thấy dòng cuối ngày `💸 Kiểm két thấy X tiền
 * giả` (endDay.ts:375) — không biết con số lọt/ngày hiện tại, cũng không biết kỹ năng Mắt tinh thực sự
 * chặn được bao nhiêu tiền để quyết có dành điểm kỹ năng hay không. Helper này đọc 100% THUẦN quan sát
 * (không đổi state/save/kinh tế/seed), dùng đúng hằng số cơ chế `RISK_RULES.counterfeit`:
 *   - `chance` (0.01) — tỉ lệ giỏ tiền mặt là tiền giả (chỉ giỏ ≥ mệnh giá nhỏ nhất mới bị, checkCash).
 *   - `notes` — các mệnh giá; mệnh giá kỳ vọng = trung bình các mệnh giá ≤ giỏ bán lẻ trung bình.
 *   - `detect` (0.55) + `sharpEyeBonus` (0.35) — khớp checkCash: detect = detect + (Mắt tinh ? bonus : 0).
 *   - `unlock` (20) — cấp mở màn tiền giả.
 * Kiểu ước lượng kỳ vọng như thẻ trộm: probe số giỏ tiền mặt bằng số khách hôm nay (revenue/customers).
 * Không RNG, không seed — con số kỳ vọng, ghi rõ là "ước lượng".
 */
import { RISK_RULES } from './risks';

/** Cấp mở màn tiền giả (khớp RISK_RULES.counterfeit.unlock). */
export const COINFAKE_UNLOCK = RISK_RULES.counterfeit.unlock;

/** Mệnh giá tiền giả (khớp RISK_RULES.counterfeit.notes). */
export const COINFAKE_NOTES = RISK_RULES.counterfeit.notes;

/** Ngưỡng phán đoán mức rò rỉ/ngày (đồng). Mức tiền giả nhỏ hơn nhiều so với trộm. */
export const COINFAKE_LEAK_HIGH = 30000;
export const COINFAKE_LEAK_MODERATE = 10000;

export interface CounterfeitRisk {
  verdict: 'locked' | 'low' | 'moderate' | 'high';
  /** Số giỏ tiền mặt kỳ vọng là tiền giả trong ngày (khách × chance). */
  attemptsPerDay: number;
  /** Giỏ bán lẻ trung bình một khách trả tiền hôm nay (revenue / customers). */
  avgBasketRetail: number;
  /** Mệnh giá tiền giả kỳ vọng một lần (mean các mệnh giá ≤ giỏ bán lẻ trung bình). */
  avgNote: number;
  /** Xác suất phát hiện hiện tại (có/không Mắt tinh). */
  detect: number;
  /** Tiền giả lọt kỳ vọng mỗi ngày ở mức hiện tại. */
  leakPerDay: number;
  /** Mắt tinh chặn thêm ước lượng mỗi ngày (0 nếu đã học). */
  sharpEyeSavesPerDay: number;
  hasSharpEye: boolean;
  /** Tiền giả chưa thu hồi KÉT ĐANG GIỮ hôm nay (quanh năm chủ không lấy lại được — chỉ reset qua ngày). */
  fakeCashToday: number;
}

export function counterfeitRisk(opts: {
  /** Cấp tiệm. */
  level: number;
  /** Số khách hôm nay (stats.customers) — probe số giỏ tiền mặt. */
  customers: number;
  /** Doanh thu hôm nay (stats.revenue). */
  revenue: number;
  /** Đã học kỹ năng Mắt tinh chưa. */
  hasSharpEye: boolean;
  /** Tiền giả két đang giữ hôm nay (state.fakeCash). */
  fakeCash: number;
}): CounterfeitRisk {
  const { level, customers, revenue, hasSharpEye, fakeCash } = opts;

  if (level < COINFAKE_UNLOCK) {
    return {
      verdict: 'locked', attemptsPerDay: 0, avgBasketRetail: 0, avgNote: 0, detect: 0,
      leakPerDay: 0, sharpEyeSavesPerDay: 0, hasSharpEye, fakeCashToday: fakeCash,
    };
  }

  const avgBasket = customers > 0 ? revenue / customers : 0;
  const attemptsPerDay = customers * RISK_RULES.counterfeit.chance;
  const applicable = RISK_RULES.counterfeit.notes.filter((n) => n <= avgBasket);
  const avgNote = applicable.length ? applicable.reduce((a, b) => a + b, 0) / applicable.length : 0;

  const detectBase = RISK_RULES.counterfeit.detect;
  const detectEye = detectBase + RISK_RULES.counterfeit.sharpEyeBonus;
  const detect = hasSharpEye ? detectEye : detectBase;

  const leakNoEye = attemptsPerDay * avgNote * (1 - detectBase);
  const leakWithEye = attemptsPerDay * avgNote * (1 - detectEye);
  const leakPerDay = hasSharpEye ? leakWithEye : leakNoEye;
  // Mắt tinh chặn thêm đúng phần bonus (0.35) của số lần tiền giả.
  const sharpEyeSavesPerDay = hasSharpEye ? 0 : attemptsPerDay * avgNote * RISK_RULES.counterfeit.sharpEyeBonus;

  let verdict: CounterfeitRisk['verdict'];
  if (leakPerDay >= COINFAKE_LEAK_HIGH) verdict = 'high';
  else if (leakPerDay >= COINFAKE_LEAK_MODERATE) verdict = 'moderate';
  else verdict = 'low';

  return {
    verdict, attemptsPerDay, avgBasketRetail: avgBasket, avgNote, detect, leakPerDay,
    sharpEyeSavesPerDay, hasSharpEye, fakeCashToday: fakeCash,
  };
}
