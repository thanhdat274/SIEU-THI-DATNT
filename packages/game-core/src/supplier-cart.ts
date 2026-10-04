import { PRODUCT_MAP, SUPPLIER_MAP } from '@game/data';
import type { SupplierCartItem, SupplierCartLine, SupplierCartValidationResult, SupplierDayState, StockLot } from '@game/shared';
import { warehouseCellsFor } from './store-layout';
import { nextDeliveryDay, wholesaleQuote } from './supplier-market';

/** Kiểm tra số lượng có phải bội số của caseSize không (nếu có caseSize). */
function isCaseMultiple(productId: string, quantity: number): boolean {
  const product = PRODUCT_MAP[productId];
  if (!product?.caseSize) return true; // không có caseSize = mua lẻ tự do
  return quantity % product.caseSize === 0;
}

/** Lấy số case từ số lượng (floor division). */
function quantityToCases(productId: string, quantity: number): number {
  const product = PRODUCT_MAP[productId];
  if (!product?.caseSize) return 0;
  return Math.floor(quantity / product.caseSize);
}

/** Tính giá case với chiết khấu 5% so mua lẻ. */
function caseDiscount(unitPrice: number, caseSize: number): number {
  const casePriceWithoutDiscount = unitPrice * caseSize;
  const casePriceWithDiscount = Math.round(casePriceWithoutDiscount * 0.95); // 5% discount
  return casePriceWithDiscount;
}

/** Giờ đại lý giao ngay trong ngày (hỏa tốc) ngừng nhận đơn. */
export const SAME_DAY_SUPPLIER_CUTOFF_HOUR = 22;

/** Trạng thái tiệm mà việc kiểm giỏ hàng cần đọc; tách khỏi `GameSimulation` để kiểm thử độc lập. */
export interface SupplierCartContext {
  level: number;
  money: number;
  day: number;
  /** Giờ game hiện tại; đại lý giao ngay trong ngày không nhận đơn từ `SAME_DAY_SUPPLIER_CUTOFF_HOUR`. */
  hour?: number;
  /** Báo giá/tồn hôm nay của nhà cung cấp đang chọn (nếu đã tính). */
  supplierState?: SupplierDayState;
  coldCapacity: number;
  reservedColdCount: number;
  ambientUnitsOf: (productId: string) => number;
  ambientFreeCells: number;
  /** Giảm giá thêm từ kỹ năng (0–1), áp lên giá sau chiết khấu NCC; khớp `GameSimulation.wholesaleUnitPrice`. */
  skillDiscount?: number;
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
  } else if (supplier.delayDays === 0 && ctx.hour !== undefined && ctx.hour >= SAME_DAY_SUPPLIER_CUTOFF_HOUR) {
    reasons.push(`${supplier.name} đã nghỉ sau ${SAME_DAY_SUPPLIER_CUTOFF_HOUR}:00, hãy đặt đại lý khác hoặc đặt lại sáng mai`);
  }

  if (!items || items.length === 0) {
    reasons.push('Giỏ hàng trống');
  }

  let listTotal = 0;
  let itemCount = 0;
  let coldItemCount = 0;
  const state = ctx.supplierState;
  const skillDiscount = Math.min(1, Math.max(0, ctx.skillDiscount ?? 0));
  const unitAfterSkill = (unit: number) => (skillDiscount > 0 ? Math.round(unit * (1 - skillDiscount)) : unit);
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

    // Xử lý giá theo case/lẻ
    const quote = supplier ? wholesaleQuote(supplier, product, state, line.quantity) : undefined;
    const baseUnitPrice = quote?.unit ?? product.purchasePrice;
    let lineTotal = baseUnitPrice * line.quantity;
    let caseCount = 0;

    if (product.caseSize && line.quantity >= product.caseSize) {
      // Tính số case đầy
      caseCount = Math.floor(line.quantity / product.caseSize);
      const remainingUnits = line.quantity % product.caseSize;

      // Giá case (giảm 5%)
      const casePrice = caseDiscount(baseUnitPrice, product.caseSize);
      lineTotal = casePrice * caseCount + baseUnitPrice * remainingUnits;
    }
    // Tổng niêm yết (trước chiết khấu NCC/kỹ năng) là cơ sở trừ tiền: thiếu dòng này thì subtotal = 0 và đặt hàng miễn phí.
    // Hàng lẻ giữ như trước (giá niêm yết × số lượng); phần đủ thùng giảm 5% như `caseDiscount`.
    const listUnit = quote?.listPrice ?? product.purchasePrice;
    listTotal += caseCount > 0 && product.caseSize
      ? caseDiscount(listUnit, product.caseSize) * caseCount + listUnit * (line.quantity % product.caseSize)
      : listUnit * line.quantity;

    cartLines.push({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: unitAfterSkill(baseUnitPrice),
      lineTotal: unitAfterSkill(lineTotal),
      bulkDiscount: quote?.bulk ?? 0,
      caseCount, // số case trong line này
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
  const supplierDiscount = Math.round(subtotal * discountRate);
  const afterSupplier = Math.max(0, subtotal - supplierDiscount);
  const skillCut = skillDiscount > 0 ? Math.round(afterSupplier * skillDiscount) : 0;
  const discountAmount = supplierDiscount + skillCut;
  const totalCost = afterSupplier - skillCut;

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
