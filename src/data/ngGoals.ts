import { relTier, PARTNER_TIERS } from './supplierRel';
import { MAX_LEVEL } from './levels';

/**
 * Mục tiêu vòng tái sinh (GĐ140) — trục NG+ khác lối chơi đầu (audit deleg_7cea64c0, Slice 2).
 *
 * Vấn đề: `doPrestige`/`prestigeRestart` chỉ là ngưỡng nhị phân + bonus cố định +8%; vòng 2 lại là
 * "chơi lại y nguyên + một hệ số", và người chơi cấp 60+ (vùng rời game đã chứng minh ở GĐ110/123)
 * không có lý do cụ thể để tái sinh. GĐ139 đóng hộp đen quyết định (preview chi phí cơ hội); GĐ140 này
 * thêm cho vòng mới một "cuốn mục tiêu" ngắn — vài mốc thành tích riêng theo vòng, nhận thưởng tiền.
 *
 * NGUYÊN TẮC đo được theo VÒNG: mọi goal phải đọc state bị `prestigeRestart` RESET về mặc định
 * (level, staff, ordersDone, biz.supplierRel, marketClearedDay/marketLast, rival/rivalsBeaten),
 * KHÔNG đọc totals.* (cumulative giữ qua các vòng) — vì vậy mỗi mục tiêu đo đúng tiến trình của
 * RIÊNG vòng hiện tại, khác với lần chơi đầu. UI chỉ hiện khi s.biz.prestige.level >= 1 (đã bước vào NG+).
 *
 * GĐ171 (audit tiến trình 29/10 — phát hiện "cảng cuối"): vòng sau KHÁC vòng trước thật sự —
 * (a) target mục tiêu nhân theo vòng (runTargetScale, trần ×3), tiền thưởng cũng nhân nhẹ hơn
 * (runRewardScale, trần ×2.5) — người vòng sau làm việc khó hơn, đền xứng hơn, nhưng vẫn không phải
 * "mỏ tiền" vì target khó đi lên nhanh hơn thưởng; (b) thêm 2 mục tiêu đo TRONG VÒNG nhờ GĐ170
 * (prestigeRestart reset rivalsBeaten về 0 mỗi vòng): hạ đối thủ + mốc cấp 50 cứng.
 *
 * Thưởng chỉ là TIỀN (đơn vị đã có); không thêm cột tài nguyên mới — giữ độ phức tạp thấp, tái dùng
 * pipeline claimQuest (progress.ts) cho nhất quán. Reset `prestige.goalsClaimed=[]` mỗi vòng.
 */
export interface NgGoalCtx {
  /** Số lần đã tái sinh (>=1 mới hiện mục tiêu). Vòng hiện tại = prestigeLevel + 1. */
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
  /** GĐ171: số đối thủ đã hạ TRONG VÒNG — prestigeRestart reset về 0 mỗi vòng (GĐ170), đo được. */
  rivalsBeaten: number;
}

export interface NgGoal {
  id: string;
  icon: string;
  name: string;
  /** Mô tả; chuỗi `{target}` được thay bằng target ĐÃ NHÂN theo vòng khi dựng tiến trình. */
  desc: string;
  /** Thưởng tiền GỐC (vòng 1) khi đạt và nhận — vòng sau nhân theo runRewardScale. */
  reward: number;
  /** Target gốc vòng 1 — chỉ đặt với mục tiêu có con số nhân được; bỏ qua với mục tiêu boolean/mốc cứng. */
  baseTarget?: number;
  /** Trần tuyệt đối của target (đơn vị riêng từng mục tiêu) — chặn target vượt giới hạn hệ thống. */
  targetCap?: number;
  done: (c: NgGoalCtx, target: number) => boolean;
}

/** ── GĐ171: hệ số nhân theo VÒNG (vòng hiện tại N = prestigeLevel + 1; vòng 1 giữ nguyên) ──
 * Target: ×(1 + 0.5×(N−1)) — vòng 2 ×1.5, vòng 3 ×2, vòng 5+ chạm trần ×3. Trần đặt để mục tiêu
 * có trần hệ thống (cấp tối đa, bậc mối tối đa) không thành mốc không-thể-đạt.
 * Thưởng: ×(1 + 0.3×(N−1)) — vòng 2 ×1.3, vòng 6+ trần ×2.5. Nhân chậm hơn target (~0.3 vs ~0.5)
 * nên giá trị "tiền trên đơn vị công sức" giảm dần: đền xứng nhưng không thành mỏ tiền.
 */
/** Trần hệ số nhân target mục tiêu theo vòng. */
export const NG_GOAL_RUN_SCALE_MAX = 3;
/** Trần hệ số nhân tiền thưởng mục tiêu theo vòng. */
export const NG_GOAL_REWARD_SCALE_MAX = 2.5;

/** Hệ số nhân TARGET mục tiêu của vòng hiện tại (prestigeLevel = số lần đã tái sinh). */
export function runTargetScale(prestigeLevel: number): number {
  return Math.min(NG_GOAL_RUN_SCALE_MAX, 1 + 0.5 * Math.max(0, prestigeLevel));
}

