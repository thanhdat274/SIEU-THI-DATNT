import type { Furniture } from '../core/gameTypes';
import type { FurnitureType } from './furniture';

/**
 * GĐ1515 — Bộ sưu tập "Đồ Việt" (mốc đặt đủ món cùng bộ → thưởng; Việt hoá hệ sổ sưu tập decor tham khảo).
 * Chỉ gồm các món decor cao cấp (mở cấp > golden 30) → sim kinh tế đầu game không đổi.
 * Đếm số LOẠI khác nhau đang đặt (không tính đồ hỏng / đồ thử); mua trùng không cộng thêm.
 */
export const VIET_SET: readonly FurnitureType[] = ['binh_bat_trang', 'trong_dong', 'chua_mot_cot', 'mam_ngu_qua', 'den_ong_sao'];
/** Mốc [số loại, 🩷 thưởng] — lấy mốc cao nhất đạt được (không cộng dồn). */
export const VIET_SET_TIERS: readonly [number, number][] = [[2, 5], [4, 12], [5, 20]];

export function vietSetCount(list: Pick<Furniture, 'type' | 'broken' | 'trial'>[]): number {
  return new Set(list.filter((f) => !f.broken && !f.trial && VIET_SET.includes(f.type)).map((f) => f.type)).size;
}

export function vietSetDecorBonus(list: Pick<Furniture, 'type' | 'broken' | 'trial'>[]): number {
  const n = vietSetCount(list);
  let bonus = 0;
  for (const [need, b] of VIET_SET_TIERS) if (n >= need) bonus = b;
  return bonus;
}
