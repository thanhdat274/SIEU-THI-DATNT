/**
 * Quét kinh tế civic-population-demand (90 ngày): 3 kịch bản
 * (a) không công trình; (b) mỗi loại civic 1 cái gần tâm khu tiệm chính; (c) spam tối đa (2 mỗi loại).
 * Ghi kết quả vào tổng hợp.md.
 *
 * OpenSpec `civic-local-fees`: bảng có thêm cột chi phí xóm/ngày (duy trì + phí), % doanh thu ngày và hoàn vốn
 * tính theo lãi ròng SAU phí. `QA_BUILD_MULT` / `QA_UPKEEP_MULT` nhân giá xây / phí duy trì để so nhiều bộ số
 * TRƯỚC khi chốt `CIVIC_DEFS` (mặc định 1 = số thật trong `CIVIC_DEFS`).
 *
 * Chạy: npx tsx src/economy-civic-pop-sweep.ts            (số thật)
 *       QA_BUILD_MULT=1.8 QA_UPKEEP_MULT=2.3 npx tsx …    (bộ số thử, KHÔNG ghi vào dữ liệu game)
 *
 * Lọc 2 vòng cho nhanh:
 *   - Vòng lọc: `QA_MODE=quick` = 1 seed × 45 ngày × chỉ (a)+(b) (~3–4 phút/lượt) — so nhiều bộ số.
 *   - Vòng chốt: mặc định = 3 seed × 90 ngày × (a)+(b)+(c) cho bộ số đã chọn.
 *   Ghi đè từng phần: `QA_SEEDS`, `QA_DAYS`, `QA_SCENARIOS=none,one_each,spam`.
 */
import { DEFAULT_INITIAL_SAVE, BUILDING_TYPE_DEFS, CIVIC_DEFS, generateStarterTileMap, resolveParcel } from '@game/data';

const QUICK = process.env.QA_MODE === 'quick';
const SEEDS = Number(process.env.QA_SEEDS ?? (QUICK ? 1 : 3));
/** Cấp người chơi khi quét: mặc định 25 (mở đủ 4 công trình). Cấp cao chạm trần lưu lượng `trafficAtLevel` (≤ 6) nên hệ số dân số không còn tác dụng. */
const LEVEL = Number(process.env.QA_LEVEL ?? 25);
const DAYS = Number(process.env.QA_DAYS ?? (QUICK ? 45 : 90));
const PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'xa_phong', 'banh_quy', 'sua_ong_tho', 'keo_cao_su'];
type Scenario = 'none' | 'one_each' | 'spam';
const ALL_SCENARIOS: Scenario[] = ['none', 'one_each', 'spam'];
/** Luôn có (a) và (b) — mọi bảng so với (a), dòng chốt dựa trên (b). */
const SCENARIOS: Scenario[] = (() => {
  const wanted = (process.env.QA_SCENARIOS ?? (QUICK ? 'none,one_each' : ALL_SCENARIOS.join(','))).split(',').map(x => x.trim());
  return ALL_SCENARIOS.filter(x => x === 'none' || x === 'one_each' || wanted.includes(x));
})();

/** Bộ số ĐANG thử: nhân giá xây / phí duy trì của `CIVIC_DEFS`. 1 = số thật đang có trong dữ liệu. */
const BUILD_MULT = Number(process.env.QA_BUILD_MULT ?? 1);
const UPKEEP_MULT = Number(process.env.QA_UPKEEP_MULT ?? 1);

/**
 * Giá xây ĐANG dùng (sau ghi đè) theo loại — bảng chốt TRƯỚC ghi đè để tính đúng chi phí bỏ ra.
 */
const EFFECTIVE_BUILD_COST: Record<string, number> = Object.fromEntries(
  CIVIC_DEFS.map(def => [def.buildingTypeId, BUILD_MULT === 1 ? def.buildCost : Math.max(1, Math.round(def.buildCost * BUILD_MULT / 1000) * 1000)]),
);

/**
 * Ghi đè giá xây / phí duy trì civic trong bộ nhớ để thử bộ số mà KHÔNG sửa dữ liệu game.
 * Chỉ chạy khi có hệ số ≠ 1. Việc nạp `./simulation` phải làm SAU khi gọi hàm này (xem `main`).
 */
