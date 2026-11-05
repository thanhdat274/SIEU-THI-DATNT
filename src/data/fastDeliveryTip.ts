/**
 * GĐ1311 — "Giao nhanh nửa đầu khung hẹn có đáng vội?": '/hoa gấp đôi cửa sổ giao điện thoại'.
 * HUD đơn đang giao chỉ hiện 'hẹn HH:MM (còn X phút)' (PhoneAlerts.tsx:54) — người chơi tưởng "kịp hẹn là
 * đủ", nhưng CHƯA ai chỉ ra MỐC NỬA ĐẦU khung: giao trước `calledAt + DELIVERY_MINUTES/2` → boa FAST_TIP
 * (×2 so với ON_TIME_TIP, orders.ts:204-207 `fast = minutes <= fastWindow`). Mốc này đếm TỪ LÚC GỌI chứ
 * không phải nửa quãng còn lại của giờ hẹn — nên cửa sổ boa ×2 dễ bị lỡ âm thầm (hộp đen, Nguyên tắc a).
 * Helper THUẦN ĐỌC: DÙNG THẲNG `fastWindow` (phoneOrders.ts:90) + lặp đúng tip orders.ts:207
 * (round(value×FAST_TIP/1000)×1000) — CHỈ nhân/gộp số ghi sẵn, không bịa (Nguyên tắc c); trả dòng ngắn
 * (≤90 cp) chỉ khi còn trong cửa sổ nhanh. KHÔNG import store (co-op an toàn), không đổi kinh tế/save/seed (Luật 5).
 */
import { FAST_TIP, fastWindow, ON_TIME_TIP, type PhoneOrder } from './phoneOrders';
import { formatMoney } from './products';

export interface FastTipInfo {
  /** Phút trong ngày bắt đầu hết hạn cửa sổ boa ×2 (`calledAt + 37.5`). */
  fastDeadline: number;
  /** Mốc giờ HH:MM của fastDeadline (formatClock floor — an toàn chiều sớm hơn). */
  deadlineClock: string;
  /** Bao gồm số phút đến hết cửa sổ ×2 (ceil). */
  fastLeft: number;
  /** Boa giao nhanh (FAST_TIP, làm tròn 1000 như sim). */
  fastTip: number;
  /** Boa giao kịp hẹn thường (ON_TIME_TIP, làm tròn 1000 như sim). */
  onTimeTip: number;
  /** Chênh lệch boa ×2 so với kịp hẹn (luôn ≥ 0). */
  delta: number;
}

/** Lượng hóa cửa sổ boa ×2 của một đơn điện thoại. THUẦN — chỉ đọc số sẵn. */
export function fastTipInfo(
  o: Pick<PhoneOrder, 'calledAt' | 'dueAt'>,
  value: number,
  minutes: number,
): FastTipInfo {
  const fastDeadline = fastWindow(o as PhoneOrder);
  const fastLeft = Math.ceil(fastDeadline - minutes);
  const fastTip = Math.round((value * FAST_TIP) / 1000) * 1000;
  const onTimeTip = Math.round((value * ON_TIME_TIP) / 1000) * 1000;
  const m = Math.floor(fastDeadline) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return {
    fastDeadline,
    deadlineClock: `${hh}:${mm}`,
    fastLeft,
    fastTip,
    onTimeTip,
    delta: fastTip - onTimeTip,
  };
}

/** Dòng đường giao nhanh — rỗng khi đã trôi qua cửa sổ ×2 (không ồn). ≤90 cp. */
export function fastTipLine(
  o: Pick<PhoneOrder, 'calledAt' | 'dueAt'>,
  value: number,
  minutes: number,
): string {
  const t = fastTipInfo(o, value, minutes);
  if (t.fastLeft <= 0) return '';
  return `⚡ Giao trước ${t.deadlineClock} → boa ${formatMoney(t.fastTip)} (gấp đôi, kịp hẹn ${formatMoney(t.onTimeTip)})`;
}
