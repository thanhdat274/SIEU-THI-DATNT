/** Logic giỏ nhập hàng thuần (không phụ thuộc React) để kiểm thử. */
export type CartQuantities = Record<string, number>;

export function clampCartQty(n: number, supplierStock: number): number {
  return Math.max(0, Math.min(Math.max(0, supplierStock), Math.trunc(Number.isFinite(n) ? n : 0)));
}

export function setCartQuantity(cart: CartQuantities, id: string, n: number, supplierStock: number): CartQuantities {
  const next = { ...cart };
  const qty = clampCartQty(n, supplierStock);
  if (qty <= 0) delete next[id]; else next[id] = qty;
  return next;
}

/** quantityToAdd = min(gợi ý, tồn NCC - đã có trong giỏ) */
export function addRecommendation(cart: CartQuantities, id: string, recommended: number, supplierStock: number): CartQuantities {
  const room = Math.max(0, supplierStock - (cart[id] ?? 0));
  const add = Math.min(recommended, room);
  return add > 0 ? { ...cart, [id]: (cart[id] ?? 0) + add } : cart;
}
