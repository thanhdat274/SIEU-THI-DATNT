import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, STALLS, STALL_MAP, stallSellSlots } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { emptyStallState, normalizeStallState, planStallDay, stallDemand } from './stalls';
import { StorageManager } from './storage';

export function runStallsStorageTests(): void {
  // --- stalls.ts ---
  assert.deepEqual(emptyStallState(), { owned: [], processedDayIds: [] });
  const normalized = normalizeStallState({ owned: ['cafe_vot', 'khong_ton_tai'], processedDayIds: [1] });
  assert.deepEqual(normalized.owned, ['cafe_vot'], 'bỏ id quầy không tồn tại');
  assert.deepEqual(normalizeStallState(undefined), { owned: [], processedDayIds: [], lastReport: undefined });
  const src = { owned: ['cafe_vot'], processedDayIds: [1] };
  normalizeStallState(src).processedDayIds.push(2);
  assert.deepEqual(src.processedDayIds, [1], 'normalize không dùng chung mảng với đầu vào');

  const cafe = STALL_MAP['cafe_vot'];
  assert.equal(stallDemand('khong_ton_tai', 5, 50), 0);
  for (const day of [1, 10, 40, 100]) {
    const d = stallDemand('cafe_vot', day, 50);
    assert.ok(d >= 0 && d <= cafe.maxServings, `nhu cầu ngày ${day} nằm trong công suất`);
    assert.equal(d, stallDemand('cafe_vot', day, 50), 'xác định');
  }
  assert.ok(stallDemand('cafe_vot', 10, 100) >= stallDemand('cafe_vot', 10, 0), 'uy tín cao không làm giảm nhu cầu');
  assert.equal(stallDemand('cafe_vot', 10, 999), stallDemand('cafe_vot', 10, 100), 'uy tín bị chặn ở 100');
  assert.equal(stallDemand('cafe_vot', 10, -50), stallDemand('cafe_vot', 10, 0), 'uy tín âm coi như 0');

  // Đủ nguyên liệu: bán đúng nhu cầu, số đơn vị làm tròn lên
  const full = planStallDay('cafe_vot', 10, 50, () => 1000)!;
  assert.equal(full.servings, full.demand);
  assert.equal(full.limitedBy, undefined);
  assert.equal(full.ingredientUnits['sua_ong_tho'], Math.ceil(full.servings * 0.2 - 1e-9));
  // Hết nguyên liệu: không bán, và nêu nguyên liệu gây thiếu
  const none = planStallDay('cafe_vot', 10, 50, () => 0)!;
  assert.equal(none.servings, 0);
  assert.ok(none.demand > 0);
  // Thiếu một nguyên liệu: giảm suất, không vượt kho, báo đúng nguyên liệu
  const low = planStallDay('cafe_vot', 10, 50, (id) => (id === 'sua_ong_tho' ? 1 : 1000))!;
  assert.ok(low.servings < low.demand && low.servings > 0);
  assert.ok(low.ingredientUnits['sua_ong_tho'] <= 1, 'không dùng quá số kho');
  assert.equal(low.limitedBy, 'sua_ong_tho');
  assert.equal(planStallDay('khong_ton_tai', 1, 0, () => 1), null);

  // --- storage.ts ---
  const base = { warehouseTier: 2, storageRackCount: 3 } as never;
  const mgr = new StorageManager(base);
  assert.deepEqual(mgr.getCapacity(), { tier: 2, racks: 3 });
  assert.equal(mgr.getWarehouseTier(), 2);
  assert.equal(mgr.getStorageRackCount(), 3);
  assert.deepEqual(mgr.export(), { warehouseTier: 2, storageRackCount: 3 });
  const legacy = new StorageManager({} as never);
  assert.deepEqual(legacy.export(), { warehouseTier: 0, storageRackCount: 0 }, 'save cũ thiếu trường mặc định 0');
  mgr.load({ warehouseTier: 5 } as never);
  assert.deepEqual(mgr.export(), { warehouseTier: 5, storageRackCount: 0 }, 'load lại ghi đè hoàn toàn');
}

export function runVeSoStallTests(): void {
  const veSo = STALL_MAP['ve_so'];
  assert.ok(veSo && veSo.ingredients.length === 0 && veSo.unlockLevel === 6 && veSo.price === 250000, 'Quầy vé số: cấp 6, 250.000, không nguyên liệu');
  assert.equal(stallSellSlots(veSo), 9, 'Vé số bán 08:00–17:00');
  assert.equal(stallSellSlots(STALL_MAP['cafe_vot']), 14, 'Quầy cũ vẫn bán tới 22:00');

  // Hình học: trong bản đồ và không chồng nhau theo cột
  for (const a of STALLS) {
    assert.ok(a.tileX >= 0 && a.tileX + a.widthTiles <= 36, `${a.id} nằm trong bản đồ`);
    for (const b of STALLS) if (a !== b) assert.ok(a.tileX + a.widthTiles <= b.tileX || b.tileX + b.widthTiles <= a.tileX, `${a.id} không chồng ${b.id}`);
  }

  // Không nguyên liệu: kho trống vẫn bán đủ nhu cầu, không báo thiếu
  const plan = planStallDay('ve_so', 10, 50, () => 0)!;
  assert.equal(plan.servings, plan.demand);
  assert.ok(plan.demand > 0 && plan.demand <= veSo.maxServings);
  assert.equal(plan.limitedBy, undefined);

  // Tích hợp: mua, bán dần tới 17:00 rồi hết vé; quầy cũ không đổi
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.money = 1_000_000;
  save.player.level = 6;
  save.inventory = [];
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  const events: string[][] = [];
  (sim as unknown as { callbacks: { onStallStatusChanged?: (ids: string[]) => void } }).callbacks.onStallStatusChanged = ids => events.push(ids);
  const before = sim.getPlayerData().money;
  assert.equal(sim.buyStall('ve_so').success, true);
  assert.equal(sim.getPlayerData().money, before - veSo.price);
  assert.deepEqual(sim.getSoldOutStalls(), [], 'Mới mở, đầu ngày chưa hết vé');
  const t = sim.getTime();
  const at = (hour: number) => sim.getClock().setTime({ ...t, hour, minute: 0 });
  at(12);
  const mid = sim.getPlayerData().money;
  assert.ok(mid > before - veSo.price, 'Bán dần theo giờ, có doanh thu giữa ngày');
  assert.deepEqual(sim.getSoldOutStalls(), []);
  at(17);
  assert.deepEqual(sim.getSoldOutStalls(), ['ve_so'], '17:00 hết vé');
  const sold = sim.getPlayerData().money;
  const expected = stallDemand('ve_so', t.day, sim.getPlayerData().reputation);
  assert.equal(sold - (before - veSo.price), expected * (veSo.servingPrice - veSo.cashCostPerServing), 'Bán đủ nhu cầu ngày: ví chỉ tăng phần hoa hồng (giá vé trừ vốn nhập)');
  at(20);
  assert.equal(sim.getPlayerData().money, sold, 'Sau giờ ngừng bán không bán thêm');
  assert.ok(events.some(ids => ids.includes('ve_so')), 'Phát onStallStatusChanged khi hết vé');
  sim.getClock().advanceToNextDay();
  at(8);
  assert.deepEqual(sim.getSoldOutStalls(), [], 'Sang ngày mới đầu giờ thì mở lại');
  console.log('  ✓ Passed: Quầy vé số (không nguyên liệu, giờ ngừng bán, biển HẾT, hình học)');
}
