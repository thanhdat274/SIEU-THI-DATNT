import {
  isSalesFixture,
  SaveGameData,
  type CustomerState,
  type StoreFixture,
} from '@game/shared';
import { PRODUCT_MAP, generateStarterTileMap, DEFAULT_INITIAL_SAVE, BUILDING_MAP, STREET_PARKING_SPOTS } from '@game/data';
import { CustomerManager } from './customers';
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
    const afterSale = reloadedSim.getCustomers().find((c) => c.checkoutId === 'legacy-chk-99');
    assert(afterSale?.stage === 'leaving' && afterSale.reservedProductId === undefined, 'Khách luồng cũ thanh toán xong là khách thật đã bỏ đặt chỗ và đang rời quầy (không chỉ bản sao)');
  }

  // Test 2.x: Tính lại đường đi phải tác động lên khách thật, không phải bản sao
  {
    console.log('--- Test 2.x: rerouteAll tác động lên khách thật ---');
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), tileMap, new InputManager());
    const mgr = sim.getCustomerManager();
    mgr.addTestCustomer({ id: 'reroute-shelf', position: { x: 9 * 32, y: 7 * 32 }, stage: 'to_shelf', targetFixtureId: 'shelf_wooden_noodles', checkoutId: 'chk-r1', patience: 30, checkoutWait: 5, basket: [] });
    mgr.addTestCustomer({ id: 'reroute-checkout', position: { x: 9 * 32, y: 9 * 32 }, stage: 'checkout', targetFixtureId: 'shelf_wooden_noodles', checkoutId: 'chk-r2', patience: 30, checkoutWait: 5, basket: [] });
    mgr.rerouteAll(tileMap, []); // kệ đích không còn trong bố cục: khách đang tới kệ không có đường nên phải bỏ đi
    const live = mgr.getCustomers();
    assert(live.find((c) => c.id === 'reroute-shelf')?.stage === 'leaving', 'Khách đang tới kệ đã mất đích chuyển sang rời đi trên khách thật');
    assert(live.find((c) => c.id === 'reroute-checkout')?.stage === 'checkout', 'Khách đang ở quầy không bị tính lại đường đi');
  }

  // Test 2.p: peekCustomers đọc khách thật không sao chép; getCustomers vẫn là bản sao
  {
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), tileMap, new InputManager());
    const mgr = sim.getCustomerManager();
    mgr.addTestCustomer({ id: 'peek-1', position: { x: 9 * 32, y: 9 * 32 }, stage: 'checkout', targetFixtureId: 'shelf_wooden_noodles', checkoutId: 'chk-p1', patience: 30, checkoutWait: 5, basket: [{ productId: 'mi_hao_hao', quantity: 1, unitPrice: 5000, lots: [] }] });
    assert(sim.peekCustomers() === sim.peekCustomers() && sim.peekCustomers()[0].id === 'peek-1', 'peekCustomers trả danh sách thật, không tạo mảng mới');
    const copy = sim.getCustomers()[0];
    copy.position.x = -999;
    assert(sim.peekCustomers()[0].position.x === 9 * 32, 'Sửa bản sao từ getCustomers không đụng khách thật');
    assert(sim.getShopkeeper().serving && sim.getShopkeeper().checkoutId === 'chk-p1', 'Chủ tiệm vẫn thấy khách chờ ở quầy khi đọc qua peek');
    sim.addMoney(10_000_000);
    sim.addExperience(100_000); // thuê nhân viên cần cấp ≥ 2
    const hired = sim.hireStaff(sim.getStaffCandidates()[0].id);
    const staffCopy = sim.getStaff();
    assert(hired.success && staffCopy.length > 0, `Thuê được nhân viên để thử (${hired.reason ?? 'ok'})`);
    assert(sim.peekStaff() === sim.peekStaff() && sim.peekStaff().length === staffCopy.length, 'peekStaff trả danh sách nhân viên thật, cùng số người với getStaff');
    staffCopy[0].name = 'đã sửa bản sao';
    assert(sim.peekStaff()[0].name !== 'đã sửa bản sao', 'Sửa bản sao từ getStaff không đụng nhân viên thật');
  }

  // Test 2.y: Mép bản đồ bị chặn thì khách rời đi theo đường dự phòng tới cửa, không biến mất tại chỗ
  {
    console.log('--- Test 2.y: Khách rời đi khi lối ra mép bị chặn ---');
    const mgr = new CustomerManager();
    // id kết thúc bằng '0' (mã chẵn) → lối ra ở ô (1, 12); đặt vật cản phủ đúng ô đó.
    const blocker = { id: 'exit_blocker', type: 'decor', tileX: 1, tileY: 12, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0 } as unknown as StoreFixture;
    const customer: CustomerState = { id: 'leave-0', position: { x: 9.5 * 32, y: 8.5 * 32 }, stage: 'leaving', targetFixtureId: 'shelf_wooden_noodles', checkoutId: 'chk-l0', patience: 30, checkoutWait: 5, basket: [] };
    mgr.addTestCustomer(customer);
    mgr.routeCustomer(customer, 'leaving', tileMap, [blocker]);
    assert(mgr.getCustomers().some((c) => c.id === 'leave-0'), 'Khách không bị xóa ngay khi lối ra mép bị chặn');
    const departed: string[] = [];
    let last = { ...customer.position };
    for (let i = 0; i < 600 && mgr.getCustomers().length; i++) {
      last = { ...(mgr.getCustomers()[0]?.position ?? last) };
      mgr.update(1 / 60, true, 1, tileMap, [blocker], [], undefined, undefined, undefined, undefined, undefined, undefined, 1, (c) => departed.push(c.id!));
    }
    const door = BUILDING_MAP.main.entranceTile;
    assert(departed.includes('leave-0'), 'Khách rời đi qua onCustomerDepart (xe đỗ/bộ đếm được xử lý như bình thường)');
    assert(Math.floor(last.x / 32) === door.x && Math.floor(last.y / 32) === door.y, `Khách đi tới cửa tiệm (${door.x}, ${door.y}) rồi mới rời`);
  }

  // Test 2.z: Khách đi xe mà chỗ đỗ bị chặn: tới ô sát xe (hoặc cửa tiệm), rồi xe mới chạy đi; không biến mất tại chỗ
  {
    console.log('--- Test 2.z: Khách đi xe khi chỗ đỗ không tới được ---');
    const spot = STREET_PARKING_SPOTS[0];
    const spotTile = { x: Math.floor(spot.x / 32), y: Math.floor(spot.y / 32) };
    const run = (blockRadius: number) => {
      const mgr = new CustomerManager();
      const blocker = { id: 'spot_blocker', type: 'decor', tileX: spotTile.x - blockRadius, tileY: spotTile.y - blockRadius, widthTiles: blockRadius * 2 + 1, heightTiles: blockRadius * 2 + 1, rotation: 0, currentStock: 0, maxCapacity: 0 } as unknown as StoreFixture;
      const customer: CustomerState = { id: 'ride-0', position: { x: 9.5 * 32, y: 8.5 * 32 }, stage: 'leaving', targetFixtureId: 'shelf_wooden_noodles', checkoutId: 'chk-v0', patience: 30, checkoutWait: 5, basket: [], arrivalMode: 'motorbike', vehicleSpot: { ...spot } };
      mgr.addTestCustomer(customer);
      mgr.routeCustomer(customer, 'leaving', tileMap, [blocker]);
      const kept = mgr.getCustomers().some((c) => c.id === 'ride-0');
      const departed: CustomerState[] = [];
      let last = { ...customer.position };
      for (let i = 0; i < 900 && mgr.getCustomers().length; i++) {
        last = { ...(mgr.getCustomers()[0]?.position ?? last) };
        mgr.update(1 / 60, true, 1, tileMap, [blocker], [], undefined, undefined, undefined, undefined, undefined, undefined, 1, (c) => departed.push(c));
      }
      return { kept, departed, lastTile: { x: Math.floor(last.x / 32), y: Math.floor(last.y / 32) } };
    };
    const nearSpot = run(0);
    assert(nearSpot.kept, 'Chỗ đỗ bị đè: khách không bị xóa ngay');
    assert(nearSpot.departed.length === 1 && !!nearSpot.departed[0].vehicleSpot, 'Rời đi qua onCustomerDepart còn giữ chỗ đỗ (xe chạy đi được)');
    assert(Math.max(Math.abs(nearSpot.lastTile.x - spotTile.x), Math.abs(nearSpot.lastTile.y - spotTile.y)) <= 2, 'Khách dừng ở ô sát chỗ đỗ (≤ 2 ô)');
    const walledIn = run(2);
    const door = BUILDING_MAP.main.entranceTile;
    assert(walledIn.kept && walledIn.departed.length === 1, 'Cả vùng quanh xe bị chặn: khách vẫn rời qua onCustomerDepart');
    assert(walledIn.lastTile.x === door.x && walledIn.lastTile.y === door.y, 'Cả vùng quanh xe bị chặn: khách về cửa tiệm rồi mới rời');
  }
}
