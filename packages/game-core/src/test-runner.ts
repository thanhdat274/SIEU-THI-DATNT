import { generateStarterTileMap, STARTER_PRODUCTS, PRODUCT_MAP, DEFAULT_INITIAL_SAVE } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { CollisionSystem } from './collision';
import { GameClock } from './clock';

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

  console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ ĐỀU ĐẠT CHUẨN!\n');
}

// Execute if run directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('test-runner')) {
  runTests();
}
