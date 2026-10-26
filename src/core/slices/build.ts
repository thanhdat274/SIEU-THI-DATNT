import { furnitureDef } from '../../data/furniture';
import { formatMoney } from '../../data/products';
import { PAINT_PRICE, SHOP_TIERS } from '../../data/shopTiers';
import { repairCost } from '../../data/risks';
import { type GameState, type Furniture, type SetState, type GetState, SELL_BACK } from '../gameTypes';
import { copyStock, returnTier, emptyTiers } from '../stock';

/** Xây dựng: đặt/dời/bán nội thất, nâng bậc tiệm, sơn, sửa kệ. */

export const updateFurniture = (set: SetState, get: GetState, uid: number, fn: (f: Furniture) => Furniture) =>
  set({ furniture: get().furniture.map((f) => (f.uid === uid ? fn(f) : f)) });

export const createBuildSlice = (set: SetState, get: GetState): Pick<GameState, 'setBuildMode' | 'setPlacing' | 'placeFurniture' | 'moveFurniture' | 'moveMainCounter' | 'sellFurniture' | 'demolishAll' | 'buyUpgrade' | 'repairFurniture' | 'paint'> => ({
  setBuildMode: (on) => set({ buildMode: on, placing: null, panel: on ? { type: 'build' } : null }),
  setPlacing: (placing) => set({ placing, panel: null }),
  placeFurniture: (type, x, z, rot) => {
    const s = get();
    const def = furnitureDef(type);
    if (s.money < def.price) {
      s.notify('Không đủ tiền!');
      return false;
    }
    const uid = Math.max(0, ...s.furniture.map((f) => f.uid)) + 1;
    set({
      money: s.money - def.price,
      furniture: [...s.furniture, { uid, type, x, z, rot, tiers: emptyTiers(type) }],
      stats: { ...s.stats, spent: s.stats.spent + def.price },
      totals: { ...s.totals, spent: s.totals.spent + def.price },
    });
    return true;
  },
  moveFurniture: (uid, x, z, rot) => updateFurniture(set, get, uid, (f) => ({ ...f, x, z, rot })),
  moveMainCounter: (x, z, rot) => set({ mainCounter: { x, z, rot } }),
  sellFurniture: (uid) => {
    const s = get();
    const f = s.furniture.find((it) => it.uid === uid);
    if (!f) return;
    const k = copyStock(s);
    for (const t of f.tiers) returnTier(k, t);
    const refund = Math.round(furnitureDef(f.type).price * SELL_BACK);
    // Kệ đã bán đi thì bỏ luôn số heat của nó
    const heat = { ...s.shelfHeat };
    delete heat[uid];
    const perf = { ...s.shelfProfit };
    delete perf[uid];
    set({ money: s.money + refund, ...k, furniture: s.furniture.filter((it) => it.uid !== uid), placing: null, shelfHeat: heat, shelfProfit: perf });
    s.notify(`Đã bán ${furnitureDef(f.type).name}, nhận lại ${formatMoney(refund)}. Hàng trên kệ về kho.`);
  },
  demolishAll: () => {
    const s = get();
    const k = copyStock(s);
    let refund = 0;
    for (const f of s.furniture) {
      for (const t of f.tiers) returnTier(k, t);
      refund += Math.round(furnitureDef(f.type).price * SELL_BACK);
    }
    set({ money: s.money + refund, ...k, furniture: [], placing: null, shelfHeat: {}, shelfProfit: {} });
    s.notify(`🔨 Đã dọn sạch tiệm, nhận lại ${formatMoney(refund)}. Hàng về kho.`);
  },
  buyUpgrade: () => {
    const s = get();
    const next = SHOP_TIERS[s.shopTier + 1];
    if (!next || s.pendingUpgrade) return;
    if (s.level < next.unlock) return s.notify(`Cần đạt cấp ${next.unlock}`);
    if (s.money < next.price) return s.notify('Không đủ tiền!');
    set({ money: s.money - next.price, pendingUpgrade: true, stats: { ...s.stats, spent: s.stats.spent + next.price }, totals: { ...s.totals, spent: s.totals.spent + next.price } });
    s.notify(`🏗️ Đã thuê thợ! Sáng mai tiệm thành "${next.name}".`);
  },
  repairFurniture: (uid) => {
    const s = get();
    const f = s.furniture.find((it) => it.uid === uid);
    if (!f) return;
    const cost = repairCost(f.type);
    if (s.money < cost) return s.notify('Không đủ tiền!');
    updateFurniture(set, get, uid, (old) => ({ ...old, wear: 10, broken: false }));
    set({ money: get().money - cost, stats: { ...s.stats, spent: s.stats.spent + cost }, totals: { ...s.totals, spent: s.totals.spent + cost } });
    s.notify(`🔧 Đã ${f.broken ? 'sửa' : 'bảo trì'} ${furnitureDef(f.type).name}: ${formatMoney(cost)}`);
  },
  paint: (part, color) => {
    const s = get();
    if (s.style[part] === color) return;
    if (s.money < PAINT_PRICE) return s.notify('Không đủ tiền!');
    set({
      money: s.money - PAINT_PRICE,
      style: { ...s.style, [part]: color },
      stats: { ...s.stats, spent: s.stats.spent + PAINT_PRICE },
      totals: { ...s.totals, spent: s.totals.spent + PAINT_PRICE },
    });
  },
});
