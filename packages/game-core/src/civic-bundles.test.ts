/**
 * Kiểm tra sổ góp xóm + mục tiêu thành phố (OpenSpec `civic-city-goals`, BƯỚC 4).
 * Giai đoạn 1 (sửa review 1.1–1.9) + Giai đoạn 2 (cân bằng 2.1–2.3).
 * Sang ngày đúng đường `getClock().advanceToNextDay()`.
 */
import assert from 'node:assert/strict';
import {
  CIVIC_BUNDLES,
  civicBundleById,
  validateCivicBundles,
  expectedBundleGoodsValue,
  civicBundleCashAmount,
  bundleBuildCost,
  DEFAULT_INITIAL_SAVE,
  generateStarterTileMap,
  PRODUCT_MAP,
} from '@game/data';
import { validateSaveGameData, CURRENT_SAVE_SCHEMA_VERSION, type SaveGameData, type LedgerEntry } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { hashSimulationState } from './replay';
import { computeNetProfit } from './ledger';
import { computeCityProgressMetrics } from './city-progress-metrics';
import { claimCityGoal as claimCityGoalPure } from './city-goals-sim';
import { civicOpenCost, countBuildingsOfType, bundleDonatedValue, isBundleCompleted } from './civic-bundles';
import { decideLandCommand } from './land-policy';

interface SimOpts { money?: number; level?: number; cityLevel?: number; bundles?: unknown }

function newSim(opts: SimOpts = {}): GameSimulation {
  const save = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  save.player.level = opts.level ?? 80;
  save.player.money = opts.money ?? 200_000_000;
  save.worldTime.isStoreOpen = false;
  save.cityProgress = { level: opts.cityLevel ?? 9, claimedCityGoalIds: [], milestones: [], metrics: {} };
  if (opts.bundles) { save.civic = { populationByDistrict: {}, bundles: opts.bundles as any }; }
  return new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
}

const advance = (sim: GameSimulation, n = 1): void => { for (let i = 0; i < n; i++) sim.getClock().advanceToNextDay(); };
const ledgerOf = (sim: GameSimulation, type: LedgerEntry['type']): LedgerEntry[] => sim.getLedger().filter(e => e.type === type);
const internal = <T>(sim: GameSimulation, key: string): T => (sim as unknown as Record<string, unknown>)[key] as T;
const day = (sim: GameSimulation): number => sim.getClock().getTime().day;
const moneyOf = (sim: GameSimulation): number => sim.getPlayerData().money;
const bundlesOf = (sim: GameSimulation): unknown => internal(sim, '_bundleStates');

interface SeedLot { quantity: number; expiresOnDay: number; unitCost: number }
/** Thêm sản phẩm vào kho sim với các lô rõ ràng (test FIFO/giá vốn). */
function seedStock(sim: GameSimulation, productId: string, lots: SeedLot[]): void {
  const inv = internal<{ productId: string; quantity: number; lots?: unknown[] }[]>(sim, 'inventory');
  inv.push({ productId, quantity: lots.reduce((s, l) => s + l.quantity, 0), lots: lots as unknown[] });
}

function currentRecord(sim: GameSimulation): any {
  return internal(sim, 'currentDayRecord');
}
function runBalanceTests(): void {
  console.log('\n--- Sổ góp: cân bằng 80% (2.1) ---');
  const v = validateCivicBundles();
  assert.ok(v.valid, `validateCivicBundles hợp lệ: ${v.errors.join(' | ')}`);
  for (const b of CIVIC_BUNDLES) {
    const goods = expectedBundleGoodsValue(b);
    const cash = civicBundleCashAmount(b);
    const build = bundleBuildCost(b);
    const total = goods + cash;
    // ≈ 80% giá xây (trong khoảng 75–85%).
    const pct = total / build;
    assert.ok(pct >= 0.75 && pct <= 0.85, `${b.id}: tổng góp dự kiến ≈80% giá xây (đang ${(pct*100).toFixed(1)}%)`);
    assert.ok(total <= build, `${b.id}: tổng góp dự kiến ≤ giá xây`);
    assert.ok(cash >= 0, `${b.id}: quỹ xây dựng ≥ 0`);
    // Ô cash amount = công thức, không nhỏ hơn một mức tối thiểu hữu ích.
    const slot = b.slots.find(s => s.kind === 'cash')!;
    assert.equal(slot.amount, cash, `${b.id}: slot cash amount = civicBundleCashAmount`);
  }
  console.log('  ✓ cân bằng 80% PASS');
}

