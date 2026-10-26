import { ROLES, type Staff } from './staff';

/**
 * Thăng tiến nhân viên: thu ngân giỏi → Trưởng quầy (quản lý quầy) → Quản lý chi nhánh.
 * Thăng chức tốn tiền thưởng, được tăng lương, đổi lại có thêm quyền lợi cho cả tiệm lẫn chi nhánh.
 * Chỉ có dữ liệu và hàm thuần; áp vào trạng thái ở `core/slices/staff` và `core/slices/branch`.
 */
export type Rank = 'lead' | 'chief';

export interface RankDef {
  name: string;
  icon: string;
  desc: string;
  /** Vai trò đang giữ để được thăng lên bậc này, và bậc phải có trước (nếu có). */
  fromRole: Staff['role'];
  fromRank?: Rank;
  minSkill: number;
  minDays: number;
  /** Tiền thưởng thăng chức (trả một lần). */
  cost: number;
  /** Lương ca nhân với hệ số này khi thăng chức. */
  raise: number;
}

export const RANKS: Record<Rank, RankDef> = {
  lead: {
    name: 'Trưởng quầy', icon: '🎖️', fromRole: 'cashier', minSkill: 4, minDays: 10, cost: 800_000, raise: 1.35,
    desc: 'Thu ngân kỳ cựu đứng đầu quầy: tự làm nhanh hơn, cả ca làm cùng đỡ mệt, và có người giám sát nên khó bị ăn bớt hơn.',
  },
  chief: {
    name: 'Quản lý chi nhánh', icon: '🏅', fromRole: 'cashier', fromRank: 'lead', minSkill: 5, minDays: 25, cost: 2_500_000, raise: 1.4,
    desc: 'Trưởng quầy xuất sắc lên làm quản lý: đảm nhiệm mọi việc của quản lý, gọi người làm thay rẻ hơn và giữ chân nhân viên tốt hơn.',
  },
};

/** Trưởng quầy: tự làm nhanh hơn. */
export const LEAD_SPEED_MUL = 1.1;
/** Trưởng quầy cùng ca: nhân viên khác mệt chậm hơn chừng này. */
export const LEAD_FATIGUE_MUL = 0.7;
/** Trưởng quầy giám sát: cộng vào xác suất bắt quả tang người tắt mắt. */
export const LEAD_CATCH_BONUS = 0.1;
/** Quản lý chi nhánh thăng từ trong ra: gọi người làm thay tốn gấp chừng này lương ca (thường là gấp đôi). */
export const CHIEF_COVER_MUL = 1.5;
/** Quản lý chi nhánh làm giảm xác suất nhân viên kiệt sức xin nghỉ việc. */
export const CHIEF_QUIT_MUL = 0.5;

export const rankOf = (st: Pick<Staff, 'rank'>): Rank | undefined => st.rank;
export const hasRank = (list: Pick<Staff, 'rank'>[], rank: Rank) => list.some((st) => st.rank === rank);

/** Kết quả xét thăng chức cho một người. */
export interface PromotionCheck {
  to: Rank;
  def: RankDef;
  ok: boolean;
  /** Điều kiện còn thiếu (để hiện cho chủ). */
  missing: string[];
}

/** Bậc kế tiếp người này có thể được thăng (null nếu hết đường hoặc không thuộc diện). */
export function nextPromotion(st: Staff, level: number): PromotionCheck | null {
  const to: Rank | null = !st.rank && st.role === 'cashier' ? 'lead' : st.rank === 'lead' ? 'chief' : null;
  if (!to) return null;
  const def = RANKS[to];
  const missing: string[] = [];
  if (st.skill < def.minSkill) missing.push(`tay nghề ${def.minSkill}★ (đang ${st.skill}★)`);
  if ((st.daysWorked ?? 0) < def.minDays) missing.push(`làm đủ ${def.minDays} ngày (đã ${st.daysWorked ?? 0})`);
  if (st.caught) missing.push('từng gian lận nên không được cất nhắc');
  if (to === 'chief' && level < ROLES.manager.unlock) missing.push(`cấp ${ROLES.manager.unlock} để thuê quản lý`);
  return { to, def, ok: missing.length === 0, missing };
}

/** Người được thăng chức: tăng lương; lên quản lý chi nhánh thì đổi sang vai trò quản lý. */
export function promoted(st: Staff, to: Rank): Staff {
  const wage = Math.round((st.wage * RANKS[to].raise) / 1000) * 1000;
  return to === 'chief' ? { ...st, wage, rank: 'chief', role: 'manager' } : { ...st, wage, rank: to };
}
