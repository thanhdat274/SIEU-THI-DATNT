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
}

export function trafficForecast(opts: {
  weather: Weather;
  tomorrow: Weather;
  level: number;
}): TrafficForecast {
  const { weather, tomorrow, level } = opts;
  const base = customersPerDay(level);
  const todayTraffic = WEATHER[weather].traffic;
  const tomorrowTraffic = WEATHER[tomorrow].traffic;
  const todayKhach = base * todayTraffic;
  const tomorrowKhach = base * tomorrowTraffic;
  const deltaPct = todayTraffic > 0 ? ((tomorrowTraffic / todayTraffic) - 1) * 100 : 0;

  let verdict: TrafficForecast['verdict'];
  if (tomorrowTraffic >= TRAFFIC_HOT) verdict = 'hot';
  else if (tomorrowTraffic <= TRAFFIC_SLOW) verdict = 'slow';
  else verdict = 'normal';

  return { todayTraffic, tomorrowTraffic, todayKhach, tomorrowKhach, deltaPct, verdict };
}
