import { productById } from './products';

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1496 — sao món theo lượt bán + đồ đựng đổi bậc (đối chiếu hệ sao món của khu
// ăn tại chỗ tham khảo, rút ngắn mốc cho tốc độ game mình). Món bán càng nhiều:
// giá bán tăng (thưởng ở quầy) và đồ đựng đổi sang bậc xịn hơn — mục tiêu ngắn
// đếm ngược được ngay trên thẻ món (Sổ nấu 🍳).
// ─────────────────────────────────────────────────────────────────────────────

/** Lượt bán cần để đạt 1★/2★/3★ (rút ngắn so với mốc tham khảo 50/250/2500). */
export const DISH_STAR_STEPS = [20, 100, 800] as const;
/** Giá bán tăng theo sao (mức 1★/2★/3★). */
export const DISH_STAR_BONUS = [0.1, 0.25, 0.6] as const;

/** Sao hiện tại của món theo tổng lượt bán (0–3). */
export const dishStars = (served: number): number =>
  DISH_STAR_STEPS.filter((n) => served >= n).length;

/** Hệ số giá bán của món theo lượt bán (1 = chưa lên sao). */
export const dishPriceMul = (served: number): number =>
  (DISH_STAR_BONUS[dishStars(served) - 1] ?? 0) + 1;

/** Đồ đựng kiểu Việt, 4 bậc theo sao — món ăn và món uống có thang riêng. */
export const FOOD_VESSELS = ['Túi nilon', 'Lá chuối', 'Bát sành', 'Men lam'] as const;
export const DRINK_VESSELS = ['Cốc giấy', 'Cốc gốm', 'Cốc sứ', 'Ly thủy tinh'] as const;

const vesselsFor = (productId: string) =>
  (productById(productId).category === 'drink' ? DRINK_VESSELS : FOOD_VESSELS);

/** Tên đồ đựng hiện tại của món theo lượt bán (bậc sao 0–3). */
export const dishVessel = (productId: string, served: number): string =>
  vesselsFor(productId)[Math.min(dishStars(served), vesselsFor(productId).length - 1)];

export interface DishStarGoal {
  stars: number;
  /** +% giá bán ở sao hiện tại. */
  bonus: number;
  /** Lượt bán cần để lên sao kế (null = đã chạm 3★). */
  nextAt: number | null;
  /** Còn bao nhiêu lượt nữa lên sao kế (null = đã chạm 3★). */
  toGo: number | null;
  /** Tên đồ đựng bậc kế tiếp (null = đã chạm 3★). */
  nextVessel: string | null;
}

/** Mục tiêu ngắn cho thẻ món (Sổ nấu): đang bao nhiêu sao, còn mấy lượt tới bậc kế + đồ đựng kế. */
export function dishStarGoalOf(productId: string, served: number): DishStarGoal {
  const stars = dishStars(served);
  const bonus = Math.round((dishPriceMul(served) - 1) * 100);
  if (stars >= DISH_STAR_STEPS.length) {
    return { stars, bonus, nextAt: null, toGo: null, nextVessel: null };
  }
  const nextAt = DISH_STAR_STEPS[stars];
  const vessels = vesselsFor(productId);
  return {
    stars, bonus, nextAt, toGo: nextAt - served,
    nextVessel: vessels[Math.min(stars + 1, vessels.length - 1)],
  };
}