function applyCivicOverrides(): void {
  for (const def of CIVIC_DEFS) {
    const buildCost = EFFECTIVE_BUILD_COST[def.buildingTypeId];
    const upkeepPerDay = UPKEEP_MULT === 1 ? def.upkeepPerDay : Math.max(0, Math.round(def.upkeepPerDay * UPKEEP_MULT));
    def.buildCost = buildCost;
    def.upkeepPerDay = upkeepPerDay;
    // `BUILDING_TYPE_DEFS` sao chép `buildCost`/`openCost` ra bản ghi riêng (một chiều từ CIVIC_DEFS) → phải đồng bộ.
    const typeDef = BUILDING_TYPE_DEFS[def.buildingTypeId as keyof typeof BUILDING_TYPE_DEFS];
    if (typeDef) {
      (typeDef as { buildCost?: number }).buildCost = buildCost;
      (typeDef as { openCost: number }).openCost = buildCost;
    }
  }
}

interface ScenarioResult {
  revenue: number[];
  totalRevenue: number;
  totalCustomers: number;
  qolDay90: number;
  popDay90: number;
  targetDay90: number;
  factorDay90: number;
  paybackDay: number | null;
  placed: number;
  setupCost: number;
  netTotal: number;
  /** Chi phí xóm TRUNG BÌNH/ngày (duy trì + phí) do simulation trừ thật trong 90 ngày. */
  upkeepPerDay: number;
  feePerDay: number;
  /** % doanh thu ngày của chi phí xóm (duy trì + phí). */
  costPctOfRevenue: number;
}

/** Module đã nạp SAU khi áp bộ số (thứ tự nạp quan trọng: `simulation` đọc `BUILDING_TYPE_DEFS`). */
type SweepModules = {
  InputManager: typeof import('./input').InputManager;
  GameSimulation: typeof import('./simulation').GameSimulation;
  createMarketState: typeof import('./market').createMarketState;
  isSalesFixture: (f: unknown) => boolean;
};

const quantile = (xs: number[], q: number) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');

/** Chi phí xóm/ngày của kịch bản (duy trì + phí) — lấy từ `DailyRecord` do simulation trừ thật. */
function dailyCivicCosts(sim: import('./simulation').GameSimulation, startDay: number): { upkeepPerDay: number; feePerDay: number; costPctOfRevenue: number } {
  let upkeep = 0, fee = 0, revenue = 0, days = 0;
  for (const record of Object.values(sim.getDailyRecords())) {
    if (record.day < startDay) continue;
    upkeep += record.civicUpkeep ?? 0;
    fee += record.civicFee ?? 0;
    revenue += record.revenue;
    days++;
  }
  const n = Math.max(1, days);
  return { upkeepPerDay: upkeep / n, feePerDay: fee / n, costPctOfRevenue: revenue > 0 ? ((upkeep + fee) / revenue) * 100 : 0 };
}

function setupSim(mods: SweepModules, seed: string): import('./simulation').GameSimulation {
  const save = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: mods.createMarketState(seed, 1) };
  save.player = { ...save.player, level: LEVEL, money: 20_000_000 };
  save.worldTime = { ...save.worldTime, isStoreOpen: false };
  const sim = new mods.GameSimulation(save, generateStarterTileMap(), new mods.InputManager());
  sim.reclaimWave('w1');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(sim.getTime().day + 2);
  sim.buyParcel('w1-corner');
  sim.buyParcel('w1-east');
  return sim;
}