function runMetricsTests(): void {
  console.log('\n--- Chỉ số thành phố (1.5): module thuần ---');
  // daily_customers lấy ngày VỪA kết thúc; building_types_open chỉ đếm loại thật; weekly_revenue chỉ mục theo ngày.
  const recs: Record<number, any> = { 3: { revenue: 1000, customersServed: 40 }, 4: { revenue: 2000, customersServed: 50 } };
  const m = computeCityProgressMetrics({ day: 4, dailyRecords: recs, openedTypeIds: ['grocery_main', 'cafe', 'grocery_main'], openedWaves: ['w1'], totalBuildings: 3 });
  assert.equal(m.daily_customers, 50, 'daily_customers = ngày vừa kết thúc (day 4)');
  assert.equal(m.building_types_open, 2, 'building_types_open = số loại thật (set, bỏ trùng)');
  assert.equal(m.waves_opened, 1, 'waves_opened = 1');
  assert.equal(m.infrastructure, 2, 'infrastructure = W0 + số đợt (1+1)');
  assert.equal(m.weekly_revenue, 3000, 'weekly_revenue = sum revenue các ngày trong cửa sổ');
  assert.equal(m.total_buildings, 3, 'total_buildings = 3');
  console.log('  ✓ metrics PASS');
}

function runConstructorBundleTests(): void {
  console.log('\n--- Constructor nạp bundles + export/import (1.1) ---');
  const bundleState = emptyBundleState('bundle_park');
  (bundleState['bundle_park'].slots['slot_park_cash'] as number) = 700_000;
  (bundleState['bundle_park'].contributions as unknown[]) = [{ playerId: 'p1', slotId: 'slot_park_cash', qty: 700_000, day: 2, value: 700_000 }];
  const sim = newSim({ cityLevel: 5, bundles: bundleState });
  const loaded = bundlesOf(sim) as Record<string, { slots: Record<string, number>; contributions: unknown[] }>;
  assert.equal(loaded['bundle_park'].slots['slot_park_cash'], 700_000, 'constructor giữ nguyên civic.bundles');
  assert.equal((loaded['bundle_park'].contributions as {playerId:string}[])[0].playerId, 'p1', 'giữ contributions');
  // export → import → export giống nhau (không mất bundles).
  const exp1 = JSON.stringify(sim.exportSaveData().civic?.bundles);
  const sim2 = new GameSimulation(structuredClone(sim.exportSaveData()), generateStarterTileMap(), new InputManager(), {});
  const exp2 = JSON.stringify(sim2.exportSaveData().civic?.bundles);
  assert.equal(exp2, exp1, 'export→import→export giữ nguyên bundles');
  console.log('  ✓ constructor bundles PASS');
}
function emptyBundleState(bundleId: string): Record<string, { slots: Record<string, number>; contributions: unknown[]; completedDay?: number }> {
  const b = civicBundleById(bundleId)!;
  const slots: Record<string, number> = {};
  for (const s of b.slots) slots[s.id] = 0;
  return { [bundleId]: { slots, contributions: [] } };
}

