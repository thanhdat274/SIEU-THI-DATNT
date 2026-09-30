import assert from 'node:assert/strict';
import { isSalesFixture } from '@game/shared';
import { ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, generateStarterTileMap, getSeasonForDay, getDayOfYear, SEASON_EVENTS, SEASON_YEAR_DAYS, STALL_MAP } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { computeStallDay } from './stalls';
import { CustomerManager } from './customers';

const dayOf = (id: string, offset = 0) => {
  const event = SEASON_EVENTS.find(item => item.id === id)!;
  // tìm ngày game đầu tiên rơi vào ngày `startDayOfYear + offset`
  for (let day = 1; day <= SEASON_YEAR_DAYS + 1; day++) if (getDayOfYear(day) === event.startDayOfYear + offset) return day;
  throw new Error('no day');
};

export function runSeasonAndStallTests(): void {
  // --- Mùa ---
  assert.equal(getSeasonForDay(1), null, 'Ngày đầu chưa có sự kiện');
  assert.equal(getSeasonForDay(dayOf('mua_mua'))?.id, 'mua_mua');
  assert.equal(getSeasonForDay(dayOf('tet', 9))?.id, 'tet', 'Ngày cuối vẫn thuộc Tết');
  assert.equal(getSeasonForDay(dayOf('tet', 10)), null, 'Sau Tết hết sự kiện');
  assert.equal(getSeasonForDay(1), getSeasonForDay(1 + SEASON_YEAR_DAYS), 'Sự kiện lặp theo năm');
  for (const event of SEASON_EVENTS) assert.ok(event.demandMultiplier > 0 && event.preferredCategories.length > 0);

  // Khách mùa ưu tiên nhóm hàng theo mùa.
  const map = generateStarterTileMap();
  const sim0 = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), map, new InputManager());
  const sales = sim0.getFixtures().filter(isSalesFixture).slice(0, 2);
  assert.equal(sales.length, 2, 'Cần hai kệ bán hàng để thử ưu tiên');
  const candy = ALL_PRODUCTS.find(p => p.category === 'candy')!;
  const noodles = ALL_PRODUCTS.find(p => p.category === 'instant_noodles')!;
  sales.forEach((fixture, index) => { fixture.assignedProductId = (index === 0 ? noodles : candy).id; fixture.currentStock = 5; });
  const seasonalCustomer = new CustomerManager([], 0, 0).maybeSpawnCustomer(1, true, sim0.getFixtures(), map, 1, 0, 1.5, ['candy']);
  assert.equal(seasonalCustomer?.targetFixtureId, sales[1].id, 'Khách mùa nhắm kệ kẹo');
  const plainCustomer = new CustomerManager([], 0, 0).maybeSpawnCustomer(1, true, sim0.getFixtures(), map, 1, 0);
  assert.equal(plainCustomer?.targetFixtureId, sales[0].id, 'Ngày thường vẫn đi theo vòng');
  const slow = new CustomerManager([], 0, 0);
  slow.maybeSpawnCustomer(1, true, sim0.getFixtures(), map, 1, 1, 0.5);
  assert.equal(slow.getSpawnCooldown(), 24, 'Nhu cầu thấp kéo dài thời gian giữa hai khách');

  // --- Quầy ăn uống ---
  const coffee = STALL_MAP['cafe_vot'];
  const normal = computeStallDay('cafe_vot', 1, 50)!;
  const rainy = computeStallDay('cafe_vot', dayOf('mua_mua'), 50)!;
  assert.ok(normal.servings > 0 && normal.servings <= coffee.maxServings);
  assert.ok(rainy.servings > normal.servings, 'Mùa mưa bán cà phê nhiều hơn');
  assert.equal(normal.revenue - normal.cogs, normal.servings * (coffee.servingPrice - coffee.servingCost));
  assert.equal(computeStallDay('khong_co', 1, 0), null);

  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.money = 1_000_000;
  save.player.level = 1;
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  assert.equal(sim.buyStall('cafe_vot').success, false, 'Chưa đủ cấp thì không mở được quầy');
  sim.addExperience(10_000);
  assert.ok(sim.getPlayerData().level >= 3);
  const before = sim.getPlayerData().money;
  assert.equal(sim.buyStall('cafe_vot').success, true);
  assert.equal(sim.getPlayerData().money, before - coffee.price, 'Mở quầy trừ đúng giá');
  assert.equal(sim.buyStall('cafe_vot').success, false, 'Không mở trùng');
  assert.equal(sim.buyStall('khong_co').success, false);

  const moneyBeforeDay = sim.getPlayerData().money;
  const day = sim.getTime().day;
  sim.getClock().advanceToNextDay();
  const expected = computeStallDay('cafe_vot', day, sim.getPlayerData().reputation)!;
  assert.ok(expected.servings > 0);
  assert.equal(sim.getPlayerData().money - moneyBeforeDay, expected.revenue, 'Tiền tăng đúng doanh thu quầy');
  const saleEntry = sim.getLedger().find(entry => entry.description.includes('Quầy cà phê vợt'));
  assert.ok(saleEntry && saleEntry.cogs === expected.cogs && saleEntry.amount === expected.revenue, 'Quầy ghi sổ có giá vốn');
  assert.ok(sim.getDailyRecords()[day]?.revenue >= expected.revenue, 'Doanh thu quầy vào báo cáo ngày');

  const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.equal(reloaded.getStalls().find(item => item.id === 'cafe_vot')?.owned, true, 'Quầy được lưu/tải');
  const ledgerCount = reloaded.getLedger().length;
  reloaded.getClock().advanceToNextDay();
  assert.equal(reloaded.getLedger().filter(entry => entry.description.includes('Quầy cà phê vợt')).length, 2, 'Mỗi ngày một dòng sổ, không tính trùng sau tải');
  assert.ok(reloaded.getLedger().length > ledgerCount);
  console.log('  ✓ Passed: Mùa Việt Nam và quầy ăn uống (mở quầy, doanh thu ngày, sổ sách, lưu/tải)');
}
