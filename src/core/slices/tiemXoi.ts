import { formatMoney, productById } from '../../data/products';
import { copyStock, putStock } from '../stock';
import { TIEM_XOI_HIRE_FEE, TIEM_XOI_MAX_STAFF, TIEM_XOI_PRICE, TIEM_XOI_UNLOCK, TIEM_XOI_COST_MUL, tiemXoiHandQty, tiemXoiHandPick, TIEM_XOI_BIG_COST, TIEM_XOI_BIG_LEVEL } from '../../data/tiemXoi';
import { canOpenZone, openZones, zoneById } from '../../data/zones';
import type { GameState, SetState, GetState } from '../gameTypes';

/** Tiệm xôi (GĐ411): mua mặt bằng, tuyển/cho nghỉ thợ nấu. Mô phỏng nấu chạy trong endDay. */

export const createTiemXoiSlice = (set: SetState, get: GetState): Pick<GameState, 'buyTiemXoi' | 'hireTiemXoi' | 'fireTiemXoi' | 'steamXoiHand' | 'expandTiemXoi' | 'openZone'> => ({
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
  /** GĐ439: chủ tự đồ một mẻ ở sạp (mỗi ngày một lần), xôi vào kho ngay. */
  steamXoiHand: () => {
    const s = get();
    const t = s.biz.tiemXoi;
    if (!t.open) { s.notify('Chưa mở tiệm xôi!'); return false; }
    if (t.handDay === s.day) { s.notify('Hôm nay đã tự đồ một mẻ rồi, mai đồ tiếp'); return false; }
    const id = tiemXoiHandPick(s.level, s.storage);
    if (!id) return false;
    const qty = tiemXoiHandQty(t.staff);
    const cost = Math.round(qty * productById(id).buy * TIEM_XOI_COST_MUL);
    if (s.money < cost) { s.notify(`Cần ${formatMoney(cost)} nguyên liệu để đồ xôi`); return false; }
    const k = copyStock(s);
    putStock(k, id, qty);
    set({ storage: k.storage, storageLots: k.storageLots, money: s.money - cost, biz: { ...s.biz, tiemXoi: { ...t, handDay: s.day } } });
    get().addXp(4); // GĐ453: việc tay như làm vườn
    s.notify(`🍚 Tự đồ ${qty} phần ${productById(id).name} vào kho (−${formatMoney(cost)})`);
    return true;
  },
  /** GĐ461: mở rộng bếp xôi một lần. */
  expandTiemXoi: () => {
    const s = get();
    const t = s.biz.tiemXoi;
    if (!t.open) { s.notify('Chưa mở tiệm xôi!'); return false; }
    if (t.big) { s.notify('Bếp xôi đã mở rộng rồi'); return false; }
    if (s.level < TIEM_XOI_BIG_LEVEL) { s.notify(`Mở rộng bếp xôi ở cấp ${TIEM_XOI_BIG_LEVEL}`); return false; }
    if (s.money < TIEM_XOI_BIG_COST) { s.notify(`Cần ${formatMoney(TIEM_XOI_BIG_COST)} để mở rộng bếp xôi`); return false; }
    set({ money: s.money - TIEM_XOI_BIG_COST, biz: { ...s.biz, tiemXoi: { ...t, big: true } } });
    s.notify('🍚 Bếp xôi mở rộng: giữ 120 phần mỗi món, nấu nhanh gấp rưỡi');
    return true;
  },
  /** GĐ498: mở khu bản đồ mới — trừ tiền, ghi biz.zones. */
  openZone: (id) => {
    const s = get();
    const z = zoneById(id);
    const c = canOpenZone(id, s.biz.zones, s.level, s.money);
    if (!z || c === 'unknown') return false;
    if (c === 'opened') { s.notify(`${z.icon} ${z.name} đã mở rồi`); return false; }
    if (c === 'level') { s.notify(`${z.icon} ${z.name} mở ở cấp ${z.unlock}`); return false; }
    if (c === 'money') { s.notify(`Cần ${formatMoney(z.cost)} để mở ${z.name}`); return false; }
    set({ money: s.money - z.cost, biz: { ...s.biz, zones: openZones([...(s.biz.zones ?? []), id]).filter((x) => x !== 'hem') } });
    s.notify(`${z.icon} Đã mở ${z.name}! ${z.desc}`.slice(0, 90));
    return true;
  },
});
