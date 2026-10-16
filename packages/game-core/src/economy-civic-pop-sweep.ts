/**
 * Quét kinh tế civic-population-demand (90 ngày): 3 kịch bản
 * (a) không công trình; (b) mỗi loại civic 1 cái gần tâm khu tiệm chính; (c) spam tối đa (2 mỗi loại).
 * Ghi kết quả vào tổng hợp.md.
 * Chạy: yarn --cwd packages/game-core economy-civic-pop
 */
import { DEFAULT_INITIAL_SAVE, BUILDING_TYPE_DEFS, generateStarterTileMap, resolveParcel } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';
import { isSalesFixture } from '@game/shared';
import { hashSimulationState } from './replay';

const SEEDS = Number(process.env.QA_SEEDS ?? 4);
/** Cấp người chơi khi quét: mặc định 25 (mở đủ 4 công trình). Cấp cao chạm trần lưu lượng `trafficAtLevel` (≤ 6) nên hệ số dân số không còn tác dụng. */
const LEVEL = Number(process.env.QA_LEVEL ?? 25);
const DAYS = 90;
const PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'xa_phong', 'banh_quy', 'sua_ong_tho', 'keo_cao_su'];
const SCENARIOS = ['none' as const, 'one_each' as const, 'spam' as const];

const quantile = (xs: number[], q: number) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');

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
}

function setupSim(seed: string): GameSimulation {
  const save = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
  save.player = { ...save.player, level: LEVEL, money: 20_000_000 };
  save.worldTime = { ...save.worldTime, isStoreOpen: false };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  sim.reclaimWave('w1');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(sim.getTime().day + 2);
  sim.buyParcel('w1-corner');
  sim.buyParcel('w1-east');
  return sim;
}

function refill(sim: GameSimulation): void {
  sim.getFixtures().filter(isSalesFixture).forEach((shelf, i) => {
    shelf.assignedProductId = shelf.assignedProductId ?? PRODUCTS[i % PRODUCTS.length];
    shelf.currentStock = Math.max(shelf.currentStock ?? 0, 14);
    shelf.stockLots = [{ quantity: shelf.currentStock, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  });
}

/** Đặt công trình: ưu tiên lô W0 (khu tiệm chính), rồi lô W1 đã mua; gốc hợp lệ đầu tiên trong lô. Trả tổng giá xây + số đã xây. */
function placeCivic(sim: GameSimulation, scenario: 'none' | 'one_each' | 'spam'): { cost: number; placed: number } {
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
          if (sim.openBuilding(typeId, parcelId, x, rect.y1 - tpl.template.height + 1).success) { cost += tpl.buildCost ?? tpl.openCost; placed++; done = true; }
        }
        if (done) break;
      }
    }
  }
  return { cost, placed };
}

function runScenario(scenario: 'none' | 'one_each' | 'spam', seed: string): ScenarioResult {
  const sim = setupSim(seed);
  const { cost: setupCost, placed } = placeCivic(sim, scenario);
  refill(sim);
  if (!sim.getTime().isStoreOpen) sim.getClock().toggleStoreStatus();

  const startDay = sim.getTime().day;
  let day = startDay, hour = sim.getTime().hour, guard = 0;
  const revenue: number[] = [];
  let cumNet = -setupCost;

  while (sim.getTime().day < startDay + DAYS && guard++ < 8_000_000) {
    const t = sim.getTime();
    if (t.day !== day) {
      revenue.push(sim.getDailyRecords()[day]?.revenue ?? 0);
      day = t.day;
      refill(sim);
    }
    if (t.hour !== hour) { hour = t.hour; refill(sim); }
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
  };
}

console.log(`\n=== Quét kinh tế civic-population-demand: ${SEEDS} seed × ${DAYS} ngày ===\n`);

const results: Record<string, ScenarioResult[]> = {};
for (const scenario of SCENARIOS) {
  console.log(`--- Kịch bản: ${scenario} ---`);
  results[scenario] = [];
  for (let i = 0; i < SEEDS; i++) {
    const seed = `civic-pop-${i + 1}`;
    try {
      results[scenario].push(runScenario(scenario, seed));
    } catch (e) {
      console.log(`  ${seed}: ${(e as Error).message}`);
    }
  }
}

