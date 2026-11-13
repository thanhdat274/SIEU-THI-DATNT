/** So tiến độ hai bản lưu (thuần, không đụng state) — màn chọn bản lưu và kho bản bị thay dùng chung. */
export interface SaveProgress { day: number; level: number; money: number }

/** <0: a kém tiến độ hơn b; >0: a tiến xa hơn; 0: ngang nhau. Cấp trước, rồi ngày, rồi tiền. */
export function compareProgress(a: SaveProgress, b: SaveProgress): number {
  return (a.level - b.level) || (a.day - b.day) || (a.money - b.money);
}

/** Bản tiến xa hơn rõ ràng (cấp hoặc ngày cao hơn) thì trả về nó; ngang nhau/không phân biệt → null. */
export function aheadOf(a: SaveProgress, b: SaveProgress): 'a' | 'b' | null {
  const c = (a.level - b.level) || (a.day - b.day);
  return c > 0 ? 'a' : c < 0 ? 'b' : null;
}

/** Chọn `chosen` mà bỏ `other` thì mất nhiều tiến độ không (kém ≥ 2 cấp hoặc ≥ 3 ngày, và không hơn ở mặt nào). */
export function losesMuch(chosen: SaveProgress, other: SaveProgress): boolean {
  if (chosen.level > other.level || chosen.day > other.day) return false;
  return other.level - chosen.level >= 2 || other.day - chosen.day >= 3;
}
