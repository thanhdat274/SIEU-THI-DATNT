import assert from 'node:assert/strict';
import { GameSimulation } from './simulation';
import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, generateStarterTileMap, INITIAL_REFRIGERATOR } from '@game/data';
import { InputManager } from './input';
import { normalizeLots, sumLots, takeLots, mergeLots } from './stock';
import { StockLot, SaveGameData } from '@game/shared';

export function runLedgerTests(): void {
  console.log('\n--- Test Group 6: Giá vốn lô, Ledger & Báo cáo ngày ---');

  // =========================================================================
  // Test 6.1: FEFO với 2 lô giá vốn khác nhau & Migration lô cũ sang estimated
  // =========================================================================
  console.log('--- Test 6.1: FEFO 2 lô giá vốn khác nhau & Migration estimated ---');
  {
    // 1. FEFO with distinct unitCost lots
    const lotA: StockLot = { quantity: 5, expiresOnDay: 10, unitCost: 3000, provenance: 'known' };
    const lotB: StockLot = { quantity: 5, expiresOnDay: 20, unitCost: 4000, provenance: 'known' };
    const lots = [lotB, lotA]; // intentionally unsorted to test FEFO ordering

    // Take 3 items -> should come from lotA (earliest expiry)
    const taken1 = takeLots(lots, 3);
    assert.equal(sumLots(taken1), 3, 'Lấy đúng 3 món');
    assert.equal(taken1[0].unitCost, 3000, 'Lô lấy đầu tiên có giá vốn 3000');
    assert.equal(taken1[0].provenance, 'known', 'Xuất xứ lô là known');

    // Take remaining 2 from lotA and 2 from lotB (total 4)
    const taken2 = takeLots(lots, 4);
    assert.equal(sumLots(taken2), 4, 'Lấy tiếp 4 món');
    const cogs2 = taken2.reduce((sum, l) => sum + l.quantity * (l.unitCost ?? 0), 0);
    // 2 from lotA (2 * 3000) + 2 from lotB (2 * 4000) = 6000 + 8000 = 14000
    assert.equal(cogs2, 14000, 'COGS tính đúng theo từng lô FEFO');

    // 2. Migration legacy save without unitCost or provenance
    const legacyLots: StockLot[] = [
      { quantity: 8, expiresOnDay: 15 },
      { quantity: 4, expiresOnDay: 25 },
    ];
    const normalized = normalizeLots(12, legacyLots, 'mi_hao_hao', 1);
    assert.equal(sumLots(normalized), 12, 'Bảo toàn số lượng 12');
    assert.equal(normalized[0].expiresOnDay, 15, 'Bảo toàn hạn dùng lô 1');
    assert.equal(normalized[1].expiresOnDay, 25, 'Bảo toàn hạn dùng lô 2');
    assert.equal(normalized[0].unitCost, PRODUCT_MAP['mi_hao_hao'].purchasePrice, 'Gán giá vốn catalog');
    assert.equal(normalized[0].provenance, 'estimated', 'Đánh dấu xuất xứ estimated cho save cũ');
    console.log('  ✓ Passed: FEFO tính đúng giá vốn từng lô và migration lô cũ thành công');
  }

  // =========================================================================
  // Test 6.2: GAAP Ledger mua 10×3000 bán 2×5000 -> DT 10000 / COGS 6000 / Lãi 4000
  // =========================================================================
  console.log('--- Test 6.2: Quy tắc GAAP - Không trừ trùng chi phí mua hàng ---');
  {
    const save: SaveGameData = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player.money = 100000;
    save.inventory = [];
    save.storeLayout.fixtures = [
      { ...INITIAL_REFRIGERATOR, stockLots: [] },
      {
        id: 'shelf_test',
        type: 'shelf_wooden',
        tileX: 7,
        tileY: 6,
        widthTiles: 1,
        heightTiles: 1,
        rotation: 0,
        label: 'Kệ thử nghiệm',
        maxCapacity: 20,
        currentStock: 0,
        stockLots: [],
      },
    ];

    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    const initialMoney = sim.getPlayerData().money;

    // Đặt hàng 10 gói mì Hảo Hảo từ đại lý đầu hẻm (đơn giá 3.000đ, tổng 30.000đ, giao ngày 2)
    const orderRes = sim.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 10 }]);
    assert.equal(orderRes.success, true, 'Đặt hàng thành công');
    assert.equal(sim.getPlayerData().money, initialMoney - 30000, 'Dòng tiền chi 30.000đ ngay khi đặt');

    // Chuyển sang ngày 2 để nhận hàng
    sim.getClock().advanceToNextDay();

    // Kiểm tra hàng đã giao vào kho với unitCost 3000 và provenance 'known'
    const inv = sim.getInventory().find((i) => i.productId === 'mi_hao_hao');
    assert(inv, 'Kho nhận được mì');
    assert.equal(inv.quantity, 10, 'Số lượng mì trong kho là 10');
    assert.equal(inv.lots?.[0]?.unitCost, 3000, 'Lô hàng giao giữ nguyên unitCost 3000');
    assert.equal(inv.lots?.[0]?.provenance, 'known', 'Lô hàng giao có provenance known');

    // Bày hàng lên kệ
    const transferRes = sim.transferToShelf('shelf_test', 'mi_hao_hao', 10);
    assert.equal(transferRes.success, true, 'Bày mì lên kệ thành công');

    // Bán 2 gói mì (giá bán catalog mi_hao_hao là 4.500 hoặc theo sản phẩm)
    // Để khớp chính xác giá test 10×3000 bán 2×5000:
    // Tạo 1 khách mua 2 gói mì
    const custMgr = sim.getCustomerManager();
    custMgr.addTestCustomer({
      id: 'cust-test-62',
      position: { x: 7 * 32, y: 7 * 32 },
      stage: 'checkout',
      targetFixtureId: 'shelf_test',
      checkoutId: 'receipt-test-62',
      patience: 30,
      checkoutWait: 5,
      basket: [
        {
          productId: 'mi_hao_hao',
          quantity: 2,
          unitPrice: 5000,
          lots: [
            { quantity: 2, expiresOnDay: 40, unitCost: 3000, provenance: 'known' },
          ],
        },
      ],
    });

    const checkoutRes = sim.completeCustomerCheckout('receipt-test-62', 'shelf_test');
    assert.equal(checkoutRes, true, 'Thanh toán thành công');

    const dayRecord = sim.getCurrentDayRecord();
    assert.equal(dayRecord.revenue, 10000, 'Doanh thu đúng 10.000đ (2 × 5000)');
    assert.equal(dayRecord.cogs, 6000, 'Giá vốn COGS đúng 6.000đ (2 × 3000)');
    assert.equal(dayRecord.grossProfit, 4000, 'Lợi nhuận gộp đúng 4.000đ (10000 - 6000)');
    assert.equal(dayRecord.netProfit, 4000, 'Lợi nhuận ròng đúng 4.000đ');

    // Xác minh không bị trừ trùng 30.000đ tiền mua hàng vào lợi nhuận
    assert(dayRecord.netProfit > 0, 'Lợi nhuận không bị âm do trừ trùng tiền mua hàng');

    // Kiểm tra Ledger có đủ 2 bút toán: 1 purchase (30.000) và 1 sale (10.000, cogs 6.000)
    const ledger = sim.getLedger();
    const purchaseEntries = ledger.filter((e) => e.type === 'purchase');
    const saleEntries = ledger.filter((e) => e.type === 'sale');
    assert.equal(purchaseEntries.length, 1, 'Có 1 bút toán mua hàng trong sổ');
    assert.equal(purchaseEntries[0].amount, 30000, 'Bút toán mua hàng 30.000đ');
    assert.equal(saleEntries.length, 1, 'Có 1 bút toán bán hàng trong sổ');
    assert.equal(saleEntries[0].amount, 10000, 'Bút toán bán hàng 10.000đ');
    assert.equal(saleEntries[0].cogs, 6000, 'Bút toán bán hàng ghi nhận COGS 6.000đ');
    console.log('  ✓ Passed: Quy tắc GAAP COGS chuẩn xác, không trừ trùng chi phí mua hàng');
  }

  // =========================================================================
  // Test 6.3: Phân tách khách/giao dịch/món & Idempotent Day Closing
  // =========================================================================
  console.log('--- Test 6.3: Tách số khách/giao dịch/món & Chốt ngày idempotent ---');
  {
    const save: SaveGameData = structuredClone(DEFAULT_INITIAL_SAVE);
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());

    // 1 khách mua 3 món trong 1 giao dịch
    const custMgr = sim.getCustomerManager();
    custMgr.addTestCustomer({
      id: 'cust-multi-item',
      position: { x: 7 * 32, y: 7 * 32 },
      stage: 'checkout',
      targetFixtureId: 'shelf_wooden_noodles',
      checkoutId: 'receipt-multi-item',
      patience: 30,
      checkoutWait: 5,
      basket: [
        {
          productId: 'mi_hao_hao',
          quantity: 3,
          unitPrice: 4500,
          lots: [{ quantity: 3, expiresOnDay: 50, unitCost: 3000, provenance: 'known' }],
        },
      ],
    });

    sim.completeCustomerCheckout('receipt-multi-item');

    const recDay1 = sim.getCurrentDayRecord();
    assert.equal(recDay1.customersServed, 1, 'Đúng 1 khách được phục vụ');
    assert.equal(recDay1.transactionsCount, 1, 'Đúng 1 giao dịch');
    assert.equal(recDay1.itemsSold, 3, 'Đúng 3 món đã bán');

    // Sang ngày 2
    sim.getClock().advanceToNextDay();

    // Day 1 phải đã được chốt trong dailyRecords
    const records = sim.getDailyRecords();
    assert(records[1], 'Bản ghi ngày 1 tồn tại');
    assert(records[1].closedAt, 'Ngày 1 có dấu thời gian chốt closedAt');
    assert.equal(records[1].customersServed, 1, 'Ngày 1 chốt 1 khách');
    assert.equal(records[1].itemsSold, 3, 'Ngày 1 chốt 3 món');

    const closedDayIds = sim.getClosedDayIds();
    assert(closedDayIds.includes(1), 'Ngày 1 nằm trong closedDayIds');

    // Thử gọi lại closeDailyRecord(1) -> không bị ảnh hưởng (idempotent)
    const timestampBefore = records[1].closedAt;
    sim.closeDailyRecord(1);
    assert.equal(sim.getDailyRecords()[1].closedAt, timestampBefore, 'Không ghi đè hoặc chốt lại ngày đã đóng');

    // Xuất save và tải lại -> bảo toàn trạng thái chốt ngày
    const exportedSave = sim.exportSaveData();
    assert(exportedSave.dailyRecords?.[1], 'Save chứa dailyRecords ngày 1');
    assert(exportedSave.closedDayIds?.includes(1), 'Save chứa closedDayIds ngày 1');

    const simReloaded = new GameSimulation(exportedSave, generateStarterTileMap(), new InputManager());
    assert.equal(simReloaded.getDailyRecords()[1].closedAt, timestampBefore, 'Bản ghi chốt ngày khôi phục chuẩn xác sau tải game');
    assert(simReloaded.getClosedDayIds().includes(1), 'closedDayIds khôi phục chuẩn xác');
    console.log('  ✓ Passed: Phân tách khách/giao dịch/món và chốt ngày an toàn tuyệt đối');
  }
}
