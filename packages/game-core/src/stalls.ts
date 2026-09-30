import type { StallState } from '@game/shared';
import { getSeasonForDay, STALL_MAP } from '@game/data';

export const emptyStallState = (): StallState => ({ owned: [], processedDayIds: [] });

export function normalizeStallState(state: StallState | undefined): StallState {
  return {
    owned: (state?.owned ?? []).filter(id => !!STALL_MAP[id]),
    processedDayIds: [...(state?.processedDayIds ?? [])],
  };
}

export interface StallDayResult { stallId: string; servings: number; revenue: number; cogs: number }

/** Sản lượng quầy một ngày: nhu cầu cơ bản × mùa × uy tín nhẹ, chặn bởi công suất. Xác định, không ngẫu nhiên. */
export function computeStallDay(stallId: string, day: number, reputation: number): StallDayResult | null {
  const stall = STALL_MAP[stallId];
  if (!stall) return null;
  const season = getSeasonForDay(day);
  const seasonFactor = (season?.demandMultiplier ?? 1) * (season?.stallMultiplier[stallId] ?? 1);
  const reputationFactor = 1 + Math.min(Math.max(reputation, 0), 100) / 400;
  const servings = Math.min(stall.maxServings, Math.max(0, Math.round(stall.baseServings * seasonFactor * reputationFactor)));
  return { stallId, servings, revenue: servings * stall.servingPrice, cogs: servings * stall.servingCost };
}
