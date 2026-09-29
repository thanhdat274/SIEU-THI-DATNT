import { StockLot } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';

export function expiryDay(productId: string, receivedDay: number): number {
  const days = PRODUCT_MAP[productId]?.expirationRules?.daysToSpoil;
  return days ? receivedDay + days : Number.MAX_SAFE_INTEGER;
}

export function sumLots(lots: StockLot[]): number {
  return lots.reduce((total, lot) => total + lot.quantity, 0);
}

/** Old saves have only aggregate quantities. Give those goods a full shelf life on migration. */
export function normalizeLots(quantity: number, lots: StockLot[] | undefined, productId: string, day: number): StockLot[] {
  if (lots) {
    return lots.filter((lot) => Number.isSafeInteger(lot.quantity) && lot.quantity > 0 && Number.isSafeInteger(lot.expiresOnDay))
      .map((lot) => ({ ...lot })).sort((a, b) => a.expiresOnDay - b.expiresOnDay);
  }
  return Number.isSafeInteger(quantity) && quantity > 0
    ? [{ quantity, expiresOnDay: expiryDay(productId, day) }]
    : [];
}

/** Transfer oldest stock first; mutates source lots and returns the moved lots. */
export function takeLots(source: StockLot[], amount: number): StockLot[] {
  const moved: StockLot[] = [];
  let remaining = amount;
  while (remaining > 0 && source.length > 0) {
    const lot = source[0];
    const quantity = Math.min(remaining, lot.quantity);
    moved.push({ quantity, expiresOnDay: lot.expiresOnDay });
    lot.quantity -= quantity;
    remaining -= quantity;
    if (lot.quantity === 0) source.shift();
  }
  return moved;
}

export function mergeLots(target: StockLot[], incoming: StockLot[]): void {
  for (const lot of incoming) {
    const sameDay = target.find((existing) => existing.expiresOnDay === lot.expiresOnDay);
    if (sameDay) sameDay.quantity += lot.quantity;
    else target.push({ ...lot });
  }
  target.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
}
