/**
 * Quét kinh tế mở rộng (headless, Giai đoạn 3.6): nhiều hạt giống × kịch bản "mở tòa trên lô thuê".
 * Với mỗi seed: tiệm chính chạy kèm một tòa phụ (chi nhánh / cà phê / quán cơm / bãi xe) trên lô góc W1 đã thuê,
 * kệ luôn đầy (như `balance-sweep.ts`, nên số khách KHÔNG bị chặn bởi hàng — đây là TRẦN, không phải kỳ vọng).
 * In: doanh thu/lãi gộp theo tòa mỗi ngày (p10/p50/p90), tiền thuê/ngày, ngày hoàn vốn (chi phí mở),
 * tỷ lệ seed phá sản (lãi gộp tòa < tiền thuê/ngày suốt cả kỳ).
 * Đây là số đo từ mô phỏng, KHÔNG thay thế playtest thật.
 * Chạy: yarn --cwd packages/game-core economy-qa
 */
import { isSalesFixture } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, BUILDING_TYPE_DEFS, LAND_LEASE_CONSTANTS, generateStarterTileMap, parcelPrice, resolveParcel } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';

const SEEDS = Array.from({ length: Number(process.env.QA_SEEDS ?? 8) }, (_, i) => `qa-econ-${i + 1}`);
const DAYS = Number(process.env.QA_DAYS ?? 30);
const PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'xa_phong', 'banh_quy', 'sua_ong_tho', 'keo_cao_su'];
const SCENARIOS = ['grocery_branch', 'cafe', 'com_restaurant', 'parking_lot'] as const;
const PARCEL = 'w1-corner';

const quantile = (xs: number[], q: number) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');

interface RunResult { mainRevenue: number[]; revenue: number[]; gross: number[]; rentPerDay: number; setupCost: number; closedDays: number; paybackDay: number | null; endMoney: number }

function run(typeId: (typeof SCENARIOS)[number], seed: string): RunResult {
  const save = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
  save.player = { ...save.player, level: 60, money: 20_000_000 };
  save.worldTime = { ...save.worldTime, isStoreOpen: false };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  sim.reclaimWave('w1');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(sim.getTime().day + 2);
  const parcel = resolveParcel(PARCEL)!;
  const lease = sim.leaseParcel(PARCEL);
  // Thử các gốc trong lô tới khi hợp lệ (kích thước tòa khác nhau; bãi xe nhỏ hơn nên cần hàng mặt tiền khác).
  let open: ReturnType<typeof sim.openBuilding> = { success: false, reason: 'no_origin' };
  for (let y = parcel.rect.y0; y <= parcel.rect.y1 && !open.success; y++) for (let x = parcel.rect.x0; x <= parcel.rect.x1 && !open.success; x++) open = sim.openBuilding(typeId, PARCEL, x, y);
  if (!lease.success || !open.success) throw new Error(`setup lỗi ${typeId}: lease=${lease.reason} open=${open.reason}`);
  const instanceId = open.instanceId!;
  const dailyRent = Math.max(1, Math.ceil(parcelPrice(parcel) * LAND_LEASE_CONSTANTS.leaseDailyRate));
  const setupCost = BUILDING_TYPE_DEFS[typeId].openCost; // thuê không còn thu trước (spec D2)
  const refill = () => sim.getFixtures().filter(isSalesFixture).forEach((shelf, i) => {
    shelf.assignedProductId = shelf.assignedProductId ?? PRODUCTS[i % PRODUCTS.length];
    shelf.currentStock = Math.max(shelf.currentStock ?? 0, 14);
    shelf.stockLots = [{ quantity: shelf.currentStock, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  });
  refill();
  if (!sim.getTime().isStoreOpen) sim.getClock().toggleStoreStatus(); // đồng hồ chỉ chạy khi tiệm mở
  const startDay = sim.getTime().day;
  let day = startDay, hour = sim.getTime().hour, guard = 0;
  const revenue: number[] = [], gross: number[] = [], mainRevenue: number[] = [];
  let cumNet = -setupCost, paybackDay: number | null = null, closedDays = 0;
  const closeDay = (d: number) => {
    const rep = sim.getDailyRecords()[d]?.buildingReports?.[instanceId];
    const rec = sim.getDailyRecords()[d];
    mainRevenue.push((rec?.revenue ?? 0) - (rep?.revenue ?? 0));
    revenue.push(rep?.revenue ?? 0); gross.push(rep?.grossProfit ?? 0);
    cumNet += (rep?.grossProfit ?? 0) - dailyRent;
    if (paybackDay === null && cumNet >= 0) paybackDay = d - startDay + 1;
    if (sim.getBuildingPlacements()?.find(p => p.buildingId === instanceId)?.closedForRent) closedDays++;
  };
  while (sim.getTime().day < startDay + DAYS && guard++ < 8_000_000) {
    const t = sim.getTime();
    if (t.day !== day) { closeDay(day); day = t.day; refill(); }
    if (t.hour !== hour) { hour = t.hour; refill(); }
    if (!t.isStoreOpen && t.hour >= 7 && t.hour < 20) sim.getClock().toggleStoreStatus();
    sim.update(0.25);
  }
  return { mainRevenue, revenue, gross, rentPerDay: dailyRent, setupCost, closedDays, paybackDay, endMoney: sim.getPlayerData().money };
}

console.log(`Quét kinh tế: ${SEEDS.length} seed × ${DAYS} ngày, tòa phụ trên lô thuê ${PARCEL} (kệ luôn đầy ⇒ trần doanh thu)`);
for (const typeId of SCENARIOS) {
  const results: RunResult[] = [];
  for (const seed of SEEDS) { try { results.push(run(typeId, seed)); } catch (e) { console.log(`  ${typeId}/${seed}: ${(e as Error).message}`); } }
  if (!results.length) continue;
  const gross = results.flatMap(r => r.gross), rev = results.flatMap(r => r.revenue);
  const rent = results[0].rentPerDay, setup = results[0].setupCost;
  const loss = results.filter(r => r.gross.reduce((a, b) => a + b, 0) < r.rentPerDay * r.gross.length).length;
  const payback = results.map(r => r.paybackDay).filter((x): x is number => x !== null);
  console.log(`\n== ${typeId} (openCost ${vnd(BUILDING_TYPE_DEFS[typeId].openCost)}, thuê/ngày ${vnd(rent)})`);
  console.log(`  doanh thu/ngày p10/p50/p90: ${vnd(quantile(rev, .1))} / ${vnd(quantile(rev, .5))} / ${vnd(quantile(rev, .9))}`);
  console.log(`  (cùng harness) doanh thu tiệm chính/ngày p50: ${vnd(quantile(results.flatMap(r => r.mainRevenue), .5))}; thuê/doanh thu tòa p50: ${(rent / Math.max(1, quantile(rev, .5)) * 100).toFixed(1)}%`);
  console.log(`  lãi gộp/ngày  p10/p50/p90: ${vnd(quantile(gross, .1))} / ${vnd(quantile(gross, .5))} / ${vnd(quantile(gross, .9))}`);
  console.log(`  seed lỗ (lãi gộp tòa < thuê cả kỳ): ${loss}/${results.length}; ngày bị đóng vì nợ: ${results.reduce((a, r) => a + r.closedDays, 0)}`);
  console.log(`  hoàn vốn trong ${DAYS} ngày: ${payback.length}/${results.length} seed${payback.length ? `, ngày hoàn vốn p50=${quantile(payback, .5)}` : ''}`);
}
