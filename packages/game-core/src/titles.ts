import { TitleDef, PlayerData } from '@game/shared';
import { TITLES, TITLE_MAP } from '@game/data';

export interface TitleContext {
  level: number;
  totalRevenue: number;
  totalCustomers: number;
  daysPassed: number;
  partyOrders: number;
  reputation: number;
}

export function evaluateTitleUnlock(def: TitleDef, ctx: TitleContext): boolean {
  switch (def.requirement.type) {
    case 'level':
      return ctx.level >= def.requirement.threshold;
    case 'totalRevenue':
      return ctx.totalRevenue >= def.requirement.threshold;
    case 'totalCustomers':
      return ctx.totalCustomers >= def.requirement.threshold;
    case 'daysPassed':
      return ctx.daysPassed >= def.requirement.threshold;
    case 'partyOrders':
      return ctx.partyOrders >= def.requirement.threshold;
    case 'reputation':
      return ctx.reputation >= def.requirement.threshold;
    default:
      return false;
  }
}

export function getUnlockedTitles(ctx: TitleContext, currentUnlocked: string[] = []): string[] {
  const unlockedSet = new Set(currentUnlocked);
  for (const def of TITLES) {
    if (evaluateTitleUnlock(def, ctx)) {
      unlockedSet.add(def.id);
    }
  }
  return Array.from(unlockedSet);
}

export function setActiveTitle(
  player: PlayerData,
  titleId: string | undefined,
  unlockedList: string[]
): { success: boolean; activeTitle?: string; reason?: string } {
  if (!titleId) {
    player.activeTitle = undefined;
    return { success: true, activeTitle: undefined };
  }
  if (!unlockedList.includes(titleId)) {
    return { success: false, reason: 'Danh hiệu này chưa được mở khóa.' };
  }
  player.activeTitle = titleId;
  return { success: true, activeTitle: titleId };
}
