import assert from 'node:assert/strict';
import { isSalesFixture, type CustomerState } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, STREET_PARKING_SPOTS, generateStarterTileMap } from '@game/data';
import { CustomerManager } from './customers';
import { GameSimulation } from './simulation';
import { InputManager } from './input';

/**
 * OpenSpec `traffic-light-crosswalk-yielding` 4.5: khách đi bộ (arrivalMode='walk') băng qua vạch trước cửa tiệm —
 * chờ đèn người đi bộ xanh rồi mới qua; rời tiệm cũng qua vạch về phía xa rồi biến mất.
 */
export function runCrosswalkTests(): void {
  console.log('\n--- Vạch qua đường trước cửa (traffic-light-crosswalk-yielding) ---');

  const tileMap = generateStarterTileMap();

  // (1) Đèn đi bộ ĐỎ: khách sinh ở mép xa không bước vào vạch; chỉ đi khi đèn xanh.
  {
    console.log('--- Test crosswalk 1: chờ đèn đỏ không vào vạch, chỉ qua khi xanh ---');
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), tileMap, new InputManager());
    const mgr = sim.getCustomerManager();
    const shelf = sim.getFixtures().find(f => f.id === 'shelf_wooden_noodles')!;
    shelf.assignedProductId = 'mi_hao_hao';
    shelf.currentStock = 3;
    shelf.stockLots = [{ quantity: 3, expiresOnDay: 999, unitCost: 3000, provenance: 'known' }];
    const fixtures = sim.getFixtures();

    // Khách đi bộ đứng sẵn ở mép xa của vạch, chờ đèn.
    mgr.setStoreFrontPedestrian('dont_walk');
    mgr.addTestCustomer({
      id: 'cw-red',
      position: { x: 320, y: 512 },
      stage: 'crosswalk',
      targetFixtureId: shelf.id,
      checkoutId: 'cw-red-chk',
      arrivalMode: 'walk',
      crosswalk: { leaving: false, phase: 'wait' },
      patience: 9999,
      checkoutWait: 5,
      basket: [],
    });

    // Chạy nhiều khung lớn với đèn đỏ: vị trí y không được nhích lên (không vào lòng đường).
    let neverEntered = true;
    for (let i = 0; i < 60; i++) {
      mgr.update(0.5, true, 1, tileMap, fixtures, [], undefined, undefined, undefined, undefined, undefined, undefined, 1);
      const c = mgr.getCustomers().find(x => x.id === 'cw-red');
      if (!c) break;
      // Mép xa y=512: đang chờ thì giữ y = 512 (không đi lên vào phạm vi 416..512).
      if (c.position.y < 512 - 0.001) { neverEntered = false; break; }
      assert.ok(c.crosswalk?.phase === 'wait', 'đèn đỏ: khách vẫn ở pha chờ');
    }
    assert.ok(neverEntered, 'đèn đỏ: khách không bước vào vạch trong lúc chờ');

    // Đèn xanh: khách bắt đầu băng qua (y giảm xuống trong lòng đường).
    mgr.setStoreFrontPedestrian('walk', 60);
    let moved = false;
    for (let i = 0; i < 60; i++) {
      mgr.update(0.5, true, 1, tileMap, fixtures, [], undefined, undefined, undefined, undefined, undefined, undefined, 1);
      const c = mgr.getCustomers().find(x => x.id === 'cw-red');
      if (!c) break;
      if (c.position.y < 512 && c.crosswalk?.phase === 'cross') { moved = true; break; }
    }
    assert.ok(moved, 'đèn xanh: khách chỉ bắt đầu băng qua sau khi đèn người đi bộ sang walk');
  }

  // (2) Sinh ở phía xa, qua vạch vào tiệm, mua xong rời qua vạch và biến mất ở phía xa.
  {
    console.log('--- Test crosswalk 2: vào tiệm qua vạch, mua xong, rời qua vạch về phía xa ---');
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), tileMap, new InputManager());
    const mgr = sim.getCustomerManager();
    const shelf = sim.getFixtures().find(f => f.id === 'shelf_wooden_noodles')!;
    shelf.assignedProductId = 'mi_hao_hao';
    shelf.currentStock = 3;
    shelf.stockLots = [{ quantity: 3, expiresOnDay: 999, unitCost: 3000, provenance: 'known' }];
    const fixtures = sim.getFixtures();
    const completed = new Set<string>();
    const departed: CustomerState[] = [];

    mgr.setStoreFrontPedestrian('dont_walk');
    mgr.addTestCustomer({
      id: 'cw-full',
      position: { x: 320, y: 512 },
      stage: 'crosswalk',
      targetFixtureId: shelf.id,
      checkoutId: 'cw-full-chk',
      arrivalMode: 'walk',
      crosswalk: { leaving: false, phase: 'wait' },
      patience: 9999,
      checkoutWait: 5,
      basket: [],
    });

    // Chạy 1 khung với đèn đỏ: xác nhận chưa qua.
    mgr.update(0.2, true, 1, tileMap, fixtures, [], undefined, undefined, undefined, undefined, undefined, undefined, 1);
    assert.ok(mgr.getCustomers().find(x => x.id === 'cw-full')?.position.y! >= 512, 'khách chưa qua vạch khi đèn đỏ');

    mgr.setStoreFrontPedestrian('walk', 120);
    let reachedShelfPick = false;
    let leftViaCrosswalk = false;
    let guard = 0;
    const cap = 8000;
    while (mgr.getCustomers().some(x => x.id === 'cw-full') && guard++ < cap) {
      const dt = 0.1;
      mgr.update(dt, true, 1, tileMap, fixtures, [], undefined, undefined, undefined, undefined, (c) => c, undefined, 1, (c) => departed.push(c));
      const c = mgr.getCustomers().find(x => x.id === 'cw-full');
      if (!c) break;
      // Tới kệ và nhặt được món → vào tiệm thành công từ phía xa.
      if (c.stage === 'to_checkout' || c.stage === 'checkout') reachedShelfPick = true;
      if (c.stage === 'checkout') {
        mgr.completeCheckout(c.checkoutId, completed, tileMap, fixtures);
        continue;
      }
      // Rời tiệm qua vạch: stage crosswalk + đang rời.
      if (c.stage === 'crosswalk' && c.crosswalk?.leaving) leftViaCrosswalk = true;
    }
    assert.ok(reachedShelfPick, 'khách đi bộ từ phía xa qua vạch vào tiệm và mua được món');
    assert.ok(leftViaCrosswalk, 'khách rời tiệm qua vạch (stage crosswalk hướng rời)');
    assert.ok(departed.length >= 1, 'khách đã rời đi (onCustomerDepart)');
    const last = departed[departed.length - 1] ?? mgr.getCustomers()[0];
    assert.ok(last.position.y > 480, `khách biến mất ở phía xa (y=${last.position.y.toFixed(1)} > 480)`);
  }

  // (2b) maybeSpawnCustomer: khách đi bộ được sinh ở phía xa (bên kia đường), không trên vỉa hè gần (hàng 12).
  {
    console.log('--- Test crosswalk 2b: khách đi bộ sinh ở phía xa (không vỉa hè gần) ---');
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), tileMap, new InputManager());
    const mgr = sim.getCustomerManager();
    const fixtures = sim.getFixtures();
    // Mọi kệ đều có hàng để khách được sinh.
    for (const f of fixtures.filter(isSalesFixture)) {
      f.assignedProductId ??= 'mi_hao_hao';
      f.currentStock = 5;
      f.stockLots = [{ quantity: 5, expiresOnDay: 999, unitCost: 3000, provenance: 'known' }];
    }
    let walkers = 0;
    let farSpawned = 0;
    for (let i = 0; i < 300; i++) {
      const c = new CustomerManager([], i, 0).maybeSpawnCustomer(1, true, fixtures, tileMap, 3, i, undefined, null, 0, false, { hour: 15, weekday: 2 });
      if (!c || c.arrivalMode !== 'walk') continue;
      walkers++;
      // Vị trí sinh phía xa: y >= 480 (bên kia đường), x trong dải vạch.
      if (c.position.y >= 480 && c.position.x >= 256 && c.position.x <= 384) farSpawned++;
    }
    assert.ok(walkers > 0, 'có khách đi bộ được sinh trong lượt thử');
    assert.equal(farSpawned, walkers, 'mọi khách đi bộ đều sinh ở phía xa trong dải vạch, không ở vỉa hè gần');
  }

  // (3) Save/load giữa lúc chờ ở vạch: khách không bị kẹt, tiếp tục qua vạch vào tiệm.
  {
    console.log('--- Test crosswalk 3: save/load lúc khách đang chờ ở vạch ---');
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), tileMap, new InputManager());
    const mgr = sim.getCustomerManager();
    const shelf = sim.getFixtures().find(f => f.id === 'shelf_wooden_noodles')!;
    shelf.assignedProductId = 'mi_hao_hao';
    shelf.currentStock = 3;
    shelf.stockLots = [{ quantity: 3, expiresOnDay: 999, unitCost: 3000, provenance: 'known' }];
    mgr.setStoreFrontPedestrian('dont_walk');
    mgr.addTestCustomer({
      id: 'cw-save',
      position: { x: 320, y: 512 },
      stage: 'crosswalk',
      targetFixtureId: shelf.id,
      checkoutId: 'cw-save-chk',
      arrivalMode: 'walk',
      crosswalk: { leaving: false, phase: 'wait' },
      patience: 9999,
      checkoutWait: 5,
      basket: [],
    });
    // Chạy vài khung với đèn đỏ để khách đang trong trạng thái chờ.
    mgr.update(0.2, true, 1, tileMap, sim.getFixtures(), [], undefined, undefined, undefined, undefined, undefined, undefined, 1);

    // Export save → tạo sim mới → import.
    const exported = sim.exportSaveData('cw-save', 1);
    const loaded = new GameSimulation(exported, tileMap, new InputManager());
    const loadedMgr = loaded.getCustomerManager();
    const restored = loadedMgr.getCustomers().find(x => x.id === 'cw-save');
    assert.ok(restored, 'save/load giữ khách đang chờ ở vạch');
    assert.equal(restored!.stage, 'crosswalk', 'khách khôi phục đúng stage vạch sau load');
    assert.equal(restored!.crosswalk?.phase, 'wait', 'khách khôi phục đúng pha chờ sau load');

    // Đèn xanh → khách tiếp tục qua vạch và vào tiệm (không kẹt).
    loadedMgr.setStoreFrontPedestrian('walk', 120);
    let reachedStore = false;
    const completed = new Set<string>();
    let guard = 0;
    while (loadedMgr.getCustomers().some(x => x.id === 'cw-save') && guard++ < 8000) {
      loadedMgr.update(0.1, true, 1, tileMap, loaded.getFixtures(), [], undefined, undefined, undefined, undefined, undefined, undefined, 1);
      const c = loadedMgr.getCustomers().find(x => x.id === 'cw-save');
      if (!c) break;
      if (c.stage === 'checkout') loadedMgr.completeCheckout(c.checkoutId, completed, tileMap, loaded.getFixtures());
      if (c.stage === 'to_checkout' || c.stage === 'checkout') { reachedStore = true; break; }
    }
    assert.ok(reachedStore, 'sau save/load khách tiếp tục qua vạch và vào tiệm, không bị kẹt/trapped');
  }
}
