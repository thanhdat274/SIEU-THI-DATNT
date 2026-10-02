import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, SUPPLIER_MAP, STORY_CHAPTER_MAP, generateStarterTileMap } from '@game/data';
import { isSalesFixture, validateSaveGameData } from '@game/shared';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { MAX_REPLAY_STEPS, REPLAY_SCHEMA, SIMULATION_VERSION, runDayReplay, type DayReplay } from './replay';

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
  // dt bất thường không được treo vòng lặp phút của đồng hồ hay replay
  const clockSim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
  clockSim.getClock().toggleStoreStatus();
  const started = Date.now();
  for (const dt of [Number.POSITIVE_INFINITY, Number.NaN, -5, 1e9, 1e12]) clockSim.update(dt);
  assert.ok(Date.now() - started < 5000, 'update(dt bất thường) phải trả về nhanh');
  assert.ok(Number.isFinite(clockSim.getTime().hour) && Number.isFinite(clockSim.getPlayerData().money));
  const base = { schema: REPLAY_SCHEMA, simulationVersion: SIMULATION_VERSION, startSave: structuredClone(DEFAULT_INITIAL_SAVE), commands: [] } as never as DayReplay;
  for (const bad of [{ steps: 10, dt: Number.POSITIVE_INFINITY }, { steps: 10, dt: 1e9 }, { steps: MAX_REPLAY_STEPS + 1, dt: 0.25 }, { steps: 10, dt: 0 }]) {
    assert.equal(runDayReplay({ ...base, ...bad } as DayReplay).ok, false, 'replay xấu phải bị từ chối');
  }
  runCorruptSaveShapeTests();
  console.log('  ✓ Passed: Bảng giá bán/sơ đồ/khách quen không trả thuộc tính prototype; dt/replay bất thường không treo');
}

/** Save sai kiểu ở trường mảng tùy chọn phải bị validator từ chối, không để lọt tới constructor rồi sập ở `.map`. */
export function runCorruptSaveShapeTests(): void {
  const mutate = (path: string[], value: unknown) => {
    const save = JSON.parse(JSON.stringify(DEFAULT_INITIAL_SAVE));
    let target = save;
    for (const key of path.slice(0, -1)) target = target[key];
    target[path[path.length - 1]] = value;
    return save;
  };
  assert.equal(validateSaveGameData(JSON.parse(JSON.stringify(DEFAULT_INITIAL_SAVE))).valid, true, 'Save mặc định hợp lệ');
  for (const path of [['staff'], ['processedPayrollDayIds'], ['pendingOrders'], ['holdingArea'], ['storeLayout', 'storedFixtures'], ['storeLayout', 'unlockedPlotIds'], ['storeLayout', 'decorOwned']]) {
    for (const bad of ['x', -1, {}]) {
      assert.equal(validateSaveGameData(mutate(path, bad)).valid, false, `${path.join('.')}=${JSON.stringify(bad)} phải bị từ chối`);
    }
  }
  console.log('  ✓ Passed: Save sai kiểu ở trường mảng tùy chọn bị validator từ chối');
}
