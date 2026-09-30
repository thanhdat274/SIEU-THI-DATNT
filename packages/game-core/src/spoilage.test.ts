import assert from 'node:assert/strict';
import { isSalesFixture, type InventoryItem } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, SPOILAGE_RULES, generateStarterTileMap, validateSpoilageData } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { CustomerManager } from './customers';
import { createMarketState, timeBandFor, weekdayOf, type MarketContext } from './market';
import { decayLot, spoilageCondition, spoilageRate } from './spoilage';

const ctxFor = (weatherId: string, eventIds: string[] = [], day = 70): MarketContext => ({
  day, hour: 12, season: null, climateId: 'clim_hot', weatherId, timeBand: timeBandFor(12), weekday: weekdayOf(day), eventIds,
});

const NEVER = Number.MAX_SAFE_INTEGER;

/** Mô phỏng bắt đầu ở ngày `day` với sự kiện cho trước đang chạy vào đúng ngày đó. */
function simWithEvents(day: number, events: Array<{ id: string; startDay: number; endDay: number }>, inventory: InventoryItem[] = []): GameSimulation {
  const market = { ...createMarketState('spoilage-seed', day), events };
  const save = { ...structuredClone(DEFAULT_INITIAL_SAVE), inventory, worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day }, market };
  return new GameSimulation(save, generateStarterTileMap(), new InputManager());
}

