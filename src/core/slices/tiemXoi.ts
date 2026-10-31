import { formatMoney } from '../../data/products';
import { TIEM_XOI_HIRE_FEE, TIEM_XOI_MAX_STAFF, TIEM_XOI_PRICE, TIEM_XOI_UNLOCK } from '../../data/tiemXoi';
import type { GameState, SetState, GetState } from '../gameTypes';

/** Tiệm xôi (GĐ411): mua mặt bằng, tuyển/cho nghỉ thợ nấu. Mô phỏng nấu chạy trong endDay. */

export const createTiemXoiSlice = (set: SetState, get: GetState): Pick<GameState, 'buyTiemXoi' | 'hireTiemXoi' | 'fireTiemXoi'> => ({
  buyTiemXoi: () => {
    const s = get();
    if (s.biz.tiemXoi.open) return false;
    if (s.level < TIEM_XOI_UNLOCK) { s.notify(`Tiệm xôi mở ở cấp ${TIEM_XOI_UNLOCK}`); return false; }
    if (s.money < TIEM_XOI_PRICE) { s.notify(`Không đủ tiền mở tiệm xôi (cần ${formatMoney(TIEM_XOI_PRICE)})!`); return false; }
    set({
      money: s.money - TIEM_XOI_PRICE,
      biz: { ...s.biz, tiemXoi: { ...s.biz.tiemXoi, open: true } },
      stats: { ...s.stats, spent: s.stats.spent + TIEM_XOI_PRICE },
      totals: { ...s.totals, spent: s.totals.spent + TIEM_XOI_PRICE },
    });
    s.notify('🍚 Tiệm xôi khai trương! Mỗi đêm nấu xôi giá rẻ bù vào kho tạp hóa.');
    return true;
  },
  hireTiemXoi: () => {
    const s = get();
    const t = s.biz.tiemXoi;
    if (!t.open) { s.notify('Chưa mở tiệm xôi!'); return false; }
    if (t.staff >= TIEM_XOI_MAX_STAFF) { s.notify('Tiệm xôi đã đủ thợ'); return false; }
    if (s.money < TIEM_XOI_HIRE_FEE) { s.notify(`Không đủ tiền tuyển thợ (${formatMoney(TIEM_XOI_HIRE_FEE)})!`); return false; }
    set({
      money: s.money - TIEM_XOI_HIRE_FEE,
      biz: { ...s.biz, tiemXoi: { ...t, staff: t.staff + 1 } },
      stats: { ...s.stats, spent: s.stats.spent + TIEM_XOI_HIRE_FEE },
      totals: { ...s.totals, spent: s.totals.spent + TIEM_XOI_HIRE_FEE },
    });
    s.notify(`🤝 Tiệm xôi thêm thợ nấu (${t.staff + 1}/${TIEM_XOI_MAX_STAFF}): nấu được nhiều phần hơn.`);
    return true;
  },
  fireTiemXoi: () => {
    const s = get();
    const t = s.biz.tiemXoi;
    if (t.staff <= 0) { s.notify('Tiệm xôi chưa có thợ nào'); return false; }
    set({ biz: { ...s.biz, tiemXoi: { ...t, staff: t.staff - 1 } } });
    s.notify('👋 Đã cho một thợ tiệm xôi nghỉ (phí tuyển không hoàn lại).');
    return true;
  },
});
