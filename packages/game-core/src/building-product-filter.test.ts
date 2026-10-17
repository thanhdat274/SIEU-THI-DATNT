import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, ALL_PRODUCTS } from '@game/data';
import type { StoreFixture } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';

/** open-world-building-types 1.3: kệ trong chi nhánh tạp hóa / bãi xe lọc món theo `productFilter` của registry. */
export function runBuildingProductFilterTests(): void {
  console.log('\n--- Lọc món bày theo loại tòa (building-types 1.3) ---');

  const s = structuredClone(DEFAULT_INITIAL_SAVE);
  s.player.level = 80;
  s.player.money = 50_000_000;
  s.worldTime.isStoreOpen = false;
  const sim = new GameSimulation(s, generateStarterTileMap(), new InputManager(), {});
  sim.reclaimWave('w1');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(3);
  assert.ok(sim.buyParcel('w1-corner').success, 'Mua lô W1');
  const open = sim.openBuilding('grocery_branch', 'w1-corner', 42, 3);
  assert.equal(sim.openBuilding('cafe', 'w1-corner', 42, 3).reason, 'parcel_occupied', 'Lô đã có tòa thì không mở thêm');
  assert.ok(open.success, 'Mở chi nhánh tạp hóa');

  const ambient = ALL_PRODUCTS.find(p => p.storageType !== 'cold' && p.category !== 'frozen' && p.unlockLevel <= 80)!;
  const frozen = ALL_PRODUCTS.find(p => p.category === 'frozen' && p.unlockLevel <= 80)!;
  assert.ok(ambient && frozen, 'Có hàng thường và hàng đông lạnh để thử');

  const fixtures = (sim as unknown as { fixtures: StoreFixture[] }).fixtures;
  const shelf = { id: 'branch_shelf', type: 'shelf_wooden', tileX: 44, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 20, label: 'kệ chi nhánh' } as unknown as StoreFixture;
  fixtures.push(shelf);

  // Kệ trong chi nhánh: hàng đông lạnh bị từ chối ở cả planogram lẫn bày tay
  assert.equal(sim.setPlanogramAssignment('branch_shelf', frozen.id).reason, 'product_not_allowed', 'Planogram: chi nhánh không nhận hàng đông lạnh');
  assert.equal(sim.transferToShelf('branch_shelf', frozen.id, 1).reason, 'product_not_allowed', 'Bày tay: chi nhánh không nhận hàng đông lạnh');
  assert.ok(sim.setPlanogramAssignment('branch_shelf', ambient.id).success, 'Planogram: hàng thường vẫn nhận');

  // Tự châm bỏ qua hàng không hợp lệ
  const inventory = (sim as unknown as { inventory: Array<{ productId: string; quantity: number }> }).inventory;
  inventory.push({ productId: frozen.id, quantity: 10 });
  delete (sim as unknown as { planogram: Record<string, string> }).planogram['branch_shelf'];
  const fill = sim.autoFillShelf('branch_shelf');
  assert.notEqual(fill.productId, frozen.id, 'Tự châm không chọn hàng đông lạnh cho chi nhánh');

  // Kệ ở tiệm chính không bị ảnh hưởng bởi bộ lọc chi nhánh
  const mainShelf = fixtures.find(f => f.id !== 'branch_shelf' && f.type.startsWith('shelf'));
  if (mainShelf) {
    assert.notEqual(sim.setPlanogramAssignment(mainShelf.id, ambient.id).reason, 'product_not_allowed', 'Tiệm chính không áp bộ lọc chi nhánh');
  }
  console.log('  ✓ Passed: bộ lọc món theo loại tòa');

  // Tòa mở thêm phải có hình học thật trên bản đồ và sống sót qua lưu/nạp
  const builtIds = (m: { buildings?: Array<{ id: string }> }) => (m.buildings ?? []).map(b => b.id);
  assert.ok(builtIds(sim.getTileMap()).includes('grocery_branch-1'), 'Bản đồ có tòa grocery_branch-1 sau khi mở');
  const saved = sim.exportSaveData('qa-save', 1);
  assert.ok(saved.storeLayout.buildingPlacements?.some(p => p.buildingId === 'grocery_branch-1'), 'Save ghi placement của tòa mở thêm');
  const reloaded = new GameSimulation(structuredClone(saved), generateStarterTileMap(), new InputManager(), {});
  assert.ok(builtIds(reloaded.getTileMap()).includes('grocery_branch-1'), 'Nạp lại save vẫn có tòa mở thêm');
  assert.equal(reloaded.openBuilding('grocery_branch', 'w1-corner', 42, 3).reason, 'parcel_occupied', 'Sau khi nạp lô vẫn bị chiếm');
  console.log('  ✓ Passed: tòa mở thêm có trên bản đồ và qua lưu/nạp');
}
