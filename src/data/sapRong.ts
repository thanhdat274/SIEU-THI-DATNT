import { isWeekend } from './calendar';
import type { Weather } from './weather';

/**
 * Sạp hàng rong ở Ngõ 2 (GĐ501, bước 3 mở rộng bản đồ): thuê lô trống, mỗi lô một sạp bán ngoài trời.
 * Trời mưa/bão sạp nghỉ (ngoài trời không bán được — lý do tiệm xôi thành nhà ở GĐ483); cuối tuần đông hơn.
 */
export const SAP_LOTS = 4;
export const SAP_LOT_COST = 5_000_000;
export const SAP_BASE_INCOME = 300_000;

/**
 * GĐ507: món mỗi sạp — lựa chọn theo dự báo: nước mía ăn nắng, bánh mì ăn ngày thường (người đi làm),
 * xôi ăn sáng se lạnh (mây/sương). Save cũ không có món = Tổng hợp.
 */
export interface SapKind { id: string; icon: string; name: string; weather: Partial<Record<Weather, number>>; weekday: number; weekend: number; hint: string; /** GĐ511: màu hàng + ô dù 3D (thiếu = màu riêng từng lô). */ colors?: [goods: number, umbrella: number] }
export const SAP_KINDS: SapKind[] = [
  { id: 'tonghop', icon: '🛒', name: 'Tổng hợp', weather: {}, weekday: 1, weekend: 1.3, hint: 'Đều đều, cuối tuần ×1,3' },
  { id: 'nuocmia', icon: '🥤', name: 'Nước mía', weather: { sunny: 1.5, cloudy: 0.9, fog: 0.7 }, weekday: 1, weekend: 1.3, hint: 'Nắng ×1,5, mây ×0,9, sương ×0,7', colors: [0x55efc4, 0x00b894] },
  { id: 'banhmi', icon: '🥖', name: 'Bánh mì', weather: {}, weekday: 1.2, weekend: 1, hint: 'Ngày thường ×1,2, cuối tuần ×1', colors: [0xe1a95f, 0xe17055] },
  { id: 'xoi', icon: '🍙', name: 'Xôi', weather: { cloudy: 1.2, fog: 1.25, sunny: 0.9 }, weekday: 1, weekend: 1.3, hint: 'Mây ×1,2, sương ×1,25, nắng ×0,9', colors: [0xffeaa7, 0xfdcb6e] },
];
export const sapKindOf = (kinds: readonly string[] | undefined, i: number) =>
  SAP_KINDS.find((k) => k.id === kinds?.[i]) ?? SAP_KINDS[0];
/** Món kế tiếp khi bấm đổi món ở lô i (vòng tròn). */
export function nextSapKinds(kinds: readonly string[] | undefined, i: number): string[] {
  const out = Array.from({ length: Math.max(i + 1, kinds?.length ?? 0) }, (_, j) => sapKindOf(kinds, j).id);
  out[i] = SAP_KINDS[(SAP_KINDS.indexOf(sapKindOf(kinds, i)) + 1) % SAP_KINDS.length].id;
  return out;
}

/** Lãi một ngày của sạp lô i theo món (0 khi mưa/bão). */
export function sapLotIncome(kind: SapKind, weather?: Weather, day?: number): number {
  if (weather === 'rain' || weather === 'storm') return 0;
  const wk = day !== undefined && isWeekend(day) ? kind.weekend : kind.weekday;
  return Math.round(SAP_BASE_INCOME * wk * (weather ? kind.weather[weather] ?? 1 : 1));
}

/** GĐ508: món lãi nhất cho một ngày (để gợi ý theo dự báo ngày mai); hoà thì giữ món đứng trước. */
export function bestSapKind(weather: Weather | undefined, day?: number): SapKind {
  return SAP_KINDS.reduce((a, b) => (sapLotIncome(b, weather, day) > sapLotIncome(a, weather, day) ? b : a));
}

/** Lãi ròng một ngày của các sạp đã thuê (0 khi mưa/bão). */
export function sapRongIncome(lots: number | undefined, weather?: Weather, day?: number, kinds?: readonly string[]): number {
  const n = Math.max(0, Math.min(SAP_LOTS, lots ?? 0));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += sapLotIncome(sapKindOf(kinds, i), weather, day);
  return sum;
}

/** GĐ502: hộp chặn lưới của bàn sạp thứ i (bàn 1,8×0,9 tại x 86+8i, z −0,5). */
export const sapStallBox = (i: number) => ({ x1: 85.1 + i * 8, z1: -0.95, x2: 86.9 + i * 8, z2: -0.05 });

/** GĐ503: số người dạo phố Ngõ 2 (2 người/sạp, tối đa 6): chỉ 6h–20h, mưa/bão vắng. */
export function sapStrollerCount(lots: number | undefined, weather: Weather | undefined, minutes: number): number {
  const m = minutes % 1440;
  if (!lots || weather === 'rain' || weather === 'storm' || m < 6 * 60 || m >= 20 * 60) return 0;
  return Math.min(6, Math.min(SAP_LOTS, lots) * 2);
}

/** GĐ509: icon món các lô cho tin cuối ngày, vd "🥤🥤🥖" (thiếu món = 🛒). */
export const sapKindIcons = (lots: number | undefined, kinds?: readonly string[]) =>
  Array.from({ length: Math.max(0, Math.min(SAP_LOTS, lots ?? 0)) }, (_, i) => sapKindOf(kinds, i).icon).join('');
