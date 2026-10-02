import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ TEST FAILED: ${message}`);
  console.log(`  ✓ Passed: ${message}`);
}

export function runShelfSlotTests(): void {
  console.log('\n--- Kệ nhiều ô cùng nhóm hàng ---');
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.inventory = [
    { productId: 'mi_hao_hao', quantity: 30 },
    { productId: 'ca_phe_hoa_tan', quantity: 10 },
  ] as typeof save.inventory;
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  const fixtures = sim.getFixtures();
  const shelf = fixtures.find(f => f.id === 'shelf_wooden_noodles')!;
  const slots = fixtures.filter(f => f.parentId === shelf.id);
  assert(slots.length === 11, 'Kệ gỗ tự có 11 ô phụ khi tải save cũ');
  assert(slots.every(s => s.tileX === shelf.tileX && s.tileY === shelf.tileY), 'Ô phụ trùng vị trí kệ cha');

  const sameCategory = sim.transferToShelf(slots[0].id, 'mi_hao_hao', 5);
  assert(sameCategory.success && sameCategory.actualQuantity === 5, 'Ô phụ nhận hàng cùng nhóm với ô chính');
  const otherCategory = sim.transferToShelf(slots[1].id, 'ca_phe_hoa_tan', 5);
  assert(!otherCategory.success && otherCategory.reason === 'product_mismatch', 'Ô phụ từ chối hàng khác nhóm với ô cùng kệ');

  const roundTrip = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
  const again = roundTrip.getFixtures().filter(f => f.parentId === shelf.id);
  assert(again.length === 11 && again[0].currentStock === 5, 'Ô phụ và hàng trong ô được lưu/tải lại');
}
