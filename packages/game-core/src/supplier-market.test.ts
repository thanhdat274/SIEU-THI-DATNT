import assert from 'node:assert/strict';
import { createInitialOnlineWorld, ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, PRODUCT_MAP, SUPPLIER_MAP, SUPPLIER_MARKET_RULES, SUPPLIERS, generateStarterTileMap, validateMarketData, validateSupplierData } from '@game/data';
import type { SaveGameData } from '@game/shared';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { WorldRuntime } from './world-runtime';
import { createMarketState, timeBandFor, weekdayOf, type MarketContext } from './market';
import { bulkDiscount, computeSupplierDay, nextDeliveryDay, stepWholesaleIndex, wholesaleQuote } from './supplier-market';

const ctxFor = (day: number, eventIds: string[] = [], hour = 12): MarketContext => ({
  day, hour, season: null, climateId: 'clim_hot', weatherId: 'sunny', timeBand: timeBandFor(hour), weekday: weekdayOf(day), eventIds,
});

const newSim = (mutate?: (save: SaveGameData) => void) => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.money = 5_000_000;
  save.player.level = 3;
  mutate?.(save);
  return new GameSimulation(save, generateStarterTileMap(), new InputManager());
};

export async function runSupplierMarketTests(): Promise<void> {
  // --- 5.1 dữ liệu và các hàm thuần ---
  assert.deepEqual(validateSupplierData(), [], 'Dữ liệu nhà cung cấp hợp lệ');
  assert.deepEqual(validateMarketData(), [], 'Dữ liệu thị trường (gồm nhà cung cấp) hợp lệ');
  assert.ok(SUPPLIERS.some(supplier => supplier.outageFactor === 0), 'Luôn có một mối không bao giờ ngừng cung');
  assert.equal(stepWholesaleIndex(1, 1.6), 1 + SUPPLIER_MARKET_RULES.maxStepPerDay, 'Giá sỉ chỉ nhích một bước mỗi ngày');
  assert.equal(stepWholesaleIndex(1.03, 0.5), 1.03 - SUPPLIER_MARKET_RULES.maxStepPerDay);
  assert.equal(stepWholesaleIndex(1.59, 3), SUPPLIER_MARKET_RULES.indexBounds.max, 'Kẹp trong dải');
  const market = SUPPLIER_MAP['cho_dau_moi'], local = SUPPLIER_MAP['dai_ly_dau_hem'];
  assert.equal(bulkDiscount(market, 10), 0);
  assert.equal(bulkDiscount(market, 24), 0.03);
  assert.equal(bulkDiscount(market, 60), 0.06, 'Bậc cao nhất đạt được');
  assert.equal(bulkDiscount(local, 500), 0, 'Mối không có ưu đãi số lượng lớn');
  // Ngày 1 = Thứ Hai; ngày 6 = Thứ Bảy, ngày 7 = Chủ Nhật (chợ đầu mối không giao)
  assert.equal(nextDeliveryDay(market, 6), 6);
  assert.equal(nextDeliveryDay(market, 7), 8, 'Đơn rơi vào Chủ Nhật được dời sang Thứ Hai');
  assert.equal(nextDeliveryDay(local, 7), 7, 'Mối không có lịch giao mọi ngày');
  const mi = PRODUCT_MAP['mi_hao_hao'];
  const neutral = wholesaleQuote(market, mi, undefined, 1);
  assert.equal(neutral.unit, Math.round(mi.purchasePrice * 0.9), 'Không có trạng thái thị trường: giá như cũ');
  assert.ok(wholesaleQuote(market, mi, { priceIndex: { instant_noodles: 1.2 } } as never, 1).unit > neutral.unit, 'Hệ số giá sỉ làm đơn giá tăng');
  assert.ok(wholesaleQuote(market, mi, undefined, 60).unit < neutral.unit, 'Ưu đãi số lượng lớn làm đơn giá giảm');

  // --- 5.1 giá sỉ trôi dần, tồn, ngừng cung, lý do ---
  const first = computeSupplierDay('supplier-seed', market, ctxFor(1));
  assert.ok(Object.values(first.priceIndex).every(value => value === 1), 'Ngày đầu giá sỉ bắt đầu ở mức chuẩn');
  assert.equal(first.stockCap['nuoc_suoi'], market.stockPerProductPerDay, 'Tồn bình thường theo cấu hình');
  let state = first;
  const trail: number[] = [];
  for (let day = 2; day <= 14; day++) {
    state = computeSupplierDay('supplier-seed', market, ctxFor(day, ['heat_wave']), state);
    trail.push(state.priceIndex['bottled_water']);
  }
  assert.ok(trail.every((value, i) => Math.abs(value - (i === 0 ? 1 : trail[i - 1])) <= SUPPLIER_MARKET_RULES.maxStepPerDay + 1e-9), 'Giá sỉ không nhảy quá bước mỗi ngày');
  assert.ok(trail[trail.length - 1] > 1.15, 'Nắng nóng kéo dài đẩy giá sỉ đồ mát lên dần');
  assert.ok(state.stockCap['nuoc_suoi'] < market.stockPerProductPerDay!, 'Nắng nóng giảm tồn nhà cung cấp đồ mát');
  assert.ok(state.reasons['bottled_water'].some(reason => reason.includes('Nắng nóng kéo dài')), 'Có lý do chính cho mức giá');
  const calmDay = computeSupplierDay('supplier-seed', market, ctxFor(15), state);
  assert.ok(calmDay.priceIndex['bottled_water'] < state.priceIndex['bottled_water'], 'Hết sự kiện giá sỉ giảm dần');
  const shortage = computeSupplierDay('supplier-seed', market, ctxFor(20, ['supplier_shortage']), first);
  assert.ok(shortage.unavailable.length > 0, 'Khan hàng: chợ đầu mối ngừng cung một số món');
  assert.ok(shortage.unavailable.every(id => shortage.stockLeft[id] === 0));
  assert.equal(computeSupplierDay('supplier-seed', local, ctxFor(20, ['supplier_shortage']), first).unavailable.length, 0, 'Mối luôn sẵn hàng không bao giờ ngừng cung');
  assert.deepEqual(shortage, computeSupplierDay('supplier-seed', market, ctxFor(20, ['supplier_shortage']), first), 'Xác định theo hạt giống');
  assert.ok(Object.keys(computeSupplierDay('s', { ...market, stockPerProductPerDay: undefined }, ctxFor(2), first).stockCap).length === 0, 'Không có cấu hình tồn: không giới hạn');

  // --- 5.1/5.2 đặt hàng theo tồn, ngừng cung, nguyên tử, khóa giá ---
  const sim = newSim();
  const left = () => sim.getMarketState().suppliers!['cho_dau_moi'].stockLeft['mi_hao_hao'];
  assert.equal(left(), 120);
  const money0 = sim.getPlayerData().money;
  assert.equal(sim.orderSupplierCart('cho_dau_moi', [{ productId: 'mi_hao_hao', quantity: 40 }]).success, true);
  assert.equal(left(), 80, 'Tồn nhà cung cấp giảm đúng số lượng đã đặt');
  const moneyAfter = sim.getPlayerData().money;
  const tooMany = sim.orderSupplierCart('cho_dau_moi', [{ productId: 'xa_xi_chuong_duong', quantity: 10 }, { productId: 'mi_hao_hao', quantity: 100 }]);
  assert.equal(tooMany.success, false, 'Vượt tồn: từ chối nguyên giỏ');
  assert.ok(tooMany.reasons!.some(reason => reason.includes('chỉ còn 80')), 'Lý do nêu tồn còn lại');
  assert.equal(sim.getPlayerData().money, moneyAfter, 'Giỏ bị từ chối không trừ tiền');
  assert.equal(sim.getMarketState().suppliers!['cho_dau_moi'].stockLeft['xa_xi_chuong_duong'], 120, 'Giỏ bị từ chối không trừ tồn dòng còn lại');
  assert.equal(sim.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 100 }]).success, true, 'Mối khác còn hàng vẫn đặt được');
  assert.ok(money0 > sim.getPlayerData().money);
  const pendingCost = sim.getPendingOrders().find(order => order.supplierId === 'cho_dau_moi')!.unitCost;
  assert.equal(pendingCost, Math.max(1, Math.round(mi.purchasePrice * 0.97 * 0.9)), 'Đơn giá chốt gồm ưu đãi số lượng lớn');

  const outSave = sim.exportSaveData();
  outSave.market!.suppliers!['cho_dau_moi'].unavailable = ['mi_hao_hao'];
  outSave.market!.suppliers!['cho_dau_moi'].stockLeft['mi_hao_hao'] = 0;
  const out = new GameSimulation(outSave, generateStarterTileMap(), new InputManager());
  const outMoney = out.getPlayerData().money;
  const blocked = out.orderSupplierCart('cho_dau_moi', [{ productId: 'xa_xi_chuong_duong', quantity: 30 }, { productId: 'mi_hao_hao', quantity: 5 }]);
  assert.equal(blocked.success, false);
  assert.ok(blocked.reasons!.some(reason => reason.includes('tạm ngừng cung')), 'Lý do: nhà cung cấp tạm ngừng cung');
  assert.equal(out.getPlayerData().money, outMoney, 'Nguyên tử: không trừ tiền');
  assert.equal(out.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 5 }]).success, true, 'Đổi sang mối không ngừng cung vẫn đặt được');

  // Giá chốt vào đơn dù giá sỉ đổi sau đó; lưu/tải giữ trạng thái thị trường nhà cung cấp
  const lock = newSim(save => { save.market = { ...createMarketState('lock-seed', 1), events: [{ id: 'heat_wave', startDay: 1, endDay: 14 }] }; });
  lock.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'nuoc_suoi', quantity: 5 }]);
  const lockedCost = lock.getPendingOrders()[0].unitCost;
  for (let i = 0; i < 6; i++) lock.getClock().advanceToNextDay();
  assert.ok(lock.wholesaleUnitPrice('dai_ly_dau_hem', 'nuoc_suoi') > lockedCost, 'Sau vài ngày nắng nóng giá sỉ hôm nay cao hơn giá đã chốt');
  assert.ok(lock.getPendingOrders().concat().every(order => order.unitCost === lockedCost) || lock.getPendingOrders().length === 0, 'Đơn đã đặt giữ giá cũ');
  const reloaded = new GameSimulation(lock.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.deepEqual(reloaded.getMarketState().suppliers, lock.getMarketState().suppliers, 'Lưu/tải giữ thị trường nhà cung cấp');

  // Save cũ không có thị trường nhà cung cấp vẫn đặt hàng như trước
  const legacy = newSim(save => { delete save.market; });
  assert.equal(legacy.orderFromSupplier('mi_hao_hao', 5), true, 'Save cũ đặt hàng bình thường');
  const quotes = legacy.getSupplierQuotes('cho_dau_moi');
  assert.ok(quotes.quotes['mi_hao_hao'].unitPrice > 0 && quotes.quotes['mi_hao_hao'].stockLeft === 120, 'Báo giá cho giao diện có giá và tồn');
  const saturday = newSim(save => { save.worldTime.day = 6; });
  assert.equal(saturday.getSupplierQuotes('cho_dau_moi').deliveryDay, 7 + 1, 'Đặt Thứ Bảy, giao Thứ Hai (không giao Chủ Nhật)');
  assert.equal(saturday.getSupplierQuotes('dai_ly_dau_hem').deliveryDay, 7, 'Mối giao mọi ngày giao sáng hôm sau');
  assert.ok(saturday.getSupplierQuotes('cho_dau_moi').bulkTiers.length === 2);
  saturday.orderSupplierCart('cho_dau_moi', [{ productId: 'mi_hao_hao', quantity: 40 }]);
  assert.equal(saturday.getPendingOrders()[0].arrivalDay, 8, 'Đơn hàng nhận đúng ngày theo lịch giao');

  // --- 5.2 co-op: runtime kiểm tra đơn hàng ---
  const owner = { id: 'owner-1', displayName: 'Owner', photoUrl: null };
  const seeded = createInitialOnlineWorld(owner, 'world-supplier-market');
  seeded.business.save.player.money = 2_000_000;
  seeded.business.save.player.level = 3;
  const runtime = new WorldRuntime(seeded.world, seeded.business, { heartbeatTimeoutMs: 1000, checkpointIntervalSeconds: 100 });
  const command = (commandId: string, items: Array<{ productId: string; quantity: number }>) => ({
    protocolVersion: 1 as const, worldId: seeded.world.id, businessId: seeded.business.id, commandId,
    expectedRevision: runtime.getSnapshot().world.revision,
    payload: { type: 'order_supplier', supplierId: 'cho_dau_moi', items },
  });
  const rejected = await runtime.executeCommand('owner-1', command('order-too-many', [{ productId: 'mi_hao_hao', quantity: 500 }]));
  assert.equal(rejected.status, 'rejected', 'Runtime từ chối đơn vượt tồn nhà cung cấp');
  const coopMoney = runtime.getSimulation().getPlayerData().money;
  const accepted = await runtime.executeCommand('owner-1', command('order-ok', [{ productId: 'mi_hao_hao', quantity: 40 }]));
  assert.equal(accepted.status, 'accepted');
  assert.ok(runtime.getSimulation().getPlayerData().money < coopMoney, 'Đơn hợp lệ được trừ tiền');
  assert.equal(runtime.getSimulation().getMarketState().suppliers!['cho_dau_moi'].stockLeft['mi_hao_hao'], 80, 'Tồn nhà cung cấp trừ trên server');

  // --- 5.4 kịch bản nhiều hệ: nắng nóng -> tồn NCC đồ mát giảm -> giá sỉ tăng dần -> người chơi chọn nhập/chờ ---
  const scenario = newSim(save => { save.market = { ...createMarketState('scenario-seed', 1), events: [{ id: 'heat_wave', startDay: 1, endDay: 12 }] }; save.player.money = 3_000_000; });
  const startMoney = scenario.getPlayerData().money;
  const indexByDay: number[] = [];
  const priceByDay: number[] = [];
  const stockByDay: number[] = [];
  for (let day = 1; day <= 10; day++) {
    const supplierState = scenario.getMarketState().suppliers!['dai_ly_dau_hem'];
    indexByDay.push(supplierState.priceIndex['bottled_water']);
    priceByDay.push(scenario.wholesaleUnitPrice('dai_ly_dau_hem', 'nuoc_suoi'));
    stockByDay.push(supplierState.stockCap['nuoc_suoi']);
    if (day === 3) assert.equal(scenario.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'nuoc_suoi', quantity: 20 }]).success, true, 'Người chơi nhập sớm khi giá còn thấp');
    scenario.getClock().advanceToNextDay();
  }
  assert.ok(indexByDay.every((value, i) => i === 0 || Math.abs(value - indexByDay[i - 1]) <= SUPPLIER_MARKET_RULES.maxStepPerDay + 1e-9), 'Kịch bản: giá sỉ đổi dần');
  assert.ok(indexByDay[9] > indexByDay[0] + 0.1, 'Kịch bản: sau 10 ngày nắng nóng giá sỉ đồ mát cao rõ rệt');
  assert.ok(priceByDay[9] > priceByDay[2], 'Kịch bản: nhập muộn đắt hơn nhập sớm');
  assert.ok(stockByDay[2] < SUPPLIER_MAP['dai_ly_dau_hem'].stockPerProductPerDay!, 'Kịch bản: tồn nhà cung cấp đồ mát giảm trong nắng nóng');
  const earlyOrder = scenario.getPendingOrders().concat().find(order => order.productId === 'nuoc_suoi') ?? scenario.getInventory().find(item => item.productId === 'nuoc_suoi');
  assert.ok(!!earlyOrder, 'Đơn nhập sớm đã về kho hoặc đang chờ');
  const purchases = scenario.getLedger().filter(entry => entry.type === 'purchase').reduce((sum, entry) => sum + entry.amount, 0);
  assert.equal(startMoney - scenario.getPlayerData().money, purchases, 'Tiền giảm đúng bằng tổng sổ cái nhập hàng (không có bán hàng)');
  assert.ok(scenario.getPlayerData().money >= 0 && ALL_PRODUCTS.length > 0);

  console.log('  ✓ Passed: Thị trường nhà cung cấp — giá sỉ động, tồn, ngừng cung, ưu đãi, lịch giao, đơn nguyên tử, co-op, kịch bản nắng nóng');
}
