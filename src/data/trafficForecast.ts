/**
 * GĐ242 "Ngày mai trời thế nào — đông hay vắng khách?" — định lượng ảnh hưởng thời tiết tới lượt ghé.
 *
 * HUD/buổi sáng chỉ hiện biểu tượng dự báo + tip mô tả ("Trời đẹp, đông người qua lại"), không cho con
 * số. Thực tế mỗi thời tiết có hệ số ghé thiết kế (weather.ts `WEATHER[*].traffic`): sunny ~1.1,
 * cloudy ~1.0, rain ~0.8, storm ~0.55, fog ~0.9 — khớp lời tip ("Giông lớn, phần đông ở nhà"). Đây là
 * hằng số chuẩn được dùng làm cơ sở xác suất ghé, deterministic; khách đi đường ≈ customersPerDay(level)
 * × traffic. Helper này THUẦN ĐỌC (weather hôm nay/mai + level), trả hai hệ số + khách ước lượng và phán
 * đoán nên trữ thêm hay né nhập (trời bão đừng chất thêm hàng dễ tồn).
 */
import { WEATHER } from './weather';
import type { Weather } from './weather';
import { customersPerDay } from './levels';
import { dayEffects } from './calendar';

/** Ngưỡng coi là "đông khách" (trữ thêm) / "vắng" (né nhập thêm). */
export const TRAFFIC_HOT = 1.05;
export const TRAFFIC_SLOW = 0.85;

export interface TrafficForecast {
  todayTraffic: number;
  tomorrowTraffic: number;
  /** Khách đi đường ước lượng hôm nay / ngày mai = customersPerDay(level) × traffic. */
  todayKhach: number;
  tomorrowKhach: number;
  /** Chênh ngày mai so với hôm nay (%). */
  deltaPct: number;
  verdict: 'hot' | 'normal' | 'slow';
  /** GĐ1176 — "không hộp đen": lý do NGOÀI thời tiết khiến mai đông/vắng (lễ hội / đường sửa), để người
   *  chơi biết con số kia vì sao. undefined khi không có yếu tố đó (chỉ thời tiết). */
  cause?: string;
}

export function trafficForecast(opts: {
  weather: Weather;
  tomorrow: Weather;
  level: number;
  /** GĐ1174: ngày + seed để ghép hệ số lễ/đường sửa thật (`dayEffects.traffic`); bỏ trống = chỉ tính thời tiết. */
  day?: number;
  seed?: number;
}): TrafficForecast {
  const { weather, tomorrow, level, day, seed } = opts;
  const base = customersPerDay(level);
  // Nhu cầu thật = thời tiết × hệ số lễ hội/đường sửa (khớp counterDemand.demandForecast); thẻ sáng
  // trước đây chỉ tính thời tiết → cuối Tết (1.7) gặp mưa (0.8) báo nhầm "trời vắng đừng trữ hàng".
  const hasDay = seed !== undefined && day !== undefined;
  const deToday = hasDay ? dayEffects(seed!, day!, level) : null;
  const deTomorrow = hasDay ? dayEffects(seed!, day! + 1, level) : null;
  const todayTraffic = WEATHER[weather].traffic * (deToday?.traffic ?? 1);
  const tomorrowTraffic = WEATHER[tomorrow].traffic * (deTomorrow?.traffic ?? 1);
  const todayKhach = base * todayTraffic;
  const tomorrowKhach = base * tomorrowTraffic;
  const deltaPct = todayTraffic > 0 ? ((tomorrowTraffic / todayTraffic) - 1) * 100 : 0;

  let verdict: TrafficForecast['verdict'];
  if (tomorrowTraffic >= TRAFFIC_HOT) verdict = 'hot';
  else if (tomorrowTraffic <= TRAFFIC_SLOW) verdict = 'slow';
  else verdict = 'normal';

  let cause: string | undefined;
  if (deTomorrow) {
    const parts: string[] = [];
    const f = deTomorrow.festival;
    if (f && f.traffic > 1) parts.push(`${f.icon} ${f.name}`);
    if (deTomorrow.market?.kind === 'roadworks') parts.push('🚧 đường sửa');
    if (parts.length) cause = parts.join(' · ');
  }

  return { todayTraffic, tomorrowTraffic, todayKhach, tomorrowKhach, deltaPct, verdict, cause };
}

/** GĐ1229 — bề mặt "dự kiến hôm nay": `todayKhach` đã tính trong `trafficForecast` nhưng chỉ MAI được
 *  hiển thị (MorningSubtitle) — sáng ra người chơi nhập/bày cho HÔM NAY mà không biết hôm nay dự kiến
 *  bao nhiêu khách (chỉ soi được biểu tượng thời tiết định tính, không có số). Trả một câu gọn đọc từ
 *  `todayTraffic`/`todayKhach` đúng mô hình thật; rỗng khi dự kiến 0 (đừng ồn). THUẦN — chỉ ghép số
 *  từ hệ số đang dùng, không đổi kinh tế/save/seed. */
export function todayTrafficNote(tf: Pick<TrafficForecast, 'todayTraffic' | 'todayKhach'>): string {
  const n = Math.round(tf.todayKhach);
  if (n <= 0) return '';
  return `Dự kiến hôm nay ~${n} khách ghé (~${Math.round(tf.todayTraffic * 100)}% mức thường).`;
}