function runCityGoalTests(): void {
  console.log('\n--- Mục tiêu thành phố: nhận từng mục tiêu, thưởng, milestones (1.2/1.3/1.4) ---');
  // 1.4: nhận từng mục tiêu riêng lẻ khi MỤC TIÊU ĐÓ đạt (không cần cả cấp đủ).
  const sim = newSim({ cityLevel: 1 });
  advance(sim, 1); // đóng ngày 1 → dailyRecords[1] tồn tại; metric day = 1.
  // Chỉ đạt daily_customers (50 ≥ 40), chưa đạt building_types (đang 1 loại < 2).
  const recs = internal<Record<number, { customersServed: number }>>(sim, 'dailyRecords');
  if (recs[1]) recs[1].customersServed = 50; else recs[1] = { customersServed: 50 } as any;
  const g1 = sim.claimCityGoal('cg_l1_daily_customers');
  assert.equal(g1.success, true, 'daily_customers đạt → nhận được (per-goal)');
  assert.ok((g1.reward?.gold ?? 0) > 0, 'thưởng gold > 0');
  assert.equal(sim.claimCityGoal('cg_l1_building_types').success, false, 'building_types chưa đạt → chưa nhận được (goal_not_met)');
  assert.ok(!g1.levelUp, 'chưa hết cấp → không lên cấp');
  // Milestones không bị đẩy trùng (đúng 1 goal_claimed, 0 level_up).
  const milestones = internal<{ milestones: { type: string }[] }>(sim, '_cityProgress').milestones;
  assert.equal(milestones.filter(m => m.type === 'goal_claimed').length, 1, 'chỉ 1 goal_claimed khi nhận 1 mục tiêu');
  assert.equal(milestones.filter(m => m.type === 'level_up').length, 0, 'chưa lên cấp nên không có level_up');
  // Thưởng: vàng vào quỹ chung (player.money), ledger ghi city_goal_reward.
  const before = sim.getPlayerData().money;
  const rewBefore = ledgerOf(sim, 'city_goal_reward').length;
  // Nhận LẠI mục tiêu đã claim → từ chối (chỉ nhận 1 lần), không thưởng thêm, không ghi ledger nữa.
  const g1b = sim.claimCityGoal('cg_l1_daily_customers');
  assert.equal(g1b.success, false, 'mục tiêu đã nhận rồi → từ chối');
  assert.equal(g1b.reason, 'already_claimed', 'lý do from chối = already_claimed');
  assert.equal(sim.getPlayerData().money, before, 'không thưởng thêm khi nhận lại');
  assert.equal(ledgerOf(sim, 'city_goal_reward').length, rewBefore, 'không ghi ledger thêm khi nhận lại');
  const rew = ledgerOf(sim, 'city_goal_reward');
  assert.ok(rew.length >= 1, 'ledger có city_goal_reward');
  assert.equal(rew[rew.length - 1].amount, 20_000, 'ledger amount = thưởng gold của mục tiêu');
  // 1.2: lên cấp khi nhận HẾT mục tiêu cấp — hàm thuần đẩy đúng 1 goal_claimed + 1 level_up, không trùng.
  assert.equal(ledgerOf(sim, 'city_goal_reward').length >= 1, true, 'đã thưởng cho mục tiêu đầu');
  console.log('  ✓ city goals (per-goal + thưởng + chống trùng) PASS');
}
const parkDef = civicBundleById('bundle_park')!;

function freshParkSim(money = 200_000_000): GameSimulation {
  return newSim({ cityLevel: 9, bundles: emptyBundleState('bundle_park'), money });
}

function runDonationRejectTests(): void {
  console.log('\n--- Góp sổ: từ chối các trường hợp (2.3) ---');
  // bundle_hidden: cấp thành phố thấp chưa hiện trang.
  const hidden = newSim({ cityLevel: 3, bundles: emptyBundleState('bundle_park') });
  assert.equal(hidden.donateToBundle('bundle_park', 'slot_park_cash', undefined, undefined, 100_000).reason, 'bundle_hidden', 'chưa hiện (cấp 3 < 4)');
  // slot_not_found.
  const sim = freshParkSim();
  assert.equal(sim.donateToBundle('bundle_park', 'nope', undefined, undefined, 100_000).reason, 'slot_not_found', 'ô không tồn tại');
  // Hàng vào ô tiền (cash): thiếu amount → invalid_amount.
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_cash', 'nuoc_rua_tay', 5, undefined).reason, 'invalid_amount', 'hàng vào ô tiền bị từ chối');
  // Tiền vào ô hàng (goods): thiếu productId → product_required.
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', undefined, undefined, 100_000).reason, 'product_required', 'tiền vào ô hàng bị từ chối');
  // wrong_product.
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'coca_pepsi', 5, undefined).reason, 'wrong_product', 'sai món');
  // invalid_quantity.
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 0, undefined).reason, 'invalid_quantity', 'số lượng 0');
  // not_enough_stock: kho không đủ (> số góp muốn).
  seedStock(sim, 'nuoc_rua_tay', [{ quantity: 3, expiresOnDay: day(sim) + 5, unitCost: 18000 }]);
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 5, undefined).reason, 'not_enough_stock', 'kho không đủ');
  // Lô còn hạn < 1 ngày bị bỏ qua → không đủ.
  const sim2 = freshParkSim();
  seedStock(sim2, 'nuoc_lau_kinh', [{ quantity: 20, expiresOnDay: day(sim2), unitCost: 15000 }]);
  assert.equal(sim2.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_lau_kinh', 10, undefined).reason, 'not_enough_stock', 'lô còn hạn < 1 ngày bị loại');
  // money: góp tiền quá số đang có.
  const poor = freshParkSim(50_000);
  assert.equal(poor.donateToBundle('bundle_park', 'slot_park_cash', undefined, undefined, 1_000_000).reason, 'money', 'thiếu tiền');
  console.log('  ✓ từ chối PASS');
}

