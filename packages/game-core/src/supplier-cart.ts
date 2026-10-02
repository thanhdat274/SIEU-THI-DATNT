import { PRODUCT_MAP, SUPPLIER_MAP } from '@game/data';
import type { SupplierCartItem, SupplierCartLine, SupplierCartValidationResult, SupplierDayState } from '@game/shared';
import { warehouseCellsFor } from './store-layout';
import { nextDeliveryDay, wholesaleQuote } from './supplier-market';

/** Trạng thái tiệm mà việc kiểm giỏ hàng cần đọc; tách khỏi `GameSimulation` để kiểm thử độc lập. */
export interface SupplierCartContext {
  level: number;
  money: number;
  day: number;
  /** Báo giá/tồn hôm nay của nhà cung cấp đang chọn (nếu đã tính). */
  supplierState?: SupplierDayState;
  coldCapacity: number;
  reservedColdCount: number;
  ambientUnitsOf: (productId: string) => number;
  ambientFreeCells: number;
}

/**
 * Kiểm toàn bộ giỏ hàng của một nhà cung cấp theo kiểu nguyên tử:
 * trả về mọi lý do không hợp lệ (cấp, tồn, tối thiểu, tiền, chỗ kho) và các dòng đã báo giá.
 */
export function validateSupplierCart(
  supplierId: string,
  items: SupplierCartItem[],
  ctx: SupplierCartContext
): SupplierCartValidationResult {
  const reasons: string[] = [];
  const supplier = SUPPLIER_MAP[supplierId];
  if (!supplier) {
    reasons.push('Nhà cung cấp không tồn tại');
  } else if (supplier.unlockLevel > ctx.level) {
    reasons.push(`Nhà cung cấp mở khóa ở cấp ${supplier.unlockLevel}`);
  }

  if (!items || items.length === 0) {
    reasons.push('Giỏ hàng trống');
  }

  let listTotal = 0;
  let itemCount = 0;
  let coldItemCount = 0;
  const state = ctx.supplierState;
  const qtyByProduct: Record<string, number> = {};
  const cartLines: SupplierCartLine[] = [];

  for (const line of items ?? []) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      reasons.push(`Số lượng sản phẩm ${line.productId} không hợp lệ`);
      continue;
    }
    const product = PRODUCT_MAP[line.productId];
    if (!product) {
      reasons.push(`Sản phẩm ${line.productId} không tồn tại`);
      continue;
    }
    if (product.unlockLevel > ctx.level) {
      reasons.push(`Sản phẩm ${product.name} mở khóa ở cấp ${product.unlockLevel}`);
    }
    qtyByProduct[line.productId] = (qtyByProduct[line.productId] ?? 0) + line.quantity;
    const quote = supplier ? wholesaleQuote(supplier, product, state, line.quantity) : undefined;
    listTotal += (quote?.listPrice ?? product.purchasePrice) * line.quantity;
    cartLines.push({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: quote?.unit ?? product.purchasePrice,
      lineTotal: (quote?.unit ?? product.purchasePrice) * line.quantity,
      bulkDiscount: quote?.bulk ?? 0,
    });
    itemCount += line.quantity;
    if (product.storageType === 'cold') {
      coldItemCount += line.quantity;
    }
  }

  const subtotal = Math.round(listTotal);
  if (supplier && state) {
    for (const [productId, quantity] of Object.entries(qtyByProduct)) {
      const name = PRODUCT_MAP[productId].name;
      if (state.unavailable.includes(productId)) {
        reasons.push(`${name}: ${supplier.name} tạm ngừng cung`);
      } else if (supplier.stockPerProductPerDay !== undefined && quantity > (state.stockLeft[productId] ?? 0)) {
        reasons.push(`${name}: ${supplier.name} chỉ còn ${state.stockLeft[productId] ?? 0} hôm nay (cần ${quantity})`);
      }
    }
  }
  if (supplier && subtotal < supplier.minOrderValue) {
    reasons.push(`Chưa đạt giá trị đơn tối thiểu ${supplier.minOrderValue.toLocaleString('vi-VN')} ₫ của ${supplier.name}`);
  }

  const discountRate = supplier?.discountRate ?? 0;
  const discountAmount = Math.round(subtotal * discountRate);
  const totalCost = Math.max(0, subtotal - discountAmount);

  if (totalCost > ctx.money) {
    reasons.push(`Không đủ tiền (cần ${totalCost.toLocaleString('vi-VN')} ₫, hiện có ${ctx.money.toLocaleString('vi-VN')} ₫)`);
  }

  if (coldItemCount > 0 && ctx.reservedColdCount + coldItemCount > ctx.coldCapacity) {
    reasons.push(`Kho mát không đủ chỗ (cần thêm ${coldItemCount}, còn ${Math.max(0, ctx.coldCapacity - ctx.reservedColdCount)} chỗ)`);
  }

  let ambientNeededCells = 0;
  for (const [productId, quantity] of Object.entries(qtyByProduct)) {
    const product = PRODUCT_MAP[productId];
    if (product.storageType === 'cold') continue;
    const held = ctx.ambientUnitsOf(productId);
    ambientNeededCells += warehouseCellsFor(product, held + quantity) - warehouseCellsFor(product, held);
  }
  if (ambientNeededCells > 0 && ambientNeededCells > ctx.ambientFreeCells) {
    reasons.push(`Kho thường không đủ chỗ (cần thêm ${ambientNeededCells} ô, còn ${ctx.ambientFreeCells} ô)`);
  }

  return {
    valid: reasons.length === 0,
    supplierId,
    subtotal,
    discountAmount,
    totalCost,
    itemCount,
    coldItemCount,
    reasons,
    lines: cartLines,
    deliveryDay: supplier ? nextDeliveryDay(supplier, ctx.day + supplier.delayDays) : undefined,
  };
}
