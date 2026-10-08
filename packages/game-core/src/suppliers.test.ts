import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, PRODUCT_MAP, SUPPLIERS, SUPPLIER_MAP } from '@game/data';
import { COLD_WAREHOUSE_CAPACITY, SaveGameData, isSalesFixture, type StockLot } from '@game/shared';
import { InputManager } from './input';
import { looseUnits, mergeLots, sealedCases, sumLots, takeLots } from './stock';
import { GameSimulation } from './simulation';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
  console.log(`  ✓ Passed: ${message}`);
}

export function runSupplierTests(): void {
  console.log('\n--- Test Group 4: B — Mối nhập và hàng chờ ---');

  // Test 4.1: Supplier configs & legacy supplier preservation
  console.log('--- Test 4.1: Cấu hình nhà cung cấp & Mối quen legacy ---');
  assert(SUPPLIERS.length === 3, 'Có 3 nhà cung cấp (đại lý đầu hẻm, chợ đầu mối, hỏa tốc)');
  const legacySup = SUPPLIER_MAP['dai_ly_dau_hem'];
  assert(!!legacySup, 'Có mối quen legacy dai_ly_dau_hem');
  assert(legacySup.unlockLevel === 1, 'Mối quen mở khóa ngay từ cấp 1');
  assert(legacySup.discountRate === 0, 'Mối quen có chiết khấu 0% (giá chuẩn)');
  assert(legacySup.minOrderValue === 0, 'Mối quen không yêu cầu giá trị đơn tối thiểu');
  assert(legacySup.delayDays === 1, 'Mối quen giao vào sáng hôm sau (delay 1 ngày)');

  const wholesaleSup = SUPPLIER_MAP['cho_dau_moi'];
  assert(!!wholesaleSup, 'Có mối chợ đầu mối');
  assert(wholesaleSup.discountRate === 0.10, 'Chợ đầu mối chiết khấu 10%');
  assert(wholesaleSup.minOrderValue === 100000, 'Chợ đầu mối yêu cầu đơn tối thiểu 100.000 ₫');

  const expressSup = SUPPLIER_MAP['giao_hoa_toc'];
  assert(!!expressSup, 'Có mối giao hỏa tốc');
  assert(expressSup.delayDays === 0, 'Giao hỏa tốc nhận ngay trong ngày (delay 0 ngày)');

  // Legacy single-item order maintains exact price and next-day delivery
  const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
  const initialMoney = sim.getPlayerData().money;
  const haoHao = PRODUCT_MAP['mi_hao_hao'];
  assert(sim.orderFromSupplier('mi_hao_hao', 5), 'Đặt 5 gói mì qua hàm legacy thành công');
  assert(sim.getPlayerData().money === initialMoney - haoHao.purchasePrice * 5, 'Tiền trừ đúng giá sỉ chuẩn');
  const pending = sim.getPendingOrders();
  assert(pending.length === 1, 'Có 1 đơn chờ');
  assert(pending[0].supplierId === 'dai_ly_dau_hem', 'Đơn legacy tự gán mối dai_ly_dau_hem');
  assert(pending[0].unitCost === haoHao.purchasePrice, 'Đơn legacy giữ nguyên đơn giá chuẩn');
  assert(pending[0].arrivalDay === sim.getClock().getTime().day + 1, 'Giao đúng sáng ngày sau');

  // Test 4.2: Atomic cart validation & commit
  console.log('\n--- Test 4.2: Kiểm tra giỏ hàng nguyên tử (Atomic Cart Validation) ---');
  // 1. Giỏ trống
  const emptyRes = sim.validateSupplierCart('dai_ly_dau_hem', []);
  assert(!emptyRes.valid, 'Từ chối giỏ hàng rỗng');

  // 2. Sản phẩm bị khóa cấp độ
  const lockedProd = Object.values(PRODUCT_MAP).find((p) => p.unlockLevel > sim.getPlayerData().level)!;
  const lockedCart = sim.validateSupplierCart('dai_ly_dau_hem', [
    { productId: 'mi_hao_hao', quantity: 2 },
    { productId: lockedProd.id, quantity: 2 },
  ]);
  assert(!lockedCart.valid, 'Giỏ có 1 món bị khóa cấp -> từ chối cả giỏ');

  // 3. Thiếu tiền
  const richCart = sim.validateSupplierCart('dai_ly_dau_hem', [
    { productId: 'mi_hao_hao', quantity: 100000 },
  ]);
  assert(!richCart.valid, 'Giỏ vượt quá số tiền người chơi -> từ chối cả giỏ');

  // 4. Kho lạnh vượt sức chứa
  const coldProd = Object.values(PRODUCT_MAP).find((p) => p.storageType === 'cold')!;
  const overflowColdCart = sim.validateSupplierCart('dai_ly_dau_hem', [
    { productId: coldProd.id, quantity: sim.getColdCapacity() + 10 },
  ]);
  assert(!overflowColdCart.valid, 'Giỏ hàng lạnh vượt sức chứa kho mát -> từ chối cả giỏ');

  // 5. Chợ đầu mối chưa đạt đơn tối thiểu 100.000đ
  const belowMinCart = sim.validateSupplierCart('cho_dau_moi', [
    { productId: 'mi_hao_hao', quantity: 2 }, // 2 * 3500 = 7000 < 100000
  ]);
  assert(!belowMinCart.valid, 'Chợ đầu mối chưa đạt đơn tối thiểu 100.000đ -> từ chối');

  // 6. Atomic rejection check: Thử order giỏ lỗi -> không trừ 1 xu, không thêm đơn chờ
  const moneyBeforeReject = sim.getPlayerData().money;
  const pendingCountBefore = sim.getPendingOrders().length;
  const rejectOrderRes = sim.orderSupplierCart('dai_ly_dau_hem', [
    { productId: 'mi_hao_hao', quantity: 1 },
    { productId: lockedProd.id, quantity: 1 },
  ]);
  assert(!rejectOrderRes.success, 'Thực thi giỏ lỗi trả về failure');
  assert(sim.getPlayerData().money === moneyBeforeReject, 'Không trừ tiền khi giỏ bị từ chối');
  assert(sim.getPendingOrders().length === pendingCountBefore, 'Không ghi đơn chờ khi giỏ bị từ chối');

  // 7. Chợ đầu mối hợp lệ với chiết khấu 10%
  // Cần đủ tiền và đủ level 2
  sim.addExperience(500); // lên cấp 2
  sim.addMoney(500000);
  const moneyBeforeWholesale = sim.getPlayerData().money;
  // Đặt 60 gói mì (2 thùng × 30); ưu đãi bậc 60 món 6% và giảm thùng 5% cộng dồn.
  const validWholesale = sim.validateSupplierCart('cho_dau_moi', [
    { productId: 'mi_hao_hao', quantity: 60 },
  ]);
  assert(validWholesale.valid, 'Giỏ sỉ đạt chuẩn hợp lệ');
  assert(validWholesale.subtotal === 160740, 'Subtotal đúng 160.740 ₫ (ưu đãi 6% theo mức 60 món, cộng dồn giảm 5% theo thùng)');
  assert(validWholesale.discountAmount === 16074, 'Chiết khấu 10% đúng 16.074 ₫');
  assert(validWholesale.totalCost === 144666, 'Tổng thanh toán sau giảm đúng 144.666 ₫');

  const commitWholesale = sim.orderSupplierCart('cho_dau_moi', [
    { productId: 'mi_hao_hao', quantity: 60 },
  ]);
  assert(commitWholesale.success, 'Đặt giỏ hàng sỉ thành công');
  assert(sim.getPlayerData().money === moneyBeforeWholesale - 144666, 'Tiền trừ đúng số tiền đã chiết khấu');
  const wholesaleOrder = sim.getPendingOrders().find((o) => o.supplierId === 'cho_dau_moi')!;
  assert(!!wholesaleOrder, 'Có đơn sỉ chợ đầu mối');
  // Giá vốn lô lấy theo số tiền thực trả / số món, gồm ưu đãi số lượng và thùng.
  assert(wholesaleOrder.unitCost === Math.round(144666 / 60), `Giá vốn lô theo giá thùng 30 gói (hiện ${wholesaleOrder.unitCost})`);
  assert(Math.abs(wholesaleOrder.unitCost * 60 - 144666) < 60, 'Giá vốn lô × số món khớp tiền đã trả (sai số làm tròn < 1 ₫/món)');
  // Hàng lẻ (không đủ thùng) giữ đơn giá sỉ như trước.
  const looseMoney = sim.getPlayerData().money;
  assert(sim.orderFromSupplier('mi_hao_hao', 5), 'Đặt lẻ 5 gói thành công');
  const looseOrder = sim.getPendingOrders()[sim.getPendingOrders().length - 1];
  assert(looseOrder.unitCost * 5 === looseMoney - sim.getPlayerData().money, 'Hàng lẻ: giá vốn lô × số món = tiền đã trả');

  // Test 4.2b: Mở thùng không sinh thêm hàng (quantity lô đã gồm hàng trong thùng)
  {
    console.log('\n--- Test 4.2b: Mở thùng chỉ đổi thùng thành hàng lẻ, tổng hàng không đổi ---');
    const caseSave = structuredClone(DEFAULT_INITIAL_SAVE);
    caseSave.inventory = caseSave.inventory.filter((item) => item.productId !== 'mi_hao_hao');
    caseSave.inventory.push({ productId: 'mi_hao_hao', quantity: 120, lots: [
      { quantity: 40, expiresOnDay: 20, unitCost: 2488, caseCount: 1 },
      { quantity: 80, expiresOnDay: 30, unitCost: 2488, caseCount: 2 },
    ] });
    const caseSim = new GameSimulation(caseSave, generateStarterTileMap(), new InputManager());
    const mi = () => caseSim.getInventory().find((item) => item.productId === 'mi_hao_hao')!;
    const cases = () => (mi().lots ?? []).reduce((n, lot) => n + (lot.caseCount ?? 0), 0);
    const one = caseSim.unpackCase('mi_hao_hao');
    assert(one.success && one.openedCases === 1, 'Mở 1 thùng thành công');
    assert(mi().quantity === 120 && cases() === 2, `Mở 1 thùng: tổng vẫn 120 gói, còn 2 thùng (hiện ${mi().quantity} gói, ${cases()} thùng)`);
    assert(!caseSim.unpackMultipleCases('mi_hao_hao', 0).success && !caseSim.unpackMultipleCases('mi_hao_hao', Number.NaN).success && !caseSim.unpackMultipleCases('mi_hao_hao', 1.5).success, 'Số thùng không hợp lệ bị từ chối');
    assert(cases() === 2 && mi().quantity === 120, 'Từ chối thì không đổi kho');
    const many = caseSim.unpackMultipleCases('mi_hao_hao', 5);
    assert(many.success && many.openedCases === 2, 'Mở nhiều hơn số thùng có: chỉ mở số thùng còn lại');
    assert(mi().quantity === 120 && cases() === 0, `Mở hết thùng: tổng vẫn 120 gói (hiện ${mi().quantity})`);
    assert(!caseSim.unpackCase('mi_hao_hao').success, 'Hết thùng thì không mở được nữa');
  }

  // Test 4.2c: Hàng còn nguyên thùng không châm kệ được; mở thùng rồi mới châm
  {
    console.log('\n--- Test 4.2c: Chỉ hàng lẻ được châm kệ, hàng nguyên thùng phải mở trước ---');
    // Hàm lô: lấy hàng lẻ, kẹp số thùng, gộp lô giữ thùng
    const lots: StockLot[] = [
      { quantity: 50, expiresOnDay: 10, unitCost: 1, caseCount: 1 }, // 10 lẻ + 1 thùng 40
      { quantity: 40, expiresOnDay: 20, unitCost: 1, caseCount: 1 }, // 0 lẻ + 1 thùng
    ];
    assert(looseUnits(lots, 40) === 10 && sealedCases(lots) === 2, 'Đếm 10 lẻ, 2 thùng');
    const looseTaken = takeLots(lots, 30, { caseSize: 40, looseOnly: true });
    assert(sumLots(looseTaken) === 10 && sumLots(lots) === 80 && sealedCases(lots) === 2, 'Lấy hàng lẻ: chỉ được 10, thùng còn nguyên');
    const anyTaken = takeLots(lots, 5, { caseSize: 40 });
    assert(sumLots(anyTaken) === 5 && sealedCases(lots) === 1 && lots.every((lot) => (lot.caseCount ?? 0) * 40 <= lot.quantity), 'Lấy thường từ lô toàn thùng thì khui thùng: còn 1 thùng, số thùng không vượt số hàng');
    const merged: StockLot[] = [{ quantity: 40, expiresOnDay: 30, unitCost: 2, caseCount: 1 }];
    mergeLots(merged, [{ quantity: 40, expiresOnDay: 30, unitCost: 2, caseCount: 1 }]);
    assert(merged.length === 1 && merged[0].quantity === 80 && merged[0].caseCount === 2, 'Gộp lô cộng cả số thùng');

    // Mô phỏng: châm tay, việc châm kệ và mở thùng
    const shelfSave = structuredClone(DEFAULT_INITIAL_SAVE);
    shelfSave.inventory = shelfSave.inventory.filter((item) => item.productId !== 'mi_hao_hao');
    shelfSave.inventory.push({ productId: 'mi_hao_hao', quantity: 35, lots: [{ quantity: 35, expiresOnDay: 40, unitCost: 2488, provenance: 'known', caseCount: 1 }] });
    const noodleShelf = shelfSave.storeLayout.fixtures.find((f) => f.id === 'shelf_wooden_noodles')!;
    noodleShelf.currentStock = 0; noodleShelf.stockLots = []; noodleShelf.assignedProductId = 'mi_hao_hao';
    const shelfSim = new GameSimulation(shelfSave, generateStarterTileMap(), new InputManager());
    const miSlot = () => shelfSim.getInventory().find((item) => item.productId === 'mi_hao_hao')!;
    const first = shelfSim.transferToShelf('shelf_wooden_noodles', 'mi_hao_hao', 30);
    assert(first.success && first.actualQuantity === 5, `Chỉ 5 gói lẻ lên kệ (hiện ${first.actualQuantity})`);
    assert(miSlot().quantity === 30 && sealedCases(miSlot().lots) === 1, 'Thùng 30 gói vẫn nguyên trong kho');
    const blocked = shelfSim.transferToShelf('shelf_wooden_noodles', 'mi_hao_hao', 10);
    assert(!blocked.success && blocked.reason === 'in_cases', 'Hết hàng lẻ: báo lý do in_cases, không lấy hàng trong thùng');
    shelfSim.setPlanogram({ shelf_wooden_noodles: 'mi_hao_hao' });
    const target = shelfSim.getRestockJobTargets().find((t) => t.fixtureId === 'shelf_wooden_noodles');
    assert(!!target && target.availableInInventory > 0, 'Việc châm kệ tính cả hàng nguyên thùng là hàng có sẵn (bày tự động sẽ mở thùng)');
    const auto = shelfSim.transferToShelf('shelf_wooden_noodles', 'mi_hao_hao', 10, true);
    assert(auto.success && auto.actualQuantity === 10 && sealedCases(miSlot().lots) === 0, 'Bày tự động tự mở thùng khi hết hàng lẻ');
  }

  // Test 4.2d: Lý do báo khi bày tự động không được + chỉ đếm kệ trống thật sự bày được
  {
    console.log('\n--- Test 4.2d: Báo đúng lý do bày tự động thất bại, đếm kệ trống bày được ---');
    const emptySave = structuredClone(DEFAULT_INITIAL_SAVE);
    emptySave.inventory = [];
    const emptySim = new GameSimulation(emptySave, generateStarterTileMap(), new InputManager());
    assert(emptySim.countFillableEmptyShelves() === 0, 'Kho trống: không kệ nào bày được');
    assert(emptySim.explainAutoRestockFailure().includes('Kho hàng không có'), 'Kho trống: báo kho không có hàng');

    const caseSave = structuredClone(DEFAULT_INITIAL_SAVE);
    caseSave.inventory = [{ productId: 'mi_hao_hao', quantity: 40, lots: [{ quantity: 40, expiresOnDay: 99, unitCost: 2488, caseCount: 1 }] }];
    const caseSim = new GameSimulation(caseSave, generateStarterTileMap(), new InputManager());
    const before = caseSim.countFillableEmptyShelves();
    assert(before > 0, 'Có thùng mì trong kho: kệ tạp hóa trống được tính là bày được (tự mở thùng)');
    const filled = caseSim.autoFillAllShelves().totalFilled;
    assert(filled > 0, 'Bày hàng lên kệ tự mở thùng và bày được mì');
    assert(sealedCases(caseSim.getInventory().find((i) => i.productId === 'mi_hao_hao')?.lots) === 0 || caseSim.getInventory().every((i) => i.productId !== 'mi_hao_hao'), 'Thùng đã được mở');
    assert(!caseSim.explainAutoRestockFailure().includes('mở thùng ở kho trước'), 'Lý do báo không còn đổ cho hàng nguyên thùng');

    // Bày tay từng ô (nút trong Sơ đồ kệ / Shelf) cũng tự mở thùng; mọi kệ hỏng thì báo kệ hỏng
    const manualSave = structuredClone(DEFAULT_INITIAL_SAVE);
    manualSave.inventory = [{ productId: 'mi_hao_hao', quantity: 40, lots: [{ quantity: 40, expiresOnDay: 99, unitCost: 2488, caseCount: 1 }] }];
    const manualSim = new GameSimulation(manualSave, generateStarterTileMap(), new InputManager());
    assert(manualSim.restockShelf('shelf_wooden_noodles', 'mi_hao_hao', 10), 'restockShelf (bày từng ô) tự mở thùng khi chỉ có hàng nguyên thùng');
    for (const f of manualSim.getFixtures()) if (isSalesFixture(f)) f.broken = 'major';
    assert(manualSim.explainAutoRestockFailure().includes('hỏng'), 'Mọi kệ hỏng: lý do báo kệ hỏng');
  }

  // Test 4.3: Delivery once, holding overflow, stow & spoilage
  console.log('\n--- Test 4.3: Giao hàng một lần, Hàng chờ (Holding Area) & Cất kho (Stow) ---');
  // Reset sim với kho lạnh chỉ còn 4 chỗ trống
  const holdSave = structuredClone(DEFAULT_INITIAL_SAVE);
  holdSave.warehouseTier = 0; // kho mát bậc đầu = COLD_WAREHOUSE_CAPACITY
  const simHold = new GameSimulation(holdSave, generateStarterTileMap(), new InputManager());
  simHold.addMoney(500000);
  simHold.addExperience(500);

  // Giả lập kho lạnh đã chứa 36 món
  const milkProd = Object.values(PRODUCT_MAP).find((p) => p.storageType === 'cold')!;
  const currentInv = simHold.getInventory();
  currentInv.push({ productId: milkProd.id, quantity: 36, lots: [{ quantity: 36, expiresOnDay: 10 }] });
  simHold.importSaveData({
    ...simHold.exportSaveData(),
    inventory: currentInv,
    pendingOrders: [],
    holdingArea: [],
  });
  assert(simHold.getColdWarehouseCount() === 36, 'Kho lạnh hiện có 36 món (còn 4 chỗ trống)');

  // Giả lập 1 đơn hàng lạnh 10 món đã về đến ngày giao
  const currentDay = simHold.getClock().getTime().day;
  simHold.importSaveData({
    ...simHold.exportSaveData(),
    pendingOrders: [
      {
        id: 'cold-order-overflow-test',
        productId: milkProd.id,
        quantity: 10,
        unitCost: milkProd.purchasePrice,
        arrivalDay: currentDay,
        supplierId: 'cho_dau_moi',
        delivered: false,
      },
    ],
  });

  // Gọi giao hàng
  simHold.deliverOrders(currentDay);
  assert(simHold.getColdWarehouseCount() === 40, 'Kho lạnh nhận đúng 4 món vừa đủ dung lượng (40 món)');
  const holding = simHold.getHoldingArea();
  assert(holding.length === 1, '6 món dư được chuyển vào khu vực hàng chờ (holdingArea)');
  assert(holding[0].quantity === 6, 'Số lượng trong hàng chờ đúng 6 món');
  assert(holding[0].productId === milkProd.id, 'Đúng mã sản phẩm sữa giữ lạnh');
  const originalHoldingExpiry = holding[0].expiresOnDay;
  assert(originalHoldingExpiry > currentDay, 'Hàng chờ có hạn dùng ban đầu hợp lệ');

  // Kiểm tra giao đúng 1 lần: gọi deliverOrders lần hai trong cùng ngày không tăng thêm hàng
  simHold.deliverOrders(currentDay);
  assert(simHold.getColdWarehouseCount() === 40, 'Deliver lần hai không tăng kho lạnh');
  assert(simHold.getHoldingArea().length === 1 && simHold.getHoldingArea()[0].quantity === 6, 'Deliver lần hai không nhân đôi hàng chờ');

  // Kiểm tra cất hàng khi kho đầy -> thất bại có lý do
  const stowFail = simHold.stowHoldingItem(holding[0].id);
  assert(!stowFail.success && stowFail.reason === 'cold_warehouse_full', 'Kho mát đầy từ chối cất hàng');

  // Giải phóng 2 chỗ ở kho lạnh bằng cách lấy 2 hộp sữa ra bày lên kệ
  const freeSimSave = simHold.exportSaveData();
  const milkSlot = freeSimSave.inventory.find((i) => i.productId === milkProd.id)!;
  milkSlot.quantity -= 2;
  milkSlot.lots![0].quantity -= 2;
  simHold.importSaveData(freeSimSave);
  assert(simHold.getColdWarehouseCount() === 38, 'Kho lạnh còn 38 món (trống 2 chỗ)');

  // Cất một phần từ hàng chờ vào kho
  const stowPartial = simHold.stowHoldingItem(holding[0].id);
  assert(stowPartial.success && stowPartial.stowedQuantity === 2, 'Cất thành công 2 món vào kho');
  assert(simHold.getColdWarehouseCount() === 40, 'Kho lạnh đầy lại 40 món');
  assert(simHold.getHoldingArea()[0].quantity === 4, 'Hàng chờ còn lại 4 món');
  // Hạn gốc được bảo toàn
  const invMilkSlot = simHold.getInventory().find((i) => i.productId === milkProd.id)!;
  const stowedLot = invMilkSlot.lots?.find((l) => l.expiresOnDay === originalHoldingExpiry);
  assert(!!stowedLot, 'Lô chuyển vào kho giữ nguyên ngày hết hạn gốc');

  // Kiểm tra hàng chờ quá hạn tự hủy và ghi vào totalSpoiled
  const spoilHoldingSave = simHold.exportSaveData();
  spoilHoldingSave.holdingArea = [
    {
      id: 'expired-holding-item',
      productId: milkProd.id,
      quantity: 4,
      expiresOnDay: 2, // hết hạn vào ngày 2
      originalArrivalDay: 1,
      unitCost: milkProd.purchasePrice,
    },
  ];
  simHold.importSaveData(spoilHoldingSave);
  // Kích hoạt qua ngày 3
  const clock = simHold.getClock();
  clock.setTime({ ...clock.getTime(), day: 3 });
  // Gọi qua ngày để expireStock xử lý
  simHold.deliverOrders(3);
  // simHold.expireStock(3) chạy qua advanceDay trong clock
  const reloadSave = simHold.exportSaveData();
  // Giả lập expire trực tiếp bằng cách import lại ngày 3
  simHold.importSaveData({
    ...reloadSave,
    worldTime: { ...reloadSave.worldTime, day: 3 },
  });
  // Hàng chờ hết hạn bị xóa
  assert(simHold.getHoldingArea().length === 0, 'Hàng chờ quá hạn tự động được dọn sạch');

  // Test 4.4: Migration pending orders lacking supplierId & save/reload holding
  console.log('\n--- Test 4.4: Di chuyển đơn cũ thiếu supplierId & Lưu/Tải Hàng chờ ---');
  const legacyOrderSave: SaveGameData = {
    ...DEFAULT_INITIAL_SAVE,
    pendingOrders: [
      {
        id: 'legacy-order-1',
        productId: 'mi_hao_hao',
        quantity: 10,
        unitCost: 3500,
        arrivalDay: 2,
        // không có supplierId, delivered
      } as any,
    ],
    holdingArea: [
      {
        id: 'holding-mig-1',
        productId: 'banh_mi_que',
        quantity: 5,
        expiresOnDay: 15,
        originalArrivalDay: 2,
        unitCost: 8000,
      },
    ],
  };

  const migSim = new GameSimulation(legacyOrderSave, generateStarterTileMap(), new InputManager());
  const migOrders = migSim.getPendingOrders();
  assert(migOrders[0].supplierId === 'dai_ly_dau_hem', 'Đơn cũ thiếu supplierId được tự động migrate thành dai_ly_dau_hem');
  assert(migOrders[0].delivered === false, 'Đơn cũ khởi tạo delivered là false');
  assert(migSim.getHoldingArea().length === 1, 'Hàng chờ được phục hồi trọn vẹn');
  assert(migSim.getHoldingArea()[0].productId === 'banh_mi_que', 'Hàng chờ giữ đúng sản phẩm bánh mì que');

  // Export & re-import check
  const exported = migSim.exportSaveData();
  assert(!!exported.holdingArea && exported.holdingArea.length === 1, 'exportSaveData chứa mảng holdingArea');
  const reloadedSim = new GameSimulation(exported, generateStarterTileMap(), new InputManager());
  assert(reloadedSim.getHoldingArea().length === 1, 'Tải lại bản lưu giữ nguyên hàng chờ');
}
