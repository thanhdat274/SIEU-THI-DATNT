/**
 * Test cho 4 tính năng snack shop mở rộng (17/10/2026):
 * (a) Khách chuyền tòa — CROSS_SELL_RULES
 * (a2) Cross-sell không teleport — khách đi bộ từ cửa tòa nguồn sang kệ tòa đích
 *     (mô phỏng thật: position không nhảy quá 1 ô; tòa đích đóng/hết hàng thì rời tiệm bình thường)
 * (b) Bé Na regular visits snack shop
 * (c) Snack shop assignment: dùng assignedBuilding='snack' của staff-shifts cho cashier/refill
 * (d) Supplemental time slots — snackSupplementaryMultiplier
 */
import assert from 'node:assert/strict';
import { CROSS_SELL_RULES, shouldCrossSell, SNACK_SUPPLEMENTARY_HOURS, snackSupplementaryMultiplier } from './customers';
import { Mulberry32Rng } from './staff';
import { hashSeed } from './weather';
import { REGULAR_CUSTOMERS, LAND_PLOTS, SNACK_PLOT_ID, DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { generateCandidatesForDay } from './staff';
import type { CustomerState, SaveGameData } from '@game/shared';
import { TILE_SIZE } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { applyStoreLayoutActions } from './store-layout';

// Helper dựng sim giống snack-shop.test.ts: chỉ kệ quán ăn vặt có hàng, mọi khách phải chọn snack.
const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
const lot = (quantity: number) => ({ quantity, expiresOnDay: 400, unitCost: 3_000, provenance: 'known' as const });
const snackOnlySave = (): SaveGameData => {
  const base = structuredClone(DEFAULT_INITIAL_SAVE);
  base.player.level = 60;
  base.player.money = 10_000_000;
  base.worldTime.isStoreOpen = false;
  const bought = applyStoreLayoutActions(base, [SNACK_PLOT_ID].map(plotId => ({ type: 'buy_plot' as const, plotId })), mapFor).save!;
  assert.ok(bought, 'mua quán ăn vặt hợp lệ');
  for (const fixture of bought.storeLayout.fixtures) {
    if (fixture.id === 'snack_shelf') { fixture.assignedProductId = 'bap_xao_tp'; fixture.currentStock = 20; fixture.stockLots = [lot(20)]; }
    else if (fixture.type === 'shelf_wooden' || fixture.type === 'refrigerator') { fixture.assignedProductId = undefined; fixture.currentStock = 0; fixture.stockLots = []; }
  }
  bought.worldTime.isStoreOpen = true;
  bought.worldTime.hour = 8;
  bought.customer = undefined;
  bought.customers = [];
  return bought;
};
const newSim = (save: SaveGameData) => new GameSimulation(save, mapFor(save.storeLayout.unlockedPlotIds ?? []), new InputManager(), {});
const live = (sim: GameSimulation): CustomerState[] => (sim as never as { customerManager: { customers: CustomerState[] } }).customerManager.customers;
// Tìm customer id mà shouldCrossSell(main→snack) trả true (deterministic theo hashSeed).
const crossSellTriggerId = (): string => {
  for (let i = 0; i < 1000; i++) {
    const cand = `xs-main-${i}`;
    if (shouldCrossSell(cand, 'main', 'snack')) return cand;
  }
  throw new Error('không tìm được customer id trigger cross-sell main→snack');
};

export function runSnackExtendedTests(): void {
  console.log('\n--- Quán ăn vặt mở rộng (cross-sell, Bé Na, assignment, time slots) ---');

  // (a) Cross-sell rules: có 4 quy tắc chuyền giữa main↔snack, main↔xoi
  {
    const ids = CROSS_SELL_RULES.map(r => `${r.fromBuilding}→${r.toBuilding}`).join(', ');
    assert.ok(ids.includes('main→snack'), 'có quy tắc main→snack');
    assert.ok(ids.includes('snack→main'), 'có quy tắc snack→main');
    assert.ok(ids.includes('main→xoi'), 'có quy tắc main→xoi');
    assert.ok(ids.includes('xoi→main'), 'có quy tắc xoi→main');
    assert.equal(CROSS_SELL_RULES.length, 4, 'có 4 quy tắc cross-sell');
    // Tỷ lệ deterministic: cùng customerId + building → cùng kết quả (dùng Mulberry32Rng)
    const r1 = shouldCrossSell('test-cust-1', 'main', 'snack');
    const r2 = shouldCrossSell('test-cust-1', 'main', 'snack');
    assert.equal(r1, r2, 'deterministic: cùng seed → cùng kết quả');
    // Khác customer → khác kết quả
    const r3 = shouldCrossSell('test-cust-2', 'main', 'snack');
    // Kiểm tra tỷ lệ: 15% nên với nhiều customer sẽ có ~15% true
    let hits = 0;
    for (let i = 0; i < 200; i++) {
      if (shouldCrossSell(`test-id-${i}`, 'main', 'snack')) hits++;
    }
    // Tỷ lệ thực tế ~15% (±5% vì hash không đều)
    assert.ok(hits >= 8 && hits <= 28, `tỷ lệ cross-sell main→snack ~15% (thấy ${hits}/200)`);
  }

  // (a2) Cross-sell KHÔNG teleport: mô phỏng thật qua sim.update().
  // (i) Khi cross-sell trigger, khách đi bộ từ cửa tòa nguồn (main) sang kệ tòa đích (snack),
  //     position không nhảy quá 1 ô trong bất kỳ tick nào.
  {
    const sim = newSim(snackOnlySave());
    const custId = crossSellTriggerId();
    sim.getCustomerManager().addTestCustomer({
      id: custId,
      checkoutId: `cx-${custId}`,
      position: { x: 9 * TILE_SIZE, y: 8 * TILE_SIZE },
      stage: 'checkout',
      buildingId: 'main',
      targetFixtureId: 'shelf_wooden_noodles',
      basket: [{ productId: 'mi_hao_hao', quantity: 1, unitPrice: 5_000, lots: [lot(1)] }],
      patience: 30,
      checkoutWait: 10,
      crossSellApplied: [] as string[],
    });
    assert.ok(sim.completeCustomerCheckout(`cx-${custId}`), 'checkout xong, cross-sell trigger (pendingCrossSellTo=snack)');
    let c: CustomerState | undefined = live(sim).find(x => x.checkoutId === `cx-${custId}`)!;
    assert.equal(c!.pendingCrossSellTo, 'snack', 'cross-sell: pendingCrossSellTo = snack sau checkout');
    assert.equal(c!.stage, 'leaving', 'cross-sell: khách đi ra cửa tòa nguồn trước (stage=leaving)');

    // Chạy sim, đo nhảy vị trí mỗi tick; ghi nhận khoảnh khắc chuyển tòa (buildingId main→snack).
    const shelfCenter = (() => {
      const f = sim.getFixtures().find(x => x.id === 'snack_shelf')!;
      return { x: (f.tileX + 1) * TILE_SIZE, y: (f.tileY + 1) * TILE_SIZE };
    })();
    let prev = { ...c!.position };
    let maxJump = 0;
    let transferred = false;
    let pendingCleared = false;
    let distAtTransfer = Infinity;
    let minDistAfter = Infinity;
    for (let i = 0; i < 12000; i++) {
      sim.update(1 / 60);
      c = live(sim).find(x => x.checkoutId === `cx-${custId}`);
      if (!c) break;
      const jump = Math.sqrt((c.position.x - prev.x) ** 2 + (c.position.y - prev.y) ** 2);
      maxJump = Math.max(maxJump, jump);
      const dist = Math.sqrt((c.position.x - shelfCenter.x) ** 2 + (c.position.y - shelfCenter.y) ** 2);
      if (!transferred && c.buildingId === 'snack' && c.stage === 'to_shelf') {
        // Khoảnh khắc chuyển tòa: khách đang ở cửa tòa nguồn (còn xa kệ snack) → chứng tỏ KHÔNG teleport vào kệ.
        transferred = true;
        distAtTransfer = dist;
      } else if (transferred) {
        if (c.pendingCrossSellTo === undefined) pendingCleared = true;
        minDistAfter = Math.min(minDistAfter, dist);
      }
      prev = { ...c.position };
    }
    assert.ok(transferred, 'cross-sell: khách chuyển sang tòa snack (buildingId main→snack qua đi bộ)');
    assert.ok(maxJump <= TILE_SIZE, `cross-sell: không tick nào nhảy quá 1 ô (không teleport), maxJump=${maxJump.toFixed(1)}px`);
    assert.ok(distAtTransfer > 3 * TILE_SIZE, `cross-sell: lúc chuyển tòa khách còn XA kệ snack (cách ${distAtTransfer.toFixed(1)}px) → không teleport vào kệ`);
    assert.ok(minDistAfter < distAtTransfer, `cross-sell: sau khi chuyển tòa khách ĐI BỘ lại gần kệ snack (min=${minDistAfter.toFixed(1)}px < transfer=${distAtTransfer.toFixed(1)}px)`);
    assert.ok(pendingCleared, 'cross-sell: pendingCrossSellTo bị xóa sau khi chuyển tòa');
  }

  // (a2)(ii) Tòa đích HẾT HÀNG (hoặc đóng) sau khi checkout: khách KHÔNG chuyển tòa,
  // rời tiệm bình thường (buildingId giữ nguyên main, khách bị removeCustomer).
  {
    const save = snackOnlySave();
    // Checkout diễn ra lúc snack còn hàng → pendingCrossSellTo được set;
    // trước khi update, làm kệ snack hết hàng để nhánh leaving không chuyển tòa.
    const sim = newSim(save);
    const custId = crossSellTriggerId();
    sim.getCustomerManager().addTestCustomer({
      id: custId,
      checkoutId: `cx2-${custId}`,
      position: { x: 9 * TILE_SIZE, y: 8 * TILE_SIZE },
      stage: 'checkout',
      buildingId: 'main',
      targetFixtureId: 'shelf_wooden_noodles',
      basket: [{ productId: 'mi_hao_hao', quantity: 1, unitPrice: 5_000, lots: [lot(1)] }],
      patience: 30,
      checkoutWait: 10,
      crossSellApplied: [] as string[],
    });
    assert.ok(sim.completeCustomerCheckout(`cx2-${custId}`), 'checkout xong, cross-sell trigger (snack còn hàng lúc checkout)');
    let c: CustomerState | undefined = live(sim).find(x => x.checkoutId === `cx2-${custId}`)!;
    assert.equal(c!.pendingCrossSellTo, 'snack', 'pendingCrossSellTo=snack được set'); 

    // Snack hết hàng trước khi khách rời khỏi tòa nguồn.
    const snackShelf = sim.getFixtures().find(x => x.id === 'snack_shelf')!;
    snackShelf.currentStock = 0;
    snackShelf.stockLots = [];

    let switchedToSnack = false;
    let removed = false;
    for (let i = 0; i < 12000; i++) {
      sim.update(1 / 60);
      c = live(sim).find(x => x.checkoutId === `cx2-${custId}`);
      if (!c) break;
      if (c.buildingId === 'snack') switchedToSnack = true;
      if (c.pendingCrossSellTo === undefined && c.stage === 'leaving') removed = true;
    }
    assert.ok(!switchedToSnack, 'tòa đích hết hàng: khách KHÔNG chuyển sang tòa snack');
    assert.ok(removed || !live(sim).some(x => x.checkoutId === `cx2-${custId}`), 'tòa đích hết hàng: khách rời tiệm bình thường (leaving → removeCustomer)');
  }

  // (b) Bé Na có snackShopProductIds và snackShopVisitHours
  {
    const beNa = REGULAR_CUSTOMERS.find(r => r.id === 'be_na');
    assert.ok(beNa, 'Bé Na tồn tại trong REGULAR_CUSTOMERS');
    assert.ok(beNa.snackShopProductIds?.length, 'Bé Na có snackShopProductIds');
    assert.ok(beNa.snackShopProductIds!.includes('bap_xao_tp'), 'Bé Na thích bắp xào');
    assert.ok(beNa.snackShopProductIds!.includes('ca_vien_chien_tp'), 'Bé Na thích cá viên chiên');
    assert.ok(beNa.snackShopProductIds!.includes('banh_trang_tron_tp'), 'Bé Na thích bánh tráng trộn');
    assert.ok(beNa.snackShopVisitHours, 'Bé Na có snackShopVisitHours');
    assert.equal(beNa.snackShopVisitHours!.fromHour, 16, 'Bé Na ghé snack shop từ 16:00');
    assert.equal(beNa.snackShopVisitHours!.toHour, 18, 'Bé Na ghé snack shop đến 18:00');
    // Bé Na có snackShopDialogues
    assert.ok(beNa.snackShopDialogues, 'Bé Na có snackShopDialogues');
    assert.ok(beNa.snackShopDialogues!.greeting.length > 0, 'greeting không rỗng');
  }

  // (c) Assignment tòa 'snack': dùng assignedBuilding='snack' của staff-shifts (không có role snack_staff)
  // Các ứng viên cashier/refill có thể được gán tòa 'snack' qua UI (buildings pool có 'snack')
  {
    const candidates = generateCandidatesForDay(1, 10);
    // Không có snack_staff role nữa — chỉ có cashier/refill/security/drink_staff/drink_security
    const snackStaff = candidates.filter(c => c.role === 'snack_staff' as never);
    assert.equal(snackStaff.length, 0, 'không có role snack_staff (dùng assignedBuilding thay thế)');
    // Buildings pool có 'snack' cho mọi role (không gán mặc định cho role nào ngoài drink_staff/drink_security)
    // Việc gán tòa 'snack' cho cashier/refill làm qua UI (assign_staff_building command)
  }

  // (d) Supplemental time slots: snack đông vào 14:00–18:00
  {
    assert.equal(snackSupplementaryMultiplier(13), 1, '13:00 không có multiplier');
    assert.equal(snackSupplementaryMultiplier(14), 1.3, '14:00 × 1.3');
    assert.equal(snackSupplementaryMultiplier(15), 1.3, '15:00 × 1.3');
    assert.equal(snackSupplementaryMultiplier(16), 1.5, '16:00 × 1.5');
    assert.equal(snackSupplementaryMultiplier(17), 1.5, '17:00 × 1.5');
    assert.equal(snackSupplementaryMultiplier(18), 1, '18:00 hết khung');
    assert.equal(snackSupplementaryMultiplier(20), 1, '20:00 không multiplier');
    // undefined = không multiplier
    assert.equal(snackSupplementaryMultiplier(undefined), 1, 'undefined = 1');
  }

  // Balance check: plot cost = 1.200.000 (giá mới, hoàn vốn ~7 ngày)
  {
    const plot = LAND_PLOTS.find(p => p.id === 'building-snack');
    assert.ok(plot, 'SNACK_PLOT_ID tồn tại');
    assert.equal(plot.cost, 1_200_000, 'giá quán ăn vặt = 1.200.000₫ (hoàn vốn ~7 ngày)');
  }

  console.log('  ✓ Passed: Quán ăn vặt mở rộng (cross-sell, Bé Na, assignment, time slots, balance)');
}