export function runSpoilageTests(): void {
  // --- 6.1 bảng điều kiện bảo quản ---
  assert.deepEqual(validateSpoilageData(), [], 'Dữ liệu hao hạn hợp lệ');
  const meat = PRODUCT_MAP['thit_heo_tuoi'], noodles = PRODUCT_MAP['mi_hao_hao'];
  assert.equal(meat.storageType, 'cold');
  assert.equal(spoilageCondition(ctxFor('sunny'), meat).id, 'cold_powered');
  assert.equal(spoilageCondition(ctxFor('sunny', ['power_outage']), meat).id, 'cold_unpowered');
  assert.equal(spoilageCondition(ctxFor('hot'), noodles).id, 'ambient_hot');
  assert.equal(spoilageCondition(ctxFor('sunny'), noodles).id, 'ambient');
  assert.equal(spoilageRate(ctxFor('sunny'), meat), 1, 'Tủ mát có điện: đúng 1 ngày mỗi ngày');
  assert.ok(spoilageRate(ctxFor('sunny', ['power_outage']), meat) >= 2, 'Mất điện: hàng tươi lạnh hao nhanh gấp nhiều lần');
  assert.equal(spoilageRate(ctxFor('sunny', ['power_outage']), noodles), 1, 'Mất điện không ảnh hưởng hàng khô');
  assert.ok(spoilageRate(ctxFor('hot'), noodles) > 1 && spoilageRate(ctxFor('hot'), noodles) < 1.5, 'Trời nóng hao nhẹ hàng kho thường');
  assert.ok(spoilageRate(ctxFor('sunny', ['power_outage']), meat) <= SPOILAGE_RULES.maxDaysLostPerDay);

  const lot = { quantity: 1, expiresOnDay: 20 } as { quantity: number; expiresOnDay: number; decayCarry?: number };
  assert.equal(decayLot(lot, 1), 0);
  assert.equal(lot.expiresOnDay, 20, 'Tốc độ 1: hạn không đổi');
  assert.equal(decayLot(lot, 2.5), 1);
  assert.equal(lot.decayCarry, 0.5, 'Phần lẻ dồn sang ngày sau');
  assert.equal(decayLot(lot, 2.5), 2);
  assert.equal(lot.expiresOnDay, 17, 'Hai ngày rate 2.5 = mất 3 ngày hạn');
  assert.equal(lot.decayCarry, undefined, 'Hết phần lẻ thì bỏ trường để save gọn');
  const forever = { expiresOnDay: NEVER } as { expiresOnDay: number; decayCarry?: number };
  assert.equal(decayLot(forever, 3), 0);
  assert.equal(forever.expiresOnDay, NEVER, 'Món không có hạn không hỏng');

  // --- 6.1 trong mô phỏng: mất điện làm lô lạnh mất hạn nhanh hơn ---
  const stockMeat = (day: number): InventoryItem[] => [
    { productId: 'thit_heo_tuoi', quantity: 4, lots: [{ quantity: 4, expiresOnDay: day + 6, unitCost: 38000, provenance: 'known' }] },
    { productId: 'mi_hao_hao', quantity: 5, lots: [{ quantity: 5, expiresOnDay: NEVER, unitCost: 3000, provenance: 'known' }] },
    { productId: 'nuoc_suoi', quantity: 5, lots: [{ quantity: 5, expiresOnDay: day + 30, unitCost: 3000 }] },
  ];
  const expiryOf = (sim: GameSimulation, productId: string) => sim.getInventory().find(item => item.productId === productId)?.lots?.[0].expiresOnDay;
  const normal = simWithEvents(40, [], stockMeat(40));
  const outage = simWithEvents(40, [{ id: 'power_outage', startDay: 40, endDay: 40 }], stockMeat(40));
  normal.getClock().advanceToNextDay();
  outage.getClock().advanceToNextDay();
  assert.equal(expiryOf(normal, 'thit_heo_tuoi'), 46, 'Tủ mát có điện: hạn không bị trừ thêm');
  assert.ok(expiryOf(outage, 'thit_heo_tuoi')! < 46, 'Ngày mất điện: lô lạnh mất hạn nhanh hơn');
  assert.equal(expiryOf(outage, 'mi_hao_hao'), NEVER, 'Món không hạn không hỏng');
  assert.equal(expiryOf(outage, 'nuoc_suoi'), 70, 'Hàng khô ngày mất điện không đổi hạn');
  assert.equal(expiryOf(normal, 'nuoc_suoi'), 70);
  for (let i = 0; i < 4; i++) outage.getClock().advanceToNextDay();
  assert.equal(outage.getInventory().some(item => item.productId === 'thit_heo_tuoi'), false, 'Thịt đã hỏng sau khi mất điện làm hụt hạn');
  assert.ok(outage.getLedger().some(entry => entry.type === 'spoilage'), 'Hỏng được ghi sổ');

  // Save cũ (lô không có decayCarry) vẫn tải được và lưu/tải giữ phần lẻ.
  const carry = simWithEvents(40, [{ id: 'power_outage', startDay: 40, endDay: 40 }], [
    { productId: 'nuoc_suoi', quantity: 2, lots: [{ quantity: 2, expiresOnDay: 99, unitCost: 3000 }] },
    { productId: 'kem_que', quantity: 3, lots: [{ quantity: 3, expiresOnDay: 99, unitCost: 6000, provenance: 'known' }] },
  ]);
  carry.getClock().advanceToNextDay();
  const reloaded = new GameSimulation(carry.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.equal(expiryOf(reloaded, 'kem_que'), expiryOf(carry, 'kem_que'));
  assert.equal(reloaded.getInventory().find(item => item.productId === 'kem_que')?.lots?.[0].decayCarry, carry.getInventory().find(item => item.productId === 'kem_que')?.lots?.[0].decayCarry, 'Lưu/tải giữ phần lẻ hao hạn');
  assert.equal(expiryOf(reloaded, 'nuoc_suoi'), 99);

  // --- 6.2 hàng quá hạn trên kệ: khách không mua, hủy, mất uy tín ---
  const map = generateStarterTileMap();
  const shelfSim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), map, new InputManager());
  const sales = shelfSim.getFixtures().filter(isSalesFixture);
  for (const other of sales.slice(1)) { other.currentStock = 0; other.stockLots = []; other.assignedProductId = undefined; }
  const shelf = sales[0];
  shelf.assignedProductId = 'mi_hao_hao'; shelf.currentStock = 3; shelf.stockLots = [{ quantity: 3, expiresOnDay: 4, unitCost: 3000, provenance: 'known' }];
  const manager = new CustomerManager([], 0, 0);
  manager.maybeSpawnCustomer(1, true, shelfSim.getFixtures(), map, 1, 0, { traffic: 1, weightOf: () => 1 });
  const reports: Array<[string, number, number]> = [];
  for (let i = 0; i < 200; i++) manager.update(0.1, true, 5, map, shelfSim.getFixtures(), [], undefined, undefined, undefined, undefined, (id, qty, cost) => reports.push([id, qty, cost]));
  assert.deepEqual(reports, [['mi_hao_hao', 3, 9000]], 'Báo đúng một lần: món, số lượng, giá vốn');
  assert.equal(shelf.currentStock, 0);
  assert.equal(manager.getCustomers().every(customer => !customer.basket?.length), true, 'Không có món quá hạn nào vào giỏ để tạo giao dịch');

  const handler = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), map, new InputManager());
  const repBefore = handler.getPlayerData().reputation;
  const ledgerBefore = handler.getLedger().length;
  (handler as unknown as { handleExpiredOnShelf(productId: string, quantity: number, cost: number): void }).handleExpiredOnShelf('mi_hao_hao', 3, 9000);
  assert.equal(handler.getPlayerData().reputation, repBefore - SPOILAGE_RULES.expiredOnShelfReputationLoss, 'Mất uy tín theo cấu hình');
  const added = handler.getLedger().slice(ledgerBefore);
  assert.equal(added.length, 1);
  assert.deepEqual([added[0].type, added[0].amount, added[0].quantity], ['spoilage', 9000, 3]);
  assert.equal(handler.getLedger().some(entry => entry.type === 'sale' && entry.day === added[0].day && entry.quantity === 3), false, 'Không có giao dịch bán cho món quá hạn');

  // --- 6.3 cảnh báo sắp hết hạn ---
  const warn = simWithEvents(10, [], [
    { productId: 'rau_cai_xanh', quantity: 7, lots: [{ quantity: 3, expiresOnDay: 11, unitCost: 6000 }, { quantity: 4, expiresOnDay: 12, unitCost: 6000 }] },
    { productId: 'nuoc_suoi', quantity: 2, lots: [{ quantity: 2, expiresOnDay: 60, unitCost: 3000 }] },
  ]);
  const soon = warn.getExpiringStock();
  assert.deepEqual(soon, [{ productId: 'rau_cai_xanh', quantity: 7, daysLeft: 1 }], 'Chỉ món sắp hết hạn trong ngưỡng, gộp theo sản phẩm');
  assert.equal(warn.getExpiringStock(0).length, 0);
  let warned = 0;
  const notified = new GameSimulation({ ...structuredClone(DEFAULT_INITIAL_SAVE), inventory: [{ productId: 'rau_cai_xanh', quantity: 2, lots: [{ quantity: 2, expiresOnDay: 12, unitCost: 6000, provenance: 'known' }] }], worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day: 10 }, market: createMarketState('spoilage-seed', 10) }, generateStarterTileMap(), new InputManager(), { onExpiringSoon: () => { warned++; } });
  notified.getClock().advanceToNextDay();
  assert.equal(warned, 1, 'Qua ngày báo sắp hết hạn một lần');

  // --- 6.3 tiêu hủy thủ công: mỗi đơn vị ghi sổ đúng một lần ---
  const disposal = simWithEvents(10, [], [
    { productId: 'rau_cai_xanh', quantity: 10, lots: [{ quantity: 4, expiresOnDay: 12, unitCost: 6000, provenance: 'known' }, { quantity: 6, expiresOnDay: 13, unitCost: 7000, provenance: 'known' }] },
  ]);
  assert.equal(disposal.disposeStock('rau_cai_xanh', 0).success, false);
  assert.equal(disposal.disposeStock('khong_ton_tai', 1).success, false);
  const first = disposal.disposeStock('rau_cai_xanh', 5);
  assert.deepEqual([first.success, first.disposed, first.cost], [true, 5, 4 * 6000 + 1 * 7000], 'Hủy lô gần hạn trước, tính đúng giá vốn từng lô');
  assert.equal(disposal.getInventory()[0].quantity, 5);
  const spoilEntries = () => disposal.getLedger().filter(entry => entry.type === 'spoilage');
  assert.equal(spoilEntries().length, 1);
  const afterReload = new GameSimulation(disposal.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.equal(afterReload.getLedger().filter(entry => entry.type === 'spoilage').length, 1, 'Lưu/tải không nhân đôi sổ hỏng');
  const rest = afterReload.disposeStock('rau_cai_xanh', 99);
  assert.deepEqual([rest.disposed, rest.cost], [5, 5 * 7000], 'Yêu cầu quá số hiện có chỉ hủy phần còn lại');
  const again = afterReload.disposeStock('rau_cai_xanh', 99);
  assert.equal(again.success, false, 'Gọi lại khi hết hàng không ghi gì');
  assert.equal(afterReload.getLedger().filter(entry => entry.type === 'spoilage').length, 2, 'Tổng 2 lần hủy thật = 2 dòng sổ');
  const record = afterReload.getCurrentDayRecord();
  assert.equal(record.spoilageCount, 10, 'Báo cáo ngày ghi đúng số lượng hỏng');
  assert.equal(record.spoilageCost, 5 * 7000 + 4 * 6000 + 7000, 'Báo cáo ngày ghi đúng giá trị hỏng');
  assert.equal(record.netProfit, record.grossProfit - record.spoilageCost - record.wagesPaid);
  assert.equal(afterReload.getStatistics().totalSpoiled, 10);

  console.log('  ✓ Passed: Hạn dùng — hao theo điều kiện bảo quản, hàng quá hạn trên kệ, cảnh báo, tiêu hủy idempotent');
}
