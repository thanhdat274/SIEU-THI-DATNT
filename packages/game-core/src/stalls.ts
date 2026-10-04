import type { StallState } from '@game/shared';
import { getSeasonForDay, STALL_MAP } from '@game/data';

export const emptyStallState = (): StallState => ({ owned: [], processedDayIds: [] });

export function normalizeStallState(state: StallState | undefined): StallState {
  return {
    owned: (state?.owned ?? []).filter(id => !!STALL_MAP[id]),
    processedDayIds: [...(state?.processedDayIds ?? [])],
    ...(state?.progress ? { progress: structuredClone(state.progress) } : {}),
    lastReport: state?.lastReport ? { day: state.lastReport.day, entries: state.lastReport.entries.map(entry => ({ ...entry })) } : undefined,
  };
}

export interface StallDayPlan {
  stallId: string;
  demand: number; // số suất khách muốn mua hôm đó
  servings: number; // số suất thực bán được sau khi trừ giới hạn nguyên liệu
  ingredientUnits: Record<string, number>; // số đơn vị kho cần lấy (làm tròn lên)
  limitedBy?: string; // productId làm thiếu hàng, nếu có
}

/** Nhu cầu quầy một ngày: cơ bản × mùa × uy tín nhẹ, chặn bởi công suất. Xác định, không ngẫu nhiên. */
export function stallDemand(stallId: string, day: number, reputation: number): number {
  const stall = STALL_MAP[stallId];
  if (!stall) return 0;
  const season = getSeasonForDay(day);
  const seasonFactor = (season?.demandMultiplier ?? 1) * (season?.stallMultiplier[stallId] ?? 1);
  const reputationFactor = 1 + Math.min(Math.max(reputation, 0), 100) / 400;
  return Math.min(stall.maxServings, Math.max(0, Math.round(stall.baseServings * seasonFactor * reputationFactor)));
}

/** Giảm số suất cho tới khi nguyên liệu trong kho (làm tròn lên) đủ. */
export function planStallDay(stallId: string, day: number, reputation: number, available: (productId: string) => number): StallDayPlan | null {
  const stall = STALL_MAP[stallId];
  if (!stall) return null;
  const demand = stallDemand(stallId, day, reputation);
  const unitsFor = (servings: number) => Object.fromEntries(stall.ingredients.map(item => [item.productId, Math.ceil(servings * item.perServing - 1e-9)]));
  let servings = demand;
  while (servings > 0 && stall.ingredients.some(item => unitsFor(servings)[item.productId] > available(item.productId))) servings--;
  const limitedBy = servings < demand
    ? stall.ingredients.find(item => unitsFor(servings + 1)[item.productId] > available(item.productId))?.productId
    : undefined;
  return { stallId, demand, servings, ingredientUnits: unitsFor(servings), limitedBy };
}
