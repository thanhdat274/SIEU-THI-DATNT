import {
  DailyRecord,
  GoalState,
  LongTermGoalDef,
  WeeklyQuestDef,
} from '@game/shared';
import { GOAL_MAP, PRODUCT_MAP, WEEKLY_QUESTS, getFestivalClaimWindow, type FestivalGoal } from '@game/data';

export interface GoalProgressInfo {
  goalId: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  claimed: boolean;
}

export interface WeeklyQuestProgressInfo {
  questId: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  claimed: boolean;
}

export interface SimulationGoalContext {
  totalRevenue: number;
  totalCustomersServed: number;
  salesFixturesCount: number;
  stallsCount: number;
  reputation: number;
  completedPartyOrdersCount: number;
  weekRevenue: number;
  weekCustomersServed: number;
  weekItemsSold: number;
  weekPartyOrdersCount: number;
  currentWeek: number;
}

export function createInitialGoalState(): GoalState {
  return {
    claimedGoalIds: [],
    claimedWeeklyQuestIds: {},
  };
}

/**
 * Tính toán tiến độ cho một mục tiêu dài hạn.
 */
export function getGoalProgress(
  goal: LongTermGoalDef,
  ctx: SimulationGoalContext,
  state: GoalState
): GoalProgressInfo {
  let currentValue = 0;

  switch (goal.category) {
    case 'sales':
      currentValue = ctx.totalRevenue;
      break;
    case 'customers':
      currentValue = ctx.totalCustomersServed;
      break;
    case 'expansion':
      if (goal.id === 'goal_expand_shelf_3') {
        currentValue = ctx.salesFixturesCount;
      } else if (goal.id === 'goal_expand_stall_1') {
        currentValue = ctx.stallsCount;
      }
      break;
    case 'reputation':
      currentValue = ctx.reputation;
      break;
  }

  const completed = currentValue >= goal.targetValue;
  const claimed = state.claimedGoalIds.includes(goal.id);

  return {
    goalId: goal.id,
    currentValue,
    targetValue: goal.targetValue,
    completed,
    claimed,
  };
}

/**
 * Nhận thưởng mục tiêu dài hạn một lần duy nhất (idempotent, chống nhận đôi).
 */
export function claimGoal(
  state: GoalState,
  goalId: string,
  ctx: SimulationGoalContext
): {
  success: boolean;
  reward?: { money: number; reputation: number; experience?: number };
  state: GoalState;
  reason?: string;
} {
  if (state.claimedGoalIds.includes(goalId)) {
    return {
      success: false,
      state,
      reason: 'Mục tiêu này đã được nhận thưởng trước đó',
    };
  }

  const goal = GOAL_MAP[goalId];
  if (!goal) {
    return { success: false, state, reason: 'Không tìm thấy mục tiêu' };
  }

  const progress = getGoalProgress(goal, ctx, state);
  if (!progress.completed) {
    return { success: false, state, reason: 'Chưa hoàn thành điều kiện mục tiêu' };
  }

  const nextClaimed = [...state.claimedGoalIds, goalId];

  return {
    success: true,
    reward: {
      money: goal.rewardMoney,
      reputation: goal.rewardReputation,
      experience: goal.rewardExperience,
    },
    state: {
      ...state,
      claimedGoalIds: nextClaimed,
    },
  };
}

/**
 * Tính toán tiến độ nhiệm vụ tuần.
 */
export function getWeeklyQuestProgress(
  quest: WeeklyQuestDef,
  ctx: SimulationGoalContext,
  state: GoalState
): WeeklyQuestProgressInfo {
  let currentValue = 0;

  switch (quest.targetType) {
    case 'revenue':
      currentValue = ctx.weekRevenue;
      break;
    case 'customers':
      currentValue = ctx.weekCustomersServed;
      break;
    case 'items_sold':
      currentValue = ctx.weekItemsSold;
      break;
    case 'party_orders':
      currentValue = ctx.weekPartyOrdersCount;
      break;
  }

  const completed = currentValue >= quest.targetValue;
  const claimedThisWeek = (state.claimedWeeklyQuestIds[ctx.currentWeek] ?? []).includes(quest.id);

  return {
    questId: quest.id,
    currentValue,
    targetValue: quest.targetValue,
    completed,
    claimed: claimedThisWeek,
  };
}

/**
 * Nhận thưởng nhiệm vụ tuần cho tuần hiện tại (chống nhận lặp trong cùng tuần).
 */
