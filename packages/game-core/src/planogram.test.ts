import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, PRODUCT_MAP } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { sumLots } from './stock';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
  console.log(`  ✓ Passed: ${message}`);
}

export function runPlanogramTests(): void {
  console.log('\n--- Test Group 5: B — Sơ đồ bày kệ (Planogram) ---');

  // Test 5.1: Planogram save/reload & validation
  console.log('--- Test 5.1: Lưu/Tải sơ đồ kệ & Kiểm tra tính hợp lệ ---');
  const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());

  // 1. Gán kệ hợp lệ
  const assignNoodles = sim.setPlanogramAssignment('shelf_wooden_noodles', 'mi_hao_hao');
  assert(assignNoodles.success, 'Gán mì hảo hảo vào kệ gỗ thành công');

  const assignDrinks = sim.setPlanogramAssignment('shelf_wooden_drinks', 'xa_xi_chuong_duong');
  assert(assignDrinks.success, 'Gán xá xị vào kệ nước thành công');

  const assignFridge = sim.setPlanogramAssignment('refrigerator_small', 'sua_chua');
  assert(assignFridge.success, 'Gán sữa chua vào tủ mát thành công');

  const plan = sim.getPlanogram();
  assert(plan['shelf_wooden_noodles'] === 'mi_hao_hao', 'Sơ đồ lưu đúng mì hảo hảo');
  assert(plan['shelf_wooden_drinks'] === 'xa_xi_chuong_duong', 'Sơ đồ lưu đúng xá xị');
  assert(plan['refrigerator_small'] === 'sua_chua', 'Sơ đồ lưu đúng sữa chua');

  // 2. Kệ không tồn tại
  const invalidFixture = sim.setPlanogramAssignment('shelf_phantom_99', 'mi_hao_hao');
  assert(!invalidFixture.success && invalidFixture.reason === 'fixture_not_found', 'Từ chối gán kệ không tồn tại');

  // 3. Kệ không phải sales fixture (quầy thu ngân)
  const cashierAssign = sim.setPlanogramAssignment('cashier_counter_wood', 'mi_hao_hao');
  assert(!cashierAssign.success && cashierAssign.reason === 'not_sales_fixture', 'Từ chối gán bàn thu ngân vào sơ đồ kệ');

  // 4. Sản phẩm không tồn tại
  const invalidProd = sim.setPlanogramAssignment('shelf_wooden_noodles', 'sp_khong_ton_tai');
  assert(!invalidProd.success && invalidProd.reason === 'invalid_product', 'Từ chối gán mã sản phẩm không tồn tại');

  // 5. Sai điều kiện bảo quản (storage type mismatch)
  const ambientToCold = sim.setPlanogramAssignment('refrigerator_small', 'mi_hao_hao');
  assert(!ambientToCold.success && ambientToCold.reason === 'storage_type_mismatch', 'Từ chối gán hàng khô vào tủ mát');

  const coldToAmbient = sim.setPlanogramAssignment('shelf_wooden_noodles', 'sua_chua');
  assert(!coldToAmbient.success && coldToAmbient.reason === 'storage_type_mismatch', 'Từ chối gán hàng mát vào kệ thường');

  // 6. Lưu và tải lại bản lưu giữ trọn vẹn sơ đồ
  const exported = sim.exportSaveData('save_planogram_test', 1);
  assert(!!exported.planogram && exported.planogram['shelf_wooden_noodles'] === 'mi_hao_hao', 'Bản lưu xuất ra chứa sơ đồ kệ');

  const reloadedSim = new GameSimulation(exported, generateStarterTileMap(), new InputManager());
  const reloadedPlan = reloadedSim.getPlanogram();
  assert(reloadedPlan['shelf_wooden_noodles'] === 'mi_hao_hao', 'Tải lại bản lưu giữ nguyên sơ đồ mì');
  assert(reloadedPlan['refrigerator_small'] === 'sua_chua', 'Tải lại bản lưu giữ nguyên sơ đồ tủ mát');

  // 7. Kệ bị xoá trong layout khi tải lại vẫn bỏ qua an toàn
  const deletedFixtureSim = new GameSimulation(
    {
      ...exported,
      storeLayout: {
        ...exported.storeLayout,
        fixtures: exported.storeLayout.fixtures.filter((f) => f.id !== 'shelf_wooden_drinks'),
      },
    },
    generateStarterTileMap(),
    new InputManager()
  );
  const deletedRes = deletedFixtureSim.applyPlanogramEntry('shelf_wooden_drinks');
  assert(!deletedRes.applied && deletedRes.reason === 'fixture_not_found', 'Kệ bị xoá trong layout được bỏ qua có lý do');

  // Test 5.2: Apply planogram, protect occupied shelf, FEFO preservation, batch accounting
  console.log('\n--- Test 5.2: Áp dụng sơ đồ kệ, Bảo vệ kệ đang có hàng & Giữ chuẩn FEFO ---');
  const sim2 = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());

  // Kệ noodles đang có sẵn 12 gói mì hảo hảo
  const noodleFixture = sim2.getFixtures().find((f) => f.id === 'shelf_wooden_noodles')!;
  assert(noodleFixture.currentStock > 0 && noodleFixture.assignedProductId === 'mi_hao_hao', 'Kệ mì ban đầu có hàng');
  const originalLots = structuredClone(noodleFixture.stockLots!);

  // Chỉ định sơ đồ món khác: 'banh_mi_que' vào kệ mì
  sim2.setPlanogramAssignment('shelf_wooden_noodles', 'banh_mi_que');

  // Áp dụng sơ đồ vào kệ này: SHALL NOT replace occupied shelf!
  const mismatchRes = sim2.applyPlanogramEntry('shelf_wooden_noodles');
  assert(!mismatchRes.applied && mismatchRes.reason === 'product_mismatch', 'Kệ đang còn hàng món khác -> từ chối thay món');
  assert(noodleFixture.assignedProductId === 'mi_hao_hao', 'Món trên kệ giữ nguyên vẹn không bị đổi');
  assert(noodleFixture.currentStock === 12, 'Số lượng trên kệ giữ nguyên 12 món');
  assert(sumLots(noodleFixture.stockLots!) === sumLots(originalLots), 'Các lô hàng trên kệ không bị thất thoát');

  // Cất hết mì để kệ trống hoàn toàn
  sim2.unstockShelf('shelf_wooden_noodles', 12);
  assert(noodleFixture.currentStock === 0, 'Kệ mì đã được dọn trống');

  // Giờ áp dụng sơ đồ 'banh_mi_que': kệ trống chấp nhận sản phẩm mới từ sơ đồ!
  const emptyShelfApply = sim2.applyPlanogramEntry('shelf_wooden_noodles');
  assert(emptyShelfApply.applied && emptyShelfApply.reason === 'success', 'Kệ trống nhận sản phẩm mới từ sơ đồ thành công');
  assert(noodleFixture.assignedProductId === 'banh_mi_que', 'Kệ đã được gán sản phẩm mới bánh mì que');
  assert(emptyShelfApply.actualQuantity > 0, 'Số lượng được châm lên kệ lớn hơn 0');
  assert(noodleFixture.currentStock === emptyShelfApply.actualQuantity, 'Tồn trên kệ bằng đúng số lượng đã chuyển');

  // Kiểm tra FEFO: các lô trên kệ được châm theo thứ tự hạn dùng gần nhất trước
  const shelfLots = noodleFixture.stockLots!;
  for (let i = 0; i < shelfLots.length - 1; i++) {
    assert(shelfLots[i].expiresOnDay <= shelfLots[i + 1].expiresOnDay, 'Hàng châm lên kệ bảo đảm chuẩn FEFO hạn gần trước');
  }

  // Batch planogram & Bảo toàn tổng lượng hàng giảm kho = sum actualQuantity
  console.log('\n--- Kiểm tra batch planogram & Giảm kho bằng tổng actualQuantity ---');
  const sim3 = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
  // Đặt sơ đồ cho các kệ
  sim3.setPlanogram({
    shelf_wooden_noodles: 'mi_hao_hao',
    shelf_wooden_drinks: 'xa_xi_chuong_duong',
  });

  const totalInvBefore = sim3.getInventory().reduce((sum, item) => sum + item.quantity, 0);
  const batchRes = sim3.applyPlanogram();
  const totalInvAfter = sim3.getInventory().reduce((sum, item) => sum + item.quantity, 0);

  const sumActual = batchRes.results.reduce((sum, r) => sum + r.actualQuantity, 0);
  assert(batchRes.totalRefilled === sumActual, 'totalRefilled bằng đúng tổng actualQuantity từng kệ');
  assert(totalInvBefore - totalInvAfter === sumActual, 'Tổng kho giảm bằng đúng tổng hàng châm lên các kệ');

  // Test 5.3: Future employee restock job targets API
  console.log('\n--- Test 5.3: API mục tiêu công việc châm kệ (Job Targets API) ---');
  const targets = sim3.getRestockJobTargets();
  // Kệ đã đầy thì không tạo target
  for (const t of targets) {
    assert(t.needed > 0, 'Mỗi target châm kệ đều cần số lượng lớn hơn 0');
    assert(t.currentStock < t.maxCapacity, 'Kệ mục tiêu chưa đạt mức tối đa');
    assert(PRODUCT_MAP[t.productId].storageType !== 'cold' || t.fixtureId === 'refrigerator_small', 'Target tương thích điều kiện bảo quản');
  }

  // Test 9.1: Exclusive job claim and pre-commit revalidation.
  const jobSave = structuredClone(DEFAULT_INITIAL_SAVE);
  jobSave.staff = [{
    id: 'refiller-1', name: 'Anh Tuấn', role: 'refill', speed: 6, accuracy: 5, stamina: 7,
    dailyWage: 30000, hiredOnDay: 1, shift: 'full_day',
  }];
  const jobSim = new GameSimulation(jobSave, generateStarterTileMap(), new InputManager());
  jobSim.setPlanogramAssignment('shelf_wooden_noodles', 'mi_hao_hao');
  const jobTarget = jobSim.getRestockJobTargets()[0];
  assert(!!jobTarget, 'Có target hợp lệ để claim');
  assert(jobSim.claimRestockJob('player', jobTarget.fixtureId).claimed, 'Người chơi claim target thành công');
  assert(jobSim.claimRestockJob('refiller-1', jobTarget.fixtureId).reason === 'target_claimed', 'Nhân viên không thể giành target đang được người chơi giữ');
  assert(jobSim.revalidateRestockJob('player', jobTarget.fixtureId).valid, 'Target được revalidate trước commit');
  assert(jobSim.releaseRestockJob('player', jobTarget.fixtureId), 'Actor có thể nhả claim của mình');
  assert(jobSim.claimRestockJob('refiller-1', jobTarget.fixtureId).claimed, 'Nhân viên claim được sau khi target được nhả');

  const endedShiftTime = jobSim.getTime();
  endedShiftTime.hour = 22;
  jobSim.getClock().setTime(endedShiftTime);
  assert(jobSim.revalidateRestockJob('refiller-1', jobTarget.fixtureId).reason === 'actor_unavailable', 'Hết ca thì revalidate nhả claim');
  assert(jobSim.claimRestockJob('player', jobTarget.fixtureId).claimed, 'Claim không bị treo sau khi nhân viên hết ca');

  const lostTargetTime = jobSim.getTime();
  lostTargetTime.hour = 7;
  jobSim.getClock().setTime(lostTargetTime);
  jobSim.applyPlanogramEntry(jobTarget.fixtureId);
  assert(jobSim.revalidateRestockJob('player', jobTarget.fixtureId).reason === 'target_invalid', 'Target đầy giữa lượt bị từ chối khi revalidate');
  const reloadedJobs = new GameSimulation(jobSim.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert(!reloadedJobs.revalidateRestockJob('player', jobTarget.fixtureId).valid, 'Reload không khôi phục claim cũ');

  // Thao tác thủ công qua transferToShelf và restockShelf vẫn hoạt động độc lập không cần nhân viên
  const manualSim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
  const manualTransfer = manualSim.transferToShelf('shelf_wooden_noodles', 'mi_hao_hao', 2);
  assert(manualTransfer.success, 'Thao tác tay châm hàng vẫn hoạt động độc lập bình thường');

  console.log('🎉 TOÀN BỘ KIỂM THỬ NHÓM 5 ĐẠT CHUẨN!\n');
}
