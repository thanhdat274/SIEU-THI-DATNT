import type { Weather } from './weather';
import { weatherMul, quanWeekendMul, quanMatchMul, QUAN_PRICE_OPTIONS, QUAN_NUOC_MAX_STAFF, type QuanNuocState } from './quanNuoc';
import { quanNuocProjection } from './quanNuocInsights';

/**
 * Dải trạng thái quán nước: vài chip một dòng đọc nhanh "hôm nay quán thế nào" (khách, kho, nhân
 * viên, giá, dự kiến lời). THUẦN — chỉ ghép lại số liệu sẵn có từ quanNuocProjection, không đổi
 * state/save/kinh tế. Mỗi chip có tone để UI tô màu: ok / warn / bad / info.
 */
export interface StatusChip { id: string; icon: string; text: string; tone: 'ok' | 'warn' | 'bad' | 'info' }

export function quanStatusChips(
  q: QuanNuocState, level: number, drinkUnits: number, weather: Weather, day: number,
): StatusChip[] {
  if (!q.open) return [];
  const out: StatusChip[] = [];
  const p = quanNuocProjection(q, level, drinkUnits, weather, day);

  // Khách: tổng các hệ số ngoài tầm tay chủ (trời, cuối tuần, trận bóng)
  const crowd = weatherMul(weather) * quanWeekendMul(day) * quanMatchMul(day, weather);
  out.push(crowd >= 1.15
    ? { id: 'crowd', icon: '👥', text: 'Khách đông', tone: 'ok' }
    : crowd <= 0.85
      ? { id: 'crowd', icon: '👥', text: 'Khách vắng', tone: 'warn' }
      : { id: 'crowd', icon: '👥', text: 'Khách bình thường', tone: 'info' });

  // Kho: đủ bán hết nhu cầu dự kiến hay thiếu
  const short = p.wanted - p.served;
  out.push(short <= 0
    ? { id: 'stock', icon: '🥤', text: `Kho đủ (${drinkUnits} ly)`, tone: 'ok' }
    : drinkUnits <= 0
      ? { id: 'stock', icon: '🥤', text: 'Hết đồ uống', tone: 'bad' }
      : { id: 'stock', icon: '🥤', text: `Kho thiếu ~${short} ly`, tone: 'warn' });

  out.push({
    id: 'staff', icon: '🧑‍🍳',
    text: q.staff === 0 ? 'Chưa có nhân viên' : `${q.staff}/${QUAN_NUOC_MAX_STAFF} nhân viên`,
    tone: q.staff === 0 ? 'warn' : 'info',
  });
  out.push({ id: 'price', icon: '🏷️', text: `Giá ${QUAN_PRICE_OPTIONS[q.price].label}`, tone: 'info' });
  out.push({ id: 'profit', icon: '💰', text: `Dự kiến lời ${p.profit >= 0 ? '+' : '−'}${Math.abs(Math.round(p.profit / 1000))}k`, tone: p.profit >= 0 ? 'ok' : 'bad' });
  return out;
}
