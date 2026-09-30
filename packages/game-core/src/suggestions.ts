import {
  ALL_PRODUCTS,
  PRODUCT_MAP,
  SUPPLIER_MAP,
  DEFAULT_SUPPLIER_ID,
} from '@game/data';
import {
  COLD_WAREHOUSE_CAPACITY,
  DailyRecord,
  HoldingItem,
  InventoryItem,
  RestockSuggestionResult,
  StoreFixture,
  SuggestedCartItem,
  SuggestionReason,
  SupplierOrder,
  isSalesFixture,
} from '@game/shared';

export interface SuggestionEngineParams {
  supplierId?: string;
  playerLevel: number;
  playerMoney: number;
  currentDay: number;
  fixtures: StoreFixture[];
  inventory: InventoryItem[];
  holdingArea: HoldingItem[];
  pendingOrders: SupplierOrder[];
  dailyRecords: Record<number, DailyRecord>;
  currentDayRecord: DailyRecord;
  coldWarehouseCount: number;
  budget?: number;
  unitPriceOf?: (productId: string) => number; // đơn giá thực (giá sỉ động); thiếu = giá chuẩn × (1 − chiết khấu)
  maxColdCapacity?: number;
  topNBestSellers?: number;
}

/**
 * Calculate sales velocity (average units sold per day) for a product over the last N days.
 */
export function calculateSalesVelocity(
  productId: string,
  dailyRecords: Record<number, DailyRecord>,
  currentDayRecord: DailyRecord,
  days = 7
): { velocity: number; totalSold: number; daysCount: number } {
  let totalSold = 0;
  let daysCount = 0;

  // 1. Check past closed days in range [currentDay - days, currentDay - 1]
  const currentDay = currentDayRecord.day;
  const startDay = Math.max(1, currentDay - days);

  for (let d = startDay; d < currentDay; d++) {
    const rec = dailyRecords[d];
    if (rec) {
      daysCount++;
      const sold = rec.productSales?.[productId] ?? 0;
      totalSold += sold;
    }
  }

  // 2. Include today's sales if any
  const todaySold = currentDayRecord.productSales?.[productId] ?? 0;
  if (todaySold > 0 || daysCount === 0) {
    daysCount++;
    totalSold += todaySold;
  }

  const effectiveDays = Math.max(1, daysCount);
  const velocity = Number((totalSold / effectiveDays).toFixed(2));
  return { velocity, totalSold, daysCount: effectiveDays };
}

/**
 * Calculate usable stock of a product across fixtures, warehouse inventory, and holding area.
 * Lots expiring on or before currentDay are excluded as spoiled.
 */
export function getUsableStock(
  productId: string,
  currentDay: number,
  fixtures: StoreFixture[],
  inventory: InventoryItem[],
  holdingArea: HoldingItem[]
): number {
  let count = 0;

  // Fixtures
  for (const f of fixtures) {
    if (isSalesFixture(f) && f.assignedProductId === productId) {
      if (f.stockLots && f.stockLots.length > 0) {
        for (const lot of f.stockLots) {
          if (lot.expiresOnDay > currentDay) {
            count += lot.quantity;
          }
        }
      } else {
        count += f.currentStock;
      }
    }
  }

  // Warehouse inventory
  const inv = inventory.find((i) => i.productId === productId);
  if (inv) {
    if (inv.lots && inv.lots.length > 0) {
      for (const lot of inv.lots) {
        if (lot.expiresOnDay > currentDay) {
          count += lot.quantity;
        }
      }
    } else {
      count += inv.quantity;
    }
  }

  // Holding area
  for (const h of holdingArea) {
    if (h.productId === productId && h.expiresOnDay > currentDay) {
      count += h.quantity;
    }
  }

  return count;
}

/**
 * Calculate incoming orders for a product that have not yet been delivered.
 */
export function getIncomingOrdersCount(
  productId: string,
  pendingOrders: SupplierOrder[]
): number {
  return pendingOrders
    .filter((order) => !order.delivered && order.productId === productId)
    .reduce((sum, order) => sum + order.quantity, 0);
}

interface CandidateItem {
  productId: string;
  wantQuantity: number;
  unitPrice: number;
  reason: SuggestionReason;
  salesVelocity?: number;
  isFallback: boolean;
  daysOfStockLeft?: number;
  storageType: 'ambient' | 'cold';
  daysToSpoil: number;
  basePopularity: number;
}

/**
 * Generate intelligent restock suggestions.
 * Prunes cart by budget, cold storage limits, supplier min order, and locked products.
 */
