import assert from 'node:assert/strict';
import { ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, FORECAST_RULES, PRODUCT_MAP, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { buildDemandTable } from './demand';
import { createMarketState, timeBandFor, weekdayOf, type MarketContext } from './market';
import { buildProductPlans, expectedDailyUnits, trendOf, type ProductPlanInput } from './forecast';

const ctxFor = (weatherId: string, eventIds: string[] = [], day = 70): MarketContext => ({
  day, hour: 12, season: null, climateId: 'clim_rainy', weatherId, timeBand: timeBandFor(12), weekday: weekdayOf(day), eventIds,
});
const tableFor = (ctx: MarketContext) => buildDemandTable({ ctx, products: ALL_PRODUCTS, reputation: 50 });
const input = (id: string, extra: Partial<ProductPlanInput> = {}): ProductPlanInput => ({
  product: PRODUCT_MAP[id], stock: 0, incoming: 0, soldRecently: 0, velocity: 0, hadSales: false, unitPrice: PRODUCT_MAP[id].purchasePrice, ...extra,
});

export function runForecastTests(): void {
  // --- 7.1 nhu cầu dự kiến và xu hướng ---
  assert.equal(expectedDailyUnits({ velocity: 4, hadSales: true, basePopularity: 0.5, multiplierNow: 1, multiplierTarget: 1.5 }), 6, 'Có doanh số: vận tốc × tỉ lệ nhu cầu');
  assert.equal(expectedDailyUnits({ velocity: 0, hadSales: false, basePopularity: 0.4, multiplierNow: 1, multiplierTarget: 1 }), 0.4 * FORECAST_RULES.trialUnitsPerPopularity, 'Chưa có doanh số: nhu cầu thử theo độ phổ biến');
  assert.equal(trendOf(1, 1.2), 'up');
  assert.equal(trendOf(1, 0.8), 'down');
  assert.equal(trendOf(1, 1.02), 'flat');

  const sunny = tableFor(ctxFor('sunny'));
  const rainy = tableFor(ctxFor('heavy_rain'));
  const base = { today: sunny, tomorrow: sunny, leadDays: 1, budget: 10_000_000, coldFree: 40 };
  const rainCtx = { ...base, tomorrow: rainy };
  const sold = { hadSales: true, velocity: 4, soldRecently: 20, stock: 5 };
  const dry = buildProductPlans([input('ao_mua_bo', sold)], base)[0];
  const wet = buildProductPlans([input('ao_mua_bo', sold)], rainCtx)[0];
  assert.equal(dry.expectedTomorrow, dry.expectedToday, 'Không đổi thời tiết: nhu cầu ngày mai bằng hôm nay');
  assert.ok(wet.expectedTomorrow > wet.expectedToday && wet.trend === 'up', 'Dự báo mưa to tăng nhu cầu áo mưa');
  assert.ok(wet.reasons.length > 0 && wet.reasons[0].includes('%'), 'Có lý do kèm hệ số từ bộ chỉnh dữ liệu');
  assert.ok(wet.recommended > dry.recommended, 'Dự báo mưa nâng khuyến nghị nhập');

  // --- cờ ---
  const flagged = buildProductPlans([
    input('mi_hao_hao', { hadSales: true, velocity: 6, soldRecently: 30, stock: 2 }),
    input('nuoc_suoi', { stock: 20, soldRecently: 0 }),
    input('rau_cai_xanh', { hadSales: true, velocity: 3, soldRecently: 15, stock: 9, expiring: { quantity: 4, earliestDay: 72 } }),
  ], base);
  assert.equal(flagged[0].flags.lowStock, true, 'Tồn ít hơn nhu cầu trong thời gian giao: sắp hết');
  assert.equal(flagged[1].flags.slowMoving, true, 'Còn tồn mà không bán: chậm bán');
  assert.equal(flagged[2].flags.expiring, true);
  assert.deepEqual(flagged[2].expiring, { quantity: 4, earliestDay: 72 });
  assert.equal(flagged[0].flags.slowMoving, false);

  // --- khuyến nghị không vượt tồn NCC / ngân sách / kho mát ---
  const want = input('mi_hao_hao', { hadSales: true, velocity: 10, soldRecently: 50, stock: 0 });
  const free = buildProductPlans([want], base)[0];
  assert.ok(free.recommended > 10 && free.note === undefined);
  const capped = buildProductPlans([{ ...want, supplierStock: 7 }], base)[0];
  assert.equal(capped.recommended, 7, 'Không vượt tồn nhà cung cấp');
  assert.ok(capped.note?.includes('thiếu'), 'Ghi chú thiếu hụt');
  assert.equal(buildProductPlans([{ ...want, supplierUnavailable: true }], base)[0].recommended, 0);
  const poor = buildProductPlans([want], { ...base, budget: want.unitPrice * 3 })[0];
  assert.equal(poor.recommended, 3, 'Không vượt ngân sách');
  const coldWant = input('rau_cai_xanh', { hadSales: true, velocity: 10, soldRecently: 50 });
  assert.equal(buildProductPlans([coldWant], { ...base, coldFree: 4 })[0].recommended, 4, 'Không vượt chỗ trống kho mát');
  const shared = buildProductPlans([{ ...want, unitPrice: 1000 }, { ...input('nuoc_suoi', { hadSales: true, velocity: 10, soldRecently: 50, stock: 25 }), unitPrice: 1000 }], { ...base, budget: 20_000 });
  assert.ok(shared[0].recommended * 1000 + shared[1].recommended * 1000 <= 20_000, 'Tổng khuyến nghị nằm trong ngân sách chung');
  assert.ok(shared[0].recommended >= shared[1].recommended, 'Món thiếu hàng nhất được xét trước khi chia ngân sách');

  // --- trong mô phỏng: không tác dụng phụ, hai nơi cùng số ---
  const record = (day: number, sales: Record<string, number>) => ({ ...structuredClone(DEFAULT_INITIAL_SAVE).dailyRecords?.[1], day, productSales: sales } as never);
  const save = {
    ...structuredClone(DEFAULT_INITIAL_SAVE), inventory: [],
    worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day: 4 }, market: createMarketState('forecast-seed', 4),
    dailyRecords: { 1: record(1, { mi_hao_hao: 10 }), 2: record(2, { mi_hao_hao: 14 }), 3: record(3, { mi_hao_hao: 12 }) },
  };
  save.player = { ...save.player, level: 5, money: 2_000_000 };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  const snapshot = () => JSON.stringify({ money: sim.getPlayerData().money, inv: sim.getInventory(), orders: sim.getPendingOrders(), ledger: sim.getLedger().length, prices: ALL_PRODUCTS.map(p => sim.sellingPrice(p.id)), market: sim.getMarketState() });
  const before = snapshot();
  const plans = sim.getProductPlans();
  sim.getTrendingProducts();
  assert.equal(snapshot(), before, 'Mở bảng lập kế hoạch không đổi tiền, kho, đơn chờ, giá');
  const noodle = plans.find(plan => plan.productId === 'mi_hao_hao')!;
  assert.ok(noodle.expectedTomorrow > 0 && noodle.soldRecently > 0);
  const suggestion = sim.suggestRestock('dai_ly_dau_hem').items.find(item => item.productId === 'mi_hao_hao');
  assert.ok(suggestion, 'Có gợi ý cho món đang bán');
  assert.equal(suggestion.salesVelocity, noodle.expectedTomorrow, 'Gợi ý nhập và bảng kế hoạch dùng cùng nhu cầu dự kiến');
  assert.equal(plans.every(plan => plan.recommended >= 0 && Number.isFinite(plan.expectedTomorrow)), true);

  console.log('  ✓ Passed: Lập kế hoạch tồn kho — nhu cầu dự kiến theo dự báo, cờ, khuyến nghị bị chặn, không tác dụng phụ');
}
