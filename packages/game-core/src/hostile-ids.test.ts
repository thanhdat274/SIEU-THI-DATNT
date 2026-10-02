import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, SUPPLIER_MAP, STORY_CHAPTER_MAP, generateStarterTileMap } from '@game/data';
import { isSalesFixture } from '@game/shared';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

/** Id lạ từ client/co-op (`constructor`, `__proto__`…) phải bị từ chối chứ không ném lỗi hay lọt qua bảng tra cứu. */
export function runHostileIdTests(): void {
  const ids = ['__proto__', 'constructor', 'toString', 'hasOwnProperty'];
  for (const id of ids) {
    assert.equal(PRODUCT_MAP[id], undefined, `PRODUCT_MAP[${id}]`);
    assert.equal(SUPPLIER_MAP[id], undefined, `SUPPLIER_MAP[${id}]`);
    assert.equal(STORY_CHAPTER_MAP[id], undefined, `STORY_CHAPTER_MAP[${id}]`);
  }
  const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
  const fixture = sim.getFixtures().filter(isSalesFixture)[0];
  const money = sim.getPlayerData().money;
  for (const id of ids) {
    assert.equal(sim.orderSupplierCart(id, [{ productId: 'mi_hao_hao', quantity: 1 }]).success, false, `nhà cung cấp ${id}`);
    assert.equal(sim.orderSupplierCart('dai_ly_dau_hem', [{ productId: id, quantity: 1 }]).success, false, `sản phẩm ${id}`);
    assert.equal(sim.setSellingPrice(id, 5000).success, false, `giá ${id}`);
    assert.equal(sim.claimStoryChapter(id).success, false, `chương ${id}`);
    assert.equal(sim.setPlanogramAssignment(fixture.id, id).success, false, `sơ đồ ${id}`);
    assert.deepEqual(sim.getPriceHistory(id), [], `lịch sử giá ${id}`);
    assert.doesNotThrow(() => { sim.getSupplierQuotes(id); sim.getProductPlans(id); sim.wholesaleUnitPrice(id, 'mi_hao_hao'); }, `báo giá ${id}`);
  }
  assert.equal(sim.getPlayerData().money, money, 'Id lạ không làm đổi tiền');
  console.log('  ✓ Passed: Id lạ (__proto__/constructor…) bị từ chối an toàn ở bảng dữ liệu và API mô phỏng');
}

/** Bảng runtime (giá bán, sơ đồ, khách quen) cũng không được trả thuộc tính prototype cho khóa lạ. */
export function runHostileRuntimeKeyTests(): void {
  const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
  for (const id of ['__proto__', 'constructor', 'toString']) {
    assert.equal(typeof sim.sellingPrice(id), 'number', `sellingPrice(${id}) phải là số`);
    assert.equal(sim.sellingPrice(id), 0);
    assert.equal(sim.getPlanogramForFixture(id), undefined, `planogram[${id}]`);
    assert.equal(sim.getCustomerCreditTerms(id).eligible, false);
  }
  const exported = sim.exportSaveData('x', 1);
  assert.equal(JSON.parse(JSON.stringify(exported)).sellingPrices !== undefined, true, 'Xuất save vẫn tuần tự hóa được bảng giá');
  console.log('  ✓ Passed: Bảng giá bán/sơ đồ/khách quen không trả thuộc tính prototype cho khóa lạ');
}