function runDonationFifoTests(): void {
  console.log('\n--- Góp hàng: FIFO giá vốn + góp vượt (2.3) ---');
  const sim = freshParkSim();
  // Slot hygiene_1 cần 10; seed nuoc_rua_tay 2 lô: 5×15000 (hạn xa trước, hết trước) + 10×20000.
  seedStock(sim, 'nuoc_rua_tay', [
    { quantity: 5, expiresOnDay: day(sim) + 5, unitCost: 15000 },
    { quantity: 10, expiresOnDay: day(sim) + 20, unitCost: 20000 },
  ]);
  const invBefore = internal<{ productId: string; quantity: number }[]>(sim, 'inventory').find(i => i.productId === 'nuoc_rua_tay')!.quantity;
  // Góp vượt: muốn 999 nhưng chỉ nhận phần thiếu (10), FIFO lấy 5×15000 + 5×20000 = 175000.
  const res = sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 999, undefined);
  assert.equal(res.success, true, 'góp vượt vẫn thành công (chỉ nhận phần thiếu)');
  const d = ledgerOf(sim, 'civic_donation');
  assert.equal(d.length, 1, 'có đúng 1 dòng civic_donation');
  assert.equal(d[0].quantity, 10, 'chỉ nhận đúng phần thiếu (10), không lấy cả 999');
  assert.equal(d[0].amount, 175_000, 'giá vốn FIFO = 5×15000 + 5×20000 = 175000');
  assert.equal(d[0].cogs, 175_000, 'cogs = giá vốn FIFO');
  assert.equal(d[0].bundleId, 'bundle_park', 'ledger có bundleId');
  assert.equal(d[0].slotId, 'slot_park_hygiene_1', 'ledger có slotId');
  // Kho đã trừ 10 (FIFO lô cũ trước): giữ 5×20000 = 100k còn lại.
  const invAfter = internal<{ productId: string; quantity: number; lots: unknown[] }[]>(sim, 'inventory').find(i => i.productId === 'nuoc_rua_tay')!;
  assert.equal(invBefore - invAfter.quantity, 10, 'kho trừ đúng 10');
  const st = (bundlesOf(sim) as Record<string, { slots: Record<string, number>; contributions: { value?: number }[] }>)['bundle_park'];
  assert.equal(st.slots['slot_park_hygiene_1'], 10, 'ô goods bằng 10');
  assert.equal(st.contributions[0].value, 175_000, 'contribution lưu giá vốn 175000');
  console.log('  ✓ FIFO + góp vượt PASS');
}

