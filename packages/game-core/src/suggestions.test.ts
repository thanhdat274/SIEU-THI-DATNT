import assert from 'node:assert/strict';
import {
  ALL_PRODUCTS,
  DEFAULT_INITIAL_SAVE,
  generateStarterTileMap,
  PRODUCT_MAP,
} from '@game/data';
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

  // 1. Hàng bán chạy cần nhiều hơn tiền đang có → vẫn giữ 60% cho hàng mới nhập thử, tổng không vượt tiền.
  {
    const money = 100000;
    const res = generateRestockSuggestions({
      ...base,
      playerMoney: money,
      fixtures: [noodleShelf(0)],
      dailyRecords: weekOf(Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, { mi_hao_hao: 60 }]))),
    });
    assert.ok(res.totalCost <= money, `Tổng gợi ý ${res.totalCost} không vượt tiền ${money}`);
    assert.ok(res.budget, 'Có thông tin phân bổ ngân sách');
    assert.equal(res.budget!.provenTarget, 40000, 'Hàng đang bán được 40% ngân sách');
    assert.ok(res.budget!.provenSpent <= 40000, `Hàng đang bán không lấn phần hàng mới (${res.budget!.provenSpent})`);
    const noodle = res.items.find((i) => i.productId === 'mi_hao_hao');
    assert.ok(noodle && !noodle.isFallback, 'Mì đang bán chạy vẫn được gợi ý');
    const trialItems = res.items.filter((i) => i.isFallback);
    assert.ok(trialItems.length >= 2, `Hàng mới luôn được gợi ý nhập thử (${trialItems.length} món)`);
    assert.ok(trialItems.length <= 6, 'Mỗi lần thử tối đa 6 mặt hàng mới');
    const trialCategories = new Set(trialItems.map((i) => PRODUCT_MAP[i.productId]!.category));
    assert.equal(trialCategories.size, trialItems.length, 'Hàng thử trải đều mỗi ngành một món để đa dạng mẫu mã');
    assert.ok(res.budget!.trialSpent > res.budget!.provenSpent * 0.9, 'Phần hàng mới dùng được tương ứng 60%');
  }

  // 2. Không có hàng mới để thử (đều đã có tồn) → phần 60% nhường cho hàng đang bán.
  {
    const res = generateRestockSuggestions({
      ...base,
      playerMoney: 100000,
      fixtures: [noodleShelf(0)],
      dailyRecords: weekOf(Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, { mi_hao_hao: 60 }]))),
      supplierStockOf: (id) => (id === 'mi_hao_hao' ? undefined : 0),
    });
    assert.equal(res.items.every((i) => i.productId === 'mi_hao_hao'), true, 'NCC hết hàng thì không gợi ý món đó');
    assert.ok(res.budget!.provenSpent > 40000, `Phần dư của nhóm hàng mới chuyển cho hàng đang bán (${res.budget!.provenSpent})`);
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

  console.log('  ✓ Hàng đang bán 40%, hàng mới nhập thử 60%; nhóm dùng không hết nhường nhóm kia');
  console.log('  ✓ Hàng mới luôn được gợi ý (tối đa 6 món/lần), NCC hết hàng thì bỏ qua');
  console.log('  ✓ Hàng bán chậm/tồn nhiều không bị lấp kệ; hàng đang thử còn tồn thì chờ kết quả');
  console.log('  ✓ Bấm gợi ý nhiều lần cộng dồn vào giỏ vẫn không vượt tiền đang có');

  console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ GỢI Ý NHẬP HÀNG (NHÓM 7) ĐÃ ĐẠT!');
}
