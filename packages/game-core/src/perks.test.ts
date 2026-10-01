import assert from 'node:assert/strict';
import type { CustomerState, InventoryItem, SaveGameData, SkillType } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, SKILL_PERKS, effectiveShelfCapacity, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';
import { createInitialSkillState, getSkillModifier } from './skills';

/** Hành vi riêng của từng đặc quyền: cùng một kịch bản chạy hai lần, chỉ khác perk, rồi so sánh kết quả. */
function build(perks: string[], mutate?: (save: SaveGameData) => void): GameSimulation {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 10;
  save.player.money = 1_000_000;
  save.skills = createInitialSkillState();
  for (const skill of ['management', 'marketing', 'storage'] as SkillType[]) save.skills.levels[skill] = 4;
  save.skills.chosenPerks = perks;
  mutate?.(save);
  return new GameSimulation(save, generateStarterTileMap(), new InputManager());
}

const cashier = (save: SaveGameData) => {
  save.staff = [{
    id: 'staff_cashier', name: 'Thu ngân', role: 'cashier', speed: 1, accuracy: 1, stamina: 1,
    dailyWage: 100_000, hiredOnDay: 1, shift: 'full_day',
  }];
};

const withCheckoutCustomer = (save: SaveGameData) => {
  const fixture = save.storeLayout.fixtures.find(item => item.type === 'shelf_wooden' || item.type === 'shelf_glass')!;
  const productId = 'nuoc_suoi';
  const customer: CustomerState = {
    id: 'perk-customer', position: { x: 320, y: 320 }, stage: 'checkout', targetFixtureId: fixture.id,
    checkoutId: 'perk-checkout', patience: 45, checkoutWait: 0,
    basket: [{ productId, quantity: 1, unitPrice: PRODUCT_MAP[productId].baseSellingPrice, lots: [{ quantity: 1, expiresOnDay: 99, unitCost: 1000 }] }],
  };
  save.customers = [customer];
};

const serviceTime = (perks: string[]): number => {
  const sim = build(perks, save => { cashier(save); withCheckoutCustomer(save); });
  assert.equal(sim.assignNextCashierCustomer('staff_cashier'), true, 'Thu ngân nhận khách ở quầy');
  return sim.getStaff()[0].checkoutServiceRemaining!;
};

/** Traffic thực tế mà simulation đưa cho bộ sinh khách (đã nhân mọi hệ số), chụp từ lời gọi thật. */
const trafficSeen = (perks: string[]): number => {
  const sim = build(perks, save => {
    save.player.level = 1;
    save.worldTime = { ...save.worldTime, isStoreOpen: true, day: 12 };
    save.market = createMarketState('perk-seed', 12);
    const shelf = save.storeLayout.fixtures.find(item => item.type === 'shelf_wooden' || item.type === 'shelf_glass')!;
    shelf.assignedProductId = 'nuoc_suoi';
    shelf.currentStock = 24;
    shelf.stockLots = [{ quantity: 24, expiresOnDay: 999, unitCost: 1000 }];
  });
  const manager = (sim as any).customerManager;
  const original = manager.maybeSpawnCustomer.bind(manager);
  let traffic = NaN;
  manager.maybeSpawnCustomer = (...args: any[]) => { traffic = args[6]?.traffic; return original(...args); };
  sim.update(0.25);
  assert.ok(Number.isFinite(traffic), 'Simulation gọi bộ sinh khách với traffic');
  return traffic;
};

