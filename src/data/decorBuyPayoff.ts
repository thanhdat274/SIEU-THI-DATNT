/**
 * GĐ2216 — "Món đồ trang trí (+N🩷) này có đáng mua không?"
 *
 * decorPayoff (GĐ2214) lượng hoá TỔNG điểm 🩷 của tiệm kéo bao nhiêu khách/tiền mỗi ngày; còn TỪNG
 * món đồ decor trong danh sách mua (chậu cây, đèn lồng, thảm chùi chân...) chỉ chìa giá + "cộng mấy
 * điểm 🩷", CHƯA ai nói món đó đáng bao nhiêu. Điểm 🩷 của từng món (+Δ) cộng vào decorScoreOf rồi
 * chạy qua decorVisitBoost kéo khách (customers.ts:174) — decorBoost tuyến tính theo decor nên tác
 * dụng BIÊN của riêng món đồ = decorVisitBoost(Δ, sao) (đúng logic bước của decorPayoff).
 * Helper THUẦN, song song decorPayoff (GĐ2214) — chỉ đọc decor của món + decorVisitBoost + cpd kevel:
 *   Δ → thêm ~X khách/ngày (round) → ~Yđ doanh thu/ngày theo phí chi tiêu bình quân (avgPerVisit).
 * KHÔNG đổi state/save/kinh tế/seed (đồ decor chỉ là nội thất, không bị autoplay mua thêm → sim đứng).
 */
import { decorVisitBoost } from './layout';
import { customersPerDay } from './levels';
import { fmtNum } from '../core/format';

export interface DecorBuyPayoff {
  /** Giá mua món đồ (furniture.price). */
  price: number;
  /** Điểm 🩷 món đồ đó cộng (furniture.decor). */
  decorDelta: number;
  /** decorBoost biên của riêng món (cộng vào nền 0.5 lượt ghé như decorPayoff). */
  boost: number;
  /** Khách THÊM mỗi ngày nếu mua thêm món này. */
  extraKhach: number;
  /** Doanh thu thêm mỗi ngày theo phí chi tiêu bình quân (0 nếu không kê avgPerVisit). */
  moneyPerDay: number;
}

/** Lượng hoá mua thêm 1 đồ decor: Δ🩷 → khách/ngày + đ/ngày (biên). THUẦN — chỉ nhân số sẵn. */
export function decorBuyPayoff(
  price: number,
  decorDelta: number,
  overallStars: number,
  level: number,
  avgPerVisit = 0,
): DecorBuyPayoff {
  const boost = decorVisitBoost(decorDelta, overallStars); // (Δ/100)×(sao/5)
  const extraKhach = Math.round(boost * customersPerDay(level));
  return {
    price,
    decorDelta,
    boost,
    extraKhach,
    moneyPerDay: Math.round(extraKhach * avgPerVisit),
  };
}

/** Dòng ngắn cho thẻ mua nội thất: món +N🩷 này thêm bao nhiêu khách/doanh thu mỗi ngày. */
export function decorBuyPayoffLine(p: DecorBuyPayoff): string {
  if (p.decorDelta <= 0) return '';
  const khach = p.extraKhach > 0 ? `thêm ~${p.extraKhach} khách/ngày` : 'không kéo thêm khách đáng kể';
  const money = p.moneyPerDay > 0 ? ` (~${fmtNum(p.moneyPerDay)}đ doanh thu/ngày)` : '';
  return `mua → +${p.decorDelta}🩷 · ${khach}${money}`;
}
