/**
 * Bảng giá đang để hụt bao nhiêu (GĐ227): tổng tiền/ngày "bỏ quên" khi không theo giá gợi ý.
 *
 * PricePanel đã soi TỪNG MÓN (suggestPrice + priceForecast 📈/📉/➖), nhưng không có một con số
 * TỔNG: "cả bảng giá hôm nay đang chừa lại ~Xđ/ngày chỉ vì vài món chưa về đúng gợi ý." Helper này
 * gộp lời dự phóng của từng món — lãi/ngày NẾU áp giá gợi ý (`suggestPrice`) trừ lãi/ngày Ở GIÁ
 * ĐANG ĐẶT (`priceForecast`) → chênh dương là tiền đang rò rỉ vì giữ giá lệch. THUẦN ĐỌC, chỉ dùng
 * lại đúng `suggestPrice` + `priceForecast` (không đổi công thức kinh tế / SAVE_VERSION / persist).
 *
 * Lưu ý độ đo: `priceForecast` trả null khi giá đang bằng giá gốc món (mới không đụng); khi đó lấy
 * baseline (baseProfitPerDay = lãi ở giá gốc) làm "giá đang đặt" để vẫn tính được chênh lệch.
 */
import { productById } from './products';
import { priceForecast, suggestPrice } from './pricing';

export interface PriceGapRow {
  id: string;
  price: number;
  soldPerDay?: number;
  wantedPerDay?: number;
}

export interface PriceGapOffender {
  id: string;
  name: string;
  /** Giá đang đặt. */
  fromPrice: number;
  /** Giá gợi ý đưa ra. */
  toPrice: number;
  /** Lãi/ngày đang có ở giá hiện tại. */
  nowProfit: number;
  /** Lãi/ngày nếu về đúng gợi ý. */
  tipProfit: number;
  /** Chênh dương mỗi ngày nếu đổi. */
  gainPerDay: number;
}

export interface PriceGapRead {
  /** Tổng tiền/ngày đang để hụt (chỉ cộng chênh dương có ý nghĩa). */
  totalMissedPerDay: number;
  /** Số món đang để hụt đáng kể. */
  count: number;
  /** Top món rò rỉ nhiều nhất (xếp giảm dần). */
  offenders: PriceGapOffender[];
  /** Có món nào đáng xử lý không. */
  actionable: boolean;
}

/** Dưới ngưỡng này coi như không đáng nói. */
export const PRICE_GAP_MIN_TOTAL = 5_000;

export function priceGap(rows: PriceGapRow[]): PriceGapRead {
  const offenders: PriceGapOffender[] = [];
  for (const r of rows) {
    const tip = suggestPrice(r.id, r.price, r.soldPerDay, r.wantedPerDay);
    if (tip.action === 'hold' || tip.price === r.price) continue; // gợi ý giữ giá — không rò rỉ
    const input = { soldPerDay: r.soldPerDay, wantedPerDay: r.wantedPerDay };
    const cur = priceForecast(r.id, r.price, input);
    const ahead = priceForecast(r.id, tip.price, input);
    if (!ahead) continue; // không dự phóng được giá mới (món nấu/thiếu dữ liệu)
    const nowProfit = cur ? cur.profitPerDay : ahead.baseProfitPerDay;
    const gain = ahead.profitPerDay - nowProfit;
    if (gain <= 0) continue;
    offenders.push({
      id: r.id,
      name: productById(r.id).name,
      fromPrice: r.price,
      toPrice: tip.price,
      nowProfit,
      tipProfit: ahead.profitPerDay,
      gainPerDay: gain,
    });
  }
  offenders.sort((a, b) => b.gainPerDay - a.gainPerDay);
  const total = offenders.reduce((n, o) => n + o.gainPerDay, 0);
  const actionable = total >= PRICE_GAP_MIN_TOTAL;
  return { totalMissedPerDay: total, count: offenders.length, offenders, actionable };
}