/** Hệ số nhân TIỀN THƯỞNG mục tiêu của vòng hiện tại. */
export function runRewardScale(prestigeLevel: number): number {
  return Math.min(NG_GOAL_REWARD_SCALE_MAX, 1 + 0.3 * Math.max(0, prestigeLevel));
}

/** Target của một mục tiêu ở vòng hiện tại (undefined với mục tiêu không có target nhân được). */
function scaledTarget(g: NgGoal, prestigeLevel: number): number | undefined {
  if (g.baseTarget === undefined) return undefined;
  const raw = Math.round(g.baseTarget * runTargetScale(prestigeLevel));
  return g.targetCap !== undefined ? Math.min(g.targetCap, raw) : raw;
}

/** Mục tiêu vòng tái sinh — thứ tự: mốc nhỏ trước, mốc lớn sau; mọi mốc đều đọc state reset-vòng. */
export const NG_GOALS: NgGoal[] = [
  {
    id: 'ng_cho_first',
    icon: '🧺',
    name: 'Chợ phiên mở hàng',
    desc: 'Bán mẻ gánh chợ phiên đầu tiên của vòng mới',
    reward: 600_000,
    // Boolean (đã/chưa bán mẻ đầu) — không có con số để nhân; vòng sau chỉ đền thêm tiền.
    done: (c) => c.marketCleared,
  },
  {
    id: 'ng_rel_t2',
    icon: '💼',
    name: 'Mối quen thân thiết',
    desc: 'Dồn mua về một mối lên bậc {target} trong vòng mới',
    reward: 1_000_000,
    baseTarget: 2,
    targetCap: PARTNER_TIERS.length, // bậc mối cao nhất là 5 — không vượt được
    done: (c, t) => c.topRelTier >= t,
  },
  {
    id: 'ng_worker_3',
    icon: '🧍',
    name: 'Cả đội năm mới',
    desc: 'Thuê lại {target} nhân viên cùng lúc',
    reward: 800_000,
    baseTarget: 3,
    done: (c, t) => c.staffCount >= t,
  },
  {
    id: 'ng_orders_20',
    icon: '📦',
    name: 'Khách sĩ nhớ cũ',
    desc: 'Giao {target} đơn đặt trước trong vòng mới',
    reward: 700_000,
    baseTarget: 20,
    done: (c, t) => c.ordersDone >= t,
  },
  {
    // GĐ171: đo được nhờ prestigeRestart reset rivalsBeaten = 0 mỗi vòng (GĐ170) — đối thủ hạ
    // TRONG vòng này, không tính thành tựu "rival" cả đời. Vòng sau phải hạ nhiều hơn.
    id: 'ng_rival_2',
    icon: '⚔️',
    name: 'Sát phạt đầu hẻm',
    desc: 'Hạ {target} đối thủ trong vòng này (rival khởi lại từ đầu mỗi vòng)',
    reward: 900_000,
    baseTarget: 2,
    done: (c, t) => c.rivalsBeaten >= t,
  },
  {
    id: 'ng_level_40',
    icon: '⭐',
    name: 'Về lại ngọn',
    desc: 'Đạt cấp {target} trong vòng mới',
    reward: 1_500_000,
    baseTarget: 40,
    targetCap: MAX_LEVEL, // vòng 5+ target 40×3=120 vượt cấp tối đa 100 — bó về 100
    done: (c, t) => c.level >= t,
  },
  {
    // GĐ171: mốc cứng cuối vòng — KHÔNG nhân theo vòng (vòng nào cũng phải chạm cấp 50 thật).
    id: 'ng_level_50',
    icon: '🌟',
    name: 'Nửa trăm tròn',
    desc: 'Đạt cấp 50 trong vòng này — mốc cứng, không nhân theo vòng',
    reward: 1_200_000,
    done: (c) => c.level >= 50,
  },
];

/** Thuần: dựng tiến trình các mục tiêu cho một state NG+ (prestigeLevel, level, staff, ordersDone, supplierRel, marketClearedDay, rivalsBeaten).
 * Trả về target đã nhân theo vòng + thưởng đã nhân + desc đã thay {target}. */
export function ngGoalProgress(input: {
  prestigeLevel: number;
  level: number;
  staffCount: number;
  ordersDone: number;
  supplierRel: Record<string, { spent: number; orders: number }>;
  marketClearedDay: number;
  rivalsBeaten: number;
}): Array<Omit<NgGoal, 'done'> & { done: boolean; target?: number }> {
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
    rivalsBeaten: input.rivalsBeaten,
  };
  return NG_GOALS.map((g) => {
    const target = scaledTarget(g, input.prestigeLevel);
    return {
      id: g.id,
      icon: g.icon,
      name: g.name,
      desc: target === undefined ? g.desc : g.desc.replace('{target}', String(target)),
      reward: Math.round(g.reward * runRewardScale(input.prestigeLevel)),
      target,
      done: g.done(ctx, target ?? 0),
    };
  });
}