function runLedgerNetProfitTests(): void {
  console.log('\n--- Sổ cái + netProfit (1.8/2.3) ---');
  const sim = freshParkSim();
  seedStock(sim, 'nuoc_rua_tay', [{ quantity: 20, expiresOnDay: day(sim) + 5, unitCost: 15000 }]);
  // Bắt phần trước như SỐ (không giữ tham chiếu sống — currentDayRecord là ref chung, đọc lại sẽ thành giá đã cập nhật).
  const recBefore = currentRecord(sim);
  const cogsBefore = recBefore.cogs;
  const revenueBefore = recBefore.revenue;
  assert.equal(revenueBefore, 0, 'chưa có doanh thu (hàng góp không phải revenue)');
  sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 10, undefined);
  const rec = currentRecord(sim);
  // 1.8: cogs tăng ĐÚNG 1 lần (không trừ 2 lần); hàng góp không là doanh thu; netProfit trừ qua grossProfit.
  assert.equal(rec.cogs, cogsBefore + 150_000, 'cogs tăng đúng 10×15000 (giá vốn) — không trừ 2 lần');
  assert.equal(rec.revenue, revenueBefore, 'revenue không đổi (hàng góp không là doanh thu)');
  assert.equal(rec.netProfit, computeNetProfit(rec), 'netProfit trừ đúng 1 lần qua grossProfit');
  const d = ledgerOf(sim, 'civic_donation');
  assert.equal(d.length, 1, 'có 1 dòng civic_donation');
  assert.equal(d[0].amount, 150_000, 'ledger ghi giá vốn (không phải doanh thu)');
  assert.equal(d[0].bundleId, 'bundle_park', 'bundleId trong civic_donation');
  assert.equal(d[0].slotId, 'slot_park_hygiene_1', 'slotId trong civic_donation');
  console.log('  ✓ ledger + netProfit PASS');
}
function runCompletionOpenTests(): void {
  console.log('\n--- Hoàn thành sổ → mở công trình + giá tòa đầu (2.3) ---');
  const sim = freshParkSim();
  const d0 = day(sim);
  seedStock(sim, 'nuoc_rua_tay', [{ quantity: 10, expiresOnDay: d0 + 5, unitCost: 18000 }]);
  seedStock(sim, 'xa_phong', [{ quantity: 10, expiresOnDay: d0 + 5, unitCost: 7000 }]);
  seedStock(sim, 'bim_bim_oishi', [{ quantity: 12, expiresOnDay: d0 + 5, unitCost: 4000 }]);
  const c = civicBundleCashAmount(parkDef);
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 10, undefined).success, true, 'góp hygiene_1');
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_hygiene_2', 'xa_phong', 10, undefined).success, true, 'góp hygiene_2');
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_snack', 'bim_bim_oishi', 12, undefined).success, true, 'góp snack');
  assert.equal(sim.donateToBundle('bundle_park', 'slot_park_cash', undefined, undefined, c).success, true, 'góp quỹ đủ');
  const st = (bundlesOf(sim) as Record<string, { completedDay?: number }>)['bundle_park'];
  assert.ok(st.completedDay !== undefined, 'trang đã góp đủ → completedDay được đặt');
  assert.equal(isBundleCompleted(parkDef, st as any), true, 'isBundleCompleted = true');
  const donated = bundleDonatedValue(parkDef, st as any);
  const expectedFirst = Math.max(0, 2_500_000 - donated);
  // Tòa đầu: trả phần còn lại.
  const M0 = moneyOf(sim);
  const open = sim.openBuilding('park', 'lot-east-1', 21, 5);
  assert.equal(open.success, true, 'mở công viên tòa đầu thành công');
  assert.equal(M0 - moneyOf(sim), expectedFirst, `tòa đầu trả phần còn lại (${expectedFirst})`);
  // Tòa 2+ giá gốc; không âm.
  const bs = bundlesOf(sim) as Record<string, unknown>;
  assert.equal(civicOpenCost('park', 2_500_000, bs as any, 1), 2_500_000, 'tòa 2+ trả giá gốc');
  // Không âm: góp quá giá xây vẫn về 0 (max(0, …)).
  const overState = { bundle_park: { slots: { slot_park_hygiene_1: 10, slot_park_hygiene_2: 10, slot_park_snack: 12, slot_park_cash: 1_750_000 }, contributions: [{ playerId: 'c', slotId: 'slot_park_cash', qty: 4_000_000, day: 1, value: 4_000_000 }], completedDay: 2 } };
  assert.equal(civicOpenCost('park', 2_500_000, overState as any, 0), 0, 'không âm khi đã góp đủ giá xây');
  console.log('  ✓ hoàn thành + mở công trình PASS');
}
function runLandPolicyCostTests(): void {
  console.log('\n--- Phiếu mở tòa (co-op): dùng giá CÒN PHẢI TRẢ (2.2) ---');
  const action = { type: 'open_building', buildingTypeId: 'park', parcelId: 'lot-east-1', originX: 21, originY: 5 };
  // Sổ park xong, đã góp 2,4M → còn phải trả 100k.
  const bs = { bundle_park: {
    slots: { slot_park_hygiene_1: 10, slot_park_hygiene_2: 10, slot_park_snack: 12, slot_park_cash: 1_750_000 },
    contributions: [{ playerId: 'c', slotId: 'slot_park_cash', qty: 2_400_000, day: 1, value: 2_400_000 }],
    completedDay: 2,
  } };
  // funds 1M: còn trả 100k = 10% < ngưỡng phiếu → cho chạy (allow).
  const decWith = decideLandCommand(action, 'member', undefined, 1_000_000, true, { bundleStates: bs as any, buildings: [] });
  assert.equal(decWith.action, 'allow', 'giá còn trả nhỏ so với quỹ → không cần phiếu');
  // Không có ctx (giá gốc 2,5M = 250% > 30%): cần phiếu.
  const decWithout = decideLandCommand(action, 'member', undefined, 1_000_000, true);
  assert.equal(decWithout.action, 'vote', 'giá gốc lớn → cần phiếu');
  console.log('  ✓ land-policy PASS');
}