export function claimWeeklyQuest(
  state: GoalState,
  questId: string,
  ctx: SimulationGoalContext
): {
  success: boolean;
  reward?: { money: number; reputation: number };
  state: GoalState;
  reason?: string;
} {
  const currentWeek = ctx.currentWeek;
  const claimedList = state.claimedWeeklyQuestIds[currentWeek] ?? [];

  if (claimedList.includes(questId)) {
    return {
      success: false,
      state,
      reason: 'Nhiệm vụ tuần này đã nhận thưởng',
    };
  }

  const quest = WEEKLY_QUESTS.find((q) => q.id === questId);
  if (!quest) {
    return { success: false, state, reason: 'Không tìm thấy nhiệm vụ tuần' };
  }

  const progress = getWeeklyQuestProgress(quest, ctx, state);
  if (!progress.completed) {
    return { success: false, state, reason: 'Chưa hoàn thành nhiệm vụ tuần' };
  }

  const nextWeekClaimed = {
    ...state.claimedWeeklyQuestIds,
    [currentWeek]: [...claimedList, questId],
  };

  return {
    success: true,
    reward: {
      money: quest.rewardMoney,
      reputation: quest.rewardReputation,
    },
    state: {
      ...state,
      claimedWeeklyQuestIds: nextWeekClaimed,
    },
  };
}

export interface FestivalGoalProgressInfo {
  goalId: string;
  seasonId: string;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  claimed: boolean;
  rewardMoney: number;
  rewardReputation: number;
  lastDay: number;
  claimUntilDay: number;
}

/** Nguồn doanh số theo ngày: sản phẩm bán ở kệ và suất bán ở quầy ăn uống. */
export type FestivalSalesOn = (day: number) => Pick<DailyRecord, 'productSales' | 'stallServings'> | undefined;

const festivalKey = (goalId: string, year: number) => `${goalId}@${year}`;

/** Số món đúng nhóm/sản phẩm đã bán trong khoảng ngày của ngày hội (từ DailyRecord đã lưu). */
export function countFestivalUnits(
  goal: FestivalGoal,
  firstDay: number,
  lastDay: number,
  salesOn: FestivalSalesOn,
): number {
  let units = 0;
  for (let d = firstDay; d <= lastDay; d++) {
    const record = salesOn(d);
    if (!record) continue;
    if (goal.targetStallId) {
      units += record.stallServings?.[goal.targetStallId] ?? 0;
      continue;
    }
    for (const [productId, qty] of Object.entries(record.productSales ?? {})) {
      if (goal.targetProductId) {
        if (productId !== goal.targetProductId) continue;
      } else if (goal.targetCategory && PRODUCT_MAP[productId]?.category !== goal.targetCategory) {
        continue;
      }
      units += qty;
    }
  }
  return units;
}

/** Mục tiêu của ngày hội đang diễn ra (rỗng nếu hôm nay không có ngày hội). */
export function getFestivalGoalProgress(
  day: number,
  state: GoalState,
  salesOn: FestivalSalesOn,
): FestivalGoalProgressInfo[] {
  const window = getFestivalClaimWindow(day);
  if (!window) return [];
  return (window.event.goals ?? []).map((goal) => {
    const currentValue = countFestivalUnits(goal, window.firstDay, Math.min(window.lastDay, day), salesOn);
    return {
      goalId: goal.id,
      seasonId: window.event.id,
      title: goal.title,
      description: goal.description,
      currentValue,
      targetValue: goal.targetUnits,
      completed: currentValue >= goal.targetUnits,
      claimed: (state.claimedFestivalGoalKeys ?? []).includes(festivalKey(goal.id, window.year)),
      rewardMoney: goal.rewardMoney,
      rewardReputation: goal.rewardReputation,
      lastDay: window.lastDay,
      claimUntilDay: window.claimUntilDay,
    };
  });
}

/** Nhận thưởng ngày hội một lần mỗi năm mùa; chỉ nhận được khi ngày hội còn diễn ra. */
export function claimFestivalGoal(
  state: GoalState,
  goalId: string,
  day: number,
  salesOn: FestivalSalesOn,
): { success: boolean; reward?: { money: number; reputation: number }; state: GoalState; reason?: string } {
  const window = getFestivalClaimWindow(day);
  const goal = window?.event.goals?.find((g) => g.id === goalId);
  if (!window || !goal) return { success: false, state, reason: 'Không có mục tiêu ngày hội này đang diễn ra' };
  const key = festivalKey(goalId, window.year);
  if ((state.claimedFestivalGoalKeys ?? []).includes(key)) {
    return { success: false, state, reason: 'Mục tiêu ngày hội đã nhận thưởng' };
  }
  const progress = countFestivalUnits(goal, window.firstDay, Math.min(window.lastDay, day), salesOn);
  if (progress < goal.targetUnits) return { success: false, state, reason: 'Chưa đủ doanh số ngày hội' };
  return {
    success: true,
    reward: { money: goal.rewardMoney, reputation: goal.rewardReputation },
    state: { ...state, claimedFestivalGoalKeys: [...(state.claimedFestivalGoalKeys ?? []), key] },
  };
}
