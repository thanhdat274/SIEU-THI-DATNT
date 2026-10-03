/**
 * Mô phỏng cân bằng chi nhánh nền (OpenSpec `branch-chain` 8.3): chạy `runBranchDay` thuần nhiều ngày/hạt giống,
 * so sánh chính sách (mức giá, quản lý) và nhịp châm hàng từ kho tổng. Số đo từ mô hình, KHÔNG thay thế playtest.
 * Giả định: kho tổng luôn có hàng giá nhập `purchasePrice` (không tính giảm giá sỉ, vận chuyển, hao hụt kho tổng);
 * mỗi `R` ngày châm mỗi món lên `baseDailyDemand × R × buffer` (trần sức chứa).
 * Chạy: yarn --ignore-engines workspace @game/core tsx src/branch-balance-sim.ts   (BRANCH_SEEDS, BRANCH_DAYS tùy chọn)
 */
import type { BranchPolicy, BranchSave, InventoryItem } from '@game/shared';
import { BRANCH_MANAGER, PRODUCT_MAP, STORE_TYPE_MAP } from '@game/data';
import { setLots } from './chain';
import { runBranchDay } from './branch-ops';
import { normalizeLots, sumLots } from './stock';

const SEEDS = Number(process.env.BRANCH_SEEDS ?? 5);
const DAYS = Number(process.env.BRANCH_DAYS ?? 120); // đủ một chu kỳ mùa
const TYPE = STORE_TYPE_MAP.drink_shop;
// Thử số khác không sửa dữ liệu thật: BRANCH_WAGE (lương nền), BRANCH_QL_WAGE (lương quản lý), BRANCH_DEMAND_SCALE (nhân cầu cơ bản).
if (process.env.BRANCH_WAGE) (TYPE as { staffWagePerDay: number }).staffWagePerDay = Number(process.env.BRANCH_WAGE);
if (process.env.BRANCH_QL_WAGE) (BRANCH_MANAGER as { wagePerDay: number }).wagePerDay = Number(process.env.BRANCH_QL_WAGE);
if (process.env.BRANCH_DEMAND_SCALE) for (const k of Object.keys(TYPE.baseDailyDemand)) (TYPE.baseDailyDemand as Record<string, number>)[k] *= Number(process.env.BRANCH_DEMAND_SCALE);
const BUFFER = Number(process.env.BRANCH_BUFFER ?? 1.15);

interface Result { profit: number; revenue: number; stockoutDayShare: number; avgStockUnits: number; reputation: number; restockCost: number }

function simulate(policy: BranchPolicy, restockEvery: number, seed: number): Result {
  let branch: BranchSave = {
    id: `branch-${seed + 1}`, storeType: 'drink_shop', name: 'Quán', openedDay: 1, stock: [], reputation: TYPE.startingReputation,
    lastBackgroundDay: 1, reports: [], totalRevenue: 0, policy,
  };
  let profit = 0, revenue = 0, restockCost = 0, stockoutDays = 0, stockUnits = 0;
  for (let day = 2; day <= DAYS + 1; day++) {
    if ((day - 2) % restockEvery === 0) {
      const stock: InventoryItem[] = structuredClone(branch.stock);
      let used = stock.reduce((s, i) => s + i.quantity, 0);
      for (const [productId, demand] of Object.entries(TYPE.baseDailyDemand)) {
        const product = PRODUCT_MAP[productId];
        const lots = normalizeLots(stock.find((i) => i.productId === productId)?.quantity ?? 0, stock.find((i) => i.productId === productId)?.lots, productId, day);
        const target = Math.ceil(demand * restockEvery * BUFFER * (policy.manager ? 1.2 : 1));
        const add = Math.min(Math.max(0, target - sumLots(lots)), Math.max(0, TYPE.stockCapacity - used));
        if (add <= 0) continue;
        lots.push({ quantity: add, expiresOnDay: day + (product.expirationRules?.daysToSpoil ?? 999), unitCost: product.purchasePrice, provenance: 'known' });
        lots.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
        setLots(stock, productId, lots);
        used += add;
        restockCost += add * product.purchasePrice;
      }
      branch = { ...branch, stock };
    }
    const result = runBranchDay({ branch, day, money: 10_000_000, seed });
    if (!result.report) continue;
    branch = result.branch;
    const r = result.report;
    profit += r.revenue - r.cogs - r.wages - r.spoilageLoss;
    revenue += r.revenue;
    if (r.stockouts.length) stockoutDays++;
    stockUnits += branch.stock.reduce((s, i) => s + i.quantity, 0);
  }
  return { profit: profit / DAYS, revenue: revenue / DAYS, stockoutDayShare: stockoutDays / DAYS, avgStockUnits: stockUnits / DAYS, reputation: branch.reputation, restockCost: restockCost / DAYS };
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN').padStart(10);
const scenarios: Array<{ label: string; policy: BranchPolicy }> = [
  { label: 'giá mềm, không QL', policy: { priceMode: 'low', manager: false } },
  { label: 'giá chuẩn, không QL', policy: { priceMode: 'normal', manager: false } },
  { label: 'giá cao, không QL', policy: { priceMode: 'high', manager: false } },
  { label: 'giá mềm, có QL', policy: { priceMode: 'low', manager: true } },
  { label: 'giá chuẩn, có QL', policy: { priceMode: 'normal', manager: true } },
  { label: 'giá cao, có QL', policy: { priceMode: 'high', manager: true } },
];

console.log(`Chi nhánh ${TYPE.name}: mở ${TYPE.openCost.toLocaleString('vi-VN')} ₫, lương nền ${TYPE.staffWagePerDay.toLocaleString('vi-VN')} ₫/ngày, QL +${BRANCH_MANAGER.wagePerDay.toLocaleString('vi-VN')} ₫/ngày; ${SEEDS} hạt giống × ${DAYS} ngày, đệm ${BUFFER}`);
for (const every of (process.env.BRANCH_EVERY ?? "1,3,7").split(",").map(Number)) {
  console.log(`\n--- Châm hàng mỗi ${every} ngày ---`);
  console.log('chính sách'.padEnd(22), 'lãi/ngày'.padStart(10), 'doanh thu'.padStart(10), 'hoàn vốn(ngày)'.padStart(15), 'ngày hụt'.padStart(9), 'tồn TB'.padStart(7), 'danh tiếng'.padStart(11));
  for (const s of scenarios) {
    const runs = Array.from({ length: SEEDS }, (_, i) => simulate(s.policy, every, i));
    const profit = avg(runs.map((r) => r.profit));
    const payback = profit > 0 ? Math.round(TYPE.openCost / profit) : Infinity;
    console.log(s.label.padEnd(22), fmt(profit), fmt(avg(runs.map((r) => r.revenue))), String(payback).padStart(15), `${Math.round(avg(runs.map((r) => r.stockoutDayShare)) * 100)}%`.padStart(9), String(Math.round(avg(runs.map((r) => r.avgStockUnits)))).padStart(7), avg(runs.map((r) => r.reputation)).toFixed(0).padStart(11));
  }
}
