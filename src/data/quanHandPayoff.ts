/**
 * GĐ1307 — "Mẻ TỰ PHA +20% tay nghề đáng bao nhiêu /mẻ và cả ngày?" (soi phần thưởng tay nghề GĐ427)
 * Nút 🍹 Tự pha (GĐ427) bán ngay 5 ly cho khách chờ với giá +20% (QUAN_HAND_BONUS) — nhưng chỉ báo
 * "+Xđ (còn N mẻ)" sau khi bấm, CHƯA ai lượng hóa: phần +20% tay nghề đáng bao nhiêu /mẻ, cả ngày
 * nếu dùng hết mẻ là bao nhiêu, và khi món kho thiếu nguyên liệu thì nút CÂM lặng không pha gì cả
 * (hộp đen, Nguyên tắc a). Helper THUẦN ĐỌC: TÁI DỰNG đúng pick-logic brewQuanHand (quanNuoc slice —
 * món tiếp theo = menu[(done + i) % len] có recipeCapacity ≥ 5, done = số mẻ đã pha hôm nay), lãi/mẻ =
 * 5 × (giá món × priceMul) ×1.2 − 5 × recipeCupCost, extra = phần +20% = 5 × giá×mul × 0.2, dayExtra =
 * còn mẻ × extra. KHÔNG bịa khách/con số, không đổi kinh tế/save/seed (Nguyên tắc c). KHÔNG import
 * store (co-op an toàn).
 */
import { QUAN_HAND_CUPS, QUAN_HAND_BONUS, quanHandLeft, quanMenuSlots, type QuanNuocState } from './quanNuoc';
import { quanRecipeById, recipeCapacity, recipeCupCost, cleanMenu, type QuanRecipe } from './quanRecipes';
import { formatMoney } from './products';

export interface QuanHandPayoff {
  /** Món mẻ kế tiếp sẽ pha (lặp đúng brewQuanHand: xoay theo mẻ đã pha hôm nay). */
  item: QuanRecipe;
  /** Doanh thu/mẻ (đã +20% tay nghề) nếu đủ nguyên liệu. */
  revenue: number;
  /** Phần +20% tay nghề (/mẻ) — đúng bằng doanh thu × 0.2/1.2. */
  extra: number;
  /** Lãi THẬT/mẻ sau nguyên liệu = revenue − 5 × recipeCupCost. */
  net: number;
  /** Còn lại bao nhiêu mẻ hôm nay. */
  batchesLeft: number;
  /** Tối đa hôm nay nếu pha HẾT số mẻ còn lại = batchesLeft × extra. */
  dayExtra: number;
  /** Món được chọn thiếu nguyên liệu kho (capacity < 5) → bấm Tự pha câm lặng không pha. */
  locked: boolean;
}

/** Lượng hóa mẻ tự pha kế tiếp + tổng bonus tay nghề hôm nay. THUẦN — null khi hết mẻ hoặc chưa có món. */
export function quanHandPayoff(opts: {
  level: number;
  menu: readonly string[];
  storage: Record<string, number>;
  priceMul: number;
  day: number;
  q: QuanNuocState;
}): QuanHandPayoff | null {
  const menu = cleanMenu(opts.menu, opts.level, quanMenuSlots(opts.q));
  const left = quanHandLeft(opts.q, opts.day);
  if (left <= 0) return null; // hết mẻ hôm nay — im, không nhắc
  if (!menu.length) return null; // chưa có món trên thực đơn — chưa pha được gì (không ồn)
  const done = opts.q.hand?.day === opts.day ? opts.q.hand.n : 0;
  const item = menu
    .map((_, i) => quanRecipeById(menu[(done + i) % menu.length]))
    .find((x) => x && recipeCapacity(x, opts.storage) >= QUAN_HAND_CUPS) ?? null;
  if (!item) {
    const first = quanRecipeById(menu[0]);
    return { item: first!, revenue: 0, extra: 0, net: 0, batchesLeft: left, dayExtra: 0, locked: true };
  }
  const perCup = item.price * opts.priceMul; // giá bán thường/chưa bonus
  const revenue = Math.round(QUAN_HAND_CUPS * perCup * QUAN_HAND_BONUS);
  const extra = Math.round(QUAN_HAND_CUPS * perCup * (QUAN_HAND_BONUS - 1)); // = +20%
  const net = revenue - Math.round(QUAN_HAND_CUPS * recipeCupCost(item));
  return { item, revenue, extra, net, batchesLeft: left, dayExtra: extra * left, locked: false };
}

/** Dòng ngắn trong panel (≤90 cp) cho mẻ tự pha — rỗng khi không đáng nhắc (không ồn). */
export function quanHandPayoffLine(p: QuanHandPayoff | null): string {
  if (!p) return '';
  if (p.locked) return `🖐️ Tự pha đang kẹt: món ${p.item.name} thiếu nguyên liệu — nhập rồi pha (+20% tay nghề)`;
  return `🖐️ Tự pha ${p.item.name}: +${formatMoney(p.extra)} tay nghề/mẻ · lãi ~${formatMoney(p.net)}/mẻ · còn ${p.batchesLeft} (~${formatMoney(p.dayExtra)}/ngày)`;
}
