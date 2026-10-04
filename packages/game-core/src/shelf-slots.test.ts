import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, generateStarterTileMap, refrigerationAccepts } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ TEST FAILED: ${message}`);
  console.log(`  ✓ Passed: ${message}`);
}

export function runShelfSlotTests(): void {
  console.log('\n--- Kệ nhiều ô bày chung nhiều nhóm hàng ---');
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.inventory = [
    { productId: 'mi_hao_hao', quantity: 30 },
    { productId: 'ca_phe_hoa_tan', quantity: 10 },
    { productId: 'coca_cola_lon', quantity: 10 },
    { productId: 'cam', quantity: 10 },
    { productId: 'whisky_red_label', quantity: 2 },
    { productId: 'kem_que', quantity: 5 },
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
  assert(otherCategory.success && otherCategory.actualQuantity === 5, 'Ô phụ nhận cả hàng khác nhóm với ô cùng kệ (bày chung nhiều loại)');

  const roundTrip = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
  const again = roundTrip.getFixtures().filter(f => f.parentId === shelf.id);
  assert(again.length === 11 && again[0].currentStock === 5, 'Ô phụ và hàng trong ô được lưu/tải lại');

  const fridge = sim.getFixtures().find(f => f.type === 'refrigerator' && !f.parentId)!;
  const fridgeSlot = sim.getFixtures().find(f => f.id === fridge.id || f.parentId === fridge.id)!;
  assert(sim.transferToShelf(fridgeSlot.id, 'coca_cola_lon', 3).success, 'Tủ mát nhận nước ngọt để bán lạnh');
  const fruitSlot = sim.getFixtures().filter(f => f.id === fridge.id || f.parentId === fridge.id)[1] ?? fridgeSlot;
  if (fruitSlot.id !== fridgeSlot.id) assert(sim.transferToShelf(fruitSlot.id, 'cam', 3).success, 'Tủ mát nhận trái cây ăn tươi, khác nhóm với ô cùng tủ');
  assert(!sim.transferToShelf(fridgeSlot.id, 'mi_hao_hao', 1).success, 'Tủ mát không nhận mì gói');
  assert(!sim.transferToShelf(fridgeSlot.id, 'whisky_red_label', 1).success, 'Tủ mát không nhận rượu mạnh');

  const fridgeFixture = { shopId: undefined as string | undefined };
  const freezerFixture = { shopId: 'freezer' };
  assert(refrigerationAccepts(freezerFixture, PRODUCT_MAP.kem_que) && !refrigerationAccepts(freezerFixture, PRODUCT_MAP.sua_tuoi), 'Tủ đông chỉ nhận hàng đông lạnh');
  assert(!refrigerationAccepts(fridgeFixture, PRODUCT_MAP.kem_que) && refrigerationAccepts(fridgeFixture, PRODUCT_MAP.sua_tuoi), 'Tủ mát nhận hàng lạnh, không nhận hàng đông lạnh');
  assert(!sim.transferToShelf(fridgeSlot.id, 'kem_que', 1).success, 'Kem que không vào được tủ mát');
}
