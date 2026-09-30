import { StockLot } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';

export function expiryDay(productId: string, receivedDay: number): number {
  const days = PRODUCT_MAP[productId]?.expirationRules?.daysToSpoil;
  return days ? receivedDay + days : Number.MAX_SAFE_INTEGER;
}

export function sumLots(lots: StockLot[]): number {
  return lots.reduce((total, lot) => total + lot.quantity, 0);
}

/** Old saves have only aggregate quantities or lack unitCost. Give those goods a full shelf life and estimated cost on migration. */
export function normalizeLots(quantity: number, lots: StockLot[] | undefined, productId: string, day: number): StockLot[] {
  const defaultCost = PRODUCT_MAP[productId]?.purchasePrice ?? 0;
  if (lots) {
    const valid = lots
      .filter((lot) => Number.isSafeInteger(lot.quantity) && lot.quantity > 0 && Number.isSafeInteger(lot.expiresOnDay))
      .map((lot) => ({
        ...lot,
        unitCost: lot.unitCost ?? defaultCost,
        provenance: (lot.provenance ?? 'estimated') as 'estimated' | 'known',
      }))
      .sort((a, b) => a.expiresOnDay - b.expiresOnDay);

    // Interrupted/partial older writes may have an aggregate quantity without
    // the matching lot. Preserve the missing goods rather than deleting them.
    const missing = quantity - sumLots(valid);
    if (Number.isSafeInteger(missing) && missing > 0) {
      mergeLots(valid, [
        {
          quantity: missing,
          expiresOnDay: expiryDay(productId, day),
          unitCost: defaultCost,
          provenance: 'estimated',
        },
      ]);
    }
    return valid;
  }
  return Number.isSafeInteger(quantity) && quantity > 0
    ? [
        {
          quantity,
          expiresOnDay: expiryDay(productId, day),
          unitCost: defaultCost,
          provenance: 'estimated',
        },
      ]
    : [];
}

/** Transfer oldest stock first; mutates source lots and returns the moved lots with unitCost and provenance preserved. */
export function takeLots(source: StockLot[], amount: number): StockLot[] {
  source.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
  const moved: StockLot[] = [];
  let remaining = amount;
  while (remaining > 0 && source.length > 0) {
    const lot = source[0];
    const quantity = Math.min(remaining, lot.quantity);
    moved.push({
      quantity,
      expiresOnDay: lot.expiresOnDay,
      unitCost: lot.unitCost,
      provenance: lot.provenance,
      ...(lot.decayCarry ? { decayCarry: lot.decayCarry } : {}),
    });
    lot.quantity -= quantity;
    remaining -= quantity;
    if (lot.quantity === 0) source.shift();
  }
  return moved;
}

export function mergeLots(target: StockLot[], incoming: StockLot[]): void {
  for (const lot of incoming) {
    const match = target.find(
      (existing) =>
        existing.expiresOnDay === lot.expiresOnDay &&
        existing.unitCost === lot.unitCost &&
        existing.provenance === lot.provenance &&
        (existing.decayCarry ?? 0) === (lot.decayCarry ?? 0)
    );
    if (match) match.quantity += lot.quantity;
    else target.push({ ...lot });
  }
  target.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
}