/** Giá phiếu (land-policy) phải bằng số tiền bị trừ thật của openBuilding — chung một hàm đếm tòa. */
function runVotePriceMatchesChargeTests(): void {
  console.log('\n--- Giá phiếu = tiền bị trừ thật (đếm tòa chung) ---');
  // Giá phiếu suy ra bằng cách dò quỹ nhỏ nhất mà lệnh còn "allow" (ngưỡng 30% quỹ): price ≈ 0.3 × funds.
  const reportedPrice = (action: unknown, ctx: any): number => {
    let lo = 1, hi = 100_000_000;
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (decideLandCommand(action, 'member', undefined, mid, true, ctx).action === 'allow') hi = mid; else lo = mid + 1; }
    return Math.round(lo * 0.3);
  };
  const near = (a: number, b: number) => Math.abs(a - b) <= 1;
  const sim = freshParkSim();
  const d0 = day(sim);
  seedStock(sim, 'nuoc_rua_tay', [{ quantity: 10, expiresOnDay: d0 + 5, unitCost: 18000 }]);
  seedStock(sim, 'xa_phong', [{ quantity: 10, expiresOnDay: d0 + 5, unitCost: 7000 }]);
  seedStock(sim, 'bim_bim_oishi', [{ quantity: 12, expiresOnDay: d0 + 5, unitCost: 4000 }]);
  sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 10, undefined);
  sim.donateToBundle('bundle_park', 'slot_park_hygiene_2', 'xa_phong', 10, undefined);
  sim.donateToBundle('bundle_park', 'slot_park_snack', 'bim_bim_oishi', 12, undefined);
  sim.donateToBundle('bundle_park', 'slot_park_cash', undefined, undefined, civicBundleCashAmount(parkDef));
  const act = (parcelId: string, x: number, y: number) => ({ type: 'open_building', buildingTypeId: 'park', parcelId, originX: x, originY: y });
  const bs = bundlesOf(sim) as any;
  const discounted = Math.max(0, 2_500_000 - bundleDonatedValue(parkDef, bs.bundle_park));
  // (1) chưa có tòa nào + id tiền tố gần giống loại khác ('park-big-1', 'park-1x') không được tính.
  const decoys = [{ buildingId: 'park-big-1' }, { buildingId: 'park-1x' }];
  assert.equal(countBuildingsOfType(decoys, 'park'), 0, 'id tiền tố trùng không tính là tòa park');
  assert.equal(countBuildingsOfType([{ buildingId: 'park-1' }, { buildingId: 'park-2' }], 'park'), 2, 'đếm đúng park-n');
  const p1 = reportedPrice(act('lot-east-1', 21, 5), { bundleStates: bs, buildings: decoys });
  assert.ok(near(p1, discounted), `giá phiếu tòa đầu (${p1}) = giá giảm (${discounted})`);
  const M0 = moneyOf(sim);
  assert.equal(sim.openBuilding('park', 'lot-east-1', 21, 5).success, true, 'mở tòa đầu');
  assert.equal(M0 - moneyOf(sim), discounted, 'tiền bị trừ thật = giá giảm');
  assert.ok(near(p1, M0 - moneyOf(sim)), 'giá phiếu = tiền trừ thật (tòa đầu)');
  // (2) đã có một tòa → giá gốc, cả phiếu lẫn trừ tiền.
  const placements = (sim as any).buildingPlacements as { buildingId: string }[];
  const p2 = reportedPrice(act('lot-east-1', 30, 5), { bundleStates: bs, buildings: placements });
  assert.ok(near(p2, 2_500_000), `đã có 1 tòa → phiếu báo giá gốc (${p2})`);
  assert.equal(sim.getOpenBuildingCost('park', 2_500_000), 2_500_000, 'getOpenBuildingCost giá gốc khi đã có tòa');
  // Mở thật tòa thứ hai (dò vị trí hợp lệ) → tiền trừ = giá phiếu báo.
  const M1 = moneyOf(sim);
  let second = false;
  for (let x = 0; x < 70 && !second; x++) for (let y = 0; y < 45 && !second; y++) second = sim.openBuilding('park', 'lot-west', x, y).success;
  if (second) assert.ok(near(p2, M1 - moneyOf(sim)), `phiếu (${p2}) = tiền trừ thật tòa 2 (${M1 - moneyOf(sim)})`);
  console.log('  ✓ giá phiếu = tiền trừ thật PASS');
}

