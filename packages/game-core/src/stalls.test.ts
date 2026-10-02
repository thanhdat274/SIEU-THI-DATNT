import assert from 'node:assert/strict';
import { STALL_MAP } from '@game/data';
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