function refill(mods: SweepModules, sim: import('./simulation').GameSimulation): void {
  sim.getFixtures().filter(f => mods.isSalesFixture(f)).forEach((shelf, i) => {
    shelf.assignedProductId = shelf.assignedProductId ?? PRODUCTS[i % PRODUCTS.length];
    shelf.currentStock = Math.max(shelf.currentStock ?? 0, 14);
    shelf.stockLots = [{ quantity: shelf.currentStock, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  });
}

/**
 * Đặt công trình: ưu tiên lô W0 (khu tiệm chính), rồi lô W1 đã mua; gốc hợp lệ đầu tiên trong lô.
 * Chi phí tính theo `EFFECTIVE_BUILD_COST` (giá ĐANG dùng sau ghi đè), không theo bảng dữ liệu gốc.
 */
function placeCivic(sim: import('./simulation').GameSimulation, scenario: 'none' | 'one_each' | 'spam'): { cost: number; placed: number } {
  if (scenario === 'none') return { cost: 0, placed: 0 };
  const count = scenario === 'one_each' ? 1 : 2;
  let cost = 0, placed = 0;
  for (let n = 0; n < count; n++) {
    for (const typeId of ['park', 'clinic', 'ward_police', 'primary_school'] as const) {
      const tpl = BUILDING_TYPE_DEFS[typeId];
      const lots = sim.getBuildableParcelIds().sort((x, y) => Number(resolveParcel(y)!.wave === 0) - Number(resolveParcel(x)!.wave === 0));
      let done = false;
      for (const parcelId of lots) {
        const rect = resolveParcel(parcelId)!.rect;
        for (let x = rect.x0; x <= rect.x1 && !done; x++) {
          if (sim.openBuilding(typeId, parcelId, x, rect.y1 - tpl.template.height + 1).success) { cost += EFFECTIVE_BUILD_COST[typeId] ?? tpl.openCost; placed++; done = true; }
        }
        if (done) break;
      }
    }
  }
  return { cost, placed };
}

function runScenario(mods: SweepModules, scenario: 'none' | 'one_each' | 'spam', seed: string): ScenarioResult {
  const sim = setupSim(mods, seed);
  const { cost: setupCost, placed } = placeCivic(sim, scenario);
  refill(mods, sim);
  if (!sim.getTime().isStoreOpen) sim.getClock().toggleStoreStatus();

  const startDay = sim.getTime().day;
  let day = startDay, hour = sim.getTime().hour, guard = 0;
  const revenue: number[] = [];

  while (sim.getTime().day < startDay + DAYS && guard++ < 8_000_000) {
    const t = sim.getTime();
    if (t.day !== day) {
      revenue.push(sim.getDailyRecords()[day]?.revenue ?? 0);
      day = t.day;
      refill(mods, sim);
    }
    if (t.hour !== hour) { hour = t.hour; refill(mods, sim); }
    if (!t.isStoreOpen && t.hour >= 7 && t.hour < 20) sim.getClock().toggleStoreStatus();
    sim.update(0.25);
  }

  // Chốt ngày cuối
  const lastDay = sim.getTime().day;
  revenue.push(sim.getDailyRecords()[lastDay]?.revenue ?? 0);

  const totalRevenue = revenue.reduce((a, b) => a + b, 0);
  const popSnap = sim.getCivicPopulation();
  const mainDistrict = sim.getMainShopDistrictId();
  const mainPop = popSnap[mainDistrict];
  const civic = dailyCivicCosts(sim, startDay);

  return {
    revenue,
    totalRevenue,
    totalCustomers: sim.getStatistics().totalCustomersServed,
    qolDay90: Math.round(sim.getCivicQol()[mainDistrict] ?? 0),
    popDay90: Math.round(mainPop?.pop ?? 0),
    targetDay90: Math.round(mainPop?.target ?? 0),
    factorDay90: mainPop?.factor ?? 1,
    paybackDay: null,
    placed,
    setupCost,
    netTotal: Object.values(sim.getDailyRecords()).filter(r => r.day >= startDay).reduce((sum, r) => sum + (r.netProfit ?? 0), 0),
    upkeepPerDay: civic.upkeepPerDay,
    feePerDay: civic.feePerDay,
    costPctOfRevenue: civic.costPctOfRevenue,
  };
}

/** Nạp module mô phỏng SAU khi áp bộ số, rồi chạy toàn bộ sweep và in bảng. */
async function main(): Promise<void> {
  // Ghi đè bộ số TRƯỚC khi nạp simulation (thiếu dòng này thì QA_UPKEEP_MULT không có tác dụng).
  if (BUILD_MULT !== 1 || UPKEEP_MULT !== 1) applyCivicOverrides();
  const mods: SweepModules = {
    InputManager: (await import('./input')).InputManager,
    GameSimulation: (await import('./simulation')).GameSimulation,
    createMarketState: (await import('./market')).createMarketState,
    isSalesFixture: (await import('@game/shared')).isSalesFixture as (f: unknown) => boolean,
  };

  console.log(`\n=== Quét kinh tế civic-population-demand: ${SEEDS} seed × ${DAYS} ngày ===`);
  console.log(`Bộ số: giá xây ×${BUILD_MULT}, duy trì ×${UPKEEP_MULT} (1 = số thật trong CIVIC_DEFS)`);
  for (const def of CIVIC_DEFS) console.log(`   ${def.buildingTypeId}: xây ${vnd(def.buildCost)} · duy trì ${vnd(def.upkeepPerDay)}/ngày`);
  console.log('');

  const results: Record<string, ScenarioResult[]> = {};
  for (const scenario of SCENARIOS) {
    console.log(`--- Kịch bản: ${scenario} ---`);
    results[scenario] = [];
    for (let i = 0; i < SEEDS; i++) {
      const seed = `civic-pop-${i + 1}`;
      try {
        results[scenario].push(runScenario(mods, scenario, seed));
      } catch (e) {
        console.log(`  ${seed}: ${(e as Error).message}`);
      }
    }
  }

  // Bảng tổng hợp
  const baseRevenue = results['none']?.map(r => r.totalRevenue) ?? [];
  const scenarios = SCENARIOS;
  results.spam ??= [];
  const hasSpam = SCENARIOS.includes('spam');

  console.log('\n========== BẢNG TỔNG HỢP ==========');
  console.log(`Doanh thu ${DAYS} ngày (VND):\n`);
  console.log(`Kịch bản\t\tp10\t\t\tp50\t\t\tp90`);
  for (const scenario of scenarios) {
    const revs = results[scenario].map(r => r.totalRevenue);
    console.log(`${scenario === 'none' ? '(a) không công trình' : scenario === 'one_each' ? '(b) mỗi loại 1 cái' : '(c) spam 2 mỗi loại'}\t\t${vnd(quantile(revs, 0.1))}\t\t${vnd(quantile(revs, 0.5))}\t\t${vnd(quantile(revs, 0.9))}`);
  }

  console.log('\nQoL / dân số / factor ngày 90 (khu tiệm chính):\n');
  console.log(`Kịch bản\t\tQoL\t\tDân số\t\tTarget\t\tFactor`);
  for (const scenario of scenarios) {
    const r = results[scenario][0];
    if (r) {
      console.log(`${scenario === 'none' ? '(a) không' : scenario === 'one_each' ? '(b) 1 mỗi loại' : '(c) spam 2'}\t\t${r.qolDay90}\t\t${r.popDay90}\t\t${r.targetDay90}\t\t${r.factorDay90.toFixed(4)}`);
    }
  }

  console.log('\n% chênh doanh thu so với (a):\n');
  const baseP50 = quantile(baseRevenue, 0.5);
  for (const scenario of SCENARIOS.filter(x => x !== 'none')) {
    const revs = results[scenario].map(r => r.totalRevenue);
    const p50 = quantile(revs, 0.5);
    const pct = baseP50 > 0 ? ((p50 - baseP50) / baseP50 * 100) : 0;
    console.log(`(${scenario === 'one_each' ? 'b' : 'c'}) so (a): +${pct.toFixed(1)}%`);
  }

  console.log('\n========== KẾT LUẬN ==========');
  const oneEachP50 = quantile(results['one_each'].map(r => r.totalRevenue), 0.5);
  const spamP50 = quantile(results['spam'].map(r => r.totalRevenue), 0.5);
  const spamVsOne = oneEachP50 > 0 ? ((spamP50 - oneEachP50) / oneEachP50 * 100) : 0;
  const oneVsBase = baseP50 > 0 ? ((oneEachP50 - baseP50) / baseP50 * 100) : 0;
  console.log(`(b) so (a): ${oneVsBase.toFixed(1)}% ${oneVsBase > 25 ? '⚠ VƯỢT TRẦN +25%' : '✓ TRONG TRẦN'}`);
  if (hasSpam) console.log(`(c) so (b): ${spamVsOne.toFixed(1)}% ${spamVsOne > 10 ? '⚠ Spam quá mạnh (có thể cần giảm qolPoints)' : '✓ Spam có tác dụng hạn chế'}`);
  console.log('===================================\n');

  // ---- Bảng cho tổng hợp.md: theo seed, so với (a) cùng seed; hoàn vốn = giá xây / lãi ròng thêm mỗi ngày (SAU phí) ----
  console.log('');
  console.log(`| Kịch bản | Công trình đã xây | DT ngày ${Math.floor(DAYS / 3)} / ${Math.floor(DAYS * 2 / 3)} / ${DAYS - 1} (trung vị) | Tổng DT ${DAYS} ngày (trung vị) | % so (a) | Lãi ròng thêm / ngày | Upkeep + phí / ngày | % doanh thu ngày | Hoàn vốn (ngày, sau phí) | QoL / dân số / hệ số cuối kỳ |`);
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const scenario of scenarios) {
    const rs = results[scenario];
    const med = (f: (r: ScenarioResult) => number) => quantile(rs.map(f), 0.5);
    const gains = rs.map((r, i) => (r.netTotal - results.none[i].netTotal) / DAYS);
    const gain = quantile(gains, 0.5);
    const cost = med(r => r.setupCost);
    const payback = scenario === 'none' ? '—' : gain > 0 ? String(Math.round(cost / gain)) : 'không hoàn vốn';
    const pct = scenario === 'none' ? '—' : `${((med(r => r.totalRevenue) - baseP50) / baseP50 * 100).toFixed(1)}%`;
    const upkeep = med(r => r.upkeepPerDay);
    const fee = med(r => r.feePerDay);
    const costPct = med(r => r.costPctOfRevenue);
    const r0 = rs[0];
    console.log(`| ${scenario} | ${med(r => r.placed)} | ${vnd(med(r => r.revenue[Math.floor(DAYS / 3) - 1] ?? 0))} / ${vnd(med(r => r.revenue[Math.floor(DAYS * 2 / 3) - 1] ?? 0))} / ${vnd(med(r => r.revenue[DAYS - 2] ?? 0))} | ${vnd(med(r => r.totalRevenue))} | ${pct} | ${scenario === 'none' ? '—' : vnd(Math.round(gain))} | ${scenario === 'none' ? '—' : vnd(Math.round(upkeep))} + ${scenario === 'none' ? '—' : vnd(Math.round(fee))} | ${scenario === 'none' ? '—' : `${costPct.toFixed(2)}%`} | ${payback} | ${r0.qolDay90} / ${r0.popDay90} / ${r0.factorDay90.toFixed(3)} |`);
  }

  // ---- Bảng gọn để so nhiều bộ số (chốt `CIVIC_DEFS`) ----
  const one = results['one_each'];
  const none = results['none'];
  const gain = quantile(one.map((r, i) => (r.netTotal - none[i].netTotal) / DAYS), 0.5);
  const cost = quantile(one.map(r => r.setupCost), 0.5);
  console.log('\n--- DÒNG CHỐT BỘ SỐ (kịch bản b) ---');
  console.log(`level=${LEVEL} seeds=${SEEDS} days=${DAYS} buildMult=${BUILD_MULT} upkeepMult=${UPKEEP_MULT} | giá xây (b)=${vnd(cost)} | upkeep+phí/ngày=${vnd(Math.round(quantile(one.map(r => r.upkeepPerDay + r.feePerDay), 0.5)))} | %DT=${quantile(one.map(r => r.costPctOfRevenue), 0.5).toFixed(2)}% | lãi ròng thêm/ngày=${vnd(Math.round(gain))} | hoàn vốn=${gain > 0 ? Math.round(cost / gain) : 'không'} ngày`);
  console.log(hasSpam ? `KT: (b) so (a)=${oneVsBase.toFixed(1)}% | (c) so (b)=${spamVsOne.toFixed(1)}% | (c) lãi ròng ${vnd(Math.round(quantile(results['spam'].map((r, i) => (r.netTotal - none[i].netTotal) / DAYS), 0.5)))}/ngày` : `KT: (b) so (a)=${oneVsBase.toFixed(1)}% | (c) chưa chạy (vòng lọc) — chạy vòng chốt để kiểm spam`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

