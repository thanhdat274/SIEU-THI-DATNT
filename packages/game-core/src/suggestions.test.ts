import assert from 'node:assert/strict';
import {
  ALL_PRODUCTS,
  DEFAULT_INITIAL_SAVE,
  generateStarterTileMap,
  PRODUCT_MAP,
} from '@game/data';
import { isSaveGameData } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import {
  calculateSalesVelocity,
  generateRestockSuggestions,
  getUsableStock
} from './suggestions';

export function runSuggestionTests(): void {
  console.log('\n=============================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ GỢI Ý NHẬP HÀNG (NHÓM 7)');
  console.log('=============================================');

  // --- Test 7.1: Sales velocity, usable stock, incoming orders, fresh expiration ---
  console.log('\n--- Test 7.1: Vận tốc bán, đơn chờ & hàng tươi sống ---');

  // 1. Calculate sales velocity over 3 and 7 days
  {
    const dailyRecords: Record<number, any> = {
      1: { day: 1, productSales: { mi_hao_hao: 10 } },
      2: { day: 2, productSales: { mi_hao_hao: 20, keo_big_babol: 4 } },
      3: { day: 3, productSales: { mi_hao_hao: 30 } },
    };
    const currentDayRecord: any = { day: 4, productSales: { mi_hao_hao: 10 } };

    const v7 = calculateSalesVelocity('mi_hao_hao', dailyRecords, currentDayRecord, 7);
    // Days 1, 2, 3 (closed) + Day 4 (today) = 4 days. Total = 10 + 20 + 30 + 10 = 70.
    // Velocity = 70 / 4 = 17.5.
    assert.equal(v7.totalSold, 70, 'Tổng số mì Hảo Hảo bán được 4 ngày là 70');
    assert.equal(v7.velocity, 17.5, 'Tốc độ bán trung bình mì Hảo Hảo là 17.5 món/ngày');

    const v3 = calculateSalesVelocity('mi_hao_hao', dailyRecords, currentDayRecord, 3);
    // Past 3 days: days 1, 2, 3 + day 4 = 4 days
    assert.ok(v3.velocity > 0);

    const vCandy = calculateSalesVelocity('keo_big_babol', dailyRecords, currentDayRecord, 7);
    assert.equal(vCandy.totalSold, 4);
    assert.equal(vCandy.velocity, 1.33);
  }

  // 2. Usable stock calculation excluding spoiled lots
  {
    const fixtures: any[] = [
      {
        id: 'shelf-1',
        type: 'shelf_wooden',
        assignedProductId: 'mi_hao_hao',
        currentStock: 10,
        stockLots: [
          { quantity: 4, expiresOnDay: 2, unitCost: 3000 }, // Expired on day 3
          { quantity: 6, expiresOnDay: 10, unitCost: 3000 }, // Usable on day 3
        ],
      },
    ];
    const inventory: any[] = [
      {
        productId: 'mi_hao_hao',
        quantity: 5,
        lots: [
          { quantity: 2, expiresOnDay: 3, unitCost: 3000 }, // Expired on day 3
          { quantity: 3, expiresOnDay: 15, unitCost: 3000 }, // Usable
        ],
      },
    ];
    const holdingArea: any[] = [
      { productId: 'mi_hao_hao', quantity: 5, expiresOnDay: 8, unitCost: 3000 }, // Usable
    ];

    const currentDay = 3;
    const usable = getUsableStock('mi_hao_hao', currentDay, fixtures, inventory, holdingArea);
    // Usable: 6 (fixture) + 3 (inventory) + 5 (holding) = 14.
    assert.equal(usable, 14, 'Chỉ tính các lô còn hạn dùng (expiresOnDay > currentDay)');
  }

  // 3. Scenario: Enough incoming stock -> does not suggest duplicate orders
  {
    const fixtures: any[] = [
      {
        id: 'shelf_wooden_noodles',
        type: 'shelf_wooden',
        assignedProductId: 'mi_hao_hao',
        currentStock: 2,
        stockLots: [{ quantity: 2, expiresOnDay: 50, unitCost: 3000 }],
        maxCapacity: 24,
      },
    ];
    const pendingOrders: any[] = [
      {
        id: 'ord-1',
        productId: 'mi_hao_hao',
        quantity: 22,
        delivered: false,
        arrivalDay: 2,
        unitCost: 3000,
      },
    ];
    // Target is shelf capacity (min 24, product capacity 30) = 24.
    // Usable stock = 2. Pending incoming = 22. Total effective = 24.
    const res = generateRestockSuggestions({
      playerLevel: 1,
      playerMoney: 500000,
      currentDay: 1,
      fixtures,
      inventory: [],
      holdingArea: [],
      pendingOrders,
      dailyRecords: {
        1: { day: 1, productSales: { mi_hao_hao: 10 } } as any,
      },
      currentDayRecord: { day: 1, productSales: { mi_hao_hao: 5 } } as any,
      coldWarehouseCount: 0,
    });

    const noodleSuggestion = res.items.find((i) => i.productId === 'mi_hao_hao');
    assert.equal(
      noodleSuggestion,
      undefined,
      'Khi tồn kho + đơn đang chờ đã đủ target thì KHÔNG gợi ý mua lặp'
    );
  }

  // 3b. Nguyên liệu quầy ăn uống đã mở được ưu tiên dù chưa từng bán ở kệ
  {
    const res = generateRestockSuggestions({
      playerLevel: 5,
      playerMoney: 500000,
      currentDay: 7,
      fixtures: [],
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords: {},
      currentDayRecord: { day: 7, productSales: {} } as any,
      coldWarehouseCount: 0,
      stallNeedOf: (id) => (id === 'sua_ong_tho' ? 4 : id === 'duong_cat' ? 1 : 0),
    });
    const sua = res.items.find((i) => i.productId === 'sua_ong_tho');
    assert.ok(sua && sua.quantity >= 12, 'Sữa đặc cho quầy cà phê được nhập đủ ~3 ngày');
    assert.equal(res.items[0]?.productId === 'sua_ong_tho' || res.items[1]?.productId === 'sua_ong_tho', true, 'Nguyên liệu quầy xếp đầu giỏ');
    assert.ok(!sua.isFallback, 'Nguyên liệu quầy không bị coi là hàng thử');
  }

  // 3c. Quỹ lương/thuế chiếm gần hết tiền: nguyên liệu quầy vẫn được nhập bằng quỹ dự phòng (trừ nợ đến hạn)
  {
    const res = generateRestockSuggestions({
      playerLevel: 5, playerMoney: 100000, currentDay: 7, fixtures: [], inventory: [], holdingArea: [], pendingOrders: [],
      dailyRecords: {}, currentDayRecord: { day: 7, productSales: {} } as any, coldWarehouseCount: 0,
      obligations: { wageDebt: 0, nextWages: 95000, taxDue: 0, taxDebt: 0, total: 95000 },
      stallNeedOf: (id) => (id === 'duong_cat' ? 4 : 0),
    });
    assert.ok(res.items.some((i) => i.productId === 'duong_cat'), 'Vẫn nhập đường cho quầy dù quỹ lương giữ gần hết tiền');
    assert.ok(res.totalCost <= 100000, 'Không vượt tiền đang có');
  }

  // 4. Scenario: Fresh perishable items do not over-order beyond shelf life
  {
    // Bánh mì que: daysToSpoil = 2
    const banhMi = PRODUCT_MAP['banh_mi_que'];
    assert.ok(banhMi, 'Bánh mì que tồn tại');
    assert.equal(banhMi.expirationRules?.daysToSpoil, 2, 'Bánh mì que có hạn 2 ngày');

    const fixtures: any[] = [
      {
        id: 'shelf_bread',
        type: 'shelf_wooden',
        assignedProductId: 'banh_mi_que',
        currentStock: 0,
        stockLots: [],
        maxCapacity: 50,
      },
    ];

    // Velocity = 2/day. Over 2 days of life, max usable = 2 * 2 = 4.
    const res = generateRestockSuggestions({
      playerLevel: 1,
      playerMoney: 500000,
      currentDay: 1,
      fixtures,
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords: {
        1: { day: 1, productSales: { banh_mi_que: 2 } } as any,
      },
      currentDayRecord: { day: 1, productSales: { banh_mi_que: 2 } } as any,
      coldWarehouseCount: 0,
    });

    const breadSug = res.items.find((i) => i.productId === 'banh_mi_que');
    assert.ok(breadSug, 'Bánh mì que được gợi ý nhập do hết hàng');
    assert.ok(
      breadSug.quantity <= 4,
      `Bánh mì tươi không nhập vượt quá lượng bán trong hạn dùng (được gợi ý: ${breadSug.quantity} <= 4)`
    );
  }

  console.log('  ✓ Vận tốc bán trung bình được tính chính xác theo 3 và 7 ngày');
  console.log('  ✓ Tồn kho sử dụng được đã loại trừ các lô hết hạn');
  console.log('  ✓ Đơn hàng đang chờ đến theo ETA ngăn chặn gợi ý mua lặp');
  console.log('  ✓ Hàng tươi sống giới hạn số lượng theo thời gian sử dụng trước khi hỏng');

  // --- Test 7.2: Cart pruning algorithm ---
  console.log('\n--- Test 7.2: Cắt giảm giỏ theo ngân sách, kho lạnh, cấp độ & mối sỉ ---');

  // 1. Cold storage nearly full
  {
    // Refrigerator has capacity 40 in warehouse. Current cold stock = 38. Available cold = 2.
    // Sữa chua hũ is cold product.
    const suaChua = PRODUCT_MAP['sua_chua'];
    assert.ok(suaChua);
    assert.equal(suaChua.storageType, 'cold');

    const res = generateRestockSuggestions({
      playerLevel: 1,
      playerMoney: 500000,
      currentDay: 1,
      fixtures: [
        {
          id: 'fridge_1',
          type: 'refrigerator',
          assignedProductId: 'sua_chua',
          currentStock: 0,
          stockLots: [],
          maxCapacity: 12,
        },
      ] as any,
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords: {
        1: { day: 1, productSales: { sua_chua: 8 } } as any,
      },
      currentDayRecord: { day: 1, productSales: { sua_chua: 4 } } as any,
      coldWarehouseCount: 38, // 38 / 40 used
      maxColdCapacity: 40,
    });

    const coldSug = res.items.find((i) => i.productId === 'sua_chua');
    assert.ok(coldSug, 'Sữa chua được gợi ý');
    assert.equal(coldSug.quantity, 2, 'Số lượng hàng lạnh bị cắt giảm còn đúng 2 chỗ trống');
    assert.ok(
      res.appliedConstraints.some((c) => c.includes('kho lạnh')),
      'Có ghi nhận lý do cắt giảm do giới hạn kho lạnh'
    );
  }

  // 2. Low budget constraint
  {
    // Player has only 15,000 VND.
    const res = generateRestockSuggestions({
      playerLevel: 1,
      playerMoney: 15000,
      budget: 15000,
      currentDay: 1,
      fixtures: [
        {
          id: 'shelf_1',
          type: 'shelf_wooden',
          assignedProductId: 'mi_hao_hao',
          currentStock: 0,
          stockLots: [],
          maxCapacity: 20,
        },
      ] as any,
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords: {},
      currentDayRecord: { day: 1, productSales: {} } as any,
      coldWarehouseCount: 0,
    });

    assert.ok(res.totalCost <= 15000, `Tổng chi phí gợi ý (${res.totalCost}) không được vượt quá ngân sách (15000)`);
    assert.ok(
      res.appliedConstraints.some((c) => c.includes('ngân sách')),
      'Có ghi nhận lý do cắt giảm theo ngân sách'
    );
  }

  // 3. Locked products excluded
  {
    // Product with unlockLevel 2 or higher should NOT be suggested for player level 1
    const lockedProd = ALL_PRODUCTS.find((p) => p.unlockLevel > 1);
    assert.ok(lockedProd, 'Có sản phẩm khóa cấp > 1');

    const res = generateRestockSuggestions({
      playerLevel: 1,
      playerMoney: 1000000,
      currentDay: 1,
      fixtures: [],
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords: {},
      currentDayRecord: { day: 1, productSales: {} } as any,
      coldWarehouseCount: 0,
    });

    const foundLocked = res.items.find((i) => i.productId === lockedProd.id);
    assert.equal(foundLocked, undefined, 'Sản phẩm chưa mở khóa không được xuất hiện trong gợi ý');
  }

  // 4. Empty sales history -> Fallback demand profile
  {
    const res = generateRestockSuggestions({
      playerLevel: 1,
      playerMoney: 200000,
      currentDay: 1,
      fixtures: [
        {
          id: 'shelf_1',
          type: 'shelf_wooden',
          assignedProductId: 'mi_hao_hao',
          currentStock: 0,
          stockLots: [],
          maxCapacity: 20,
        },
      ] as any,
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords: {},
      currentDayRecord: { day: 1, productSales: {} } as any,
      coldWarehouseCount: 0,
    });

    assert.ok(res.items.length > 0, 'Khi lịch sử rỗng vẫn có gợi ý thử nghiệm');
    const fallbackItem = res.items[0];
    assert.equal(fallbackItem.isFallback, true, 'Đánh dấu là gợi ý fallback');
    assert.equal(fallbackItem.reason, 'fallback_trial', 'Lý do là thử nghiệm nhu cầu ban đầu');
    assert.ok(res.explanation.includes('thử nghiệm'), 'Thông báo giải thích rõ là thử nghiệm');
  }

  // 5. Supplier discount & minimum order
  {
    // Chợ Đầu Mối: 10% discount, minOrder 100,000 VND
    const res = generateRestockSuggestions({
      supplierId: 'cho_dau_moi',
      playerLevel: 2, // Cho dau moi requires level 2
      playerMoney: 500000,
      currentDay: 1,
      fixtures: [
        {
          id: 'shelf_1',
          type: 'shelf_wooden',
          assignedProductId: 'mi_hao_hao',
          currentStock: 0,
          stockLots: [],
          maxCapacity: 40,
        },
      ] as any,
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords: {
        1: { day: 1, productSales: { mi_hao_hao: 30 } } as any,
      },
      currentDayRecord: { day: 1, productSales: { mi_hao_hao: 10 } } as any,
      coldWarehouseCount: 0,
      options: { provenSharePct: 100, cashReservePct: 0 },
    });

    const noodle = res.items.find((i) => i.productId === 'mi_hao_hao');
    assert.ok(noodle);
    // mi_hao_hao purchasePrice is 3000 -> 10% discount = 2700
    assert.equal(noodle.unitPrice, 2700, 'Đơn giá được áp dụng chiết khấu 10% của Chợ Đầu Mối');
    assert.ok(res.totalCost >= 100000, 'Tự động nâng số lượng đạt mức đơn tối thiểu 100.000 ₫');
  }

  console.log('  ✓ Kho lạnh đạt ngưỡng tự động cắt giảm sản phẩm lạnh và báo lý do');
  console.log('  ✓ Ngân sách thấp tự động cắt giảm số lượng vừa đủ tiền mặt');
  console.log('  ✓ Sản phẩm chưa mở khóa bị loại bỏ hoàn toàn khỏi danh sách');
  console.log('  ✓ Lịch sử bán hàng rỗng chuyển sang chế độ thử nghiệm fallback');
  console.log('  ✓ Chiết khấu nhà cung cấp và đơn tối thiểu được đáp ứng chính xác');

  // --- Test 7.3: GameSimulation integration ---
  console.log('\n--- Test 7.3: Tích hợp vào GameSimulation ---');
  {
    const initialSave = structuredClone(DEFAULT_INITIAL_SAVE);
    const sim = new GameSimulation(initialSave, generateStarterTileMap(), new InputManager());

    // Initially day 1 with starter inventory
    const suggestion = sim.suggestRestock();
    assert.ok(suggestion, 'Simulation trả về kết quả gợi ý nhập hàng');
    assert.equal(suggestion.supplierId, 'dai_ly_dau_hem');
    assert.ok(Array.isArray(suggestion.items));
    assert.ok(typeof suggestion.explanation === 'string');

    // Record sales and verify velocity tracking
    sim.recordProductSale('mi_hao_hao', 15);
    const rec = sim.getCurrentDayRecord();
    assert.equal(rec.productSales?.['mi_hao_hao'], 15, 'Sản phẩm bán được ghi nhận vào bản ghi ngày');

    // Close day 1 and move to day 2
    sim.closeDailyRecord(1);
    const closed = sim.getDailyRecords();
    assert.equal(closed[1]?.productSales?.['mi_hao_hao'], 15, 'Bản ghi ngày đã chốt bảo lưu số lượng từng sản phẩm');
  }

  // --- Test 7.4: Gợi ý theo mùa/thời tiết & giới hạn hàng tươi sống (Task 2.5) ---
  console.log('\n--- Test 7.4: Gợi ý theo mùa/thời tiết & giới hạn hàng tươi sống ---');
  {
    const fixtures: any[] = [
      {
        id: 'shelf_wooden_1',
        type: 'shelf_wooden',
        assignedProductId: 'mi_hao_hao',
        currentStock: 0,
        stockLots: [],
        maxCapacity: 50,
      },
    ];
    const dailyRecords: Record<number, any> = {
      1: { day: 1, productSales: { mi_hao_hao: 10 } },
    };
    const currentDayRecord: any = { day: 2, productSales: { mi_hao_hao: 10 } };

    // Standard demand: velocity = 10, target = 25
    const normalRes = generateRestockSuggestions({
      playerLevel: 10,
      playerMoney: 500000,
      currentDay: 2,
      fixtures,
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords,
      currentDayRecord,
      coldWarehouseCount: 0,
    });
    const normalNoodle = normalRes.items.find((i) => i.productId === 'mi_hao_hao');
    assert.ok(normalNoodle, 'Có gợi ý nhập mì Hảo Hảo');

    // Rainy season/weather boost (1.5x multiplier): target should scale up
    const boostedRes = generateRestockSuggestions({
      playerLevel: 10,
      playerMoney: 500000,
      currentDay: 2,
      fixtures,
      inventory: [],
      holdingArea: [],
      pendingOrders: [],
      dailyRecords,
      currentDayRecord,
      coldWarehouseCount: 0,
      demandMultiplierOf: (id) => (id === 'mi_hao_hao' ? 1.5 : 1.0),
    });
    const boostedNoodle = boostedRes.items.find((i) => i.productId === 'mi_hao_hao');
    assert.ok(boostedNoodle, 'Có gợi ý nhập mì mùa mưa');
    assert.ok(
      boostedNoodle.quantity > normalNoodle.quantity,
      `Hệ số mùa/thời tiết làm tăng lượng gợi ý: ${boostedNoodle.quantity} > ${normalNoodle.quantity}`
    );

    // Fresh perishable item (rau_cai_xanh: daysToSpoil = 3)
    // Even if demand multiplier is huge (3.0x), target must not exceed daysToSpoil shelf life ceiling
    const vegProduct = ALL_PRODUCTS.find((p) => p.expirationRules?.daysToSpoil && p.expirationRules.daysToSpoil <= 3);
    if (vegProduct) {
      const freshFixtures: any[] = [
        {
          id: 'shelf_veg',
          type: 'shelf_wooden',
          assignedProductId: vegProduct.id,
          currentStock: 0,
          stockLots: [],
          maxCapacity: 100,
        },
      ];
      const freshDailyRecords: Record<number, any> = {
        1: { day: 1, productSales: { [vegProduct.id]: 2 } },
      };
      const freshRes = generateRestockSuggestions({
        playerLevel: 20,
        playerMoney: 500000,
        currentDay: 2,
        fixtures: freshFixtures,
        inventory: [],
        holdingArea: [],
        pendingOrders: [],
        dailyRecords: freshDailyRecords,
        currentDayRecord: { day: 2, productSales: { [vegProduct.id]: 2 } } as any,
        coldWarehouseCount: 0,
        demandMultiplierOf: () => 3.0, // High season multiplier
      });
      const freshItem = freshRes.items.find((i) => i.productId === vegProduct.id);
      if (freshItem) {
        const daysToSpoil = vegProduct.expirationRules?.daysToSpoil ?? 3;
        // maxFresh = Math.ceil(trendVelocity * daysToSpoil) = Math.ceil((2 * 3.0) * 3) = 18
        // Should not exceed maxFresh and definitely should not exceed shelf life safety limit
        assert.ok(
          freshItem.quantity <= Math.ceil(2 * 3.0 * daysToSpoil),
          'Hàng tươi sống không vượt trần tiêu thụ theo hạn sử dụng'
        );
      }
    }
  }

  console.log('  ✓ Hệ số thời tiết/mùa làm tăng nhu cầu gợi ý chính xác');
  console.log('  ✓ Hàng tươi sống tuân thủ nghiêm ngặt trần hạn sử dụng');

  // --- Test 7.5: Chia ngân sách 40/60, giỏ đang có, hàng bán chậm & hàng đang thử ---
  console.log('\n--- Test 7.5: Chia ngân sách 40/60, không vượt tiền, giảm hàng bán chậm ---');
  const noodleShelf = (stock: number): any => ({
    id: 'shelf_noodle',
    type: 'shelf_wooden',
    assignedProductId: 'mi_hao_hao',
    currentStock: stock,
    stockLots: stock > 0 ? [{ quantity: stock, expiresOnDay: 99, unitCost: 3000 }] : [],
    maxCapacity: 40,
  });
  const weekOf = (sales: Record<number, Record<string, number>>): Record<number, any> =>
    Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((day) => [day, { day, productSales: sales[day] ?? {} }]));
  const base = {
    playerLevel: 1,
    currentDay: 8,
    inventory: [],
    holdingArea: [],
    pendingOrders: [],
    coldWarehouseCount: 0,
    currentDayRecord: { day: 8, productSales: {} } as any,
  };

  // 1. Hàng bán chạy nhập theo thùng nguyên; tổng chi không vượt tiền mặt.
  {
    const money = 100000;
    const res = generateRestockSuggestions({
      ...base,
      options: { cashReservePct: 0 },
      playerMoney: money,
      fixtures: [noodleShelf(0)],
      dailyRecords: weekOf(Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, { mi_hao_hao: 60 }]))),
    });
    assert.ok(res.totalCost <= money, `Tổng gợi ý ${res.totalCost} không vượt tiền ${money}`);
    assert.ok(res.budget, 'Có thông tin phân bổ ngân sách');
    assert.equal(res.budget!.provenTarget, 40000, 'Hàng đang bán có mục tiêu 40% ngân sách');
    assert.ok(res.budget!.provenSpent <= res.budget!.spendable, `Một kiện nguyên có thể vượt mục tiêu nhóm nhưng không vượt tổng ngân sách (${res.budget!.provenSpent})`);
    const noodle = res.items.find((i) => i.productId === 'mi_hao_hao');
    assert.ok(!noodle || (!noodle.isFallback && noodle.quantity % 30 === 0), 'Mì bán chạy nếu được gợi ý thì theo thùng nguyên');
    const trialItems = res.items.filter((i) => i.isFallback);
    assert.ok(trialItems.length >= 2, `Hàng mới luôn được gợi ý nhập thử (${trialItems.length} món)`);
    assert.ok(trialItems.length <= 6, 'Mỗi lần thử tối đa 6 mặt hàng mới');
    const trialCategories = new Set(trialItems.map((i) => PRODUCT_MAP[i.productId]!.category));
    assert.equal(trialCategories.size, trialItems.length, 'Hàng thử trải đều mỗi ngành một món để đa dạng mẫu mã');
    assert.ok(res.budget!.trialSpent > 0, 'Phần ngân sách hàng mới vẫn gợi ý sản phẩm mới');
  }

  // 2. Không có hàng mới để thử (đều đã có tồn) → phần 60% nhường cho hàng đang bán.
  {
    const res = generateRestockSuggestions({
      ...base,
      options: { cashReservePct: 0 },
      playerMoney: 100000,
      fixtures: [noodleShelf(0)],
      dailyRecords: weekOf(Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, { mi_hao_hao: 60 }]))),
      supplierStockOf: (id) => (id === 'mi_hao_hao' ? undefined : 0),
    });
    assert.equal(res.items.every((i) => i.productId === 'mi_hao_hao'), true, 'NCC hết hàng thì không gợi ý món đó');
    assert.ok(res.totalCost <= 100000);
  }

  // 3. Hàng bán chậm/tồn nhiều không bị lấp đầy kệ; hàng chưa bán mà còn tồn thì chờ, không nhập thêm.
  {
    const res = generateRestockSuggestions({
      ...base,
      playerMoney: 500000,
      fixtures: [noodleShelf(1), { id: 'shelf_candy', type: 'shelf_wooden', assignedProductId: 'keo_big_babol', currentStock: 3, stockLots: [{ quantity: 3, expiresOnDay: 99, unitCost: 1000 }], maxCapacity: 40 }],
      dailyRecords: weekOf({ 1: { mi_hao_hao: 1 } }), // 1 gói / 7 ngày
    });
    assert.equal(res.items.find((i) => i.productId === 'mi_hao_hao'), undefined, 'Mì bán chậm còn 1 gói thì không lấp kệ 40');
    assert.equal(res.items.find((i) => i.productId === 'keo_big_babol'), undefined, 'Kẹo đang thử chưa bán, còn tồn → không nhập thêm');
    assert.ok(res.explanation.includes('bán chậm'), 'Giải thích có nhắc hàng bán chậm');
    assert.ok(res.explanation.includes('đang thử'), 'Giải thích có nhắc hàng đang thử');
  }

  // 3d. Nhập nhanh nguyên liệu quầy: tự chọn đại lý, đặt thành công, tồn kho tăng sau khi giao
  {
    const save: any = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player = { ...save.player, level: 8, money: 2000000 };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    (sim as any).stalls.owned.push('cafe_vot', 'banh_mi_muoi_ot');
    for (const stallId of ['cafe_vot', 'banh_mi_muoi_ot']) {
      const need = sim.getStallRestockItems(stallId);
      assert.ok(need.length > 0, `Quầy ${stallId} thiếu nguyên liệu khi kho trống`);
      const plan = sim.planStallRestock(stallId);
      assert.ok('orders' in plan, `Lập được kế hoạch nhập cho ${stallId}: ${'reason' in plan ? plan.reason : ''}`);
      if (!('orders' in plan)) continue;
      const before = (sim as any).playerData.money;
      for (const order of plan.orders) {
        const res = sim.orderSupplierCart(order.supplierId, order.items);
        assert.ok(res.success, `Đặt giỏ ${order.supplierId} thành công: ${res.reasons?.join(' · ') ?? ''}`);
      }
      assert.ok(before - (sim as any).playerData.money <= plan.totalCost + 1, 'Chi đúng theo kế hoạch');
      for (const line of need) {
        const ordered: number = plan.orders.flatMap(o => o.items).filter(it => it.productId === line.productId).reduce((sum: number, it) => sum + it.quantity, 0);
        assert.ok(ordered >= line.quantity, `Đặt đủ ${line.productId}`);
      }
    }
  }

  // 3e. Thiếu tiền cho đủ 3 ngày: vẫn mua trước phần làm được và báo món còn thiếu
  {
    const save: any = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player = { ...save.player, level: 8, money: 100000 };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    (sim as any).stalls.owned.push('banh_mi_muoi_ot');
    const plan = sim.planStallRestock('banh_mi_muoi_ot');
    assert.ok('orders' in plan, `Có kế hoạch mua một phần: ${'reason' in plan ? plan.reason : ''}`);
    if ('orders' in plan) {
      assert.ok(plan.totalCost <= 100000, 'Không vượt tiền đang có');
      assert.ok((plan.missing?.length ?? 0) > 0, 'Báo món còn thiếu');
      for (const order of plan.orders) assert.ok(sim.orderSupplierCart(order.supplierId, order.items).success, 'Đặt được phần mua trước');
    }
  }

  // 3f. Tự nhập nguyên liệu quầy mỗi sáng (auto-buy): đặt hàng, ghi báo cáo, lưu/nạp cờ
  {
    const save: any = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player = { ...save.player, level: 8, money: 2000000 };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    (sim as any).stalls.owned.push('cafe_vot');
    sim.setAutoBuyStalls(true);
    const pendingBefore = (sim as any).pendingOrders.length;
    (sim as any).processAutoBuy(2);
    assert.ok((sim as any).pendingOrders.length > pendingBefore, 'Sáng hôm sau tự đặt nguyên liệu quầy');
    const report = sim.getAutoBuyConfig().reports[2];
    assert.ok(report && report.placed.some(p => p.ruleId === 'stall:cafe_vot'), 'Báo cáo ghi dòng đặt của quầy');
    const exported: any = sim.exportSaveData('slot', 1);
    assert.equal(exported.autoBuyStalls, true, 'Cờ tự nhập quầy được lưu');
    assert.ok(isSaveGameData(exported), 'Save có cờ mới vẫn hợp lệ');
  }

  // 3g. Thiếu tiền buổi sáng → mua một phần, giữa ngày có tiền thì tự mua nốt; nạp lại save giữ cờ
  {
    const save: any = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player = { ...save.player, level: 8, money: 100000 };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    (sim as any).stalls.owned.push('banh_mi_muoi_ot');
    sim.setAutoBuyStalls(true);
    (sim as any).processAutoBuy(2);
    assert.ok((sim as any).stallShortfall.has('banh_mi_muoi_ot'), 'Quầy mới nhập một phần được đánh dấu còn thiếu');
    const afterMorning = (sim as any).pendingOrders.length;
    (sim as any).topUpStallShortfalls();
    assert.equal((sim as any).pendingOrders.length, afterMorning, 'Chưa đủ tiền thì chưa mua nốt');
    const midSave: any = structuredClone(sim.exportSaveData('slot', 1));
    assert.deepEqual(midSave.stallShortfall, ['banh_mi_muoi_ot'], 'Danh sách quầy còn thiếu nằm trong save');
    assert.ok(isSaveGameData(midSave), 'Save có stallShortfall vẫn hợp lệ');
    const midReload = new GameSimulation(structuredClone(midSave), generateStarterTileMap(), new InputManager());
    assert.ok((midReload as any).stallShortfall.has('banh_mi_muoi_ot'), 'Nạp lại save giữa ngày vẫn nhớ quầy còn thiếu');
    (sim as any).playerData.money += 1000000;
    (sim as any).lastStallTopUpKey = '';
    (sim as any).topUpStallShortfalls();
    assert.ok((sim as any).pendingOrders.length > afterMorning, 'Có tiền giữa ngày thì tự mua nốt');
    assert.equal((sim as any).stallShortfall.size, 0, 'Hết thiếu sau khi mua nốt');

    const reloaded = new GameSimulation(structuredClone(sim.exportSaveData('slot', 1)) as any, generateStarterTileMap(), new InputManager());
    assert.equal(reloaded.getAutoBuyConfig().stalls, true, 'Nạp lại save vẫn bật tự nhập quầy');
    const loaded = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
    loaded.importSaveData(structuredClone(sim.exportSaveData('slot', 1)) as any);
    assert.equal(loaded.getAutoBuyConfig().stalls, true, 'importSaveData giữ cờ tự nhập quầy');
  }

  // 3h. Callback onAutoPurchase báo cho UI khi tự nhập đặt đơn (để commit/lưu, kể cả tiệm online)
  {
    let fired = 0;
    const save: any = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player = { ...save.player, level: 8, money: 2000000 };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), { onAutoPurchase: () => { fired++; } });
    (sim as any).stalls.owned.push('cafe_vot');
    sim.setAutoBuyStalls(true);
    (sim as any).processAutoBuy(2);
    assert.equal(fired, 1, 'Đặt đơn buổi sáng báo đúng một lần');
  }

  // 4. Tích hợp: bấm gợi ý hai lần (giỏ cộng dồn như UI) vẫn không vượt tiền theo giá thật lúc đặt.
  {
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
    const money = sim.getPlayerData().money;
    const supplierId = 'dai_ly_dau_hem';
    let cart: Record<string, number> = {};
    for (let i = 0; i < 3; i++) {
      const res = sim.suggestRestock(supplierId, undefined, cart);
      for (const item of res.items) cart = { ...cart, [item.productId]: (cart[item.productId] ?? 0) + item.quantity };
    }
    const lines = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    assert.ok(lines.length > 0, 'Gợi ý có hàng');
    const check = sim.validateSupplierCart(supplierId, lines);
    assert.ok(check.totalCost <= money, `Giỏ sau 3 lần bấm (${check.totalCost}) không vượt tiền (${money})`);
    assert.ok(!check.reasons.some((r) => r.includes('Không đủ tiền')), 'Giỏ gợi ý không bị từ chối vì thiếu tiền');

    // Ngân sách nhỏ: cắt theo giá thật, vẫn không vượt.
    const tight = sim.suggestRestock(supplierId, 20000);
    const tightCheck = sim.validateSupplierCart(supplierId, tight.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    assert.ok(tight.items.length === 0 || tightCheck.totalCost <= 20000, `Ngân sách 20.000 ₫ được tôn trọng (${tightCheck.totalCost})`);
  }

  // 5. Tuỳ chọn: quỹ dự phòng, tỷ lệ chia và số món thử chỉnh được.
  {
    const common = {
      ...base,
      playerMoney: 100000,
      fixtures: [noodleShelf(0)],
      dailyRecords: weekOf(Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, { mi_hao_hao: 60 }]))),
    };
    const byDefault = generateRestockSuggestions(common);
    assert.equal(byDefault.budget!.reserved, 10000, 'Mặc định giữ lại 10% tiền mặt');
    assert.ok(byDefault.totalCost <= 90000, `Không đụng quỹ dự phòng (${byDefault.totalCost} <= 90000)`);

    const reserve50 = generateRestockSuggestions({ ...common, options: { cashReservePct: 50 } });
    assert.ok(reserve50.totalCost <= 50000, `Giữ 50% thì chỉ chi tối đa 50.000 (${reserve50.totalCost})`);

    const noReserve = generateRestockSuggestions({ ...common, options: { cashReservePct: 0 } });
    assert.ok(noReserve.totalCost > byDefault.totalCost - 1, 'Không giữ quỹ thì được dùng nhiều hơn hoặc bằng');

    const split = generateRestockSuggestions({ ...common, options: { cashReservePct: 0, provenSharePct: 70 } });
    assert.equal(split.budget!.provenTarget, 70000, 'Tỷ lệ hàng đang bán chỉnh thành 70%');
    assert.equal(split.budget!.trialTarget, 30000);

    const fewer = generateRestockSuggestions({ ...common, options: { cashReservePct: 0, maxTrialProducts: 2 } });
    assert.ok(fewer.items.filter((i) => i.isFallback).length <= 2, 'Giới hạn món thử chỉnh được còn 2');
    const none = generateRestockSuggestions({ ...common, options: { cashReservePct: 0, maxTrialProducts: 0 } });
    assert.equal(none.items.some((i) => i.isFallback), false, 'maxTrialProducts = 0 tắt hàng thử');

    const garbage = generateRestockSuggestions({ ...common, options: { provenSharePct: NaN, cashReservePct: 999, maxTrialProducts: -4 } });
    assert.ok(garbage.totalCost <= 10000 + 1, 'Giá trị rác bị kẹp về khoảng hợp lệ (giữ tối đa 90%)');
  }

  // 6. Giá giỏ khớp giá hiển thị khi có kỹ năng giảm giá nhà cung cấp.
  {
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
    const supplierId = 'dai_ly_dau_hem';
    const lines = [{ productId: 'mi_hao_hao', quantity: 10 }];
    const before = sim.validateSupplierCart(supplierId, lines);
    const shown = sim.wholesaleUnitPrice(supplierId, 'mi_hao_hao', 10) * 10;
    assert.equal(before.totalCost, shown, 'Không có kỹ năng: giá giỏ = giá hiển thị');
    (sim as any).skills.chosenPerks = ['perk_negotiator']; // -5% giá nhập
    const afterSkill = sim.validateSupplierCart(supplierId, lines);
    const shownAfter = sim.wholesaleUnitPrice(supplierId, 'mi_hao_hao', 10) * 10;
    assert.ok(afterSkill.totalCost < before.totalCost, 'Có kỹ năng: giỏ rẻ hơn');
    assert.ok(Math.abs(afterSkill.totalCost - shownAfter) <= 10, `Giá giỏ (${afterSkill.totalCost}) khớp giá hiển thị (${shownAfter})`);
    const moneyBefore = sim.getPlayerData().money;
    const order = sim.orderSupplierCart(supplierId, lines);
    assert.ok(order.success, 'Đặt hàng thành công');
    assert.equal(moneyBefore - sim.getPlayerData().money, afterSkill.totalCost, 'Tiền trừ đúng bằng giá giỏ đã giảm');
    assert.equal(sim.getPendingOrders().at(-1)!.unitCost, sim.wholesaleUnitPrice(supplierId, 'mi_hao_hao', 10), 'Giá vốn lô ghi theo giá đã giảm');
  }

  // 6b. Món từng bán lâu trước đó, nay hết hàng: là hàng cũ (nhập theo tốc độ bán cũ), không phải hàng mới thử.
  {
    const old = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { day: i + 1, productSales: i < 3 ? { mi_hao_hao: 20 } : {} }]));
    const res = generateRestockSuggestions({
      ...base,
      currentDay: 40,
      currentDayRecord: { day: 40, productSales: {} } as any,
      playerMoney: 200000,
      options: { cashReservePct: 0 },
      fixtures: [noodleShelf(0)],
      dailyRecords: old as any,
    });
    const noodle = res.items.find((i) => i.productId === 'mi_hao_hao');
    assert.ok(noodle, 'Mì từng bán (cách đây >7 ngày) và đang hết hàng được gợi ý');
    assert.equal(noodle!.quantity % 30, 0, 'Gợi ý mì Hảo Hảo làm tròn theo thùng 30 gói');
    assert.equal(noodle!.isFallback, false, 'Không bị xếp vào nhóm hàng mới thử');
    assert.notEqual(noodle!.reason, 'fallback_trial');
    assert.ok(noodle!.salesVelocity! > 0, 'Dùng tốc độ bán đã ghi nhận');
    assert.ok(noodle!.quantity >= 30, `Gợi ý ít nhất một thùng nguyên (${noodle!.quantity})`);

    // Chưa từng bán ngày nào trong lịch sử: vẫn là hàng mới thử.
    const fresh = generateRestockSuggestions({
      ...base, currentDay: 40, currentDayRecord: { day: 40, productSales: {} } as any, playerMoney: 200000,
      options: { cashReservePct: 0 }, fixtures: [noodleShelf(0)],
      dailyRecords: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { day: i + 1, productSales: {} }])) as any,
    });
    assert.ok(fresh.items.some((i) => i.isFallback), 'Chưa từng bán → có hàng mới thử theo ngân sách và kiện nguyên');
  }

  // 7. Quỹ dự phòng theo nghĩa vụ thực tế (lương, thuế) — lấy mức lớn hơn giữa nghĩa vụ và % tiền mặt.
  {
    const common = {
      ...base,
      playerMoney: 100000,
      fixtures: [noodleShelf(0)],
      dailyRecords: weekOf(Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, { mi_hao_hao: 60 }]))),
    };
    const obligations = { wageDebt: 20000, nextWages: 30000, taxDue: 10000, taxDebt: 5000, total: 65000 };
    const res = generateRestockSuggestions({ ...common, obligations });
    assert.equal(res.budget!.reserved, 65000, 'Nghĩa vụ 65.000 lớn hơn 10% (10.000) nên giữ 65.000');
    assert.equal(res.budget!.obligations, 65000);
    assert.ok(res.totalCost <= 35000, `Chỉ chi trong phần còn lại 35.000 (${res.totalCost})`);
    assert.ok(res.appliedConstraints.some((c) => c.includes('nợ lương') && c.includes('lương kỳ tới') && c.includes('thuế sắp nộp')), 'Ghi rõ giữ lại cho khoản nào');

    const off = generateRestockSuggestions({ ...common, obligations, options: { protectObligations: false } });
    assert.equal(off.budget!.reserved, 10000, 'Tắt công tắc: chỉ còn % tiền mặt');

    const small = generateRestockSuggestions({ ...common, obligations: { wageDebt: 0, nextWages: 3000, taxDue: 0, taxDebt: 0, total: 3000 } });
    assert.equal(small.budget!.reserved, 10000, 'Nghĩa vụ nhỏ hơn 10% thì vẫn giữ 10%');

    const broke = generateRestockSuggestions({ ...common, obligations: { ...obligations, total: 500000 } });
    assert.equal(broke.items.length, 0, 'Nghĩa vụ vượt tiền mặt: không gợi ý gì');
    assert.equal(broke.totalCost, 0);

    // Tích hợp: nợ lương trong GameSimulation được giữ lại khi gợi ý.
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
    const money = sim.getPlayerData().money;
    assert.equal(sim.getCashObligations().total, 0, 'Tiệm mới chưa có nghĩa vụ');
    (sim as any).wageDebt = 60000;
    const ob = sim.getCashObligations();
    assert.equal(ob.wageDebt, 60000);
    const gen = sim.suggestRestock('dai_ly_dau_hem');
    assert.ok(gen.totalCost <= money - 60000, `Gợi ý chừa nợ lương 60.000 (${gen.totalCost} <= ${money - 60000})`);

    // Lương kỳ tới khớp đúng số processPayroll sẽ trả cho nhân viên đã thuê.
    const staffSim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
    (staffSim as any).playerData.money = 5_000_000;
    (staffSim as any).playerData.level = 2; // thuê nhân viên cần cấp 2
    const candidate = staffSim.getStaffCandidates()[0];
    assert.ok(candidate, 'Có ứng viên');
    const hired = staffSim.hireStaff(candidate!.id);
    assert.ok(hired.success, `Thuê được nhân viên (${hired.reason ?? 'ok'})`);
    const expected = staffSim.getCashObligations().nextWages;
    assert.ok(expected > 0, 'Có nhân viên thì có lương kỳ tới');
    const moneyBefore = staffSim.getPlayerData().money;
    const paid = staffSim.processPayroll(staffSim.getTime().day);
    assert.equal(paid.totalGrossWage, expected, 'nextWages khớp tổng lương processPayroll tính');
    assert.equal(moneyBefore - staffSim.getPlayerData().money, expected, 'Tiền trả đúng bằng nextWages');
  }

  // 8. Cài đặt gợi ý nằm trong save: lưu → nạp lại giữ nguyên, save cũ không có trường vẫn hợp lệ, trường rác bị từ chối/kẹp.
  {
    const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());
    assert.equal(sim.getRestockOptions(), undefined, 'Chưa chỉnh thì chưa có cài đặt lưu');
    assert.equal('restockOptions' in sim.exportSaveData(), false, 'Save không ghi trường khi chưa chỉnh');
    assert.equal(isSaveGameData(sim.exportSaveData()), true, 'Save cũ (không có restockOptions) vẫn hợp lệ');

    const saved = sim.setRestockOptions({ provenSharePct: 65, maxTrialProducts: 3, cashReservePct: 25, protectObligations: false });
    assert.deepEqual(saved, { provenSharePct: 65, maxTrialProducts: 3, cashReservePct: 25, protectObligations: false });
    const data = sim.exportSaveData();
    assert.deepEqual(data.restockOptions, saved, 'Cài đặt được ghi vào save');
    assert.equal(isSaveGameData(JSON.parse(JSON.stringify(data))), true, 'Save có restockOptions hợp lệ sau JSON');

    const reloaded = new GameSimulation(structuredClone(data), generateStarterTileMap(), new InputManager());
    assert.deepEqual(reloaded.getRestockOptions(), saved, 'Nạp lại save giữ nguyên cài đặt');
    const res = reloaded.suggestRestock('dai_ly_dau_hem');
    assert.equal(res.budget!.provenShare, 0.65, 'suggestRestock dùng cài đặt đã lưu khi không truyền options');
    assert.equal(res.budget!.reserved, Math.floor(reloaded.getPlayerData().money * 0.25), 'Quỹ giữ lại theo 25% đã lưu');

    assert.equal(isSaveGameData({ ...JSON.parse(JSON.stringify(data)), restockOptions: 'x' }), false, 'restockOptions không phải object bị từ chối');
    assert.equal(isSaveGameData({ ...JSON.parse(JSON.stringify(data)), restockOptions: { cashReservePct: 'abc' } }), false, 'Số sai kiểu bị từ chối');
    assert.equal(isSaveGameData({ ...JSON.parse(JSON.stringify(data)), restockOptions: { protectObligations: 1 } }), false, 'Công tắc sai kiểu bị từ chối');
    const clamped = new GameSimulation({ ...structuredClone(data), restockOptions: { provenSharePct: 500, maxTrialProducts: -3, cashReservePct: 1e9 } }, generateStarterTileMap(), new InputManager());
    assert.deepEqual(clamped.getRestockOptions(), { provenSharePct: 100, maxTrialProducts: 0, cashReservePct: 90, protectObligations: true }, 'Giá trị ngoài khoảng bị kẹp khi nạp');
  }

  console.log('  ✓ Hàng đang bán 40%, hàng mới nhập thử 60%; nhóm dùng không hết nhường nhóm kia');
  console.log('  ✓ Hàng mới luôn được gợi ý (tối đa 6 món/lần), NCC hết hàng thì bỏ qua');
  console.log('  ✓ Hàng bán chậm/tồn nhiều không bị lấp kệ; hàng đang thử còn tồn thì chờ kết quả');
  console.log('  ✓ Bấm gợi ý nhiều lần cộng dồn vào giỏ vẫn không vượt tiền đang có');

  console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ GỢI Ý NHẬP HÀNG (NHÓM 7) ĐÃ ĐẠT!');
}
