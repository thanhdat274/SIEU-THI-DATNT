import assert from 'node:assert/strict';
import { isSalesFixture } from '@game/shared';
import { ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';

const DAYS = 4;
const STEP = 0.25;
const SHELF_PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ao_mua_bo', 'ca_phe_hoa_tan', 'kem_que', 'rau_cai_xanh'];

interface DayMetrics { day: number; traffic: number; demand: Record<string, number>; wholesale: Record<string, number>; supplierStock: Record<string, number>; money: number; customers: number }
interface ScenarioResult { metrics: DayMetrics[]; sim: GameSimulation; startMoney: number }

function runScenario(options: { events?: Array<{ id: string; startDay: number; endDay: number }>; weather?: string; seed?: string }): ScenarioResult {
  const market = createMarketState(options.seed ?? 'scenario-seed', 1);
  const save = {
    ...structuredClone(DEFAULT_INITIAL_SAVE),
    market: { ...market, events: options.events ?? [], weather: options.weather ? { ...market.weather, today: options.weather } : market.weather },
  };
  save.player = { ...save.player, level: 6, money: 2_000_000 };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  const startMoney = sim.getPlayerData().money;
  const restock = () => {
    const shelves = sim.getFixtures().filter(isSalesFixture);
    shelves.forEach((shelf, index) => {
      const productId = SHELF_PRODUCTS[index % SHELF_PRODUCTS.length];
      const cold = ALL_PRODUCTS.find(product => product.id === productId)?.storageType === 'cold';
      if (cold && shelf.type !== 'refrigerator') return;
      shelf.assignedProductId = productId;
      shelf.currentStock = 12;
      shelf.stockLots = [{ quantity: 12, expiresOnDay: 9999, unitCost: 3000, provenance: 'known' }];
    });
  };
  const metrics: DayMetrics[] = [];
  const snapshot = () => {
    const supplier = sim.getMarketState().suppliers?.['dai_ly_dau_hem'];
    metrics.push({
      day: sim.getTime().day,
      traffic: sim.getMarketSummary().traffic.value,
      demand: Object.fromEntries(['nuoc_suoi', 'ao_mua_bo', 'ca_phe_hoa_tan', 'kem_que', 'rau_cai_xanh'].map(id => [id, sim.getDemandTable().perProduct[id].multiplier])),
      wholesale: { bottled_water: supplier?.priceIndex['bottled_water'] ?? 1, household: supplier?.priceIndex['household'] ?? 1 },
      supplierStock: { nuoc_suoi: supplier?.stockLeft['nuoc_suoi'] ?? 0, ao_mua_bo: supplier?.stockLeft['ao_mua_bo'] ?? 0 },
      money: sim.getPlayerData().money,
      customers: sim.getStatistics().totalCustomersServed,
    });
  };
  restock();
  snapshot();
  let day = sim.getTime().day;
  let hour = sim.getTime().hour;
  let guard = 0;
  while (sim.getTime().day < 1 + DAYS && guard++ < 2_000_000) {
    const t = sim.getTime();
    if (t.day !== day) { day = t.day; restock(); snapshot(); }
    if (t.hour !== hour) { hour = t.hour; restock(); } // kệ luôn đầy để số khách không bị chặn bởi hàng trong harness
    if (!t.isStoreOpen && t.hour >= 8 && t.hour < 20) sim.getClock().toggleStoreStatus();
    sim.update(STEP);
  }
  assert.ok(guard < 2_000_000, 'Kịch bản phải kết thúc');
  return { metrics, sim, startMoney };
}

function assertLedger(result: ScenarioResult, label: string): void {
  const ledger = result.sim.getLedger();
  const net = ledger.reduce((sum, entry) => sum + (entry.type === 'sale' || entry.type === 'recovery' ? entry.amount : entry.type === 'spoilage' || entry.type === 'theft' ? 0 : -entry.amount), 0);
  assert.equal(result.sim.getPlayerData().money - result.startMoney, net, `${label}: Δtiền khớp sổ cái`);
  assert.ok(result.sim.getPlayerData().money >= 0, `${label}: tiền không âm`);
  assert.ok(result.metrics.every(m => Number.isFinite(m.traffic) && m.traffic > 0 && Object.values(m.demand).every(v => v > 0 && Number.isFinite(v))), `${label}: không có số âm hoặc vô hạn`);
  assert.equal(new Set(ledger.map(e => e.id)).size, ledger.length, `${label}: ID sổ cái duy nhất`);
}

/** Kịch bản xuyên hệ nhiều ngày: so chuỗi nhu cầu, lưu lượng, giá sỉ, tồn nhà cung cấp với một nền không sự kiện, và đối chiếu tiền với sổ cái. */
export function runScenarioTests(): void {
  const base = runScenario({ weather: 'sunny' });
  assertLedger(base, 'Nền');
  const report: string[] = [`nền: khách ${base.metrics.at(-1)!.customers}, tiền ${base.startMoney}→${base.metrics.at(-1)!.money}`];
  const note = (label: string, result: ScenarioResult) => report.push(`${label}: khách ${result.metrics.at(-1)!.customers}, tiền ${result.startMoney}→${result.metrics.at(-1)!.money}`);

  const hot = runScenario({ weather: 'hot', events: [{ id: 'heat_wave', startDay: 1, endDay: 4 }] });
  assertLedger(hot, 'Nóng'); note('nóng', hot);
  assert.ok(hot.metrics[1].traffic > base.metrics[1].traffic, 'Nóng: lưu lượng cao hơn nền');
  assert.ok(hot.metrics[1].demand.kem_que > base.metrics[1].demand.kem_que && hot.metrics[1].demand.nuoc_suoi > base.metrics[1].demand.nuoc_suoi, 'Nóng: nhu cầu kem và nước cao hơn nền');
  assert.ok(hot.metrics[2].supplierStock.nuoc_suoi < base.metrics[2].supplierStock.nuoc_suoi, 'Nóng: tồn nhà cung cấp nước uống thấp hơn nền');
  assert.ok(hot.metrics.at(-1)!.wholesale.bottled_water > base.metrics.at(-1)!.wholesale.bottled_water, 'Nóng: giá sỉ nước uống cao hơn nền sau vài ngày');
  assert.ok(hot.metrics.every((m, i) => i === 0 || Math.abs(m.wholesale.bottled_water - hot.metrics[i - 1].wholesale.bottled_water) <= 0.04 + 1e-9), 'Nóng: giá sỉ đổi từng bước');
  assert.ok(hot.metrics.at(-1)!.customers > base.metrics.at(-1)!.customers, 'Nóng: phục vụ nhiều khách hơn nền khi kệ luôn đầy');

  const rain = runScenario({ weather: 'heavy_rain', events: [{ id: 'heavy_rain_spell', startDay: 1, endDay: 4 }] });
  assertLedger(rain, 'Mưa'); note('mưa', rain);
  assert.ok(rain.metrics[1].traffic < base.metrics[1].traffic, 'Mưa: lưu lượng thấp hơn nền');
  assert.ok(rain.metrics[1].demand.ao_mua_bo > base.metrics[1].demand.ao_mua_bo, 'Mưa: nhu cầu áo mưa cao hơn nền');
  assert.ok(rain.metrics[2].supplierStock.ao_mua_bo < base.metrics[2].supplierStock.ao_mua_bo, 'Mưa: tồn nhà cung cấp áo mưa thấp hơn nền');
  assert.ok(rain.metrics.at(-1)!.customers < base.metrics.at(-1)!.customers, 'Mưa: phục vụ ít khách hơn nền');

  const cold = runScenario({ weather: 'cold' });
  assertLedger(cold, 'Lạnh'); note('lạnh', cold);
  assert.ok(cold.metrics[0].demand.ca_phe_hoa_tan > base.metrics[0].demand.ca_phe_hoa_tan, 'Lạnh: nhu cầu cà phê hòa tan cao hơn nền');
  assert.ok(cold.metrics[0].demand.kem_que < base.metrics[0].demand.kem_que, 'Lạnh: nhu cầu kem thấp hơn nền');

  const holiday = runScenario({ weather: 'sunny', events: [{ id: 'public_holiday', startDay: 1, endDay: 4 }] });
  assertLedger(holiday, 'Nghỉ lễ'); note('nghỉ lễ', holiday);
  assert.ok(holiday.metrics[1].traffic > base.metrics[1].traffic, 'Lễ: lưu lượng cao hơn nền');
  assert.ok(holiday.metrics[1].demand.rau_cai_xanh > base.metrics[1].demand.rau_cai_xanh, 'Lễ: nhu cầu thực phẩm tươi cao hơn nền');
  assert.ok(holiday.metrics.at(-1)!.customers > base.metrics.at(-1)!.customers, 'Lễ: phục vụ nhiều khách hơn nền');

  const shortage = runScenario({ weather: 'sunny', events: [{ id: 'supplier_shortage', startDay: 1, endDay: 4 }] });
  assertLedger(shortage, 'Khan hàng'); note('khan hàng', shortage);
  assert.ok(shortage.metrics[2].supplierStock.nuoc_suoi < base.metrics[2].supplierStock.nuoc_suoi, 'Khan hàng: tồn nhà cung cấp thấp hơn nền');
  assert.ok(shortage.metrics.at(-1)!.wholesale.bottled_water > base.metrics.at(-1)!.wholesale.bottled_water, 'Khan hàng: giá sỉ cao hơn nền');
  const reliable = shortage.sim.getSupplierQuotes('giao_hoa_toc');
  assert.ok(Object.values(reliable.quotes).some(q => !q.unavailable), 'Mối không ngừng cung vẫn còn hàng khi khan hàng');

  const outage = runScenario({ weather: 'sunny', events: [{ id: 'power_outage', startDay: 1, endDay: 1 }] });
  assertLedger(outage, 'Mất điện'); note('mất điện', outage);
  assert.ok(outage.metrics[0].traffic < base.metrics[0].traffic, 'Mất điện: lưu lượng thấp hơn nền');

  for (const line of report) console.log(`    ${line}`);
  console.log('  ✓ Passed: Kịch bản xuyên hệ — nóng, mưa, lạnh, lễ, khan hàng, mất điện (nhiều ngày, tiền khớp sổ cái)');
}
