/** GĐ590: helper Sổ kinh doanh quán nước (chỉ panel lazy dùng) tách khỏi quanNuoc.ts để rời chunk chính. */
import { fmtMul, productById } from './products';
import type { DayAction } from './dayPlan';
import type { Weather } from './weather';
import { brewMenu, cleanMenu, quanRecipeById, varietyMul, quanHotMul, QUAN_MENU_SLOTS } from './quanRecipes';
import { QUAN_MATCH_MUL, QUAN_NUOC_MAX_STAFF, QUAN_NUOC_PRICE, QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS, type QuanNuocPrice, type QuanNuocState, isQuanMatchDay, quanMatchMul, quanMenuSlots, quanNuocDrinkIds, quanTierMul, quanWeekendMul, weatherMul } from './quanNuoc';

/* —————————————————————————————————————————————————————————————————————
 * GĐ127: Sổ kinh doanh quán nước — mồi quyết định (thuê/sa thải, nhập kho, cân
 * kho với kệ tiệm chính). THUẦN ĐỌC state/hằng số có sẵn (quanNuocLast, storage,
 * quanNuocDrinkIds, QUAN_PRICE_OPTIONS, QUAN_NUOC_WAGE) — KHÔNG đổi SAVE_VERSION,
 * không persist, không đổi công thức kinh tế. Giá trị hiển thị tự tính LẠI từ cùng
 * công thức `quanNuocDay` nên không bao giờ lệch số liệu.
 * ————————————————————————————————————————————————————————————————————— */

/** Giá bán trung bình của thực đơn đồ uống đã mở (cùng công thức quanNuocDay). */
export const quanNuocAvgSell = (level: number, menu?: readonly string[]): number => {
  // GĐ415: có thực đơn pha chế thì lấy giá TB các món pha (khách phục vụ món pha trước)
  const m = cleanMenu(menu, level, QUAN_MENU_SLOTS + 1);
  if (m.length) return m.reduce((n, id) => n + quanRecipeById(id)!.price, 0) / m.length;
  const drinks = quanNuocDrinkIds(level);
  return drinks.length ? drinks.reduce((n, id) => n + productById(id).sell, 0) / drinks.length : 0;
};

/** Tổng ly phục vụ được với kho hiện có: món pha (tới sức nguyên liệu) + nước chai. Thuần. */
export function quanNuocCupSupply(q: QuanNuocState, level: number, storage: Record<string, number>): number {
  const brewed = brewMenu(cleanMenu(q.menu, level, quanMenuSlots(q)), storage, 1e9, 1, () => {}).total;
  return brewed + quanNuocDrinkIds(level).reduce((n, id) => n + (storage[id] ?? 0), 0);
}

export interface QuanNuocProjection { customers: number; wanted: number; served: number; revenue: number; wages: number; profit: number }

/**
 * Dự phóng một đêm bán của quán nước theo số nhân viên `q.staff`, chặn bởi tổng
 * đơn vị đồ uống hiện có `drinkUnits` (cap như `quanNuocDay`). THUẦN — không gọi
 * `take`, không đổi state. Dùng để hỏi "thuê thêm 1 người có đáng lương 150k không".
 */
export function quanNuocProjection(q: QuanNuocState, level: number, drinkUnits: number, weather?: Weather, day?: number): QuanNuocProjection {
  const opt = QUAN_PRICE_OPTIONS[q.price];
  const avgPrice = quanNuocAvgSell(level, q.menu);
  const customers = Math.round(45 * opt.traffic * quanTierMul(q) * (1 + 0.15 * q.staff) * weatherMul(weather) * varietyMul(cleanMenu(q.menu, level, quanMenuSlots(q)).length) * quanWeekendMul(day) * quanMatchMul(day, weather) * quanHotMul(cleanMenu(q.menu, level, quanMenuSlots(q)), weather, day));
  const wanted = Math.ceil(customers * 1.5);
  const served = Math.min(wanted, Math.max(0, drinkUnits));
  const revenue = Math.round(served * avgPrice * opt.mul);
  const wages = q.staff * QUAN_NUOC_WAGE;
  return { customers, wanted, served, revenue, wages, profit: revenue - wages };
}

export interface QuanNuocHealth {
  /** Tổng đơn vị đồ uống hiện trong kho (chung với kệ tiệm chính) — mồi cân kho. */
  drinkUnitsNow: number;
  /** Số ly quán tiêu HÔM QUA (= served) — cho biết mức lấn kho. */
  consumedYesterday: number;
  /** Doanh thu bỏ lỡ hôm qua vì kho thiếu (~Zđ, dùng giá/mul hiện tại) — 0 khi bán đủ. */
  missedRevenue: number;
  shortYesterday: boolean;
  /** Dự phóng ĐÊM NAY (cùng kho + giá hiện tại) ở mức nhân viên hiện tại. */
  tonight: QuanNuocProjection;
  /** Dự phóng đêm nay nếu tuyển thêm 1 người (null khi đã đủ MAX). */
  hire: QuanNuocProjection | null;
  /** Lợi nhuận tăng thêm nếu tuyển thêm 1 người (lời hơn → dương; lỗ thêm → âm). */
  hireMarginal: number | null;
  /** Kho chỉ đủ cho đêm nay — quán sẽ ăn sạch, kệ tiệm chính cạn nước/rủi ro cạn. */
  driesMain: boolean;
}

