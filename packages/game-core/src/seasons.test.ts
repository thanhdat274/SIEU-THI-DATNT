import assert from 'node:assert/strict';
import { isSalesFixture } from '@game/shared';
import { ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, generateStarterTileMap, getSeasonForDay, getDayOfYear, SEASON_EVENTS, SEASON_YEAR_DAYS, STALL_MAP } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { planStallDay } from './stalls';
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
  for (const event of SEASON_EVENTS) {
    assert.ok(event.demandMultiplier > 0 && event.preferredCategories.length > 0);
    assert.ok(event.goals && event.goals.length > 0, `Mùa ${event.name} có mục tiêu ngày hội`);
    for (const goal of event.goals) {
      assert.ok(goal.id && goal.title && goal.targetUnits > 0 && goal.rewardMoney > 0, 'Mục tiêu ngày hội hợp lệ');
    }
  }

  // Khách mùa ưu tiên nhóm hàng theo mùa.
  const map = generateStarterTileMap();
  const sim0 = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), map, new InputManager());
  const sales = sim0.getFixtures().filter(isSalesFixture).slice(0, 2);
  assert.equal(sales.length, 2, 'Cần hai kệ bán hàng để thử ưu tiên');
  const candy = ALL_PRODUCTS.find(p => p.category === 'candy')!;
  const noodles = ALL_PRODUCTS.find(p => p.category === 'instant_noodles')!;
  sales.forEach((fixture, index) => { fixture.assignedProductId = (index === 0 ? noodles : candy).id; fixture.currentStock = 5; });
  const seasonalCustomer = new CustomerManager([], 0, 0).maybeSpawnCustomer(1, true, sim0.getFixtures(), map, 1, 0, { traffic: 1.5, weightOf: id => id === candy.id ? 100 : 0.001 });
  assert.equal(seasonalCustomer?.targetFixtureId, sales[1].id, 'Nhu cầu kẹo cao thì khách nhắm kệ kẹo');
  const plainCustomer = new CustomerManager([], 0, 0).maybeSpawnCustomer(1, true, sim0.getFixtures(), map, 1, 0);
  assert.equal(plainCustomer?.targetFixtureId, sales[0].id, 'Ngày thường vẫn đi theo vòng');
  const slow = new CustomerManager([], 0, 0);
  slow.maybeSpawnCustomer(1, true, sim0.getFixtures(), map, 1, 1, { traffic: 0.5, weightOf: () => 1 });
  assert.equal(slow.getSpawnCooldown(), 11, 'Nhu cầu thấp kéo dài thời gian giữa hai khách theo nhịp cơ sở 5.5 giây');

  // --- Quầy ăn uống ---
  const coffee = STALL_MAP['cafe_vot'];
  const stock = (productId: string) => (id: string) => id === productId ? 100 : 100;
  const normal = planStallDay('cafe_vot', 1, 50, stock('x'))!;
  const rainy = planStallDay('cafe_vot', dayOf('mua_mua'), 50, stock('x'))!;
  assert.ok(normal.servings > 0 && normal.servings <= coffee.maxServings);
  assert.ok(rainy.servings > normal.servings, 'Mùa mưa bán cà phê nhiều hơn');
  assert.equal(planStallDay('khong_co', 1, 0, stock('x')), null);
  const capped = planStallDay('cafe_vot', 1, 50, id => id === 'sua_ong_tho' ? 1 : 100)!;
  assert.equal(capped.servings, 5, 'Một hộp sữa đặc chỉ đủ 5 suất');
  assert.equal(capped.limitedBy, 'sua_ong_tho');
  assert.equal(planStallDay('cafe_vot', 1, 50, () => 0)!.servings, 0, 'Hết nguyên liệu thì không bán được');

  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.money = 1_000_000;
  save.player.level = 1;
  save.inventory = [{ productId: 'sua_ong_tho', quantity: 5 }];
  const stallTile = (sim: GameSimulation) => {
    const map = sim.getTileMap();
    return map.collisionLayer[(coffee.tileY - (map.originTileY ?? 0)) * map.width + coffee.tileX];
  };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  assert.equal(sim.buyStall('cafe_vot').success, false, 'Chưa đủ cấp thì không mở được quầy');
  sim.addExperience(10_000);
  assert.ok(sim.getPlayerData().level >= 3);
  assert.equal(stallTile(sim), false, 'Chưa mở quầy thì vỉa hè còn trống');
  const before = sim.getPlayerData().money;
  assert.equal(sim.buyStall('cafe_vot').success, true);
  assert.equal(sim.getPlayerData().money, before - coffee.price, 'Mở quầy trừ đúng giá');
  assert.equal(stallTile(sim), true, 'Quầy chặn đường đi trên bản đồ');
  assert.equal(sim.getTileMap().stalls?.[0]?.id, 'cafe_vot', 'Bản đồ báo vị trí quầy để vẽ');
  assert.equal(sim.buyStall('cafe_vot').success, false, 'Không mở trùng');
  assert.equal(sim.buyStall('khong_co').success, false);

  // Ngày 1: chỉ có sữa đặc, thiếu đường -> không đủ nguyên liệu để bán.
  const moneyBeforeDay = sim.getPlayerData().money;
  sim.getClock().advanceToNextDay();
  assert.equal(sim.getPlayerData().money, moneyBeforeDay, 'Thiếu đường thì quầy không bán và không tốn tiền');
  assert.equal(sim.getStallReport()?.entries[0]?.servings, 0);
  assert.equal(sim.getStallReport()?.entries[0]?.limitedBy, 'duong_cat');
  assert.equal(sim.getInventory().find(i => i.productId === 'sua_ong_tho')?.quantity, 5, 'Không lấy kho khi không bán');

  // Ngày 2: nhập thêm đường vào kho, quầy lấy nguyên liệu theo lô và ghi giá vốn thật.
  const restock = sim.exportSaveData(undefined, 1);
  restock.inventory = [{ productId: 'sua_ong_tho', quantity: 5, lots: [{ quantity: 5, expiresOnDay: 999, unitCost: 17000, provenance: 'known' }] },
    { productId: 'duong_cat', quantity: 3, lots: [{ quantity: 3, expiresOnDay: 999, unitCost: 11000, provenance: 'known' }] }];
  sim.importSaveData(restock);
  const day = sim.getTime().day;
  const moneyDay2 = sim.getPlayerData().money;
  const plan = planStallDay('cafe_vot', day, sim.getPlayerData().reputation, id => id === 'sua_ong_tho' ? 5 : 3)!;
  assert.ok(plan.servings > 0);
  sim.getClock().advanceToNextDay();
  const revenue = plan.servings * coffee.servingPrice;
  const cogs = plan.servings * coffee.cashCostPerServing + plan.ingredientUnits['sua_ong_tho'] * 17000 + plan.ingredientUnits['duong_cat'] * 11000;
  assert.equal(sim.getPlayerData().money - moneyDay2, revenue, 'Tiền tăng đúng doanh thu quầy');
  const saleEntry = sim.getLedger().find(entry => entry.description.includes('Quầy cà phê vợt') && entry.day === day);
  assert.ok(saleEntry && saleEntry.cogs === cogs && saleEntry.amount === revenue, 'Quầy ghi sổ với giá vốn theo lô kho');
  assert.equal(sim.getInventory().find(i => i.productId === 'sua_ong_tho')?.quantity ?? 0, 5 - plan.ingredientUnits['sua_ong_tho'], 'Trừ đúng nguyên liệu trong kho');
  assert.ok(sim.getDailyRecords()[day]?.revenue >= revenue, 'Doanh thu quầy vào báo cáo ngày');
  assert.equal(sim.getDailyRecords()[day]?.stallServings?.cafe_vot, plan.servings, 'Số suất quầy được ghi theo ngày để tính mục tiêu ngày hội');

  const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.equal(reloaded.getStalls().find(item => item.id === 'cafe_vot')?.owned, true, 'Quầy được lưu/tải');
  assert.equal(stallTile(reloaded), true, 'Tải lại vẫn có quầy trên bản đồ');
  const soldEntries = () => reloaded.getLedger().filter(entry => entry.description.includes('Quầy cà phê vợt')).length;
  const beforeCount = soldEntries();
  reloaded.importSaveData(sim.exportSaveData());
  assert.equal(soldEntries(), beforeCount, 'Nhập lại save không tính trùng ngày đã xử lý');
  console.log('  ✓ Passed: Mùa Việt Nam và quầy ăn uống (bản đồ, nguyên liệu kho, giá vốn, sổ sách, lưu/tải)');
}
