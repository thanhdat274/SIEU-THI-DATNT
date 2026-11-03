// ============================================================================
// Data: Farm ↔ Quán nước — pha hay bán lẻ nông sản nhà trồng (GĐ1093)
// ----------------------------------------------------------------------------
// Nối tiếp GĐ147 (farmKitchenValue — "nấu hay bán" cho BẾP) và loạt GĐ1088–1092
// (mọi trái cây nhà đều đã có món quán nước): trước đây soi sáng ở vườn chỉ xét
// công thức bếp — nông sản như vải/ổi/chuối hiện "không vào bếp nào" dù đã có
// ly pha ở quán → panel tư vấn sai ("chỉ bán lẻ được"). Hàm này xét thêm
// QUAN_RECIPES: dùng 1 đơn vị nông sản pha được `cups` ly (theo đúng quy ước
// uses), nguyên liệu khác lấy theo tỷ lệ ly, cơ hội phí = bán lẻ nhà trồng ×1,2.
// Thuần đọc 100% — chỉ đọc QUAN_RECIPES + productById + homegrownSell, KHÔNG đổi
// state/kinh tế/SAVE_VERSION/persist; UI chỉ tính + hiển thị.
// ============================================================================

import { type QuanRecipe, QUAN_RECIPES } from './quanRecipes';
import { productById } from './products';
import { homegrownSell } from './farmValue';

export type FarmDrinkVerdict = 'brew' | 'sell' | 'even';

export interface HomegrownDrinkDecision {
  recipe: QuanRecipe;
  /** 1 đơn vị nông sản pha được bao nhiêu ly. */
  glasses: number;
  /** Doanh thu các ly từ 1 đơn vị nông sản. */
  revenue: number;
  /** Chi phí nguyên liệu khác (tra/sữa/đá…) theo đúng tỷ lệ ly. */
  otherCost: number;
  /** Lãi pha khi coi nông sản mình đáng giá bằng bán lẻ nhà trồng (cơ hội phí thật). */
  homegrownNet: number;
  /** 'brew' = pha hời hơn bán lẻ; 'sell' = bán lẻ hời hơn pha; 'even' = ngang. */
  verdict: FarmDrinkVerdict;
}

/** Quyết định "pha món này hay bán lẻ nông sản p" cho một món quán nước dùng p. Trả null nếu p không phải nguyên liệu. */
export function homegrownDrinkDecision(r: QuanRecipe, productId: string): HomegrownDrinkDecision | null {
  const own = r.uses.find((u) => u.id === productId);
  if (!own) return null;
  const revenue = r.price * own.cups;
  const otherCost = r.uses.reduce(
    (n, u) => (u.id === productId ? n : n + (own.cups / u.cups) * productById(u.id).buy),
    0,
  );
  const homegrownNet = revenue - otherCost - homegrownSell(productId);
  const verdict: FarmDrinkVerdict = homegrownNet > 0 ? 'brew' : homegrownNet < 0 ? 'sell' : 'even';
  return { recipe: r, glasses: own.cups, revenue, otherCost, homegrownNet, verdict };
}

export interface FarmVsDrinks {
  productId: string;
  /** Bán lẻ 1 đơn vị (nhà trồng ×1,2). */
  sellPerUnit: number;
  /** Mọi món quán nước dùng nông sản này, sắp theo lãi pha giảm dần. */
  drinks: HomegrownDrinkDecision[];
  /** Món pha lãi cao nhất — nơi nông sản này bõ nhất ở quán. */
  best: HomegrownDrinkDecision | null;
  /** 'brew' nếu có ≥1 món pha hời, 'sell' nếu không có món nào dùng / pha đều lỗ. */
  verdict: FarmDrinkVerdict;
}

/** Toàn bộ quyết định "pha hay bán lẻ" cho 1 nông sản nhà trồng, xét mọi món quán nước có dùng nó. */
export function farmVsDrinks(productId: string, minUnlock = 0): FarmVsDrinks {
  const drinks = QUAN_RECIPES.filter((r) => minUnlock === 0 || r.unlock >= minUnlock)
    .map((r) => homegrownDrinkDecision(r, productId))
    .filter((d): d is HomegrownDrinkDecision => d !== null)
    .sort((a, b) => b.homegrownNet - a.homegrownNet);
  const best = drinks.length ? drinks[0] : null;
  const verdict: FarmDrinkVerdict = best ? best.verdict : 'sell';
  return { productId, sellPerUnit: homegrownSell(productId), drinks, best, verdict };
}

/** Mọi nông sản nhà trồng/nuôi có ít nhất một món quán nước pha. */
export function drinkableProducts(): string[] {
  const ids = new Set<string>();
  for (const r of QUAN_RECIPES) for (const u of r.uses) ids.add(u.id);
  return [...ids];
}
