import assert from 'node:assert/strict';
import { isSalesFixture } from '@game/shared';
import { ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, PRICE_RULES, PRODUCT_MAP, SEASON_EVENTS, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { CustomerManager } from './customers';
import { Mulberry32Rng, daySeed } from './staff';
import { buildDemandTable } from './demand';
import { timeBandFor, weekdayOf, type MarketContext } from './market';
import {
  advancePriceIndex, computePriceTargets, demandPriceFactor, keepChance, priceRatio, productSensitivity, scarcityFactor, stepPriceIndex,
} from './price';

const ctxFor = (weatherId: string, eventIds: string[] = [], hour = 15, day = 70): MarketContext => ({
  day, hour, season: null, climateId: 'clim_hot', weatherId, timeBand: timeBandFor(hour), weekday: weekdayOf(day), eventIds,
});
const tableFor = (ctx: MarketContext) => buildDemandTable({ ctx, products: ALL_PRODUCTS, reputation: 50 });

export function runPriceTests(): void {
  // --- 4.1 độ nhạy giá ---
  assert.equal(keepChance(0.8, 3), 1, 'Giá thấp hơn tham chiếu: khách luôn lấy');
  assert.equal(keepChance(1, 3), 1, 'Giá bằng tham chiếu: khách luôn lấy');
  assert.ok(keepChance(1.2, 3) < keepChance(1.2, 1), 'Độ nhạy cao bỏ hàng nhiều hơn khi giá cao');
  assert.ok(keepChance(1.4, 2) < keepChance(1.2, 2), 'Giá càng cao càng ít người lấy');
  assert.equal(keepChance(5, 3), PRICE_RULES.minKeepChance, 'Luôn còn xác suất tối thiểu');
  assert.equal(demandPriceFactor(1.5), 1, 'Giá cao không đổi trọng số nhu cầu (khách từ chối ở bước lấy hàng)');
  assert.ok(demandPriceFactor(0.9) > 1 && demandPriceFactor(0.9) < PRICE_RULES.lowPriceDemandCap);
  assert.equal(demandPriceFactor(0.1), PRICE_RULES.lowPriceDemandCap, 'Giá rất thấp: nhu cầu tăng không vượt trần');
  assert.equal(priceRatio(1000, 0), 1);
  const water = PRODUCT_MAP['nuoc_suoi'], rainCoat = PRODUCT_MAP['ao_mua_bo'], soap = PRODUCT_MAP['xa_phong'];
  assert.ok(productSensitivity(water) > productSensitivity(rainCoat), 'Nước uống nhạy giá hơn áo mưa cần gấp');
  assert.equal(productSensitivity(PRODUCT_MAP['mi_hao_hao']) > 0, true);
  assert.ok(productSensitivity(soap) > 0);

  // --- 4.2 giá tham chiếu trôi dần ---
  assert.equal(stepPriceIndex(1, 1.4), 1 + PRICE_RULES.maxStepPerDay, 'Mục tiêu +40% chỉ tăng một bước mỗi ngày');
  assert.equal(stepPriceIndex(1.2, 1), 1.2 - PRICE_RULES.maxStepPerDay, 'Giảm cũng theo từng bước');
  assert.equal(stepPriceIndex(1.39, 2), PRICE_RULES.indexBounds.max, 'Kẹp ở trần dải');
  assert.equal(stepPriceIndex(0.81, 0.1), PRICE_RULES.indexBounds.min, 'Kẹp ở sàn dải');
  let index = 1;
  const trail: number[] = [];
  for (let day = 0; day < 20; day++) { index = stepPriceIndex(index, 1.4); trail.push(index); }
  assert.ok(trail.every((value, i) => i === 0 || value - trail[i - 1] <= PRICE_RULES.maxStepPerDay + 1e-12), 'Không nhảy quá bước mỗi ngày');
  assert.ok(trail[0] < 1.05 && trail[trail.length - 1] === PRICE_RULES.indexBounds.max, 'Tiến dần tới mục tiêu qua nhiều ngày');
  for (let day = 0; day < 20; day++) index = stepPriceIndex(index, 1);
  assert.ok(Math.abs(index - 1) < 1e-9, 'Hết sự kiện thì về mức nền dần, không nhảy ngay');

  assert.ok(scarcityFactor(0) > scarcityFactor(5) && scarcityFactor(5) > scarcityFactor(30), 'Càng khan hiếm giá càng nhích lên');
  assert.ok(scarcityFactor(200) < 1, 'Ứ đọng kéo giá xuống');
  const calm = tableFor(ctxFor('sunny'));
  const heat = tableFor(ctxFor('hot', ['heat_wave']));
  const stocked = { bottled_water: 30, soft_drinks: 30, household: 30 };
  const calmTargets = computePriceTargets({ products: ALL_PRODUCTS, table: calm, stockUnits: stocked });
  const heatTargets = computePriceTargets({ products: ALL_PRODUCTS, table: heat, stockUnits: stocked });
  assert.ok(heatTargets.bottled_water.target > calmTargets.bottled_water.target, 'Nắng nóng kéo dài đẩy mục tiêu giá nước uống lên');
  assert.ok(heatTargets.bottled_water.demand > 1 && heatTargets.bottled_water.scarcity === 1, 'Lý do: áp lực nhu cầu, chưa khan hiếm');
  const scarce = computePriceTargets({ products: ALL_PRODUCTS, table: calm, stockUnits: { bottled_water: 0 } });
  assert.ok(scarce.bottled_water.scarcity > 1 && scarce.bottled_water.target > calmTargets.bottled_water.target, 'Hết hàng: khan hiếm đẩy mục tiêu lên');
  const costly = computePriceTargets({ products: ALL_PRODUCTS, table: calm, stockUnits: stocked, costFactor: () => 1.2 });
  assert.ok(costly.bottled_water.target > calmTargets.bottled_water.target, 'Chi phí nhập tăng kéo mục tiêu giá lên');
  const advanced = advancePriceIndex(undefined, heatTargets);
  assert.ok(Object.values(advanced).every(value => Math.abs(value - 1) <= PRICE_RULES.maxStepPerDay + 1e-12), 'Bước đầu của mọi nhóm không quá biên độ');

  // --- 4.2 trong mô phỏng: kho trống đẩy giá dần, lưu/tải, lý do ---
  const sim = new GameSimulation(Object.assign(structuredClone(DEFAULT_INITIAL_SAVE), { inventory: [] }), generateStarterTileMap(), new InputManager());
  for (const fixture of sim.getFixtures().filter(isSalesFixture)) { fixture.currentStock = 0; fixture.stockLots = []; fixture.assignedProductId = undefined; }
  assert.equal(sim.referencePrice('nuoc_suoi'), PRODUCT_MAP['nuoc_suoi'].baseSellingPrice, 'Ngày đầu giá tham chiếu bằng giá gợi ý');
  let previous = 1;
  for (let day = 0; day < 8; day++) {
    sim.getClock().advanceToNextDay();
    const row = sim.getPriceMarket().find(item => item.category === 'bottled_water')!;
    assert.ok(Math.abs(row.index - previous) <= PRICE_RULES.maxStepPerDay + 1e-9, 'Giá tham chiếu trong mô phỏng đổi không quá biên độ mỗi ngày');
    assert.ok(Math.abs(row.index - stepPriceIndex(previous, row.target)) < 1e-9, 'Mỗi ngày chỉ số bằng một bước tiến về mục tiêu của ngày đó');
    assert.ok(row.scarcity > 1, 'Kho nước uống trống: khan hiếm được tính vào mục tiêu');
    previous = row.index;
  }
  const info = sim.getPriceMarket().find(item => item.category === 'bottled_water')!;
  assert.ok(info.scarcity > 1 && info.demand > 0, 'Có lý do (khan hiếm, áp lực nhu cầu) cho giá tham chiếu');
  const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.equal(reloaded.getPriceMarket().find(item => item.category === 'bottled_water')!.index, previous, 'Lưu/tải giữ chỉ số giá');
  assert.equal(sellingUnchanged(sim), true, 'Giá bán gợi ý cố định không đổi theo chỉ số');

  // --- 4.3 khách từ chối giá cao / ba chiến lược giá ở mức động cơ ---
  const map = generateStarterTileMap();
  const walk = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), map, new InputManager());
  const shelf = walk.getFixtures().filter(isSalesFixture)[0];
  for (const other of walk.getFixtures().filter(isSalesFixture).slice(1)) { other.currentStock = 0; other.stockLots = []; other.assignedProductId = undefined; }
  const stockShelf = () => { shelf.assignedProductId = 'mi_hao_hao'; shelf.currentStock = 3; shelf.stockLots = [{ quantity: 3, expiresOnDay: 999, unitCost: 3000, provenance: 'known' }]; };
  const runCustomer = (keep: number, price: number) => {
    stockShelf();
    const manager = new CustomerManager([], 0, 0);
    manager.maybeSpawnCustomer(1, true, walk.getFixtures(), map, 1, 0, { traffic: 1, weightOf: () => 1 });
    let rejects = 0;
    for (let i = 0; i < 200; i++) manager.update(0.1, true, 1, map, walk.getFixtures(), [], undefined, undefined, undefined, { priceOf: () => price, keepChance: () => keep, onReject: () => rejects++ });
    return { rejects, basketPrice: manager.getCustomers()[0]?.basket?.[0]?.unitPrice, stock: shelf.currentStock };
  };
  const rejected = runCustomer(0, 4500);
  assert.equal(rejected.rejects, 1, 'Khách bỏ hàng vì giá: ghi nhận một lần');
  assert.equal(rejected.stock, 3, 'Khách từ chối không lấy hàng khỏi kệ');
  const accepted = runCustomer(1, 6100);
  assert.equal(accepted.rejects, 0);
  assert.equal(accepted.basketPrice, 6100, 'Giá chốt vào giỏ lúc lấy hàng');
  assert.equal(accepted.stock, 2);

  // Ba chiến lược giá cho cùng một món (B) cạnh một món đối chứng (A) đúng giá tham chiếu.
  const a = PRODUCT_MAP['mi_hao_hao'], b = PRODUCT_MAP['nuoc_suoi'];
  const shelves = walk.getFixtures().filter(isSalesFixture).slice(0, 2);
  shelves[0].assignedProductId = a.id; shelves[1].assignedProductId = b.id;
  for (const s of shelves) s.currentStock = 5;
  const ctx = ctxFor('sunny');
  const strategy = (multiplier: number) => {
    const sellB = b.baseSellingPrice * multiplier;
    const table = buildDemandTable({ ctx, products: ALL_PRODUCTS, reputation: 50, priceFactor: id => id === b.id ? demandPriceFactor(priceRatio(sellB, b.baseSellingPrice)) : 1 });
    let units = 0;
    for (let i = 0; i < 3000; i++) {
      const customer = new CustomerManager([], i, 0).maybeSpawnCustomer(1, true, walk.getFixtures(), map, 3, i, { traffic: 1, weightOf: id => table.perProduct[id]?.demand ?? 0.01 });
      if (customer?.targetFixtureId !== shelves[1].id) continue;
      const keep = keepChance(priceRatio(sellB, b.baseSellingPrice), productSensitivity(b, ctx));
      if (new Mulberry32Rng(daySeed(i + 7919, 1)).next() < keep) units++;
    }
    const revenue = units * sellB;
    const grossProfit = units * (sellB - b.purchasePrice);
    return { units, revenue, grossProfit, margin: sellB - b.purchasePrice };
  };
  const low = strategy(0.7), normal = strategy(1), high = strategy(1.3);
  assert.ok(low.units > normal.units && normal.units > high.units, `Giá thấp bán nhiều hơn, giá cao bán ít hơn (${low.units}/${normal.units}/${high.units})`);
  assert.ok(low.margin < normal.margin && normal.margin < high.margin, 'Biên lãi mỗi đơn vị tăng theo giá');
  assert.ok(new Set([low.grossProfit, normal.grossProfit, high.grossProfit]).size === 3, 'Ba chiến lược cho lãi gộp khác nhau');
  assert.ok(SEASON_EVENTS.length > 0);

  console.log('  ✓ Passed: Phản ứng giá — độ nhạy, giá tham chiếu trôi dần, khách bỏ hàng vì giá, ba chiến lược giá');
}

function sellingUnchanged(sim: GameSimulation): boolean {
  return ALL_PRODUCTS.every(product => sim.sellingPrice(product.id) === product.baseSellingPrice);
}
