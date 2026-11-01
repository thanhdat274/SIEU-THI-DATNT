import type { Festival } from './calendar';
import { productById } from './products';

// ───── Đón lễ (GĐ70): trữ sẵn trước mùa — trục giữ-chân THEO DỊP LỄ (seasonal) ─────
// Vài ngày trước mỗi dịp lễ, Sổ đầu ngày nhắc "trữ sẵn hàng bán trong dịp"; nếu tại
// cuối ngày trước khi lễ bắt đầu người chơi đã trữ đủ trong kho, nhận thưởng đón lễ
// một lần (theo cấp + độ lớn dịp). Khác hẳn monthly-loyalty (GĐ67/68/69): neo theo
// ngày dịp lễ THẬT (vài dịp/năm), thưởng hành động chuẩn bị, không đụng hồ sơ trung thành.

export const PREP_NOTICE = 3; // số ngày báo trước (tái dùng nhịp thông báo lễ)
export const PREP_MIN_QTY = 8; // đủ "trữ sẵn" khi mỗi món trong kho ≥ đơn vị này

/** Món cần trữ cho dịp: hàng HOT của dịp đã mở khóa (đều là hàng có thể nhập về kho). */
export const prepItems = (f: Festival, level: number) =>
  (f.hot ?? []).filter((id) => productById(id).unlock <= level);

/** Đã trữ sẵn đủ hàng chưa: mọi món cần trữ đều có trong kho ≥ PREP_MIN_QTY (đơn vị). */
export function prepReadiness(storage: Record<string, number>, f: Festival, level: number): { missing: string[]; ready: boolean } {
  const need = prepItems(f, level);
  const missing = need.filter((id) => (storage[id] ?? 0) < PREP_MIN_QTY);
  return { missing, ready: missing.length === 0 };
}

/** Thưởng đón lễ (một lần): scale theo cấp + số ngày lễ + sức hút dịp; làm tròn xuống nghìn. */
export function prepBonus(f: Festival, level: number): number {
  const days = f.to - f.from + 1;
  const base = (15000 + level * 1500) * Math.min(days, 3) * (f.traffic ?? 1);
  return Math.floor(base / 1000) * 1000;
}
