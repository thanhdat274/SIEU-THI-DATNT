import {
  isSalesFixture,
  SaveGameData,
} from '@game/shared';
import { PRODUCT_MAP, generateStarterTileMap, DEFAULT_INITIAL_SAVE } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
  console.log(`  ✓ Passed: ${message}`);
}

export function runCustomerTests(): void {
  console.log('\n--- Test Group 2: Khách hàng, Giỏ hàng & Thu ngân ---');

  const tileMap = generateStarterTileMap();

  // Test 2.1: Hai khách cùng nhặt món cuối, giá giỏ khóa chặt, đường đi đến kệ/quầy
  {
    console.log('--- Test 2.1: Hai khách nhặt món cuối & khóa giá giỏ ---');
    const save: SaveGameData = structuredClone(DEFAULT_INITIAL_SAVE);
    const shelfInit = save.storeLayout.fixtures.find((f) => f.id === 'shelf_wooden_noodles')!;
    shelfInit.currentStock = 1;
    shelfInit.stockLots = [{ quantity: 1, expiresOnDay: 10 }];

    const sim = new GameSimulation(save, tileMap, new InputManager());
    const mgr = sim.getCustomerManager();

    // Add Customer 1 and Customer 2 heading to noodle shelf
    mgr.addTestCustomer({
      id: 'cust-1',
      position: { x: 9 * 32, y: 7 * 32 }, // right at shelf
      stage: 'to_shelf',
      targetFixtureId: 'shelf_wooden_noodles',
      checkoutId: 'chk-1',
      patience: 30,
      checkoutWait: 5,
      basket: [],
    });
    mgr.addTestCustomer({
      id: 'cust-2',
      position: { x: 9 * 32, y: 7 * 32 }, // also at shelf
      stage: 'to_shelf',
      targetFixtureId: 'shelf_wooden_noodles',
      checkoutId: 'chk-2',
      patience: 30,
      checkoutWait: 5,
      basket: [],
    });

    // Run 1 frame of update to process arrival at shelf
    sim.update(0.016);

    const customers = sim.getCustomers();
    const c1 = customers.find((c) => c.id === 'cust-1');
    const c2 = customers.find((c) => c.id === 'cust-2');
    const liveShelf = sim.getFixtures().find((f) => f.id === 'shelf_wooden_noodles')!;

    assert(!!c1 && (c1.basket?.length ?? 0) === 1, 'Khách 1 nhặt được món cuối vào giỏ');
    assert(c1!.basket![0].unitPrice === PRODUCT_MAP['mi_hao_hao'].baseSellingPrice, 'Giá giỏ hàng được khóa theo giá lúc nhặt');
    assert(liveShelf.currentStock === 0, 'Kệ hết hàng ngay sau khi khách nhặt vào giỏ (không còn ghost stock)');
    assert(!!c2 && c2.stage === 'leaving', 'Khách 2 đến kệ thấy hết hàng thì tự rời đi không văng lỗi');
  }

  // Test 2.2: Không khách không bán, replay thanh toán idempotent
  {
    console.log('--- Test 2.2: Không khách không bán & Replay thanh toán ---');
    const save: SaveGameData = structuredClone(DEFAULT_INITIAL_SAVE);
    const sim = new GameSimulation(save, tileMap, new InputManager());

    // 1. No customer at checkout
    assert(!sim.checkoutShelf('shelf_wooden_noodles'), 'Không có khách ở quầy: từ chối thanh toán');
    assert(!sim.completeCustomerCheckout('non-existent-id'), 'ID thanh toán lạ: từ chối thanh toán');

    // 2. Put customer at checkout
    const initialMoney = sim.getPlayerData().money;
    const initialXP = sim.getPlayerData().experience;
    const unitPrice = PRODUCT_MAP['mi_hao_hao'].baseSellingPrice;

    sim.getCustomerManager().addTestCustomer({
      id: 'cust-checkout',
      position: { x: 9 * 32, y: 8 * 32 },
      stage: 'checkout',
      targetFixtureId: 'shelf_wooden_noodles',
      checkoutId: 'receipt-101',
      basket: [
        {
          productId: 'mi_hao_hao',
          quantity: 2,
          unitPrice,
          lots: [{ quantity: 2, expiresOnDay: 15 }],
        },
      ],
      patience: 30,
      checkoutWait: 10,
    });

    // 3. Valid checkout
    const checkoutSuccess = sim.checkoutShelf();
    assert(checkoutSuccess, 'Thanh toán thành công khi có khách tại quầy');
    assert(sim.getPlayerData().money === initialMoney + unitPrice * 2, 'Tiền tăng đúng 2 món trong giỏ');
    assert(sim.getPlayerData().experience === initialXP + 10, 'XP tăng đúng số món bán được');
    assert(sim.getStatistics().totalCustomersServed === 1, 'Thống kê khách phục vụ tăng 1');

    // 4. Replay payment
    const replaySuccess = sim.completeCustomerCheckout('receipt-101');
    assert(replaySuccess, 'Replay receipt trả về thành công an toàn');
    assert(sim.getPlayerData().money === initialMoney + unitPrice * 2, 'Replay không cộng tiền lần hai');
    assert(sim.getPlayerData().experience === initialXP + 10, 'Replay không nhân đôi kinh nghiệm');
  }

  // Test 2.3: Bỏ về / đóng cửa / bảo toàn tổng kho+kệ+giỏ+bán+hỏng
  {
    console.log('--- Test 2.3: Bảo toàn số lượng hàng (kho + kệ + giỏ + bán + hỏng) ---');
    const save: SaveGameData = structuredClone(DEFAULT_INITIAL_SAVE);
    const sim = new GameSimulation(save, tileMap, new InputManager());

    const countAllUnits = (): number => {
      const invCount = sim.getInventory().reduce((sum, item) => sum + item.quantity, 0);
      const shelfCount = sim.getFixtures().reduce((sum, f) => sum + (isSalesFixture(f) ? f.currentStock : 0), 0);
      const basketCount = sim.getCustomers().reduce(
        (sum, c) => sum + (c.basket?.reduce((bSum, b) => bSum + b.quantity, 0) ?? 0),
        0
      );
      const spoiledCount = sim.getStatistics().totalSpoiled ?? 0;
      // In this test we keep track of initial baseline
      return invCount + shelfCount + basketCount + spoiledCount;
    };

    const initialTotal = countAllUnits();

    // Give customer 1 unexpired lot and 1 lot expiring today (day 1)
    sim.getCustomerManager().addTestCustomer({
      id: 'cust-abandon',
      position: { x: 9 * 32, y: 8 * 32 },
      stage: 'to_checkout',
      targetFixtureId: 'shelf_wooden_noodles',
      checkoutId: 'chk-abandon',
      basket: [
        {
          productId: 'mi_hao_hao',
          quantity: 2,
          unitPrice: 4500,
          lots: [
            { quantity: 1, expiresOnDay: 10 }, // unexpired -> should return to shelf/inventory
            { quantity: 1, expiresOnDay: 1 },  // expired today -> should be marked spoiled
          ],
        },
      ],
      patience: 0.1, // about to expire
      checkoutWait: 5,
    });

    // Add customer to baseline
    const totalWithCustomer = countAllUnits();
    assert(totalWithCustomer === initialTotal + 2, 'Giỏ hàng khách được tính vào tổng lượng hàng trong hệ thống');

    // Update 1 second to trigger patience timeout
    sim.update(1.0);

    const postAbandonTotal = countAllUnits();
    assert(postAbandonTotal === totalWithCustomer, 'Phương trình bảo toàn tổng hàng (kho + kệ + giỏ + hỏng) luôn khớp sau khi khách bỏ về');
    assert((sim.getStatistics().totalSpoiled ?? 0) >= 1, 'Món hết hạn trong giỏ bị bỏ lại được ghi nhận vào hàng hỏng');
  }

  // Test 2.4: Migrate customer schema 2 không có giỏ & save/reload queue
  {
    console.log('--- Test 2.4: Migrate khách không giỏ & Lưu/Tải hàng đợi ---');
    const legacySave: SaveGameData = structuredClone(DEFAULT_INITIAL_SAVE);
    // Customer at checkout without basket
    legacySave.customer = {
      position: { x: 9 * 32, y: 8 * 32 },
      stage: 'checkout',
      targetFixtureId: 'shelf_wooden_noodles',
      checkoutId: 'legacy-chk-99',
      reservedProductId: 'mi_hao_hao',
      patience: 30,
      checkoutWait: 10,
    };
    delete (legacySave as any).customers;

    const migratedSim = new GameSimulation(legacySave, tileMap, new InputManager());
    const initialCust = migratedSim.getCustomer();
    assert(!!initialCust, 'Khách cũ được tải vào bộ quản lý khách');
    assert(initialCust?.reservedProductId === 'mi_hao_hao', 'Giữ đúng món khách đã nhắm');

    // Export save and reload to verify queue & customers persistence
    const exportedSave = migratedSim.exportSaveData('test-queue-save', 2);
    assert(Array.isArray(exportedSave.customers), 'Save xuất ra mảng danh sách khách customers');
    assert(exportedSave.customers!.length >= 1, 'Lưu trữ đủ số khách đang có');

    const reloadedSim = new GameSimulation(exportedSave, tileMap, new InputManager());
    const reloadedCust = reloadedSim.getCustomer();
    assert(reloadedCust?.checkoutId === 'legacy-chk-99', 'Khách hàng đợi giữ nguyên ID sau save/reload');

    // Complete checkout on migrated customer
    const completed = reloadedSim.completeCustomerCheckout('legacy-chk-99');
    assert(completed, 'Hoàn tất thanh toán cho khách legacy');
    assert(reloadedSim.completeCustomerCheckout('legacy-chk-99'), 'Replay thanh toán khách legacy an toàn');
  }
}
