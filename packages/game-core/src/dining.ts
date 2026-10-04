import type { InventoryItem } from '@game/shared';
import { DINING, PRODUCT_MAP, type DiningAddOnRule } from '@game/data';
import { normalizeLots, sumLots, takeLots } from './stock';
import { Mulberry32Rng, daySeed } from './staff';
import { hashSeed } from './weather';

/**
 * Các món khách gọi thêm khi vừa ngồi bàn. Xác định theo (ngày, khách): cùng đầu vào luôn ra cùng kết quả,
 * nên server phát lại và client nạp lại không lệch nhau. Tối đa `DINING.maxExtraOrders` món, mỗi món một lần.
 */
export function rollDiningAddOns(rules: readonly DiningAddOnRule[], basketProductIds: readonly string[], customerKey: string, day: number): string[] {
  const rng = new Mulberry32Rng(daySeed(day, hashSeed(`dining-addon:${customerKey}`)));
  const picked: string[] = [];
  for (const rule of rules) {
    if (!rule.whenProductIds.some(id => basketProductIds.includes(id))) continue;
    for (const addOn of rule.addOns) {
      const roll = rng.next(); // luôn rút để kết quả không phụ thuộc vào món trước đó có được chọn hay không
      if (picked.length >= DINING.maxExtraOrders || picked.includes(addOn.productId)) continue;
      if (roll < addOn.chance) picked.push(addOn.productId);
    }
  }
  return picked;
}

/** Lấy `quantity` đơn vị còn hạn từ kho theo FEFO. Trả giá vốn, hoặc undefined nếu không đủ (kho không bị sửa). */
export function takeInventoryUnits(inventory: InventoryItem[], productId: string, quantity: number, day: number): { cost: number } | undefined {
  const slot = inventory.find(item => item.productId === productId);
  if (!slot) return undefined;
  const lots = normalizeLots(slot.quantity, slot.lots, productId, day);
  const expired = lots.filter(lot => lot.expiresOnDay <= day);
  const fresh = lots.filter(lot => lot.expiresOnDay > day);
  if (sumLots(fresh) < quantity) return undefined;
  const taken = takeLots(fresh, quantity, { caseSize: PRODUCT_MAP[productId]?.caseSize });
  slot.lots = [...expired, ...fresh].sort((a, b) => a.expiresOnDay - b.expiresOnDay);
  slot.quantity = sumLots(slot.lots);
  return { cost: taken.reduce((sum, lot) => sum + lot.quantity * (lot.unitCost ?? 0), 0) };
}