function runSaveSchemaHashTests(): void {
  console.log('\n--- Save schema 10/11 + validate + hash (1.7/2.3) ---');
  const sim = freshParkSim();
  seedStock(sim, 'nuoc_rua_tay', [{ quantity: 10, expiresOnDay: day(sim) + 5, unitCost: 18000 }]);
  sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 10, undefined);
  const exp = sim.exportSaveData();
  assert.equal(validateSaveGameData(exp).valid, true, 'save schema hiện tại hợp lệ');
  // schema 10 vẫn nạp + validate được.
  const s10 = structuredClone(exp);
  s10.schemaVersion = 10;
  assert.equal(validateSaveGameData(s10).valid, true, 'schema 10 hợp lệ');
  const sim10 = new GameSimulation(s10, generateStarterTileMap(), new InputManager(), {});
  assert.ok((bundlesOf(sim10) as Record<string, unknown>)['bundle_park'], 'schema 10 nạp được bundles');
  // slots âm → từ chối.
  const bad = structuredClone(exp);
  (bad as any).civic.bundles['bundle_park'].slots['slot_park_hygiene_1'] = -5;
  assert.equal(validateSaveGameData(bad).valid, false, 'ô âm bị từ chối');
  // contribution thiếu slotId → từ chối.
  const bad2 = structuredClone(exp);
  (bad2 as any).civic.bundles['bundle_park'].contributions = [{ playerId: 'x' }];
  assert.equal(validateSaveGameData(bad2).valid, false, 'contribution thiếu slotId/qty bị từ chối');
  // Mongo lưu `undefined` thành null: civic/bundles = null phải hợp lệ (trước đây làm layout_batch bị từ chối oan).
  const nullCivic = structuredClone(exp) as any; nullCivic.civic = null;
  assert.equal(validateSaveGameData(nullCivic).valid, true, 'civic = null (Mongo) hợp lệ');
  const nullBundles = structuredClone(exp) as any; nullBundles.civic = { populationByDistrict: {}, bundles: null };
  assert.equal(validateSaveGameData(nullBundles).valid, true, 'civic.bundles = null hợp lệ');
  // Hash: 2 sim cùng save + cùng dãy lệnh → cùng hashSimulationState.
  const mk = (): GameSimulation => {
    const s = freshParkSim();
    seedStock(s, 'nuoc_rua_tay', [{ quantity: 10, expiresOnDay: day(s) + 5, unitCost: 18000 }]);
    s.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 10, undefined);
    s.donateToBundle('bundle_park', 'slot_park_cash', undefined, undefined, 100_000);
    advance(s, 2);
    return s;
  };
  const a = mk(); const b = mk();
  assert.equal(hashSimulationState(a), hashSimulationState(b), 'hai sim cùng save + lệnh → cùng hash');
  console.log('  ✓ save + hash PASS');
}

export function runCivicBundleTests(): void {
  runBalanceTests();
  runMetricsTests();
  runConstructorBundleTests();
  runCityGoalTests();
  runDonationRejectTests();
  runDonationFifoTests();
  runLedgerNetProfitTests();
  runCompletionOpenTests();
  runLandPolicyCostTests();
  runVotePriceMatchesChargeTests();
  runSaveSchemaHashTests();
}