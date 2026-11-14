/**
 * GĐ2214 — "Trang trí đáng bao nhiêu khách/ngày?" (định lượng lợi ích điểm 🩷 decor).
 *
 * BuildPanel cho biết từng món decor cộng bao nhiêu 🩷 (`decorPopupLine`) và mốc bộ "Đồ Việt" (GĐ1515);
 * nhưng chưa ai nói điểm 🩷 GỘP của tiệm đang kéo thêm bao nhiêu KHÁCH và bao nhiêu TIỀN mỗi ngày.
 *
 * Sự thật kinh tế đang bật (customers.ts:174-181):
 *   decorBoost  = decorVisitBoost(decorScore, overallStars) = (decorScore / 100) × (sao/5)
 *   visit       = (0.5 + decorBoost + repVisitBonus) × traffic × ...
 * decor nằm CỘNG vào nền 0.5 lượt ghé như repVisitBonus — hiệu quả tương đối = decorBoost / 0.5.
 * Số khách tiệm chính mỗi ngày ≈ customersPerDay(level) → khách THÊM/ngày = decorBoost × cpd.
 *
 * Helper này THUẦN ĐỌC, song song repPayoff→repMoney (GĐ148/229): chỉ đọc decorScore, overallStars,
 * customersPerDay(level), avgPerVisit — KHÔNG đổi state/save/kinh tế/seed, co-op an toàn.
 */
import { decorVisitBoost, DECOR_VISIT_DIVISOR } from './layout';
import { customersPerDay } from './levels';
import { fmtNum } from '../core/format';

/** Nền xác suất ghé của khách đi đường (khớp customers.ts:181 / repPayoff VISIT_BASE). */
export const VISIT_BASE = 0.5;
/** Mốc "thêm bao nhiêu 🩷" cho dòng "nếu thêm trang trí" (ước lợi ích biên dễ đọc). */
export const DECOR_STEP = 10;

export interface DecorPayoff {
  /** Điểm 🩷 đang có (tổng mọi đồ decor chưa hỏng/dùng thử). */
  decorScore: number;
  /** Sao danh tiếng chung đang nhân vào (decor chỉ phát huy khi tiệm phục vụ tốt). */
  overallStars: number;
  /** decorBoost tuyệt đối đang áp (cộng vào nền 0.5 lượt ghé). */
  boost: number;
  /** % tương đối trên người đi đường = boost / 0.5. */
  pct: number;
  /** Ước khách THÊM mỗi ngày = boost × customersPerDay(level). */
  extraKhach: number;
  /** Doanh thu thêm mỗi ngày theo phí chi tiêu bình quân (avgPerVisit). */
  moneyPerDay: number;
  /** Ước khách thêm mỗi ngày nếu cộng thêm DECOR_STEP 🩷 (biên). */
  stepKhach: number;
  /** Doanh thu thêm mỗi ngày nếu cộng thêm DECOR_STEP 🩷. */
  stepMoney: number;
}

export function decorPayoff(
  decorScore: number,
  overallStars: number,
  level: number,
  avgPerVisit = 0,
): DecorPayoff {
  const boost = decorVisitBoost(decorScore, overallStars);
  const cpd = customersPerDay(level);
  const extraKhach = Math.round(boost * cpd);
  const stepBoost = (DECOR_STEP / DECOR_VISIT_DIVISOR) * (overallStars / 5);
  const stepKhach = Math.round(stepBoost * cpd);
  return {
    decorScore,
    overallStars,
    boost,
    pct: Math.round((boost / VISIT_BASE) * 1000) / 10,
    extraKhach,
    moneyPerDay: Math.round(extraKhach * avgPerVisit),
    stepKhach,
    stepMoney: Math.round(stepKhach * avgPerVisit),
  };
}

/** Một dòng ngắn cho bề mặt xây dựng: decor đang kéo bao nhiêu khách/tiền, thêm 10🩷 thì sao. */
export function decorPayoffLine(p: DecorPayoff): string {
  return `🩷 Trang trí ${p.decorScore} điểm đang kéo thêm ~${p.extraKhach} khách/ngày (${fmtNum(p.moneyPerDay)}đ/ngày); thêm 10🩷 ≈ +${p.stepKhach} khách (~${fmtNum(p.stepMoney)}đ/ngày).`;
}
