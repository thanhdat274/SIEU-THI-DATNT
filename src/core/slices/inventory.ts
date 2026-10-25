import { furnitureDef } from '../../data/furniture';
import { warehouseTier, WAREHOUSE_TIERS } from '../../data/warehouse';
import { customersPerDay } from '../../data/levels';
import { formatMoney, productById, unlockedProducts } from '../../data/products';
import { orderTotal, supplierById } from '../../data/suppliers';
import { fitLots, mergeLots, tierMarkdown, takeOldest } from '../../data/freshness';
import { COOKED_PRODUCT_IDS } from '../../data/recipes';
import { type GameState, type Furniture, type SetState, type GetState, storageCapacity, storageUsed } from '../gameTypes';
import { copyStock, putStock, takeStock, returnTier } from '../stock';
import { updateFurniture } from './build';

/** Kho và kệ: nhập hàng, đặt nhà cung cấp, nâng kho, bày/rút hàng, khách lấy hàng khỏi kệ. */

export const createInventorySlice = (set: SetState, get: GetState): Pick<GameState, 'toggleShop' | 'buy' | 'placeOrder' | 'noteDemand' | 'upgradeWarehouse' | 'replaceEmptySlots' | 'unstockTier' | 'stockTier' | 'takeFromShelf' | 'consumeStock'> => ({
  toggleShop: () => {
    const s = get();
    if (!s.shopOpen && s.inspection?.suspendedDay === s.day) return s.notify('⛔ Tiệm đang bị đình chỉ kinh doanh hôm nay vì trượt thanh tra nhiều lần — mai mới mở cửa lại được');
    set({ shopOpen: !s.shopOpen });
    s.notify(s.shopOpen ? '🔒 Đã đóng cửa tiệm' : `🏪 Mở cửa! Hôm nay dự kiến khoảng ${customersPerDay(s.level)} khách`);
  },
  buy: (productId, qty) => {
    const s = get();
    // Món nhà làm không nhập được ở đâu: phải tự nấu ở trạm (vì vậy đơn nấu mới có ý nghĩa)
    if (COOKED_PRODUCT_IDS.has(productId)) {
      s.notify(`🍳 ${productById(productId).name} là món nhà làm — vào trạm nấu để chế biến nhé`);
      return false;
    }
    const cost = productById(productId).buy * qty;
    if (s.money < cost) {
      s.notify('Không đủ tiền!');
      return false;
    }
    const k = copyStock(s);
    putStock(k, productId, qty);
    set({
      money: s.money - cost,
      ...k,
      stats: { ...s.stats, spent: s.stats.spent + cost },
      totals: { ...s.totals, spent: s.totals.spent + cost },
    });
    return true;
  },
  placeOrder: (supplierId, items) => {
    const s = get();
    const sup = supplierById(supplierId);
    const lines = Object.fromEntries(Object.entries(items).filter(([, q]) => q > 0));
    const cost = orderTotal(sup, lines, s.day);
    if (!Object.keys(lines).length) return false;
    if (cost < sup.minOrder) {
      s.notify(`${sup.name} nhận đơn từ ${formatMoney(sup.minOrder)}`);
      return false;
    }
    if (s.money < cost) {
      s.notify('Không đủ tiền!');
      return false;
    }
    // Hàng đang chờ giao cũng phải có chỗ trong kho
    const pending = s.deliveries.map((d) => d.items);
    const cap = storageCapacity(s.warehouseTier);
    const need = storageUsed(s.storage, ...pending, lines);
    if (need > cap) {
      s.notify(`📦 Nhà kho không đủ chỗ: đơn cần ${need - storageUsed(s.storage, ...pending)} thùng, kho còn trống ${Math.max(0, cap - storageUsed(s.storage, ...pending))} thùng. Nâng cấp nhà kho nhé!`);
      return false;
    }
    const stats = { ...s.stats, spent: s.stats.spent + cost };
    const totals = { ...s.totals, spent: s.totals.spent + cost };
    if (sup.delayDays === 0) {
      const k = copyStock(s);
      for (const [id, qty] of Object.entries(lines)) putStock(k, id, qty);
      set({ money: s.money - cost, ...k, stats, totals });
      const swapped = s.autoSwap ? get().replaceEmptySlots() : [];
      s.notify(`📦 Đã nhập hàng từ ${sup.name}: ${formatMoney(cost)}${swapped.length ? ` · 🔄 Thay ô hết hàng: ${swapped.join(', ')}` : ''}`);
    } else {
      set({ money: s.money - cost, stats, totals, deliveries: [...s.deliveries, { supplierId, items: lines }] });
      s.notify(`🚚 Đã đặt ${sup.name} (${formatMoney(cost)}), hàng về lúc 6h sáng mai`);
    }
    return true;
  },
  noteDemand: (productId) => {
    const d = get().demandToday;
    set({ demandToday: { ...d, [productId]: (d[productId] ?? 0) + 1 } });
  },
  upgradeWarehouse: () => {
    const s = get();
    const next = WAREHOUSE_TIERS[s.warehouseTier + 1];
    if (!next) return false;
    if (s.level < next.unlock) {
      s.notify(`Cần cấp ${next.unlock} để nâng lên ${next.name}`);
      return false;
    }
    if (s.money < next.price) {
      s.notify('Không đủ tiền!');
      return false;
    }
    set({ money: s.money - next.price, warehouseTier: s.warehouseTier + 1, stats: { ...s.stats, spent: s.stats.spent + next.price }, totals: { ...s.totals, spent: s.totals.spent + next.price } });
    s.notify(`🏭 Đã nâng cấp ${next.name}: chứa ${next.cases} thùng, giữ lạnh ${next.cold} món`);
    return true;
  },
  replaceEmptySlots: () => {
    const done: string[] = [];
    const incoming = new Set(get().deliveries.flatMap((d) => Object.keys(d.items)));
    for (const f0 of get().furniture) {
      const def = furnitureDef(f0.type);
      f0.tiers.forEach((t0, i) => {
        const s = get();
        const f = s.furniture.find((it) => it.uid === f0.uid)!;
        const t = f.tiers[i];
        const old = t.productId;
        if (!old || t.count > 0 || (s.storage[old] ?? 0) > 0 || incoming.has(old)) return;
        // Món thay: kho đang có, ưu tiên món chưa bày ở đâu trong tiệm, rồi món kho còn nhiều nhất
        const shown = new Set(s.furniture.flatMap((it) => it.tiers.filter((x) => x.count > 0).map((x) => x.productId)));
        const pick = unlockedProducts(s.level)
          .filter((p) => def.categories.includes(p.category) && (s.storage[p.id] ?? 0) > 0)
          .sort((a, b) => Number(shown.has(a.id)) - Number(shown.has(b.id)) || (s.storage[b.id] ?? 0) - (s.storage[a.id] ?? 0))[0];
        if (!pick) return;
        s.stockTier(f.uid, i, pick.id);
        done.push(`${productById(old).name} → ${pick.name}`);
      });
    }
    return done;
  },
  unstockTier: (uid, tierIndex) => {
    const k = copyStock(get());
    updateFurniture(set, get, uid, (f) => ({
      ...f,
      tiers: f.tiers.map((t, i) => {
        if (i !== tierIndex) return t;
        returnTier(k, t);
        return { ...t, count: 0, lots: [] };
      }),
    }));
    set(k);
  },
  stockTier: (uid, tierIndex, productId) => {
    const s = get();
    const k = copyStock(s);
    updateFurniture(set, get, uid, (f) => {
      const tiers = f.tiers.map((t) => ({ ...t }));
      const tier = tiers[tierIndex];
      // Đổi loại hàng thì trả hàng cũ về kho
      if (tier.productId && tier.productId !== productId) {
        returnTier(k, tier);
        tier.count = 0;
        tier.lots = [];
      }
      tier.productId = productId;
      if (productId) {
        const moved = takeStock(k, productId, furnitureDef(f.type).capacity - tier.count);
        tier.lots = mergeLots(fitLots(tier.lots, tier.count, productId), moved);
        tier.count = tier.lots.reduce((n, l) => n + l.qty, 0);
      }
      return { ...f, tiers };
    });
    set(k);
  },
  takeFromShelf: (productId, preferUid) => {
    const s = get();
    // Ưu tiên kệ khách đang đứng trước, sau đó tới tủ mát (đắt hơn)
    const score = (f: Furniture) => (f.uid === preferUid ? 10 : 0) + (furnitureDef(f.type).priceBonus ?? 0);
    const sorted = [...s.furniture].sort((a, b) => score(b) - score(a));
    for (const f of sorted) {
      if (f.broken) continue;
      const j = f.tiers.findIndex((t) => t.productId === productId && t.count > 0);
      if (j < 0) continue;
      updateFurniture(set, get, f.uid, (old) => ({
        ...old,
        tiers: old.tiers.map((t, i) => (i === j ? { ...t, count: t.count - 1, lots: takeOldest(fitLots(t.lots, t.count, productId), 1)[0] } : t)),
      }));
      // Heatmap vị trí: đếm số món bán ra của kệ vừa được lấy hàng
      const heat = get().shelfHeat;
      set({ shelfHeat: { ...heat, [f.uid]: (heat[f.uid] ?? 0) + 1 } });
      // Lô cận hạn tự giảm giá
      const sale = tierMarkdown(productId, f.tiers[j].lots, f.tiers[j].count);
      return Math.round(s.priceOf(productId) * (1 + (furnitureDef(f.type).priceBonus ?? 0)) * (1 - sale));
    }
    return null;
  },
  consumeStock: (productId, qty) => {
    const k = copyStock(get());
    takeStock(k, productId, qty);
    set(k);
  },
});
