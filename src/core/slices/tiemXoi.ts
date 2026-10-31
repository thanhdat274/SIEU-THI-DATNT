import { formatMoney, productById } from '../../data/products';
import { copyStock, putStock } from '../stock';
import { TIEM_XOI_HIRE_FEE, TIEM_XOI_MAX_STAFF, TIEM_XOI_PRICE, TIEM_XOI_UNLOCK, TIEM_XOI_COST_MUL, tiemXoiHandQty, tiemXoiHandPick, TIEM_XOI_BIG_COST, TIEM_XOI_BIG_LEVEL } from '../../data/tiemXoi';
import { SAP_LOT_COST, SAP_LOTS, SAP_TIERS, nextSapKinds, sapKindOf, sapTierOf, sapRongIncome } from '../../data/sapRong';
import { canOpenZone, openZones, zoneById } from '../../data/zones';
import type { GameState, SetState, GetState } from '../gameTypes';

/** Tiệm xôi (GĐ411): mua mặt bằng, tuyển/cho nghỉ thợ nấu. Mô phỏng nấu chạy trong endDay. */

export const createTiemXoiSlice = (set: SetState, get: GetState): Pick<GameState, 'buyTiemXoi' | 'hireTiemXoi' | 'fireTiemXoi' | 'steamXoiHand' | 'expandTiemXoi' | 'openZone' | 'rentSapLot' | 'cycleSapKind' | 'upgradeSapLot' | 'tendSapHand'> => ({
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
    if (!id) { s.notify('Chưa có món xôi nào mở ở cấp này'); return false; }
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
  rentSapLot: () => {
    const s = get();
    const n = s.biz.sapRong ?? 0;
    if (!openZones(s.biz.zones).includes('ngo2')) { s.notify('Mở Ngõ 2 trước rồi mới thuê lô sạp'); return false; }
    if (n >= SAP_LOTS) { s.notify('Đã thuê hết lô sạp ở Ngõ 2'); return false; }
    if (s.money < SAP_LOT_COST) { s.notify(`Cần ${formatMoney(SAP_LOT_COST)} để thuê lô sạp`); return false; }
    set({ money: s.money - SAP_LOT_COST, biz: { ...s.biz, sapRong: n + 1 } });
    s.notify(`🛒 Thuê lô sạp ${n + 1}/${SAP_LOTS}: sạp bán ngày nắng, mưa thì nghỉ`);
    return true;
  },
  upgradeSapLot: (i: number) => {
    const s = get();
    if (!Number.isInteger(i) || i < 0 || i >= (s.biz.sapRong ?? 0)) return false;
    const t = sapTierOf(s.biz.sapTiers, i);
    const next = SAP_TIERS[t + 1];
    if (!next) { s.notify('Sạp này đã là quầy, bậc cao nhất'); return false; }
    if (s.money < next.cost) { s.notify(`Cần ${formatMoney(next.cost)} để nâng lên ${next.name}`); return false; }
    const tiers = Array.from({ length: Math.max(i + 1, s.biz.sapTiers?.length ?? 0) }, (_, j) => sapTierOf(s.biz.sapTiers, j));
    tiers[i] = t + 1;
    set({ money: s.money - next.cost, biz: { ...s.biz, sapTiers: tiers } });
    s.notify(`${next.icon} Lô ${i + 1} lên ${next.name}: thu ×${String(next.mul).replace('.', ',')}`);
    return true;
  },
  /** GĐ521: chủ tự đứng sạp Ngõ 2 một buổi — hôm nay mọi lô thu +25%; mưa/bão sạp nghỉ. */
  tendSapHand: () => {
    const s = get();
    if (!(s.biz.sapRong ?? 0)) { s.notify('Chưa thuê lô sạp nào ở Ngõ 2'); return false; }
    if (s.biz.sapHandDay === s.day) { s.notify('Hôm nay đã đứng sạp rồi, mai ghé tiếp'); return false; }
    if (s.weather === 'rain' || s.weather === 'storm') { s.notify('Trời mưa, sạp nghỉ bán hôm nay'); return false; }
    set({ biz: { ...s.biz, sapHandDay: s.day } });
    get().addXp(4);
    const b = s.biz, inc = (h: boolean) => sapRongIncome(b.sapRong, s.weather, s.day, b.sapKinds, b.sapTiers, b.tiemXoi.open, h);
    s.notify(`🙋 Đứng sạp Ngõ 2: hôm nay mọi lô thu thêm 25% (≈+${formatMoney(inc(true) - inc(false))})`);
    return true;
  },
  cycleSapKind: (i: number) => {
    const s = get();
    if (!Number.isInteger(i) || i < 0 || i >= (s.biz.sapRong ?? 0)) return false;
    const kinds = nextSapKinds(s.biz.sapKinds, i);
    set({ biz: { ...s.biz, sapKinds: kinds } });
    const k = sapKindOf(kinds, i);
    s.notify(`${k.icon} Lô ${i + 1} bán ${k.name}: ${k.hint}`);
    return true;
  },
});
