// ============================================================================
// Data: Farm ↔ Kitchen — nấu hay bán lẻ nông sản nhà trồng/nuôi (GĐ147)
// ----------------------------------------------------------------------------
// Mặt ghép biên giữa GĐ146 (farmValue — trồng/nuôi) và GĐ145 (kitchenValue — nấu),
// đóng khép chuỗi sản xuất lõi "trại → kho → bếp → quầy": sau khi thu hoạch 1 nông
// sản NHÀ TRỒNG/NUÔI, người chơi phải chọn đưa nó đi bán lẻ ở quầy (được cộng 20%
// nhãn nhà trồng, HOMEGROWN_PREMIUM) hay chế thành món. Câu hỏi:
//   - BÁN LẺ: homegrownSell(p) = round(sell × 1,2) mỗi đơn vị.
//   - DÙNG NẤU: món chín bán ra, nhưng CHI PHÍ THẬT của đám nông sản mình bỏ vào
//     không phải giá mua niêm yết (mình tự trồng) mà là GIÁ BÁN LẺ NHÀ TRỒNG mình
//     đã bỏ lỡ (cơ hội phí). Đúng giải bài "nấu hay bán nguyên liệu" của GĐ145
//     nhưng ở đúng mức giá nhà trồng (×1,2) thay vì giá bán rời thường (sell).
// Thuần đọc 100% — chỉ đọc RECIPES + productById + homegrownSell, không đổi
// state/kinh tế/SAVE_VERSION/persist; UI chỉ tính + hiển thị.
// ============================================================================

import { type Recipe, RECIPES } from './recipes';
import { productById } from './products';
import { homegrownSell } from './farmValue';

export type FarmCookVerdict = 'cook' | 'sell' | 'even';

/** Có đúng 1 lượng nguyên liệu này trong mẻ (0 nếu không phải nguyên liệu). */
export function ingredientQty(r: Recipe, productId: string): number {
  const ing = r.inputs.find((i) => i.productId === productId);
  return ing ? ing.quantity : 0;
}

export interface HomegrownRecipeDecision {
  recipe: Recipe;
  /** Lượng nông sản này mỗi mẻ. */
  quantity: number;
  /** Bán lẻ cả lot (số lượng × homegrownSell) — nếu không nấu. */
  sellLot: number;
  /** Doanh thu thành phẩm trừ tiền mua các nguyên liệu CÒN LẠI (không phải nông sản này). */
  grossBeforeOwn: number;
  /** Lãi món khi coi nông sản mình bỏ vào đáng giá bằng homegrownSell (cơ hội phí thật). */
  homegrownNet: number;
  /**
   * Nấu hời hơn bán lẻ bao nhiêu (tính cho cả lot): >0 nấu hơn, <0 bán lẻ hơn.
   * = homegrownNet − 0 (bán lẻ thì chẳng tốn nguyên liệu khác, lời = sellLot là so
   * đã vào grossBeforeOwn − sellLot); thực chất deltaVsSell chính là homegrownNet —
   * giữ tên rõ nghĩa cho UI.
   */
  deltaVsSell: number;
  /** 'cook' = nấu vẫn hời hơn bán lẻ; 'sell' = bán lẻ hời hơn nấu; 'even' = ngang. */
  verdict: FarmCookVerdict;
}

/**
 * Quyết định "nấu món này hay bán lẻ nông sản p" cho một công thức dùng p làm
 * nguyên liệu. Trả null nếu p không phải nguyên liệu của r.
 */
export function homegrownRecipeDecision(r: Recipe, productId: string): HomegrownRecipeDecision | null {
  const q = ingredientQty(r, productId);
  if (!q) return null;
  const sellLot = homegrownSell(productId) * q;
  const grossBeforeOwn =
    productById(r.outputId).sell * r.outputQty -
    r.inputs.reduce((n, i) => (i.productId === productId ? n : n + productById(i.productId).buy * i.quantity), 0);
  const homegrownNet = grossBeforeOwn - sellLot;
  const verdict: FarmCookVerdict = homegrownNet > 0 ? 'cook' : homegrownNet < 0 ? 'sell' : 'even';
  return {
    recipe: r, quantity: q, sellLot, grossBeforeOwn, homegrownNet,
    deltaVsSell: homegrownNet, verdict,
  };
}

export interface FarmVsCook {
  /** Mã nông sản nhà trồng/nuôi. */
  productId: string;
  /** Bán lẻ 1 đơn vị (nhà trồng ×1,2). */
  sellPerUnit: number;
  /** Mọi công thức dùng nông sản này, sắp theo lãi món giảm dần. */
  recipes: HomegrownRecipeDecision[];
  /** Công thức cho lãi món (homegrownNet) cao nhất — nơi nông sản này bõ nhất. */
  best: HomegrownRecipeDecision | null;
  /** Verdict chung của nông sản: 'cook' nếu có ≥1 món nấu hời, 'sell' nếu mọi món bán lẻ hời. */
  verdict: FarmCookVerdict;
}

/**
 * Toàn bộ quyết định "nấu hay bán lẻ" cho 1 nông sản nhà trồng/nuôi, dựa trên mọi
 * công thức có dùng nó. Nông sản không vào được bếp nào → recipes rỗng, best null,
 * verdict 'sell' (chỉ bán lẻ được).
 */
export function farmVsCook(productId: string, minUnlock = 0): FarmVsCook {
  const recipes = RECIPES
    .filter((r) => (minUnlock === 0 || r.unlock >= minUnlock) && !r.festival)
    .map((r) => homegrownRecipeDecision(r, productId))
    .filter((d): d is HomegrownRecipeDecision => d !== null)
    .sort((a, b) => b.homegrownNet - a.homegrownNet);
  const best = recipes.length ? recipes[0] : null;
  const verdict: FarmCookVerdict =
    !recipes.length ? 'sell'
    : best && best.homegrownNet > 0 ? 'cook'
    : best && best.homegrownNet < 0 ? 'sell'
    : 'even';
  return { productId, sellPerUnit: homegrownSell(productId), recipes, best, verdict };
}

/** Mọi nông sản nhà trồng/nuôi có ít nhất một công thức nấu. */
export function cookableProducts(minUnlock = 0): string[] {
  const ids = new Set<string>();
  for (const r of RECIPES) {
    if (minUnlock && r.unlock < minUnlock) continue;
    if (r.festival) continue; // món lễ chỉ gói trong dịp — không tính là "nấu thường"
    for (const i of r.inputs) ids.add(i.productId);
  }
  return [...ids];
}