export function generateRestockSuggestions(
  params: SuggestionEngineParams
): RestockSuggestionResult {
  const supplierId = params.supplierId ?? DEFAULT_SUPPLIER_ID;
  const supplier = SUPPLIER_MAP[supplierId];
  const appliedConstraints: string[] = [];

  if (!supplier) {
    return {
      supplierId,
      items: [],
      totalCost: 0,
      totalQuantity: 0,
      coldItemCount: 0,
      appliedConstraints: ['Nhà cung cấp không tồn tại'],
      explanation: 'Không tìm thấy nhà cung cấp đã chọn.',
    };
  }

  if (supplier.unlockLevel > params.playerLevel) {
    return {
      supplierId,
      items: [],
      totalCost: 0,
      totalQuantity: 0,
      coldItemCount: 0,
      appliedConstraints: [`Nhà cung cấp ${supplier.name} mở khóa ở cấp ${supplier.unlockLevel}`],
      explanation: `Cần đạt cấp ${supplier.unlockLevel} để nhập hàng từ ${supplier.name}.`,
    };
  }

  const maxColdCapacity = params.maxColdCapacity ?? COLD_WAREHOUSE_CAPACITY;
  const pendingColdCount = params.pendingOrders
    .filter((order) => !order.delivered && PRODUCT_MAP[order.productId]?.storageType === 'cold')
    .reduce((sum, order) => sum + order.quantity, 0);
  let availableCold = Math.max(0, maxColdCapacity - params.coldWarehouseCount - pendingColdCount);

  const discount = supplier.discountRate ?? 0;
  const candidates: CandidateItem[] = [];

  // Filter products by player level
  const availableProducts = ALL_PRODUCTS.filter((p) => p.unlockLevel <= params.playerLevel);

  for (const product of availableProducts) {
    const usableStock = getUsableStock(
      product.id,
      params.currentDay,
      params.fixtures,
      params.inventory,
      params.holdingArea
    );
    const incoming = getIncomingOrdersCount(product.id, params.pendingOrders);
    const effectiveStock = usableStock + incoming;

    // Sales velocity: 7 days & 3 days
    const v7 = calculateSalesVelocity(product.id, params.dailyRecords, params.currentDayRecord, 7);
    const v3 = calculateSalesVelocity(product.id, params.dailyRecords, params.currentDayRecord, 3);
    const trendVelocity = Math.max(v7.velocity, v3.velocity);
    const hadSales = v7.totalSold > 0 || (params.currentDayRecord.productSales?.[product.id] ?? 0) > 0;

    const assignedFixture = params.fixtures.find(
      (f) => isSalesFixture(f) && f.assignedProductId === product.id
    );

    let target = 0;
    let isFallback = false;
    let reason: SuggestionReason = 'low_stock';

    if (hadSales) {
      // Stock target for 2.5 days of demand
      target = Math.ceil(trendVelocity * 2.5);
      if (assignedFixture) {
        const shelfCap = Math.min(assignedFixture.maxCapacity, product.shelfCapacity);
        target = Math.max(target, shelfCap);
      }

      // Perishable constraint: fresh items must not exceed shelf life
      const daysToSpoil = product.expirationRules?.daysToSpoil ?? 99;
      if (daysToSpoil <= 7) {
        const maxFresh = Math.max(2, Math.ceil(Math.max(trendVelocity, 1) * daysToSpoil));
        target = Math.min(target, maxFresh);
      }

      if (effectiveStock === 0) {
        reason = 'out_of_stock';
      } else if (trendVelocity >= 2) {
        reason = 'best_seller';
      } else {
        reason = 'low_stock';
      }
    } else {
      // Fallback trial demand profile
      isFallback = true;
      reason = 'fallback_trial';
      const basePop = product.demandProfile?.basePopularity ?? 0.5;
      const trialQty = Math.max(2, Math.round(basePop * 5));

      if (assignedFixture) {
        const shelfCap = Math.min(assignedFixture.maxCapacity, product.shelfCapacity);
        target = Math.min(trialQty, shelfCap);
      } else {
        target = trialQty;
      }

      // Fresh perishable constraint for trial
      const daysToSpoil = product.expirationRules?.daysToSpoil ?? 99;
      if (daysToSpoil <= 7) {
        target = Math.min(target, Math.max(2, daysToSpoil));
      }
    }

    const wantQuantity = Math.max(0, target - effectiveStock);
    if (wantQuantity > 0) {
      const unitPrice = params.unitPriceOf?.(product.id) ?? Math.round(product.purchasePrice * (1 - discount));
      const daysOfStockLeft =
        trendVelocity > 0
          ? Number((effectiveStock / trendVelocity).toFixed(1))
          : effectiveStock > 0
          ? 99
          : 0;

      const daysToSpoil = product.expirationRules?.daysToSpoil ?? 99;
      candidates.push({
        productId: product.id,
        wantQuantity,
        unitPrice,
        reason,
        salesVelocity: hadSales ? trendVelocity : undefined,
        isFallback,
        daysOfStockLeft,
        storageType: product.storageType,
        daysToSpoil,
        basePopularity: product.demandProfile?.basePopularity ?? 0.5,
      });
    }
  }

  // Priority sorting:
  // 1. out_of_stock
  // 2. low_stock
  // 3. best_seller
  // 4. fallback_trial
  const priorityOrder: Record<SuggestionReason, number> = {
    out_of_stock: 1,
    low_stock: 2,
    best_seller: 3,
    fallback_trial: 4,
  };

  candidates.sort((a, b) => {
    const pDiff = priorityOrder[a.reason] - priorityOrder[b.reason];
    if (pDiff !== 0) return pDiff;
    if (a.salesVelocity !== undefined && b.salesVelocity !== undefined) {
      return b.salesVelocity - a.salesVelocity;
    }
    if (a.isFallback && b.isFallback) {
      return b.basePopularity - a.basePopularity;
    }
    return a.unitPrice - b.unitPrice;
  });

  // Pruning phase
  let remainingBudget = Math.min(params.budget ?? params.playerMoney, params.playerMoney);
  const suggestedItems: SuggestedCartItem[] = [];

  for (const cand of candidates) {
    let finalQty = cand.wantQuantity;
    const prod = PRODUCT_MAP[cand.productId]!;

    // Cold storage constraint
    if (cand.storageType === 'cold') {
      if (availableCold <= 0) {
        appliedConstraints.push(`Bỏ qua ${prod.name} do kho lạnh không còn chỗ trống`);
        continue;
      }
      if (finalQty > availableCold) {
        appliedConstraints.push(`Cắt giảm ${prod.name} từ ${finalQty} xuống ${availableCold} do giới hạn kho lạnh`);
        finalQty = availableCold;
      }
    }

    if (finalQty <= 0) continue;

    // Budget constraint
    if (remainingBudget < cand.unitPrice) {
      appliedConstraints.push(`Dừng gợi ý thêm sản phẩm do không đủ ngân sách`);
      break;
    }

    const affordableQty = Math.min(finalQty, Math.floor(remainingBudget / cand.unitPrice));
    if (affordableQty < finalQty) {
      appliedConstraints.push(`Cắt giảm ${prod.name} từ ${finalQty} xuống ${affordableQty} theo ngân sách`);
      finalQty = affordableQty;
    }

    if (finalQty <= 0) continue;

    const estimatedCost = finalQty * cand.unitPrice;
    suggestedItems.push({
      productId: cand.productId,
      quantity: finalQty,
      unitPrice: cand.unitPrice,
      estimatedCost,
      reason: cand.reason,
      salesVelocity: cand.salesVelocity,
      isFallback: cand.isFallback,
      daysOfStockLeft: cand.daysOfStockLeft,
    });

    remainingBudget -= estimatedCost;
    if (cand.storageType === 'cold') {
      availableCold -= finalQty;
    }
  }

  let totalCost = suggestedItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  const totalQuantity = suggestedItems.reduce((sum, item) => sum + item.quantity, 0);
  const coldItemCount = suggestedItems
    .filter((item) => PRODUCT_MAP[item.productId]?.storageType === 'cold')
    .reduce((sum, item) => sum + item.quantity, 0);

  // Supplier minOrder handling
  if (supplier.minOrderValue && totalCost < supplier.minOrderValue && suggestedItems.length > 0) {
    if (params.playerMoney < supplier.minOrderValue) {
      appliedConstraints.push(
        `Đơn hàng (${totalCost.toLocaleString('vi-VN')} ₫) chưa đạt đơn tối thiểu (${supplier.minOrderValue.toLocaleString('vi-VN')} ₫) của ${supplier.name}`
      );
    } else {
      // Try to top up highest priority items to reach minOrder if budget and storage allow
      for (const item of suggestedItems) {
        const deficit = supplier.minOrderValue - totalCost;
        if (deficit <= 0) break;
        const extraUnitsNeeded = Math.ceil(deficit / item.unitPrice);
        const maxBudgetUnits = Math.floor(remainingBudget / item.unitPrice);
        let addQty = Math.min(extraUnitsNeeded, maxBudgetUnits);
        const prod = PRODUCT_MAP[item.productId]!;
        if (prod.storageType === 'cold') {
          addQty = Math.min(addQty, availableCold);
        }

        if (addQty > 0) {
          item.quantity += addQty;
          item.estimatedCost += addQty * item.unitPrice;
          totalCost += addQty * item.unitPrice;
          remainingBudget -= addQty * item.unitPrice;
          if (prod.storageType === 'cold') availableCold -= addQty;
        }
      }

      if (totalCost < supplier.minOrderValue) {
        appliedConstraints.push(
          `Đơn hàng (${totalCost.toLocaleString('vi-VN')} ₫) chưa đạt đơn tối thiểu (${supplier.minOrderValue.toLocaleString('vi-VN')} ₫)`
        );
      }
    }
  }

  // Deduplicate constraints
  const uniqueConstraints = Array.from(new Set(appliedConstraints));

  let explanation = '';
  if (suggestedItems.length === 0) {
    explanation = 'Tồn kho hiện tại và các đơn đang giao đã đủ đáp ứng nhu cầu dự kiến.';
  } else {
    explanation = `Gợi ý ${suggestedItems.length} mặt hàng (${totalQuantity} sản phẩm) từ ${supplier.name} với tổng chi phí ${totalCost.toLocaleString('vi-VN')} ₫.`;
    if (suggestedItems.some((it) => it.isFallback)) {
      explanation += ' Một số mặt hàng được gợi ý thử nghiệm mức nhỏ do chưa có đủ lịch sử bán.';
    }
  }

  return {
    supplierId,
    items: suggestedItems,
    totalCost,
    totalQuantity,
    coldItemCount,
    appliedConstraints: uniqueConstraints,
    explanation,
  };
}
