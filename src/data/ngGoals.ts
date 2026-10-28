import { relTier } from './supplierRel';

/**
 * Mục tiêu vòng tái sinh (GĐ140) — trục NG+ khác lối chơi đầu (audit deleg_7cea64c0, Slice 2).
 *
 * Vấn đề: `doPrestige`/`prestigeRestart` chỉ là ngưỡng nhị phân + bonus cố định +8%; vòng 2 lại là
 * "chơi lại y nguyên + một hệ số", và người chơi cấp 60+ (vùng rời game đã chứng minh ở GĐ110/123)
 * không có lý do cụ thể để tái sinh. GĐ139 đóng hộp đen quyết định (preview chi phí cơ hội); GĐ140 này
 * thêm cho vòng mới một "cuốn mục tiêu" ngắn — vài mốc thành tích riêng theo vòng, nhận thưởng tiền.
 *
 * NGUYÊN TẮC đo được theo VÒNG: mọi goal phải đọc state bị `prestigeRestart` RESET về mặc định
 * (level, staff, ordersDone, biz.supplierRel, marketClearedDay/marketLast), KHÔNG đọc totals.*
 * (cumulative giữ qua các vòng) — vì vậy mỗi mục tiêu đo đúng tiến trình của RIÊNG vòng hiện tại,
 * khác với lần chơi đầu. UI chỉ hiện khi s.biz.prestige.level >= 1 (đã bước vào NG+).
 *
 * Thưởng chỉ là TIỀN (đơn vị đã có); không thêm cột tài nguyên mới — giữ độ phức tạp thấp, tái dùng
 * pipeline claimQuest (progress.ts) cho nhất quán. Reset `prestige.goalsClaimed=[]` mỗi vòng.
 */
export interface NgGoalCtx {
  /** Số lần đã tái sinh (>=1 mới hiện mục tiêu). */
  prestigeLevel: number;
  /** Cấp hiện tại — reset mỗi vòng. */
  level: number;
  /** Số nhân viên đang thuê — reset mỗi vòng. */
  staffCount: number;
  /** Số đơn đặt trước đã giao — reset mỗi vòng. */
  ordersDone: number;
  /** Bậc mối quen cao nhất trong vòng (relTier trên doanh mua vòng này — supplierRel reset mỗi vòng). */
  topRelTier: number;
  /** Đã bán được mẻ chợ phiên vòng này chưa (marketClearedDay đảo ngày — reset mỗi vòng). */
  marketCleared: boolean;
}

export interface NgGoal {
  id: string;
  icon: string;
  name: string;
  desc: string;
  /** Thưởng tiền khi đạt và nhận. */
  reward: number;
  done: (c: NgGoalCtx) => boolean;
}

/** Mục tiêu vòng tái sinh — thứ tự: mốc nhỏ trước, mốc lớn sau; mọi mốc đều đọc state reset-vòng. */
export const NG_GOALS: NgGoal[] = [
  {
    id: 'ng_cho_first',
    icon: '🧺',
    name: 'Chợ phiên mở hàng',
    desc: 'Bán mẻ gánh chợ phiên đầu tiên của vòng mới',
    reward: 600_000,
    done: (c) => c.marketCleared,
  },
  {
    id: 'ng_rel_t2',
    icon: '💼',
    name: 'Mối quen bậc 2',
    desc: 'Dồn mua về một mối lên bậc 2 trong vòng mới',
    reward: 1_000_000,
    done: (c) => c.topRelTier >= 2,
  },
  {
    id: 'ng_worker_3',
    icon: '🧍',
    name: 'Cả đội năm mới',
    desc: 'Thuê lại 3 nhân viên cùng lúc',
    reward: 800_000,
    done: (c) => c.staffCount >= 3,
  },
  {
    id: 'ng_orders_20',
    icon: '📦',
    name: 'Khách sĩ nhớ cũ',
    desc: 'Giao 20 đơn đặt trước trong vòng mới',
    reward: 700_000,
    done: (c) => c.ordersDone >= 20,
  },
  {
    id: 'ng_level_40',
    icon: '⭐',
    name: 'Về lại ngọn',
    desc: 'Đạt cấp 40 trong vòng mới',
    reward: 1_500_000,
    done: (c) => c.level >= 40,
  },
];

/** Thuần: dựng tiến trình các mục tiêu cho một state NG+ (prestigeLevel, level, staff, ordersDone, supplierRel, marketClearedDay). */
export function ngGoalProgress(input: {
  prestigeLevel: number;
  level: number;
  staffCount: number;
  ordersDone: number;
  supplierRel: Record<string, { spent: number; orders: number }>;
  marketClearedDay: number;
}): Array<Omit<NgGoal, 'done'> & { done: boolean }> {
  const topRelTier = Object.keys(input.supplierRel).length
    ? Math.max(...Object.values(input.supplierRel).map((r) => relTier(r.spent).level))
    : 0;
  const ctx: NgGoalCtx = {
    prestigeLevel: input.prestigeLevel,
    level: input.level,
    staffCount: input.staffCount,
    ordersDone: input.ordersDone,
    topRelTier,
    marketCleared: input.marketClearedDay > 0,
  };
  return NG_GOALS.map((g) => ({ ...g, done: g.done(ctx) }));
}
