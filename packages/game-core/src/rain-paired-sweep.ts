/**
 * Sweep CẶP cho hệ số khách theo mưa: mỗi đầu ngày nhân bản trạng thái, chạy CÙNG một ngày hai lần — bật và tắt
 * `RAIN_BAND_CUSTOMER_FACTOR` — rồi so doanh thu. Loại tác động chéo ngày (XP → lên cấp, uy tín, RNG tách nhánh)
 * mà `balance-sweep.ts` không tách được. Cấp giữ cố định (BALANCE_LEVEL, mặc định 6).
 * Chạy: npx tsx src/rain-paired-sweep.ts  (BALANCE_DAYS=60)
 */
import { isSalesFixture } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, RAIN_BAND_CUSTOMER_FACTOR, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState, effectiveWeatherId } from './market';
import { rainForecastForDay } from './weather';

const SEEDS = ['balance-a', 'balance-b', 'balance-c', 'balance-d', 'balance-e'];
const DAYS = Number(process.env.BALANCE_DAYS ?? 60);
const LEVEL = Number(process.env.BALANCE_LEVEL ?? 6);
const PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'ao_mua_bo', 'xa_phong', 'banh_quy'];
const ON = { ...RAIN_BAND_CUSTOMER_FACTOR };
const setFactors = (on: boolean) => { for (const k of Object.keys(ON) as (keyof typeof ON)[]) (RAIN_BAND_CUSTOMER_FACTOR as Record<string, number>)[k] = on ? ON[k] : 1; };

const refill = (sim: GameSimulation) => sim.getFixtures().filter(isSalesFixture).forEach((shelf, i) => {
  shelf.assignedProductId = PRODUCTS[i % PRODUCTS.length];
  shelf.currentStock = 14;
  shelf.stockLots = [{ quantity: 14, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
});
const lockLevel = (sim: GameSimulation) => { (sim as unknown as { playerData: { level: number } }).playerData.level = LEVEL; };

/** Chạy hết một ngày (tới khi sang ngày mới), trả doanh thu và số khách của ngày đó. */
function runDay(sim: GameSimulation): { revenue: number; customers: number } {
  const day = sim.getTime().day;
  let hour = sim.getTime().hour;
  for (let guard = 0; sim.getTime().day === day && guard < 400_000; guard++) {
    const t = sim.getTime();
    if (t.hour !== hour) { hour = t.hour; refill(sim); }
    if (!t.isStoreOpen && t.hour >= 8 && t.hour < 20) sim.getClock().toggleStoreStatus();
    sim.update(0.25);
  }
  const r = sim.getDailyRecords()[day];
  return { revenue: r?.revenue ?? 0, customers: r?.customersServed ?? 0 };
}

type Bucket = { days: number; on: number; off: number; onC: number; offC: number };
const buckets: Record<string, Bucket> = {};
let mismatch = 0;
for (const seed of SEEDS) {
  const save = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
  save.player = { ...save.player, level: LEVEL, money: 5_000_000 };
  let sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  for (let n = 0; n < DAYS; n++) {
    lockLevel(sim); refill(sim);
    const day = sim.getTime().day;
    const snapshot = sim.exportSaveData();
    const band = rainForecastForDay(sim.getWeatherSeed(), day, effectiveWeatherId(sim.getMarketState(), day))?.band ?? 'none';
    setFactors(false);
    const off = runDay(new GameSimulation(structuredClone(snapshot), generateStarterTileMap(), new InputManager()));
    setFactors(true);
    // Kiểm tất định: ngày nắng chạy lại từ cùng ảnh chụp phải ra đúng doanh thu (hệ số mưa = 1 cả hai).
    sim = new GameSimulation(structuredClone(snapshot), generateStarterTileMap(), new InputManager());
    const on = runDay(sim);
    if (band === 'none' && on.revenue !== off.revenue) mismatch++;
    const b = (buckets[band] ??= { days: 0, on: 0, off: 0, onC: 0, offC: 0 });
    b.days++; b.on += on.revenue; b.off += off.revenue; b.onC += on.customers; b.offC += off.customers;
  }
}
console.log(`Sweep cặp: ${SEEDS.length} seed × ${DAYS} ngày, cấp ${LEVEL}, hệ số ${JSON.stringify(ON)}`);
console.log(`Ngày không mưa lệch giữa hai lần chạy (phải 0 nếu tất định): ${mismatch}`);
for (const [band, b] of Object.entries(buckets)) {
  const pct = b.off ? ((b.on / b.off - 1) * 100).toFixed(1) : '—';
  console.log(`${band}: ${b.days} ngày; DT TB tắt ${Math.round(b.off / b.days).toLocaleString('vi-VN')} ₫ → bật ${Math.round(b.on / b.days).toLocaleString('vi-VN')} ₫ (${pct}%); khách ${(b.offC / b.days).toFixed(1)} → ${(b.onC / b.days).toFixed(1)}`);
}
