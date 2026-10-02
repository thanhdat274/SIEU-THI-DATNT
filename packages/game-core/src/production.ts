import { InventoryItem, ProductionJob, StockLot } from '@game/shared';
import { Recipe } from '@game/data';
import { mergeLots, normalizeLots, sumLots, takeLots } from './stock';

export interface MissingIngredient {
  productId: string;
  needed: number;
  available: number;
}

/** Số hàng còn dùng được (chưa hết hạn) của một sản phẩm trong kho. */
function usableUnits(inventory: InventoryItem[], productId: string, day: number): number {
  const slot = inventory.find(item => item.productId === productId);
  if (!slot) return 0;
  return normalizeLots(slot.quantity, slot.lots, productId, day).filter(lot => lot.expiresOnDay > day).reduce((sum, lot) => sum + lot.quantity, 0);
}

export function missingIngredients(inventory: InventoryItem[], recipe: Recipe, day: number): MissingIngredient[] {
  return recipe.inputs
    .map(input => ({ productId: input.productId, needed: input.quantity, available: usableUnits(inventory, input.productId, day) }))
    .filter(entry => entry.available < entry.needed);
}

/**
 * Trừ nguyên liệu theo FEFO, chỉ khi đủ toàn bộ (không trừ một phần). Trả về tổng giá vốn và hạn dùng sớm nhất của các lô đã lấy,
 * hoặc undefined nếu thiếu; khi undefined, kho không bị sửa.
 */
export function consumeIngredients(inventory: InventoryItem[], recipe: Recipe, day: number): { inputCost: number; inputExpiresOnDay: number } | undefined {
  if (missingIngredients(inventory, recipe, day).length > 0) return undefined;
  let inputCost = 0;
  let inputExpiresOnDay = Number.MAX_SAFE_INTEGER;
  for (const input of recipe.inputs) {
    const slot = inventory.find(item => item.productId === input.productId)!;
    slot.lots = normalizeLots(slot.quantity, slot.lots, input.productId, day);
    // Lô đã hết hạn nằm đầu hàng đợi FEFO; tách ra để không bị dùng nhầm.
    const expired = slot.lots.filter(lot => lot.expiresOnDay <= day);
    const fresh = slot.lots.filter(lot => lot.expiresOnDay > day);
    const taken: StockLot[] = takeLots(fresh, input.quantity);
    for (const lot of taken) {
      inputCost += lot.quantity * (lot.unitCost ?? 0);
      inputExpiresOnDay = Math.min(inputExpiresOnDay, lot.expiresOnDay);
    }
    slot.lots = [...expired, ...fresh].sort((a, b) => a.expiresOnDay - b.expiresOnDay);
    slot.quantity = sumLots(slot.lots);
  }
  return { inputCost, inputExpiresOnDay };
}

/** Thêm đầu ra của mẻ vào kho với lô, giá vốn bình quân và hạn dùng (không dài hơn hạn nguyên liệu). */
export function addProductionOutput(inventory: InventoryItem[], recipe: Recipe, job: ProductionJob, completionDay: number, shelfLifeDays: number | undefined): StockLot {
  const ownExpiry = shelfLifeDays ? completionDay + shelfLifeDays : Number.MAX_SAFE_INTEGER;
  const lot: StockLot = {
    quantity: recipe.outputQuantity,
    expiresOnDay: Math.min(ownExpiry, job.inputExpiresOnDay),
    unitCost: Math.ceil(job.inputCost / recipe.outputQuantity),
    provenance: 'known',
  };
  let slot = inventory.find(item => item.productId === recipe.outputProductId);
  if (!slot) {
    slot = { productId: recipe.outputProductId, quantity: 0, lots: [] };
    inventory.push(slot);
  }
  slot.lots = normalizeLots(slot.quantity, slot.lots, recipe.outputProductId, completionDay);
  mergeLots(slot.lots, [lot]);
  slot.quantity = sumLots(slot.lots);
  return lot;
}

export function sanitizeProductionJobs(raw: unknown): ProductionJob[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((job): job is ProductionJob => !!job && typeof job.id === 'string' && typeof job.recipeId === 'string'
    && typeof job.stationId === 'string' && Number.isFinite(job.remaining) && job.remaining >= 0
    && Number.isFinite(job.inputCost) && job.inputCost >= 0 && Number.isFinite(job.inputExpiresOnDay) && Number.isSafeInteger(job.startedDay))
    .map(job => ({ ...job }));
}