/**
 * Mồi quyết định quán nước — đọc `quanNuocLast` (Hôm qua) + `storage` (kho hiện tại)
 * + `q` (cấu hình hiện tại) + `level`. Trả phân tích thuần; UI chỉ hiện khi quán mở
 * và có tín hiệu (short / lỗ / cạn kho) để không nhiễu ngày sạch.
 */
export function quanNuocHealth(
  q: QuanNuocState, level: number, storage: Record<string, number>, last?: { served?: number; wanted?: number } | null, weather?: Weather, day?: number,
): QuanNuocHealth {
  const drinkUnits = quanNuocCupSupply(q, level, storage);
  // GĐ491: có `day` thì dự báo tính cả cuối tuần + đồ nóng tháng rét
  const tonight = quanNuocProjection(q, level, drinkUnits, weather, day);
  const hire = q.staff < QUAN_NUOC_MAX_STAFF ? quanNuocProjection({ ...q, staff: q.staff + 1 }, level, drinkUnits, weather, day) : null;
  const hireMarginal = hire ? hire.profit - tonight.profit : null;
  const shortYesterday = !!last && typeof last.wanted === 'number' && typeof last.served === 'number' && last.served < last.wanted;
  const missedRevenue = shortYesterday ? Math.round(((last!.wanted as number) - (last!.served as number)) * quanNuocAvgSell(level, q.menu) * QUAN_PRICE_OPTIONS[q.price].mul) : 0;
  return {
    drinkUnitsNow: drinkUnits,
    consumedYesterday: typeof last?.served === 'number' ? last.served : 0,
    missedRevenue,
    shortYesterday,
    tonight,
    hire,
    hireMarginal,
    driesMain: q.open && q.staff > 0 && drinkUnits < tonight.wanted,
  };
}

/**
 * GĐ189 — "Quán nước thiếu đồ uống thành việc sáng": Sổ đầu ngày (GĐ76) đã nhắc chi nhánh, hợp đồng,
 * nợ ngân hàng, đối tác, sự kiện mùa — nhưng quán nước chỉ nằm ở thẻ phụ (Callout thụ động), KHÔNG vào
 * danh sách ưu tiên "Việc hôm nay". Chuyển tín hiệu quán thiếu kho lên Sổ đầu ngày:
 *   - Quán thiếu ly hôm qua (missedRevenue>0): việc sáng "Nạp đồ uống" (danger — đang mất tiền thật).
 *   - Quán sắp ăn khô kho chung (driesMain — kệ tiệm chính cạn nước theo): cảnh báo nên xử lý.
 * THUẦN ĐỌC health có sẵn — không đổi SAVE_VERSION/kinh tế/sim; DayAction layout tái dùng dayPlan.
 */
export function quanNuocDayAction(h: QuanNuocHealth | null | undefined, day?: number, weather?: Weather): DayAction | null {
  if (!h) return null;
  if (h.missedRevenue > 0) {
    return {
      icon: '🧋', panel: 'quannuoc',
      text: `Quán nước hôm qua thiếu đồ uống bỏ lỡ ~${h.missedRevenue.toLocaleString('vi-VN')}đ — nạp nước/ngọt/cà phê`,
      danger: true, priority: 1,
    };
  }
  if (h.driesMain) {
    return {
      icon: '🥤', panel: 'quannuoc',
      text: `Kho đồ uống còn ${h.drinkUnitsNow} ly, quán tối nay ăn hết là kệ tiệm chính cạn nước — nạp trước`,
      danger: false, priority: 2,
    };
  }
  // GĐ584: tối có trận bóng — nhắc trong Sổ đầu ngày, không chỉ trong panel quán
  if (isQuanMatchDay(day, weather)) return { icon: '⚽', panel: 'quannuoc', text: `Tối nay có trận bóng — quán đông ×${fmtMul(QUAN_MATCH_MUL)}, nạp đủ đồ uống`, danger: false, priority: 3 };
  return null;
}

/**
 * GĐ1102 — "Món trên menu ngừng bán vì hết nguyên liệu" thành việc sáng: QuanMenuSection có cảnh báo
 * ⚠️ từng món (GĐ415), nhưng nó nằm sâu trong panel — món pha lời cao nhất ngừng bán cả ngày là rỉ
 * tiền thật mà Sổ đầu ngày không nói. Trả việc sáng đầu tiên (món thứ tự thực đơn) khi quán MỞ và
 * món đã mở thiếu ≥1 nguyên liệu (kho ≤0): danger + priority 1 như "Nạp đồ uống" (GĐ189).
 * Thuần đọc menu/level/storage — KHÔNG đổi SAVE_VERSION/kinh tế/sim.
 */
