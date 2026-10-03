import type { BranchDayReport, BranchSave } from '@game/shared';
import { BRANCH_REPORT_LIMIT } from '@game/shared';
import { PRODUCT_MAP, STORE_TYPE_MAP, getSeasonForDay } from '@game/data';
import { setLots } from './chain';
import { Mulberry32Rng } from './staff';
import { normalizeLots, sumLots, takeLots } from './stock';

/**
 * Chạy nền một ngày cho chi nhánh không được điều khiển (OpenSpec `branch-chain`, D5).
 * Hàm thuần, xác định theo (id chi nhánh, ngày), idempotent theo `lastBackgroundDay`. Chưa nối vào `GameSimulation`.
 * Hệ số nền là **ước lượng, chưa playtest**.
 */
export const BACKGROUND_DEMAND_FACTOR = 0.7;

export interface BranchDayInput {
  branch: BranchSave;
  day: number;
  /** Ví chung hiện tại; chỉ dùng để quyết định lương có trả được không (ví không âm). */
  money: number;
  /** Hạt giống ngày/thế giới để cùng chi nhánh khác thế giới cho kết quả khác. */
  seed?: number;
}

export interface BranchDayResult {
  branch: BranchSave;
  /** Thay đổi ví chung = doanh thu − lương (≥ −money). */
  moneyDelta: number;
  report?: BranchDayReport;
  /** Ngày đã được tính từ trước nên không đổi gì. */
  skipped?: boolean;
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function runBranchDay(input: BranchDayInput): BranchDayResult {
  const { day } = input;
  if (!Number.isSafeInteger(day) || day <= input.branch.lastBackgroundDay) {
    return { branch: structuredClone(input.branch), moneyDelta: 0, skipped: true };
  }
  const branch = structuredClone(input.branch);
  const type = STORE_TYPE_MAP[branch.storeType];
  if (!type) return { branch, moneyDelta: 0, skipped: true };

  const rng = new Mulberry32Rng(hashString(branch.id) + day * 7919 + (input.seed ?? 0));
  const season = getSeasonForDay(day);
  const reputationFactor = 1 + Math.min(Math.max(branch.reputation, 0), 100) / 400;

  // Hết hạn trước khi bán.
  let spoilageLoss = 0;
  for (const item of [...branch.stock]) {
    const lots = normalizeLots(item.quantity, item.lots, item.productId, day);
    const expired = lots.filter((lot) => lot.expiresOnDay <= day);
    if (!expired.length) continue;
    for (const lot of expired) spoilageLoss += lot.quantity * (lot.unitCost ?? 0);
    setLots(branch.stock, item.productId, lots.filter((lot) => lot.expiresOnDay > day));
  }

  let revenue = 0, cogs = 0, unitsSold = 0;
  const stockouts: string[] = [];
  for (const [productId, baseDemand] of Object.entries(type.baseDailyDemand)) {
    const product = PRODUCT_MAP[productId];
    if (!product) continue;
    const jitter = 0.9 + rng.next() * 0.2;
    const demand = Math.max(0, Math.round(baseDemand * (season?.demandMultiplier ?? 1) * reputationFactor * BACKGROUND_DEMAND_FACTOR * jitter));
    if (demand === 0) continue;
    const item = branch.stock.find((i) => i.productId === productId);
    const lots = normalizeLots(item?.quantity ?? 0, item?.lots, productId, day);
    const sold = Math.min(demand, sumLots(lots));
    if (sold < demand) stockouts.push(productId);
    if (sold <= 0) continue;
    for (const lot of takeLots(lots, sold)) cogs += lot.quantity * (lot.unitCost ?? product.purchasePrice);
    setLots(branch.stock, productId, lots);
    revenue += sold * product.baseSellingPrice;
    unitsSold += sold;
  }

  const available = Math.max(0, input.money) + revenue;
  const wages = Math.min(type.staffWagePerDay, available);
  const report: BranchDayReport = { day, revenue, cogs, wages, spoilageLoss, unitsSold, stockouts };
  branch.reports = [...branch.reports, report].slice(-BRANCH_REPORT_LIMIT);
  branch.totalRevenue += revenue;
  branch.reputation = Math.min(100, Math.max(0, branch.reputation + (stockouts.length ? -0.5 : 0.2)));
  branch.lastBackgroundDay = day;
  return { branch, moneyDelta: revenue - wages, report };
}

/** Bắt kịp nhiều ngày vắng; mỗi ngày dùng ví sau ngày trước. */
export function catchUpBranch(branch: BranchSave, toDay: number, money: number, seed?: number): { branch: BranchSave; moneyDelta: number; reports: BranchDayReport[] } {
  let current = branch;
  let wallet = money;
  let moneyDelta = 0;
  const reports: BranchDayReport[] = [];
  for (let day = branch.lastBackgroundDay + 1; day <= toDay; day++) {
    const result = runBranchDay({ branch: current, day, money: wallet, seed });
    if (result.skipped || !result.report) continue;
    current = result.branch;
    wallet += result.moneyDelta;
    moneyDelta += result.moneyDelta;
    reports.push(result.report);
  }
  return { branch: current, moneyDelta, reports };
}
