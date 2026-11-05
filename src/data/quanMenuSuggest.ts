/**
 * GĐ1306 — "Tối nay quán nước nên thêm MÓN NÀO?" (chọn đúng công thức, sau GĐ415/476/1112 soi TỪNG món)
 * Panel thực đơn đã hiện LÃI/LY từng món (GĐ415) + nhắc đồ nóng trời mưa (quanHotNote GĐ477) + nút thắt
 * nguyên liệu (recipeBottleneck GĐ1112) — nhưng CHƯA ai XẾP HẠNG: trong các món đã mở, tối nay thêm món
 * nào LÃI NHẤT (kể cả mở ×khách nhờ đồ nóng khi trời mưa/rét mà thực đơn chưa có món nóng, trong giới hạn
 * kho đủ pha). Helper THUẦN ĐỌC: chỉ nhân số ghi sẵn — lãi/ly = price × priceMul − recipeCupCost (giá bán
 * với mức giá hiện tại + giá vốn nguyên liệu), sức pha recipeCapacity(theo kho), quanHotMul (món nóng
 * ×1.2 mưa/bão / ×1.1 tháng rét). KHÔNG bịa công thức/khách, không đổi kinh tế/save/seed (Nguyên tắc c).
 * KHÔNG import store (co-op an toàn).
 */
import { quanRecipesAt, quanRecipeById, recipeCapacity, recipeCupCost, cleanMenu, QUAN_MENU_SLOTS, type QuanRecipe } from './quanRecipes';
import { monthOf } from './calendar';
import { formatMoney } from './products';

export interface QuanMenuSuggestion {
  /** Công thức nên thêm vào thực đơn tối nay. */
  better: QuanRecipe;
  /** Lãi ròng ước ~/ly theo mức giá đang đặt (đ). */
  marginPerCup: number;
  /** Số ly kho đủ pha tối nay (≤0 = thiếu nguyên liệu — phải nhập). */
  capacity: number;
  /** Thêm món này sẽ MỞ ×khách nhờ đồ nóng (mưa/bão ×1.2 / tháng rét ×1.1) — thực đơn chưa có món nóng. */
  hotUnlocks: boolean;
  /** Thiếu nguyên liệu (capacity ≤ 0): đề xuất kèm "nhập rồi thêm". */
  locked: boolean;
}

/** Món NÊN THÊM nhất tối nay (còn ô trống): ưu tiên món đủ nguyên liệu làm được ngay, rồi món mở ×khách
 *  đồ nóng, rồi lãi/ly cao. THUẦN — null khi hết ô trống hoặc không còn món chưa bán (không ồn). */
export function quanBestAdd(opts: {
  level: number;
  storage: Record<string, number>;
  menu: readonly string[];
  priceMul: number;
  weather?: string;
  day?: number;
  slots?: number;
}): QuanMenuSuggestion | null {
  const slots = opts.slots ?? QUAN_MENU_SLOTS;
  const menu = cleanMenu(opts.menu, opts.level, slots);
  if (menu.length >= slots) return null; // hết ô trống — người chơi tự hoán đổi, không gợi ý thêm
  const rain = opts.weather === 'rain' || opts.weather === 'storm';
  const cold = opts.day !== undefined && [12, 1, 2].includes(monthOf(opts.day));
  const wantHot = rain || cold;
  const hasHot = menu.some((id) => quanRecipeById(id)?.hot);
  const hotRelevant = wantHot && !hasHot;
  const cands = quanRecipesAt(opts.level)
    .filter((r) => !menu.includes(r.id))
    .map((r) => {
      const cap = recipeCapacity(r, opts.storage);
      return {
        r,
        margin: Math.round(r.price * opts.priceMul - recipeCupCost(r)),
        cap,
        hotUnlocks: hotRelevant && !!r.hot,
      };
    });
  if (!cands.length) return null;
  const top = [...cands].sort((a, b) =>
    (Number(b.cap > 0) - Number(a.cap > 0)) ||
    (Number(b.hotUnlocks) - Number(a.hotUnlocks)) ||
    (b.margin - a.margin),
  )[0];
  return {
    better: top.r, marginPerCup: top.margin, capacity: top.cap,
    hotUnlocks: top.hotUnlocks, locked: top.cap <= 0,
  };
}

/** Dòng ngắn "🌙 Nên thêm: {món} (lãi ~X/ly…)" — rỗng khi không có khuyến nghị (không ồn). */
export function quanBestAddLine(s: QuanMenuSuggestion | null, weather?: string): string {
  if (!s) return '';
  const note = s.hotUnlocks
    ? (weather === 'rain' || weather === 'storm' ? ' · đồ nóng kéo khách ×1.2' : ' · đồ nóng kéo khách ×1.1')
    : (s.locked ? ' · thiếu nguyên liệu — nhập rồi thêm' : '');
  return `🌙 Nên thêm: ${s.better.icon} ${s.better.name} (lãi ~${formatMoney(s.marginPerCup)}/ly)${note}`;
}
