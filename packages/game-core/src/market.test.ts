import assert from 'node:assert/strict';
import type { ModifierRule, SaveGameData } from '@game/shared';
import { isSalesFixture } from '@game/shared';
import {
  ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, MODIFIER_RULES, PRODUCT_MAP, SEASON_EVENTS, WEATHER_TYPES, generateStarterTileMap,
  getProductTags, getDayOfYear, validateMarketData, CLIMATE_SEASONS,
} from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { CustomerManager } from './customers';
import { createWeatherState, advanceWeather, weatherOnDay, pickWeather } from './weather';
import { collectFactors, timeBandFor, weekdayOf, type MarketContext } from './market';
import { availabilityFactor, buildDemandTable, effectiveTraffic } from './demand';

const newSim = (mutate?: (save: SaveGameData) => void) => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  mutate?.(save);
  return new GameSimulation(save, generateStarterTileMap(), new InputManager());
};

const ctxFor = (weatherId: string, hour = 15, day = 2, seasonId: string | null = null): MarketContext => ({
  day, hour, season: seasonId ? SEASON_EVENTS.find(item => item.id === seasonId)! : null, climateId: 'clim_hot', weatherId,
  timeBand: timeBandFor(hour), weekday: weekdayOf(day), eventIds: [],
});

export function runMarketTests(): void {
  // --- 1.1/1.2 dữ liệu hợp lệ và bị từ chối khi sai ---
  assert.deepEqual(validateMarketData(), [], 'Dữ liệu thị trường mặc định hợp lệ');
  const bad: ModifierRule[] = [
    { id: 'bad_range', label: 'x', source: 'weather', when: { weather: ['sunny'] }, effects: { demand: 9 } },
    { id: 'bad_ref', label: 'x', source: 'weather', when: { weather: ['tsunami'] }, target: { tags: ['no_tag'], productIds: ['khong_co'] }, effects: { traffic: 1 } },
    { id: 'bad_ref', label: 'dup', source: 'time', when: { timeBand: ['midnight'] }, effects: { traffic: 1 } },
  ];
  const errors = validateMarketData([...MODIFIER_RULES, ...bad]).join('\n');
  for (const part of ['bad_range', 'tsunami', 'no_tag', 'khong_co', 'trùng id', 'midnight']) assert.ok(errors.includes(part), `Báo lỗi nêu đúng mục: ${part}`);
  assert.ok(CLIMATE_SEASONS.every(item => item.endDayOfYear >= item.startDayOfYear), 'Mùa khí hậu hợp lệ');
  assert.ok(getProductTags(PRODUCT_MAP['nuoc_suoi']).includes('cold_drink') && getProductTags(PRODUCT_MAP['o_gap']).includes('rain_gear'), 'Thẻ sản phẩm theo nhóm và theo món');
  assert.ok(WEATHER_TYPES.length >= 8, 'Đủ các loại thời tiết yêu cầu');

  // --- 1.3 thêm bộ chỉnh bằng dữ liệu, không đổi lõi; sản phẩm ngoài mùa vẫn bán ---
  const custom: ModifierRule = { id: 'custom_sunny_candy', label: 'Thử nghiệm', source: 'weather', when: { weather: ['sunny'] }, target: { tags: ['sweet'] }, effects: { demand: 2 } };
  assert.equal(collectFactors(ctxFor('sunny'), 'demand', PRODUCT_MAP['keo_big_babol'], [custom])[0]?.factor, 2, 'Quy tắc mới chỉ bằng dữ liệu được áp dụng');
  const tet = SEASON_EVENTS.find(item => item.id === 'tet')!;
  assert.ok(tet.seasonalProductIds!.every(id => !!PRODUCT_MAP[id]), 'Sản phẩm theo mùa tồn tại trong catalog');
  const offSeason = buildDemandTable({ ctx: ctxFor('sunny', 15, 2, null), products: ALL_PRODUCTS, reputation: 10 });
  assert.ok(offSeason.perProduct['thit_heo_tuoi'].demand > 0, 'Hàng theo mùa vẫn có nhu cầu ngoài mùa');
  assert.equal(weekdayOf(1), 0, 'Ngày 1 là Thứ Hai');
  assert.equal(weekdayOf(8), 0);
  assert.equal(timeBandFor(8), 'morning');
  assert.equal(timeBandFor(19), 'evening');
  assert.ok(getDayOfYear(1) >= 0);

  // --- 1.4 thời tiết xác định, dự báo khớp, lưu/tải ---
  const a = createWeatherState('seed-A', 10);
  assert.deepEqual(a, createWeatherState('seed-A', 10), 'Cùng seed cùng thời tiết');
  const days = Array.from({ length: 40 }, (_, i) => weatherOnDay('seed-A', i + 1)).join();
  const other = Array.from({ length: 40 }, (_, i) => weatherOnDay('seed-B', i + 1)).join();
  assert.notEqual(days, other, 'Khác seed khác chuỗi thời tiết');
  assert.equal(advanceWeather('seed-A', a, 11).today, a.forecast[0], 'Dự báo khớp thực tế ngày hôm sau');
  assert.equal(advanceWeather('seed-A', a, 12).today, a.forecast[1], 'Dự báo ngày kia khớp');
  assert.equal(advanceWeather('seed-A', createWeatherState('seed-A', 1), 10).today, weatherOnDay('seed-A', 10), 'Đẩy từng ngày giống tính thẳng từ đầu');
  assert.equal(pickWeather('seed-A', 5, 'rainy'), pickWeather('seed-A', 5, 'rainy'));
  const seen = new Set(Array.from({ length: 360 }, (_, i) => weatherOnDay('seed-A', i + 1)));
  for (const type of ['sunny', 'cloudy', 'rainy', 'hot', 'cold']) assert.ok(seen.has(type), `Trong một năm có xuất hiện thời tiết ${type}`);

  const sim = newSim();
  const saved = sim.exportSaveData();
  assert.ok(saved.market && saved.market.seed, 'Save mới có trạng thái thị trường');
  const reloaded = new GameSimulation(saved, generateStarterTileMap(), new InputManager());
  assert.deepEqual(reloaded.getMarketState().weather, sim.getMarketState().weather, 'Lưu/tải giữ thời tiết và dự báo');
  const legacy = structuredClone(DEFAULT_INITIAL_SAVE);
  delete legacy.market;
  assert.ok(new GameSimulation(legacy, generateStarterTileMap(), new InputManager()).getMarketState().weather.today, 'Save cũ không có market vẫn tải');
  const todayBefore = sim.getMarketState().weather;
  sim.getClock().advanceToNextDay();
  assert.equal(sim.getMarketState().weather.today, todayBefore.forecast[0], 'Sang ngày mới thời tiết bằng dự báo');

  // --- 2.1 nhu cầu hiệu dụng ---
  const water = PRODUCT_MAP['nuoc_suoi'], noodles = PRODUCT_MAP['mi_hao_hao'], soap = PRODUCT_MAP['xa_phong'];
  const table = (weather: string, hour = 15) => buildDemandTable({ ctx: ctxFor(weather, hour), products: ALL_PRODUCTS, reputation: 50 });
  const hot = table('hot'), rainy = table('rainy'), heavy = table('heavy_rain'), cold = table('cold'), sunny = table('sunny');
  assert.ok(hot.perProduct[water.id].demand > sunny.perProduct[water.id].demand, 'Nóng: đồ uống mát tăng');
  assert.ok(hot.perProduct['kem_que'].demand > sunny.perProduct['kem_que'].demand * 1.5, 'Nóng: kem tăng mạnh');
  assert.ok(hot.perProduct['tra_nong_gung'].demand < sunny.perProduct['tra_nong_gung'].demand, 'Nóng: đồ uống nóng giảm');
  assert.ok(rainy.perProduct[noodles.id].demand > sunny.perProduct[noodles.id].demand, 'Mưa: mì gói tăng');
  assert.ok(rainy.perProduct['o_gap'].demand > sunny.perProduct['o_gap'].demand * 1.5, 'Mưa: ô tăng');
  assert.ok(heavy.perProduct['ao_mua_bo'].demand > rainy.perProduct['ao_mua_bo'].demand, 'Mưa to: áo mưa cần hơn mưa thường');
  assert.ok(cold.perProduct['ca_phe_hoa_tan'].demand > sunny.perProduct['ca_phe_hoa_tan'].demand, 'Lạnh: đồ uống nóng tăng');
  assert.ok(cold.perProduct[water.id].demand < sunny.perProduct[water.id].demand, 'Lạnh: đồ uống mát giảm');
  const breakdown = rainy.perProduct[noodles.id];
  assert.ok(Math.abs(breakdown.factors.reduce((p, f) => p * f.factor, 1) - breakdown.rawMultiplier) < 1e-9, 'Phân rã nhân ra đúng hệ số tổng');
  assert.ok(breakdown.factors.every(f => f.label.length > 0 && f.ruleId.length > 0), 'Mỗi hệ số có nhãn đọc được');
  assert.ok(breakdown.demand <= breakdown.base * 3 + 1e-9, 'Kẹp theo dải kênh');
  const plain = buildDemandTable({ ctx: ctxFor('sunny', 15, 2, null), products: [soap], reputation: 50 }).perProduct[soap.id];
  assert.equal(plain.multiplier, 1, 'Món không khớp bộ chỉnh nào = nhu cầu cơ bản');
  assert.equal(plain.demand, soap.demandProfile.basePopularity);
  const morning = table('sunny', 8), afternoon = table('sunny', 15);
  assert.ok(morning.perProduct['banh_mi_goi'].demand > afternoon.perProduct['banh_mi_goi'].demand, 'Sáng: đồ ăn sáng cao hơn chiều');
  assert.ok(afternoon.perProduct['bim_bim_oishi'].demand > morning.perProduct['bim_bim_oishi'].demand, 'Chiều: ăn vặt cao hơn sáng');

  // --- 2.1 lưu lượng ---
  assert.ok(rainy.traffic.value < sunny.traffic.value && heavy.traffic.value < rainy.traffic.value, 'Mưa to giảm lưu lượng hơn mưa');
  assert.ok(effectiveTraffic(sunny, 1) >= 0.25 && effectiveTraffic(hot, 1) <= 2.5, 'Lưu lượng nằm trong dải');
  assert.equal(effectiveTraffic(sunny, 0), 0);
  const shelfOf = (productId: string | undefined, inStock: boolean) => ({ productId, inStock });
  assert.equal(availabilityFactor(sunny, [shelfOf(noodles.id, false), shelfOf(water.id, false)]), 0, 'Kệ trống hết: không sinh khách');
  assert.equal(availabilityFactor(sunny, [shelfOf(noodles.id, true), shelfOf(water.id, true)]), 1, 'Đủ hàng: sẵn hàng đầy đủ');
  const partial = availabilityFactor(sunny, [shelfOf(noodles.id, true), shelfOf(water.id, false)]);
  assert.ok(partial >= 0.3 && partial < 1, 'Một kệ hết hàng: sẵn hàng giảm theo nhu cầu của kệ hết');
  assert.equal(availabilityFactor(sunny, [shelfOf(undefined, false), shelfOf(noodles.id, true)]), 1, 'Kệ không gán món không tính');

  // --- 2.2 tính lại theo khoảng ---
  const interval = newSim();
  for (let i = 0; i < 600; i++) interval.update(1 / 60);
  const builds = interval.getDemandBuildCount();
  assert.ok(builds >= 1 && builds <= 2, `Không tính lại mỗi khung hình (${builds} lần sau 600 khung)`);
  for (let i = 0; i < 600; i++) interval.update(1 / 60);
  assert.ok(interval.getDemandBuildCount() - builds <= 1, 'Thêm 600 khung chỉ tính lại khi sang khung giờ');
  const before = interval.getDemandBuildCount();
  const swapped = interval.exportSaveData();
  swapped.market = { ...swapped.market!, weather: { ...swapped.market!.weather, today: swapped.market!.weather.today === 'storm' ? 'hot' : 'storm' } };
  interval.importSaveData(swapped);
  interval.update(1 / 60);
  assert.equal(interval.getDemandBuildCount(), before + 1, 'Đổi thời tiết kích hoạt tính lại bảng nhu cầu');
  assert.ok(interval.explainDemand('mi_hao_hao')!.factors.length > 0, 'Có thể hỏi lý do nhu cầu một món');
  assert.ok(interval.getMarketSummary().forecast.length === 2, 'Tóm tắt có dự báo hai ngày');

  // --- 2.3 khách chọn món theo nhu cầu ---
  const map = generateStarterTileMap();
  const base = newSim();
  const allSales = base.getFixtures().filter(isSalesFixture);
  const shelves = allSales.slice(0, 2);
  for (const other of allSales.slice(2)) { other.currentStock = 0; other.stockLots = []; other.assignedProductId = undefined; }
  shelves[0].assignedProductId = noodles.id; shelves[1].assignedProductId = water.id;
  for (const shelf of shelves) shelf.currentStock = 5;
  const pickCounts = (t: typeof rainy) => {
    const counts: Record<string, number> = { [noodles.id]: 0, [water.id]: 0 };
    for (let i = 0; i < 400; i++) {
      const customer = new CustomerManager([], i, 0).maybeSpawnCustomer(1, true, base.getFixtures(), map, 3, i, { traffic: 1, weightOf: id => t.perProduct[id]?.demand ?? 0.01 });
      const product = shelves.find(shelf => shelf.id === customer?.targetFixtureId)?.assignedProductId;
      if (product) counts[product]++;
    }
    return counts;
  };
  const rainyCounts = pickCounts(rainy);
  assert.ok(rainyCounts[noodles.id] > rainyCounts[water.id] * 1.3, `Mưa: mì gói được chọn nhiều hơn nước mát (${rainyCounts[noodles.id]} vs ${rainyCounts[water.id]})`);
  const hotCounts = pickCounts(hot);
  assert.ok(hotCounts[water.id] > rainyCounts[water.id], 'Nóng: nước mát được chọn nhiều hơn ngày mưa');
  assert.deepEqual(pickCounts(rainy), rainyCounts, 'Cùng trạng thái chạy lại cho cùng chuỗi chọn');
  shelves[0].currentStock = 0; shelves[0].stockLots = [];
  const onlyWater = new CustomerManager([], 7, 0).maybeSpawnCustomer(1, true, base.getFixtures(), map, 3, 0, { traffic: 1, weightOf: id => rainy.perProduct[id]?.demand ?? 0.01 });
  assert.equal(onlyWater?.targetFixtureId, shelves[1].id, 'Kệ hết hàng không được chọn dù nhu cầu cao');
  const legacyPick = new CustomerManager([], 0, 0).maybeSpawnCustomer(1, true, base.getFixtures(), map, 3, 0);
  assert.equal(legacyPick?.targetFixtureId, shelves[1].id, 'Không có bảng nhu cầu: dùng cách chọn cũ');

  // --- 2.4 khách bỏ về vì hết hàng ---
  const walk = newSim();
  const walkShelves = walk.getFixtures().filter(isSalesFixture);
  const shelf = walkShelves[0];
  for (const other of walkShelves.slice(1)) { other.currentStock = 0; other.stockLots = []; other.assignedProductId = undefined; }
  shelf.assignedProductId = noodles.id; shelf.currentStock = 3;
  shelf.stockLots = [{ quantity: 3, expiresOnDay: 999, unitCost: 3000, provenance: 'known' }];
  const manager = new CustomerManager([], 0, 0);
  manager.maybeSpawnCustomer(1, true, walk.getFixtures(), map, 1, 0, { traffic: 1, weightOf: () => 1 });
  shelf.currentStock = 0; shelf.stockLots = []; shelf.assignedProductId = undefined;
  let walkouts = 0;
  for (let i = 0; i < 3000 && manager.getCustomers().length; i++) manager.update(0.1, true, 1, map, walk.getFixtures(), [], undefined, undefined, () => walkouts++);
  assert.equal(walkouts, 1, 'Đếm đúng một khách bỏ về vì hết hàng');
  assert.equal(newSim().getCurrentDayRecord().outOfStockWalkouts ?? 0, 0, 'Báo cáo ngày mới không có khách bỏ về');

  console.log('  ✓ Passed: Thị trường — dữ liệu, thời tiết xác định, nhu cầu, lưu lượng, chọn món theo nhu cầu');
}
