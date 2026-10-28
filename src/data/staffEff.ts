/** Hiệu quả đào tạo nhân viên "thấy được": đọc thuần từ state — biến chi tiêu đào tạo (bí ở chỗ
 *  không số nào được hiện ngoài UI) thành quyết định rõ: +1★ tăng tốc bao nhiêu, lợi ích theo vai trò,
 *  giá bao nhiêu, còn thiếu bao nhiêu kinh nghiệm. Không đổi cách tính, chỉ soi sáng số đã có. */

import { ROLES, BARTENDER_SPEED_PER_STAR, WAREHOUSE_KEEP_PER_STAR, CARE_PATIENCE_PER_STAR, type Staff, type StaffRole } from './staff';
import { expToNext, trainCost, workSpeed } from './staffTraits';

export interface StaffEff {
  /** Hệ số tốc độ làm việc tổng (đã nhân tính cách, không gồm chức trưởng quầy). */
  speed: number;
  /** % tăng tốc nếu lên 1★. */
  nextDeltaPct: number;
  /** Lợi ích theo vai trò ở số sao hiện tại (chỉ vai có bonus riêng; người khác = null). */
  roleBonus: string | null;
  /** Kinh nghiệm đã tích / cần để lên sao kế tiếp. */
  exp: number;
  expNeeded: number;
  /** Giá một buổi đào tạo (cộng 4 exp). */
  trainCost: number;
  /** Đã 5★ tối đa. */
  maxed: boolean;
  /** Lợi ích theo số sao hiện tại, đọc từ hằng số vai (khớp comment "5★ …" trong staff.ts). */
}

const ROLE_BONUS: Partial<Record<StaffRole, (s: number) => string>> = {
  bartender: (s) => `Pha chế nhanh thêm ${Math.round(BARTENDER_SPEED_PER_STAR * 100 * s)}%`,
  cook: (s) => `Nấu mau hơn theo tay nghề (5★ ×1.5)`,
  warehouse_mgr: (s) => `Hàng hỏng qua đêm chậm ${Math.round(WAREHOUSE_KEEP_PER_STAR * 100 * s)}%`,
  customer_care: (s) => `Khách chịu chờ thêm ${Math.round(CARE_PATIENCE_PER_STAR * 100 * s)}%`,
};

export function staffEff(st: Staff): StaffEff {
  const next = Math.min(st.skill + 1, 5);
  const speed = workSpeed(st);
  const nextDeltaPct = next > st.skill ? Math.round((workSpeed({ ...st, skill: next }) / speed - 1) * 100) : 0;
  return {
    speed,
    nextDeltaPct,
    roleBonus: ROLES[st.role] ? ROLE_BONUS[st.role]?.(st.skill) ?? null : null,
    exp: st.exp ?? 0,
    expNeeded: expToNext(st.skill),
    trainCost: trainCost(st.skill),
    maxed: st.skill >= 5,
  };
}
