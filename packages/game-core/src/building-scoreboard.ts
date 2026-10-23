/**
 * Bảng thành tích theo tòa / người phụ trách (OpenSpec `open-world-coop-contracts` 3.1, design D4, phương án A).
 *
 * Tính từ sổ cái: mỗi dòng thuộc tòa `buildingInstanceId` (thiếu = 'main'). `internal_transfer` cộng giá nội bộ vào
 * doanh thu tòa giao và giá vốn tòa nhận — tổng toàn doanh nghiệp bằng 0, nên tổng lãi theo người luôn khớp lãi sổ cái.
 * Nhập hàng (`purchase`) không tính (giá vốn ghi lúc bán); góp sổ xóm và trả nợ khách là dòng tiền, không phải lãi.
 */
import type { LedgerEntry, LedgerEntryType } from '@game/shared';

export interface ScoreLine { revenue: number; cogs: number; costs: number; profit: number }
export interface BuildingScore extends ScoreLine { buildingId: string; managerAccountId?: string }
export interface ManagerScore extends ScoreLine { managerAccountId: string; buildingIds: string[] }

/** Nhóm "chưa có người phụ trách" (chơi một mình / tòa chưa gán). */
export const UNMANAGED = 'chung';

const REVENUE_TYPES: ReadonlySet<LedgerEntryType> = new Set(['sale', 'credit_sale', 'recovery', 'city_goal_reward']);
const COST_TYPES: ReadonlySet<LedgerEntryType> = new Set(['spoilage', 'wage', 'maintenance', 'theft', 'theft_cash', 'counterfeit', 'bad_debt', 'tax', 'rent', 'civic_upkeep', 'civic_fee']);

const empty = (): ScoreLine => ({ revenue: 0, cogs: 0, costs: 0, profit: 0 });
const finish = <T extends ScoreLine>(s: T): T => ({ ...s, profit: s.revenue - s.cogs - s.costs });

/** Lãi của cả doanh nghiệp theo cùng luật (để đối soát). */
export function ledgerProfit(entries: readonly LedgerEntry[]): number {
  let total = 0;
  for (const e of entries) {
    if (REVENUE_TYPES.has(e.type)) total += e.amount - (e.cogs ?? 0);
    else if (COST_TYPES.has(e.type)) total -= e.amount;
  }
  return total;
}

/** Thành tích theo tòa; `day` có thì chỉ tính ngày đó, không thì tính tổng. */
export function buildingScores(
  entries: readonly LedgerEntry[],
  managers: Readonly<Record<string, string | undefined>> = {},
  day?: number,
): BuildingScore[] {
  const map = new Map<string, ScoreLine>();
  const at = (id: string) => { let s = map.get(id); if (!s) { s = empty(); map.set(id, s); } return s; };
  for (const e of entries) {
    if (day !== undefined && e.day !== day) continue;
    const id = e.buildingInstanceId ?? 'main';
    if (REVENUE_TYPES.has(e.type)) { at(id).revenue += e.amount; at(id).cogs += e.cogs ?? 0; }
    else if (COST_TYPES.has(e.type)) at(id).costs += e.amount;
    else if (e.type === 'internal_transfer' && e.toBuildingInstanceId) { at(id).revenue += e.amount; at(e.toBuildingInstanceId).cogs += e.amount; }
  }
  return [...map.entries()]
    .map(([buildingId, s]) => finish({ buildingId, ...s, ...(managers[buildingId] ? { managerAccountId: managers[buildingId] } : {}) }))
    .sort((a, b) => b.profit - a.profit);
}

/** Gom thành tích tòa theo người phụ trách (tòa chưa gán vào `UNMANAGED`). */
export function managerScores(scores: readonly BuildingScore[]): ManagerScore[] {
  const map = new Map<string, ManagerScore>();
  for (const s of scores) {
    const key = s.managerAccountId ?? UNMANAGED;
    const m = map.get(key) ?? { managerAccountId: key, buildingIds: [], ...empty() };
    m.revenue += s.revenue; m.cogs += s.cogs; m.costs += s.costs; m.buildingIds.push(s.buildingId);
    map.set(key, m);
  }
  return [...map.values()].map(finish).sort((a, b) => b.profit - a.profit);
}