// Bảng tổng hợp
const baseRevenue = results['none']?.map(r => r.totalRevenue) ?? [];
const scenarios: ('none' | 'one_each' | 'spam')[] = ['none', 'one_each', 'spam'];

console.log('\n========== BẢNG TỔNG HỢP ==========');
console.log('Doanh thu 90 ngày (VND):\n');
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
for (const scenario of ['one_each', 'spam']) {
  const revs = results[scenario].map(r => r.totalRevenue);
  const p50 = quantile(revs, 0.5);
  const pct = baseP50 > 0 ? ((p50 - baseP50) / baseP50 * 100) : 0;
  console.log(`(b) so (a): +${pct.toFixed(1)}%`);
  if (scenario === 'spam') {
    const spamP50 = quantile(results['spam'].map(r => r.totalRevenue), 0.5);
    const oneEachP50 = quantile(results['one_each'].map(r => r.totalRevenue), 0.5);
    const spamVsOne = oneEachP50 > 0 ? ((spamP50 - oneEachP50) / oneEachP50 * 100) : 0;
    console.log(`(c) so (b): +${spamVsOne.toFixed(1)}%`);
  }
}

console.log('\n========== KẾT LUẬN ==========');
const oneEachP50 = quantile(results['one_each'].map(r => r.totalRevenue), 0.5);
const spamP50 = quantile(results['spam'].map(r => r.totalRevenue), 0.5);
const spamVsOne = oneEachP50 > 0 ? ((spamP50 - oneEachP50) / oneEachP50 * 100) : 0;
const oneVsBase = baseP50 > 0 ? ((oneEachP50 - baseP50) / baseP50 * 100) : 0;
console.log(`(b) so (a): ${oneVsBase.toFixed(1)}% ${oneVsBase > 25 ? '⚠ VƯỢT TRẦN +25%' : '✓ TRONG TRẦN'}`);
console.log(`(c) so (b): ${spamVsOne.toFixed(1)}% ${spamVsOne > 10 ? '⚠ Spam quá mạnh (có thể cần giảm qolPoints)' : '✓ Spam có tác dụng hạn chế'}`);
console.log('===================================\n');

// ---- Bảng cho tổng hợp.md: theo seed, so với (a) cùng seed; hoàn vốn = giá xây / lãi ròng thêm mỗi ngày ----
console.log('');
console.log('| Kịch bản | Công trình đã xây | DT ngày 30 / 60 / 89 (trung vị) | Tổng DT 90 ngày (trung vị) | % so (a) | Lãi ròng thêm / ngày | Hoàn vốn (ngày) | QoL / dân số / hệ số ngày 90 |');
console.log('|---|---|---|---|---|---|---|---|');
for (const scenario of scenarios) {
  const rs = results[scenario];
  const med = (f: (r: ScenarioResult) => number) => quantile(rs.map(f), 0.5);
  const gains = rs.map((r, i) => (r.netTotal - results.none[i].netTotal) / DAYS);
  const gain = quantile(gains, 0.5);
  const cost = med(r => r.setupCost);
  const payback = scenario === 'none' ? '—' : gain > 0 ? String(Math.round(cost / gain)) : 'không hoàn vốn';
  const pct = scenario === 'none' ? '—' : `${((med(r => r.totalRevenue) - baseP50) / baseP50 * 100).toFixed(1)}%`;
  const r0 = rs[0];
  console.log(`| ${scenario} | ${med(r => r.placed)} | ${vnd(med(r => r.revenue[29] ?? 0))} / ${vnd(med(r => r.revenue[59] ?? 0))} / ${vnd(med(r => r.revenue[88] ?? 0))} | ${vnd(med(r => r.totalRevenue))} | ${pct} | ${scenario === 'none' ? '—' : vnd(Math.round(gain))} | ${payback} | ${r0.qolDay90} / ${r0.popDay90} / ${r0.factorDay90.toFixed(3)} |`);
}
