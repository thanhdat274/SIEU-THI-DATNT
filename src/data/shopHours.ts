/**
 * Giờ mở cửa theo từng loại tiệm (một nguồn chung). Phút trong ngày; `to` ≥ 24*60 là sau nửa đêm.
 * - Tạp hóa chính: khách thật vào theo giờ này (customers.ts) — giữ 6:00–22:00 như trước, không đổi cân bằng.
 * - Tiệm xôi, quán nước: người đi làm/đi học cần ăn uống sớm nên MỞ SỚM HƠN tạp hóa.
 * - Tiện lợi: 24/7.
 * Tiệm xôi và quán nước chạy theo NGÀY (endDay) nên giờ ở đây là thông tin cho người chơi, doanh thu không đổi.
 */
export type ShopHoursKind = 'grocery' | 'tiemXoi' | 'quanNuoc' | 'convenience';
export const SHOP_HOURS: Record<ShopHoursKind, { name: string; from: number; to: number }> = {
  grocery: { name: 'Tạp hóa', from: 6 * 60, to: 22 * 60 },
  tiemXoi: { name: 'Tiệm xôi', from: 5 * 60, to: 11 * 60 },
  quanNuoc: { name: 'Quán nước', from: 5 * 60 + 30, to: 22 * 60 },
  convenience: { name: 'Cửa hàng tiện lợi', from: 0, to: 24 * 60 },
};
const hm = (m: number) => `${Math.floor(m / 60) % 24}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
export const shopHoursLabel = (k: ShopHoursKind): string => {
  const h = SHOP_HOURS[k];
  return h.to - h.from >= 24 * 60 ? '24/7' : `${hm(h.from)}–${hm(h.to)}`;
};
