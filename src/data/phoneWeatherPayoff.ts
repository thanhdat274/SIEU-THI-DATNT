/**
 * GĐ1309 — "Trời MƯA/GIÔNG là ngày XUI hay cơ hội?" soi kênh điện thoại đặt đơn (reframe tâm lý phạt).
 * HUD chỉ báo mặt âm (endDay 'Giông lớn, phần đông ở nhà') — người chơi coi ngày mưa là ngày lỗ, nhưng
 * CHƯA ai chỉ mặt TÍCH CỰC: ngày mưa/giông khách LƯỜI ra đường nên GỌI ĐIỆN đặt đơn tăng lên
 * (phoneOrders.ts:130 `weatherPhoneMul` — giông ×1.8 / mưa ×1.5), tần cuộc gọi chance được nhân lên
 * (phoneOrders.ts:144). Helper THUẦN ĐỌC: DÙNG THẲNG `weatherPhoneMul` + lặp đúng công thức chance
 * (cận 0.65) — CHỈ đọc/số sẵn, không bịa; trả về dòng reframe ngắn (≤90 cp). KHÔNG import store
 * (co-op an toàn), không đổi kinh tế/save/seed (Luật 5).
 */
import { weatherPhoneMul } from './phoneOrders';
import type { Weather } from './weather';
import { fmtMul } from './products';

export interface PhoneWeatherInfo {
  weather: Weather;
  /** Hệ số tần gọi điện theo thời tiết (giông 1.8 / mưa 1.5 / khác 1) — đọc thẳng weatherPhoneMul. */
  mul: number;
  /** Xác suất có cuộc gọi (cận 0.65) nếu trời nắng — lặp đúng phoneOrders.ts:144. */
  chanceBase: number;
  /** Xác suất có cuộc gọi hôm nay với thời tiết thật (đã nhân mul, cận 0.65). */
  chanceNow: number;
  /** Dòng reframe ngắn cho panel sáng — rỗng khi trời không mưa/giông. */
  line: string;
}

/** Lượng hóa cơ hội gọi điện đặt đơn hôm nay theo thời tiết. THUẦN — null khi trời nắng/râm (không ồn). */
export function phoneWeatherInfo(weather: Weather, level: number): PhoneWeatherInfo | null {
  const mul = weatherPhoneMul(weather);
  if (mul <= 1) return null; // trời không mưa/giông → không tăng cuộc gọi, không nhắc
  const base = Math.min(0.65, 0.3 + level * 0.01);
  const now = Math.min(0.65, base * mul);
  const kind = weather === 'storm' ? 'Giông' : 'Mưa';
  const line = `🌧️ ${kind} ghé ↓ nhưng gọi đặt đơn ×${fmtMul(mul)} — trực máy dễ giao hơn`;
  return { weather, mul, chanceBase: base, chanceNow: now, line };
}
