import { generateStarterTileMap, STARTER_PRODUCTS, ALL_PRODUCTS, PRODUCT_CATEGORY_LABELS, PRODUCT_MAP, DEFAULT_INITIAL_SAVE } from '@game/data';
import { COLD_WAREHOUSE_CAPACITY } from '@game/shared';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { CollisionSystem } from './collision';
import { GameClock } from './clock';

declare const process: any;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
  console.log(`  ✓ Passed: ${message}`);
}

export function runTests(): void {
  console.log('\n=============================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG (UNIT TESTS)');
  console.log('=============================================\n');

  // Test 1: Starter Data & Products
  console.log('--- Test 1: Dữ liệu khởi tạo & 5 sản phẩm Việt Nam ---');
  assert(STARTER_PRODUCTS.length >= 5, 'Có ít nhất 5 sản phẩm khởi đầu');
  assert(!!PRODUCT_MAP['mi_hao_hao'], 'Có sản phẩm Mì Tôm Hảo Hảo');
  assert(PRODUCT_MAP['mi_hao_hao'].baseSellingPrice > PRODUCT_MAP['mi_hao_hao'].purchasePrice, 'Giá bán Mì Hảo Hảo có lãi');
  assert(!!PRODUCT_MAP['xa_xi_chuong_duong'], 'Có sản phẩm Xá Xị Chương Dương');
  assert(!!PRODUCT_MAP['keo_big_babol'], 'Có sản phẩm Kẹo Big Babol');
  assert(!!PRODUCT_MAP['sua_ong_tho'], 'Có sản phẩm Sữa Đặc Ông Thọ');
  assert(!!PRODUCT_MAP['banh_mi_que'], 'Có sản phẩm Bánh Mì Que');
  assert(ALL_PRODUCTS.length >= 30, 'Danh mục có ít nhất 30 sản phẩm');
  assert(new Set(ALL_PRODUCTS.map((product) => product.id)).size === ALL_PRODUCTS.length, 'Mã sản phẩm không trùng');
  assert(new Set(ALL_PRODUCTS.map((product) => product.category)).size === Object.keys(PRODUCT_CATEGORY_LABELS).length, 'Đủ mười nhóm hàng');

  // Test 2: Map & Collision
  console.log('\n--- Test 2: Bản đồ 8x8 & Hệ thống va chạm ---');
  const tileMap = generateStarterTileMap();
  assert(tileMap.width === 20 && tileMap.height === 16, 'Kích thước ma trận bản đồ chuẩn 20x16');
  const collision = new CollisionSystem(tileMap, DEFAULT_INITIAL_SAVE.storeLayout.fixtures);
  // Outside map is solid
  assert(collision.isColliding({ x: -10, y: 10, width: 20, height: 20 }), 'Không thể đi ra ngoài biên bản đồ');
  // Wall at (6, 3) should be solid
  assert(collision.isColliding({ x: 6 * 32 + 5, y: 3 * 32 + 5, width: 20, height: 20 }), 'Tường tiệm ngăn chặn va chạm');
  // Walkable open area inside shop
  assert(!collision.isColliding({ x: 9 * 32 + 5, y: 8 * 32 + 5, width: 14, height: 10 }), 'Vùng sàn tiệm đi lại bình thường');

  // Test 3: Simulation & Restocking
  console.log('\n--- Test 3: Mô phỏng tiệm & Bày hàng lên kệ ---');
  const input = new InputManager();
  const sim = new GameSimulation(DEFAULT_INITIAL_SAVE, tileMap, input);

  const initialHaoHaoInInventory = sim.getInventory().find(i => i.productId === 'mi_hao_hao')?.quantity || 0;
  assert(initialHaoHaoInInventory > 0, 'Túi đồ ban đầu có sẵn Mì Hảo Hảo');

  const shelf1 = sim.getFixtures().find(f => f.id === 'shelf_wooden_noodles')!;
  const initialStock = shelf1.currentStock;

  // Restock 2 packets
  const restockSuccess = sim.restockShelf('shelf_wooden_noodles', 'mi_hao_hao', 2);
  assert(restockSuccess, 'Bày thành công 2 gói mì lên kệ');
  assert(shelf1.currentStock === initialStock + 2, 'Số lượng trên kệ tăng đúng 2 đơn vị');

  const afterHaoHaoInInventory = sim.getInventory().find(i => i.productId === 'mi_hao_hao')?.quantity || 0;
  assert(afterHaoHaoInInventory === initialHaoHaoInInventory - 2, 'Số lượng trong túi đồ giảm đúng 2 đơn vị');

  // Unstock 1 packet
  const unstockSuccess = sim.unstockShelf('shelf_wooden_noodles', 1);
  assert(unstockSuccess, 'Cất thành công 1 gói mì từ kệ vào lại túi');
  assert(shelf1.currentStock === initialStock + 1, 'Số lượng trên kệ giảm đúng 1 đơn vị');

  // Test 4: Clock & Time Progression
  console.log('\n--- Test 4: Đồng hồ & Chu kỳ thời gian ---');
  const clock = new GameClock({
    day: 1,
    hour: 7,
    minute: 0,
    isStoreOpen: true,
    timeScale: 60,
  });

  assert(clock.formatTimeString() === '07:00', 'Định dạng giờ ban đầu chuẩn 07:00');
  // Update 1 real second (= 1 game minute)
  clock.update(1.0);
  assert(clock.formatTimeString() === '07:01', 'Đồng hồ tăng 1 phút sau 1 giây đời thực');

  // Advance day
  clock.advanceToNextDay();
  assert(clock.getTime().day === 2, 'Chuyển sang Ngày 2');
  assert(clock.formatTimeString() === '07:00', 'Ngày mới bắt đầu lúc 07:00');

  // Test 5: Save & Restore Data Integrity
  console.log('\n--- Test 5: Xuất nhập dữ liệu lưu game ---');
  const exported = sim.exportSaveData('test_save_id', 1);
  assert(exported.id === 'test_save_id', 'ID bản lưu khớp');
  assert(exported.revision === 2, 'Revision tăng dần');
  assert(exported.inventory.length > 0, 'Dữ liệu túi đồ được lưu trọn vẹn');

  // Test 6: supplier orders must affect money, delivery, shelf stock, and saves.
  console.log('\n--- Test 6: Đặt hàng nhà phân phối & giao kho ---');
  const beforeMoney = sim.getPlayerData().money;
  assert(!sim.orderFromSupplier('mi_hao_hao', 0), 'Không chấp nhận số lượng bằng không');
  assert(!sim.orderFromSupplier('mi_hao_hao', 1000000), 'Không cho đặt quá số tiền đang có');
  assert(sim.orderFromSupplier('mi_hao_hao', 3), 'Đặt được ba gói mì');
  assert(sim.getPlayerData().money === beforeMoney - PRODUCT_MAP['mi_hao_hao'].purchasePrice * 3, 'Tiền giảm theo giá nhập');
  assert(sim.getPendingOrders().length === 1, 'Đơn hàng chờ giao được ghi nhận');
  const orderedSave = sim.exportSaveData('test_save_id', 2);
  const resumed = new GameSimulation(orderedSave, tileMap, input);
  assert(resumed.getPendingOrders().length === 1, 'Đơn hàng còn nguyên sau khi tải game');
  const beforeDelivery = resumed.getInventory().find((item) => item.productId === 'mi_hao_hao')?.quantity ?? 0;
  resumed.getClock().advanceToNextDay();
  assert(resumed.getPendingOrders().length === 0, 'Đơn đã giao được gỡ khỏi danh sách chờ');
  assert((resumed.getInventory().find((item) => item.productId === 'mi_hao_hao')?.quantity ?? 0) === beforeDelivery + 3, 'Hàng được chuyển vào kho sáng hôm sau');
  assert(!resumed.restockShelf('cashier_counter_wood', 'mi_hao_hao', 1), 'Không thể bày hàng trên bàn thu ngân');

  // Test 7: checkout updates the same state that is saved and loaded.
  console.log('\n--- Test 7: Bán hàng tại quầy ---');
  const saleMoney = resumed.getPlayerData().money;
  const saleStock = resumed.getFixtures().find((fixture) => fixture.id === 'shelf_wooden_noodles')!.currentStock;
  assert(resumed.checkoutShelf('shelf_wooden_noodles'), 'Bán được hàng đang nằm trên kệ');
  assert(resumed.getPlayerData().money === saleMoney + PRODUCT_MAP['mi_hao_hao'].baseSellingPrice, 'Tiền tăng đúng giá bán');
  assert(resumed.getFixtures().find((fixture) => fixture.id === 'shelf_wooden_noodles')!.currentStock === saleStock - 1, 'Tồn kệ giảm đúng một');
  assert(resumed.getStatistics().totalCustomersServed === 1, 'Thống kê bán hàng tăng');
  const afterSale = new GameSimulation(resumed.exportSaveData('test_save_id', 3), tileMap, input);
  assert(afterSale.getStatistics().totalRevenue === PRODUCT_MAP['mi_hao_hao'].baseSellingPrice, 'Doanh thu được khôi phục từ bản lưu');
  afterSale.getClock().toggleStoreStatus();
  assert(!afterSale.checkoutShelf('shelf_wooden_noodles'), 'Không thể bán khi tiệm đóng cửa');

  console.log('\n--- Test 8: Bản lưu cũ, lô hàng và hạn dùng ---');
  const legacySave = structuredClone(DEFAULT_INITIAL_SAVE);
  legacySave.schemaVersion = 1;
  legacySave.storeLayout.fixtures = legacySave.storeLayout.fixtures.filter((fixture) => fixture.type !== 'refrigerator');
  const migrated = new GameSimulation(legacySave, tileMap, input);
  assert(migrated.getFixtures().some((fixture) => fixture.type === 'refrigerator'), 'Bản lưu cũ được bổ sung tủ mát');
  assert(migrated.getInventory().every((item) => item.lots?.length), 'Hàng trong bản lưu cũ được gắn hạn dùng');
  assert(migrated.exportSaveData('test_save_id', 4).schemaVersion === 2, 'Bản lưu mới dùng schema version 2');
  assert(migrated.unstockShelf('shelf_wooden_noodles', 12), 'Cất mì để giải phóng kệ');
  assert(migrated.restockShelf('shelf_wooden_noodles', 'banh_mi_que', 3), 'Bày bánh mì lên kệ');
  const breadExpiry = migrated.getFixtures().find((fixture) => fixture.id === 'shelf_wooden_noodles')!.stockLots?.[0].expiresOnDay;
  assert(breadExpiry === 3, 'Lô bánh mì giữ ngày hết hạn khi chuyển lên kệ');
  migrated.getClock().advanceToNextDay();
  assert(migrated.getInventory().some((item) => item.productId === 'banh_mi_que'), 'Bánh mì vẫn còn trước ngày hết hạn');
  migrated.getClock().advanceToNextDay();
  assert(!migrated.getInventory().some((item) => item.productId === 'banh_mi_que'), 'Bánh mì quá hạn bị loại khỏi kho');
  assert(migrated.getFixtures().find((fixture) => fixture.id === 'shelf_wooden_noodles')!.currentStock === 0, 'Bánh mì quá hạn bị loại khỏi kệ');
  assert(migrated.getStatistics().totalSpoiled === 8, 'Số hàng hỏng được thống kê đúng');

  console.log('\n--- Test 9: Bảo quản lạnh và giới hạn kho mát ---');
  const richSave = structuredClone(DEFAULT_INITIAL_SAVE);
  richSave.player.money = 1_000_000;
  const coldSim = new GameSimulation(richSave, tileMap, input);
  assert(!coldSim.orderFromSupplier('sua_chua', COLD_WAREHOUSE_CAPACITY + 1), 'Không nhận đơn lạnh vượt sức chứa kho');
  assert(coldSim.orderFromSupplier('sua_chua', COLD_WAREHOUSE_CAPACITY), 'Đặt được hàng lạnh vừa sức chứa');
  coldSim.getClock().advanceToNextDay();
  assert(coldSim.getColdWarehouseCount() === COLD_WAREHOUSE_CAPACITY, 'Hàng lạnh được giao vào kho mát');
  assert(!coldSim.restockShelf('shelf_wooden_drinks', 'sua_chua', 1), 'Không thể bày hàng lạnh trên kệ thường');
  assert(coldSim.restockShelf('refrigerator_small', 'sua_chua', 5), 'Bày hàng lạnh vào tủ mát');
  assert(coldSim.getColdWarehouseCount() === COLD_WAREHOUSE_CAPACITY - 5, 'Kho mát giảm khi bày hàng');
  assert(coldSim.orderFromSupplier('sua_chua', 5), 'Có thể đặt thêm khi kho vừa trống');
  assert(!coldSim.unstockShelf('refrigerator_small', 1), 'Không thể cất ngược khi kho mát đã được giữ chỗ');
  const coldResumed = new GameSimulation(coldSim.exportSaveData('test_save_id', 5), tileMap, input);
  assert(coldResumed.getFixtures().find((fixture) => fixture.id === 'refrigerator_small')!.currentStock === 5, 'Tủ mát được khôi phục sau khi tải game');

  console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ ĐỀU ĐẠT CHUẨN!\n');
}

// Execute if run directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('test-runner')) {
  runTests();
}
