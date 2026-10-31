import { formatMoney } from '../../data/products';
import {
  QUAN_NUOC_HIRE_FEE, QUAN_NUOC_MAX_STAFF, QUAN_NUOC_PRICE, QUAN_NUOC_UNLOCK, QUAN_PRICE_OPTIONS,
  type QuanNuocPrice,
} from '../../data/quanNuoc';
import { cleanMenu, quanRecipeById, QUAN_MENU_SLOTS } from '../../data/quanRecipes';
import type { GameState, SetState, GetState } from '../gameTypes';

/**
 * Quán nước đầu ngõ (GĐ7): địa điểm kinh doanh thứ hai mở ở cấp 29, bán đồ uống rút nguyên liệu từ kho
 * chung, chạy theo ngày trong endDay (không mô phỏng real-time). Khớp pattern slice branch.ts.
 */

export const createQuanNuocSlice = (set: SetState, get: GetState): Pick<GameState, 'buyQuanNuoc' | 'hireQuanNuoc' | 'fireQuanNuoc' | 'setQuanNuocPrice' | 'toggleQuanRecipe'> => ({
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
});
