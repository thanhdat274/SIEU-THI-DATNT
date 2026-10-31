import { formatMoney } from '../../data/products';
import {
  QUAN_TIERS, quanTierOf, QUAN_HAND_BONUS, QUAN_HAND_CUPS, quanHandLeft, QUAN_NUOC_HIRE_FEE, QUAN_NUOC_MAX_STAFF, QUAN_NUOC_PRICE, QUAN_NUOC_UNLOCK, QUAN_PRICE_OPTIONS,
  type QuanNuocPrice,
} from '../../data/quanNuoc';
import { brewMenu, cleanMenu, quanRecipeById, recipeCapacity, QUAN_MENU_SLOTS } from '../../data/quanRecipes';
import { copyStock, takeStock } from '../stock';
import type { GameState, SetState, GetState } from '../gameTypes';

/**
 * Quán nước đầu ngõ (GĐ7): địa điểm kinh doanh thứ hai mở ở cấp 29, bán đồ uống rút nguyên liệu từ kho
 * chung, chạy theo ngày trong endDay (không mô phỏng real-time). Khớp pattern slice branch.ts.
 */

export const createQuanNuocSlice = (set: SetState, get: GetState): Pick<GameState, 'buyQuanNuoc' | 'hireQuanNuoc' | 'fireQuanNuoc' | 'setQuanNuocPrice' | 'toggleQuanRecipe' | 'brewQuanHand' | 'upgradeQuanTier'> => ({
  /** Mua mặt bằng quán nước: cần đủ cấp và đủ tiền; mua xong là mở bán ngay từ tối nay. */
  buyQuanNuoc: () => {
    const s = get();
    if (s.biz.quanNuoc.open) return false;
    if (s.level < QUAN_NUOC_UNLOCK) { s.notify(`Quán nước đầu ngõ mở ở cấp ${QUAN_NUOC_UNLOCK}`); return false; }
    if (s.money < QUAN_NUOC_PRICE) { s.notify(`Không đủ tiền mở quán nước (cần ${formatMoney(QUAN_NUOC_PRICE)})! Có thể vay ngân hàng.`); return false; }
    set({
      money: s.money - QUAN_NUOC_PRICE,
      biz: { ...s.biz, quanNuoc: { ...s.biz.quanNuoc, open: true } },
      stats: { ...s.stats, spent: s.stats.spent + QUAN_NUOC_PRICE },
      totals: { ...s.totals, spent: s.totals.spent + QUAN_NUOC_PRICE },
    });
    s.notify('🧋 Quán nước khai trương! Nhập đồ uống vào kho là quán tự bán mỗi ngày.');
    return true;
  },
  /** Tuyển thêm nhân viên quán nước (tối đa QUAN_NUOC_MAX_STAFF): khách đông hơn, phí tuyển một lần. */
  hireQuanNuoc: () => {
    const s = get();
    const q = s.biz.quanNuoc;
    if (!q.open) { s.notify('Chưa mở quán nước!'); return false; }
    if (q.staff >= QUAN_NUOC_MAX_STAFF) { s.notify('Quán nước đã đủ nhân viên'); return false; }
    if (s.money < QUAN_NUOC_HIRE_FEE) { s.notify(`Không đủ tiền tuyển nhân viên (${formatMoney(QUAN_NUOC_HIRE_FEE)})!`); return false; }
    set({
      money: s.money - QUAN_NUOC_HIRE_FEE,
      biz: { ...s.biz, quanNuoc: { ...q, staff: q.staff + 1 } },
      stats: { ...s.stats, spent: s.stats.spent + QUAN_NUOC_HIRE_FEE },
      totals: { ...s.totals, spent: s.totals.spent + QUAN_NUOC_HIRE_FEE },
    });
    s.notify(`🤝 Đã tuyển thêm người cho quán nước (${q.staff + 1}/${QUAN_NUOC_MAX_STAFF}): khách ghé đông hơn.`);
    return true;
  },
  /** Cho một nhân viên quán nước nghỉ việc: không hoàn phí tuyển. */
  fireQuanNuoc: () => {
    const s = get();
    const q = s.biz.quanNuoc;
    if (q.staff <= 0) { s.notify('Quán nước chưa có nhân viên nào'); return false; }
    set({ biz: { ...s.biz, quanNuoc: { ...q, staff: q.staff - 1 } } });
    s.notify('👋 Đã cho một nhân viên quán nước nghỉ việc (phí tuyển không hoàn lại).');
    return true;
  },
  /** Đổi mức giá quán (bình dân / vừa phải / đắt hơn): ảnh hưởng lượt khách và giá mỗi ly. */
  setQuanNuocPrice: (p: QuanNuocPrice) => {
    const s = get();
    const q = s.biz.quanNuoc;
    if (!(p in QUAN_PRICE_OPTIONS) || q.price === p) return;
    set({ biz: { ...s.biz, quanNuoc: { ...q, price: p } } });
    s.notify(`💰 Quán nước chuyển sang mức giá ${QUAN_PRICE_OPTIONS[p].label}.`);
  },
  /** GĐ415: thêm/bỏ một món pha chế khỏi thực đơn (tối đa QUAN_MENU_SLOTS, chỉ món đã mở). */
  toggleQuanRecipe: (id: string) => {
    const s = get();
    const q = s.biz.quanNuoc;
    const r = quanRecipeById(id);
    if (!r) return;
    if (s.level < r.unlock) { s.notify(`${r.name} mở ở cấp ${r.unlock}`); return; }
    const menu = cleanMenu(q.menu, s.level);
    const on = menu.includes(id);
    if (!on && menu.length >= QUAN_MENU_SLOTS) { s.notify(`Thực đơn tối đa ${QUAN_MENU_SLOTS} món, bỏ bớt một món trước`); return; }
    set({ biz: { ...s.biz, quanNuoc: { ...q, menu: on ? menu.filter((m) => m !== id) : [...menu, id] } } });
  },
  /** GĐ427: đứng quầy tự pha một mẻ món đầu tiên còn đủ nguyên liệu trên thực đơn, bán ngay. */
  brewQuanHand: () => {
    const s = get();
    const q = s.biz.quanNuoc;
    if (!q.open) { s.notify('Chưa mở quán nước!'); return false; }
    const left = quanHandLeft(q, s.day);
    if (left <= 0) { s.notify('Hôm nay đã tự pha đủ mẻ, để nhân viên lo phần còn lại'); return false; }
    // GĐ436: lần lượt theo thực đơn (mẻ thứ n bắt đầu từ món thứ n), bỏ món thiếu nguyên liệu
    const menu = cleanMenu(q.menu, s.level);
    const done = q.hand?.day === s.day ? q.hand.n : 0;
    const r = menu.map((_, i) => quanRecipeById(menu[(done + i) % menu.length])).find((x) => x && recipeCapacity(x, s.storage) >= QUAN_HAND_CUPS);
    if (!r) { s.notify('Chưa có món nào đủ nguyên liệu cho 5 ly, nhập thêm hoặc chọn thực đơn'); return false; }
    const k = copyStock(s);
    const b = brewMenu([r.id], k.storage, QUAN_HAND_CUPS, QUAN_PRICE_OPTIONS[q.price].mul * QUAN_HAND_BONUS, (id, n) => { takeStock(k, id, n); });
    set({
      storage: k.storage, storageLots: k.storageLots, money: s.money + b.revenue,
      biz: { ...s.biz, quanNuoc: { ...q, hand: { day: s.day, n: (q.hand?.day === s.day ? q.hand.n : 0) + 1 } } },
    });
    s.notify(`${r.icon} Tự pha ${QUAN_HAND_CUPS} ly ${r.name}: +${formatMoney(b.revenue)} (còn ${left - 1} mẻ hôm nay)`);
    return true;
  },
  /** GĐ428: nâng bậc cửa hàng nước (quầy → quán → cà phê), đông khách hơn. */
  upgradeQuanTier: () => {
    const s = get();
    const q = s.biz.quanNuoc;
    if (!q.open) { s.notify('Chưa mở quán nước!'); return false; }
    const cur = quanTierOf(q);
    const next = QUAN_TIERS[cur + 1];
    if (!next) { s.notify('Cửa hàng nước đã ở bậc cao nhất'); return false; }
    if (s.level < next.level) { s.notify(`${next.name} mở ở cấp ${next.level}`); return false; }
    if (s.money < next.cost) { s.notify(`Cần ${formatMoney(next.cost)} để nâng lên ${next.name}`); return false; }
    set({
      money: s.money - next.cost,
      biz: { ...s.biz, quanNuoc: { ...q, tier: cur + 1 } },
      stats: { ...s.stats, spent: s.stats.spent + next.cost },
      totals: { ...s.totals, spent: s.totals.spent + next.cost },
    });
    s.notify(`${next.icon} Đã nâng lên ${next.name}: khách ghé ×${next.mul}`);
    return true;
  },
});
