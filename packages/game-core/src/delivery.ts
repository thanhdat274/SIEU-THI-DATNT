import { PRODUCT_MAP } from '@game/data';
import type { HoldingItem, InventoryItem, StockLot, SupplierOrder } from '@game/shared';
import { expiryDay, mergeLots, sumLots } from './stock';

export interface DeliveryTarget {
  inventory: InventoryItem[];
  holdingArea: HoldingItem[];
  /** Chỗ mát còn trống tại thời điểm gọi; được tính lại cho từng đơn vì kho thay đổi giữa các đơn. */
  freeColdSlots: () => number;
  /** Ngày hạn cộng thêm từ kỹ năng cho hàng tươi. */
  freshExtraDays: number;
}

function addLot(inventory: InventoryItem[], productId: string, quantity: number, lot: StockLot): void {
  const slot = inventory.find((item) => item.productId === productId);
  if (slot) {
    mergeLots(slot.lots!, [lot]);
    slot.quantity = sumLots(slot.lots!);
  } else {
    inventory.push({ productId, quantity, lots: [lot] });
  }
}

/**
 * Nhận các đơn đã đến hạn vào kho: đánh dấu đã giao, tạo lô theo giá vốn và hạn dùng.
 * Hàng mát vượt chỗ trống chuyển sang `holdingArea`. Trả về số hàng thực sự vào kho.
 * Sửa trực tiếp `orders`, `inventory` và `holdingArea`.
 */
export function receiveDeliveredOrders(orders: SupplierOrder[], day: number, target: DeliveryTarget): number {
  let deliveredCount = 0;
  for (const order of orders) {
    order.delivered = true;
    order.deliveryDay = day;
    const product = PRODUCT_MAP[order.productId];
    const expiry = expiryDay(order.productId, day) + target.freshExtraDays;
    const newLot = (quantity: number, caseCount: number = 0): StockLot => ({ quantity, expiresOnDay: expiry, unitCost: order.unitCost, provenance: 'known', caseCount });

    if (product?.storageType === 'cold') {
      const fitQty = Math.min(order.quantity, Math.max(0, target.freeColdSlots()));
      const overflowQty = order.quantity - fitQty;
      if (fitQty > 0) {
        addLot(target.inventory, order.productId, fitQty, newLot(fitQty, order.caseCount ?? 0));
        deliveredCount += fitQty;
      }
      if (overflowQty > 0) {
        target.holdingArea.push({
          id: `holding-${order.id}-${target.holdingArea.length + 1}`,
          productId: order.productId,
          quantity: overflowQty,
          expiresOnDay: expiry,
          originalArrivalDay: order.arrivalDay,
          unitCost: order.unitCost,
          provenance: 'known',
        });
      }
    } else {
      addLot(target.inventory, order.productId, order.quantity, newLot(order.quantity, order.caseCount ?? 0));
      deliveredCount += order.quantity;
    }
  }
  return deliveredCount;
}