export function quanBlockedDrinkAction(
  menu: readonly string[] | undefined,
  level: number,
  storage: Record<string, number>,
): DayAction | null {
  for (const id of menu ?? []) {
    const r = quanRecipeById(id);
    if (!r || r.unlock > level) continue;
    const missing = r.uses.filter((u) => (storage[u.id] ?? 0) <= 0).map((u) => productById(u.id).name);
    if (!missing.length) continue;
    return {
      icon: '🧋', panel: 'quannuoc',
      text: `${r.name} ngừng bán — thiếu ${missing.join(', ')} (nạp để pha)`,
      danger: true, priority: 1,
    };
  }
  return null;
}

/**
 * GĐ190 — "Nạp bao nhiêu để bán đủ tối nay?" — companion nạp kho của GĐ189: Sổ đầu ngày nhắc quán
 * thiếu đồ uống, nhưng vế quan trọng là NGƯỜI CHƠI cần biết NHẬP THÊM BAO NHIÊU ly và ấn ở đâu để
 * xử lý. Helper thuần này trả con số thiếu hụt tối nay (chênh giữa `tonight.wanted` — nhu cầu dự phóng
 * — và tồn kho hiện tại) + mức khẩn cấp đúng bảng ngữ cảnh:
 *   - danger: hôm qua BỊ MẤT tiền vì kho thiếu (missedRevenue>0) — đang rỉ máu.
 *   - warn:   chưa mất nhưng đêm nay ăn khô kho chung (driesMain) — cần xử lý trước.
 *   - null:   ngày sạch — không nhiễu.
 * Cùng chân lý `quanNuocHealth` (tức `quanNuocDay`), KHÔNG đổi SAVE_VERSION/kinh tế/sim. UI dùng
 * con số này để ra thẻ nạp kho + nút nhảy sang Nhập hàng (order).
 */
export interface QuanNuocRestockTip { shortfall: number; wanted: number; have: number; missedRevenue: number; verdict: 'danger' | 'warn' }

export function quanNuocRestockTip(
  q: QuanNuocState, level: number, storage: Record<string, number>, last?: { served?: number; wanted?: number } | null, weather?: Weather, day?: number,
): QuanNuocRestockTip | null {
  const h = quanNuocHealth(q, level, storage, last, weather, day);
  const shortfall = Math.max(0, h.tonight.wanted - h.drinkUnitsNow);
  if (h.missedRevenue > 0) {
    return { shortfall, wanted: h.tonight.wanted, have: h.drinkUnitsNow, missedRevenue: h.missedRevenue, verdict: 'danger' };
  }
  if (h.driesMain && shortfall > 0) {
    return { shortfall, wanted: h.tonight.wanted, have: h.drinkUnitsNow, missedRevenue: 0, verdict: 'warn' };
  }
  return null;
}

/**
 * GĐ193 — "Xây quán nước 25tr hồi vốn sau bao lâu?": màn XÂY QUÁN chỉ cho giá + cấp yêu cầu, không
 * nói được sẽ kiếm về bao nhiêu để quyết mua. Vì quán nước chạy công thức DETERMINISTIC
 * (`quanNuocProjection`, GĐ127) khác hẳn chi nhánh/sim, mình tính được lời ròng MỘT ngày (giả định kho
 * ĐỦ đồ uống để bán hết nhu cầu — trường hợp tốt nhất) rồi chia vốn xây → số ngày hồi. Cực kỳ hữu ích:
 * mở SỚM ở cấp 29 thực đơn ít → lời thấp → hồi vốn chậm; lên cấp thêm nước/ngọt/cà phê → hồi nhanh.
 * THUẦN — đọc hằng số + projection, không đổi kinh tế/save. UI ghi rõ là ước tính "nếu kho đủ".
 */
export interface QuanNuocBuildPayback {
  cost: number;
  /** Lời ròng ước một ngày (1 nhân viên, giá vừa, kho đủ bán hết nhu cầu). */
  netPerDay: number;
  /** Số ngày cần để hồi vốn (làm tròn lên); null khi lỗ / chưa có thực đơn. */
  paybackDays: number | null;
  verdict: 'worth' | 'slow' | 'notworth' | 'noMenu';
}

export function quanNuocBuildPayback(level: number, staff: number = 1, price: QuanNuocPrice = 'vua'): QuanNuocBuildPayback {
  if (quanNuocDrinkIds(level).length === 0) {
    return { cost: QUAN_NUOC_PRICE, netPerDay: 0, paybackDays: null, verdict: 'noMenu' };
  }
  const q: QuanNuocState = { open: true, staff, price };
  // Giả định kho đủ để bán hết nhu cầu (served = wanted) — giới hạn trên của tiềm năng hàng ngày.
  const proj = quanNuocProjection(q, level, Number.MAX_SAFE_INTEGER);
  const net = proj.profit;
  if (net <= 0) return { cost: QUAN_NUOC_PRICE, netPerDay: net, paybackDays: null, verdict: 'notworth' };
  const paybackDays = Math.ceil(QUAN_NUOC_PRICE / net);
  return { cost: QUAN_NUOC_PRICE, netPerDay: net, paybackDays, verdict: paybackDays <= 60 ? 'worth' : 'slow' };
}