export function runPerkBehaviorTests(): void {
  console.log('\n--- Test: Hành vi từng đặc quyền ---');

  // Mỗi đặc quyền trong dữ liệu đều có modifier trả về > 0 khi chọn và đúng 0 khi không chọn.
  for (const perk of SKILL_PERKS) {
    const state = createInitialSkillState();
    const keys = ['cashier_speed', 'wage_discount', 'staff_speed', 'tip_bonus', 'supplier_discount', 'traffic_boost', 'fresh_extra_day', 'shelf_capacity_bonus', 'spoilage_reduction'] as const;
    const none = keys.map(key => getSkillModifier(state, key)).reduce((a, b) => a + b, 0);
    state.chosenPerks = [perk.id];
    const some = keys.map(key => getSkillModifier(state, key)).reduce((a, b) => a + b, 0);
    assert.equal(none, 0);
    assert.ok(some > 0, `${perk.id} có modifier`);
  }

  // perk_quick_hands: thu ngân phục vụ nhanh hơn 15%.
  const base = serviceTime([]);
  assert.ok(Math.abs(serviceTime(['perk_quick_hands']) - base * 0.85) < 1e-9, 'quick_hands giảm 15% thời gian xử lý hóa đơn');

  // perk_master_manager: nhân viên nhanh hơn 20% (cộng dồn nhân với quick_hands).
  assert.ok(Math.abs(serviceTime(['perk_master_manager']) - base * 0.8) < 1e-9, 'master_manager giảm 20% thời gian xử lý hóa đơn');
  assert.ok(Math.abs(serviceTime(['perk_quick_hands', 'perk_master_manager']) - base * 0.85 * 0.8) < 1e-9, 'hai perk nhân với nhau, không cộng quá tay');

  // perk_cool_pack: hàng tươi lạnh giao tới có hạn dài hơn đúng 1 ngày.
  const deliveredExpiry = (perks: string[]): number => {
    const sim = build(perks, save => {
      save.pendingOrders = [{ id: 'order-cool', productId: 'thit_heo_tuoi', quantity: 3, unitCost: 38_000, arrivalDay: 2 }];
    });
    sim.deliverOrders(2);
    return sim.getInventory().find((item: InventoryItem) => item.productId === 'thit_heo_tuoi')!.lots![0].expiresOnDay;
  };
  assert.equal(deliveredExpiry(['perk_cool_pack']), deliveredExpiry([]) + 1, 'cool_pack kéo dài hạn hàng tươi 1 ngày');

  // perk_zero_waste: ngày mất điện, lô lạnh mất ít hạn hơn (một nửa phần hao thêm).
  const expiryAfterOutage = (perks: string[]): number => {
    const day = 40;
    const sim = build(perks, save => {
      save.worldTime = { ...save.worldTime, day };
      save.market = { ...createMarketState('perk-seed', day), events: [{ id: 'power_outage', startDay: day, endDay: day }] };
      save.inventory = [{ productId: 'thit_heo_tuoi', quantity: 4, lots: [{ quantity: 4, expiresOnDay: day + 8, unitCost: 38_000, provenance: 'known' }] }];
    });
    sim.getClock().advanceToNextDay();
    return sim.getInventory().find(item => item.productId === 'thit_heo_tuoi')!.lots![0].expiresOnDay;
  };
  const lostNormal = 48 - expiryAfterOutage([]);
  const lostPerk = 48 - expiryAfterOutage(['perk_zero_waste']);
  assert.ok(lostNormal >= 2, 'Mất điện làm lô lạnh hao nhanh');
  assert.ok(lostPerk < lostNormal, 'zero_waste giảm hao hạn khi mất điện');
  assert.ok(lostPerk >= 1, 'Vẫn mất ít nhất 1 ngày hạn mỗi ngày trôi qua');

  // perk_neat_shelves: +20% trên mức trần thấp hơn giữa kệ và mặt hàng, nên có tác dụng cả khi món đã chạm trần kệ.
  const shelfSpace = (perks: string[], productId: string): { moved: number; maxCapacity: number } => {
    const sim = build(perks, save => {
      save.inventory = [{ productId, quantity: 500, lots: [{ quantity: 500, expiresOnDay: 999, unitCost: 1000 }] }];
      const shelf = save.storeLayout.fixtures.find(item => item.type === 'shelf_wooden' || item.type === 'shelf_glass')!;
      shelf.assignedProductId = undefined; shelf.currentStock = 0; shelf.stockLots = [];
    });
    const shelf = sim.getFixtures().find(item => item.type === 'shelf_wooden' || item.type === 'shelf_glass')!;
    return { moved: sim.transferToShelf(shelf.id, productId, 500).actualQuantity, maxCapacity: shelf.maxCapacity };
  };
  const small = Object.values(PRODUCT_MAP).find(item => item.storageType !== 'cold' && item.shelfCapacity >= 10 && item.shelfCapacity <= 19)!;
  assert.ok(small, 'Có mặt hàng đủ nhỏ để thấy hiệu ứng');
  const capped = PRODUCT_MAP['nuoc_suoi'];
  for (const product of [small, capped]) {
    const plain = shelfSpace([], product.id);
    const neat = shelfSpace(['perk_neat_shelves'], product.id);
    assert.equal(plain.moved, effectiveShelfCapacity(plain.maxCapacity, product.shelfCapacity, 0));
    assert.equal(neat.moved, effectiveShelfCapacity(neat.maxCapacity, product.shelfCapacity, 0.2), `${product.id}: neat_shelves +20%`);
    assert.ok(neat.moved > plain.moved, `${product.id}: perk luôn có tác dụng nhìn thấy được`);
  }
  assert.ok(shelfSpace([], capped.id).moved === shelfSpace([], capped.id).maxCapacity, 'nuoc_suoi đã chạm trần kệ khi không có perk');
  // UI/renderer dùng cùng nguồn bonus với simulation.
  assert.equal(build(['perk_neat_shelves']).getShelfCapacityBonus(), 0.2);
  assert.equal(build([]).getShelfCapacityBonus(), 0);

  // perk_local_legend: traffic nhân 1,1 (đo trực tiếp giá trị đưa vào bộ sinh khách ở cấp 1, dưới trần 6).
  const trafficBase = trafficSeen([]);
  const trafficLegend = trafficSeen(['perk_local_legend']);
  assert.ok(trafficBase > 0 && trafficLegend < 6, 'Traffic nằm dưới trần để so sánh được');
  assert.ok(Math.abs(trafficLegend / trafficBase - 1.1) < 1e-9, `local_legend nhân traffic 1,1 (${trafficBase} → ${trafficLegend})`);

  console.log(`  ✓ 9 perk có hành vi riêng: quick_hands 0,85×, master_manager 0,8×, cool_pack +1 ngày hạn, zero_waste giảm hao, neat_shelves +20% kể cả món đã chạm trần kệ, local_legend traffic ${trafficBase.toFixed(2)}→${trafficLegend.toFixed(2)}`);
}
