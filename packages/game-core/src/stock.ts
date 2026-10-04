import { StockLot } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';

export function expiryDay(productId: string, receivedDay: number): number {
  const days = PRODUCT_MAP[productId]?.expirationRules?.daysToSpoil;
  return days ? receivedDay + days : Number.MAX_SAFE_INTEGER;
}

export function sumLots(lots: StockLot[]): number {
  return lots.reduce((total, lot) => total + lot.quantity, 0);
}

/**
 * Hàng lẻ (đã mở thùng) trong các lô: `quantity` của lô gồm cả hàng còn nguyên thùng (`caseCount` × `caseSize`),
 * chỉ phần lẻ mới được châm lên kệ. Không có `caseSize` (món không bán theo thùng) thì mọi hàng đều là hàng lẻ.
 */
export function looseUnits(lots: readonly StockLot[] | undefined, caseSize?: number): number {
  return (lots ?? []).reduce((total, lot) => total + Math.max(0, lot.quantity - (caseSize ? (lot.caseCount ?? 0) * caseSize : 0)), 0);
}

/** Số thùng còn nguyên trong các lô. */
export function sealedCases(lots: readonly StockLot[] | undefined): number {
  return (lots ?? []).reduce((total, lot) => total + (lot.caseCount ?? 0), 0);
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

/**
 * Transfer oldest stock first; mutates source lots and returns the moved lots with unitCost and provenance preserved.
 * Hàng lấy ra luôn là hàng lẻ (không mang `caseCount`). Có `caseSize`:
 * - `looseOnly` (châm kệ): chỉ lấy phần lẻ của từng lô, hàng còn nguyên thùng ở lại kho;
 * - mặc định (tiêu hủy, quầy dùng nguyên liệu...): lấy theo hạn như cũ; trong một lô, phần lẻ hết trước rồi mới khui thùng
 *   (bớt `caseCount` cho khớp, không bao giờ vượt `quantity / caseSize`).
 */
export function takeLots(source: StockLot[], amount: number, options: { caseSize?: number; looseOnly?: boolean } = {}): StockLot[] {
  const { caseSize, looseOnly = false } = options;
  source.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
  const moved: StockLot[] = [];
  let remaining = amount;
  for (let i = 0; remaining > 0 && i < source.length;) {
    const lot = source[i];
    const sealed = caseSize ? (lot.caseCount ?? 0) * caseSize : 0;
    const takeable = looseOnly ? Math.max(0, lot.quantity - sealed) : lot.quantity;
    const quantity = Math.min(remaining, takeable);
    if (quantity <= 0) { i++; continue; }
    moved.push({
      quantity,
      expiresOnDay: lot.expiresOnDay,
      unitCost: lot.unitCost,
      provenance: lot.provenance,
      ...(lot.decayCarry ? { decayCarry: lot.decayCarry } : {}),
    });
    lot.quantity -= quantity;
    remaining -= quantity;
    if (caseSize && lot.caseCount) {
      lot.caseCount = Math.min(lot.caseCount, Math.floor(lot.quantity / caseSize));
      if (lot.caseCount === 0) delete lot.caseCount;
    }
    if (lot.quantity === 0) source.splice(i, 1);
    else i++;
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
    if (match) {
      match.quantity += lot.quantity;
      // Gộp lô thì cộng cả số thùng (trước đây thùng của lô gộp vào bị mất, hàng thành lẻ hết).
      if (lot.caseCount) match.caseCount = (match.caseCount ?? 0) + lot.caseCount;
    } else target.push({ ...lot });
  }
  target.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
}
