/** Kho theo lô: cất, lấy, trả từ kệ, hỏng qua đêm; và chuyển tầng kệ của bản lưu cũ. */
import { furnitureDef, slotCount, type FurnitureType } from '../data/furniture';
import { warehouseTier } from '../data/warehouse';
import { productById } from '../data/products';
import { ageLots, fitLots, mergeLots, needsCold, shelfLife, spoilRate, takeOldest, type Lot } from '../data/freshness';
import { spoilFactor } from './biz';
import { hasSkill } from '../data/titles';
import { WAREHOUSE_KEEP_PER_STAR } from '../data/staff';
import type { GameState, Furniture, Tier } from './gameTypes';

export interface Stock { storage: Record<string, number>; storageLots: Record<string, Lot[]> }

export const copyStock = (s: Stock): Stock => ({ storage: { ...s.storage }, storageLots: { ...s.storageLots } });

/** Cất lô vào kho (mặc định là hàng mới nhập, hạn đầy). */
export function putStock(k: Stock, id: string, qty: number, lots: Lot[] = [{ qty, life: shelfLife(id) }]) {
  if (qty <= 0) return;
  k.storageLots[id] = mergeLots(fitLots(k.storageLots[id], k.storage[id] ?? 0, id), lots);
  k.storage[id] = (k.storage[id] ?? 0) + qty;
}

/** Lấy tối đa `qty` món khỏi kho, lô sắp hết hạn trước. */
export function takeStock(k: Stock, id: string, qty: number): Lot[] {
  const [rest, taken] = takeOldest(fitLots(k.storageLots[id], k.storage[id] ?? 0, id), qty);
  k.storageLots[id] = rest;
  k.storage[id] = rest.reduce((n, l) => n + l.qty, 0);
  return taken;
}

/** Trả hàng trên một tầng kệ về kho. */
export function returnTier(k: Stock, t: Tier) {
  if (t.productId && t.count > 0) putStock(k, t.productId, t.count, fitLots(t.lots, t.count, t.productId));
}

/**
 * Qua đêm: trừ hạn mọi lô theo chỗ cất và thời tiết hôm nay, bỏ hàng hết hạn.
 * Trả về kho, nội thất mới và số món/tiền vốn bỏ đi.
 */
export function spoilOvernight(s: Pick<GameState, 'storage' | 'storageLots' | 'furniture' | 'weather' | 'warehouseTier' | 'skills' | 'biz' | 'day' | 'staff'>) {
  let items = 0;
  let cost = 0;
  /** Số món hỏng theo từng sản phẩm — cho sổ phân tích 30 ngày. */
  const byId: Record<string, number> = {};
  // fresh_keeper: hàng hỏng chậm 25%
  const keeper = hasSkill(s.skills, 'fresh_keeper') ? 0.75 : 1;
  // cool_pack: mở khóa ở cấp 12 – cộng thêm 0.8 cho hệ số giữ tươi
  const cooler = hasSkill(s.skills, 'cool_pack') ? 0.85 : 1;
  // zero_waste: mở khóa ở cấp 35 – giảm 50% tốc độ hư hỏng thực phẩm tươi
  const zeroWasteMul = hasSkill(s.skills, 'zero_waste') ? 0.5 : 1;
  const effectiveKeeper = keeper * cooler * (zeroWasteMul === 0.5 ? (zeroWasteMul + (1 - zeroWasteMul) * keeper) : 1);
  // Quản lý kho: sắp xếp xoay hàng, hàng hỏng chậm hơn theo tay nghề (không kể ca — dọn kho cả ngày)
  const mgrSkill = s.staff.reduce((best, st) => (st.role === 'warehouse_mgr' ? Math.max(best, st.skill) : best), 0);
  // Clamp ≥0.1 để nếu sau này skill vượt 5 (hoặc đổi hằng số) hệ số không thể âm — âm sẽ biến "hỏng hàng" thành "đẻ thêm hàng"
  const keeperMgr = Math.max(0.1, 1 - WAREHOUSE_KEEP_PER_STAR * mgrSkill);
  const spoil = (id: string, lots: Lot[], place: Parameters<typeof spoilRate>[1]) => {
    // Áp dụng zero_waste cho hàng tươi sống (fresh category)
    const product = productById(id);
    const isFresh = product.category === 'fresh';
    // Mèo giữ tiệm bắt chuột: hàng hỏng chậm hơn
    const rate = spoilRate(id, place, s.weather) * (isFresh ? effectiveKeeper : keeper) * keeperMgr * spoilFactor(s.biz, s.day);
    const [kept, gone] = ageLots(lots, rate);
    items += gone;
    cost += gone * product.buy;
    if (gone) byId[id] = (byId[id] ?? 0) + gone;
    return kept;
  };
  const k: Stock = { storage: {}, storageLots: {} };
  // Tủ lạnh kho giữ lạnh được một số món: ưu tiên hàng hạn ngắn nhất
  let cold = warehouseTier(s.warehouseTier).cold;
  const ids = Object.keys(s.storage).sort((a, b) => shelfLife(a) - shelfLife(b));
  for (const id of ids) {
    const qty = s.storage[id];
    if (qty <= 0) continue;
    let lots = fitLots(s.storageLots[id], qty, id);
    let chilled: Lot[] = [];
    if (cold > 0 && needsCold(id)) {
      [lots, chilled] = takeOldest(lots, cold);
      cold -= chilled.reduce((n, l) => n + l.qty, 0);
    }
    const kept = mergeLots(spoil(id, lots, 'storage'), spoil(id, chilled, 'coldStorage'));
    k.storageLots[id] = kept;
    k.storage[id] = kept.reduce((n, l) => n + l.qty, 0);
  }
  const furniture = s.furniture.map((f) => ({
    ...f,
    tiers: f.tiers.map((t) => {
      if (!t.productId || t.count <= 0) return t;
      // Tủ mát/tủ đông hỏng: mất lạnh, hàng trong tủ hỏng nhanh như để ngoài kho
      const place = f.broken && (f.type === 'fridge' || f.type === 'freezer') ? 'storage' as const : f.type;
      const lots = spoil(t.productId, fitLots(t.lots, t.count, t.productId), place);
      return { ...t, lots, count: lots.reduce((n, l) => n + l.qty, 0) };
    }),
  }));
  return { ...k, furniture, items, cost, byId };
}

export const emptyTiers = (type: FurnitureType): Tier[] =>
  Array.from({ length: slotCount(type) }, () => ({ productId: null, count: 0 }));

/**
 * Bản lưu cũ mỗi tầng là một món (tối đa slots × capacity): chia hàng của tầng đó vào các ô của tầng,
 * lô cũ vào ô đầu. Đồ đã đúng số ô thì giữ nguyên. Kệ tăng/giảm số ô (đợt kệ rộng hơn) thì
 * bù ô trống hoặc cắt bớt để khớp tầng × ô hiện tại.
 */
export function migrateTiers(f: Furniture): Furniture {
  const def = furnitureDef(f.type);
  const target = slotCount(f.type);
  if (f.tiers.length === target) return f;
  if (f.tiers.length !== def.tiers) {
    // Đúng dạng tầng × ô nhưng số ô đã đổi: giữ nguyên hàng, bù ô trống / cắt ô thừa
    const tiers = f.tiers.slice(0, target).map((t) => ({ ...t }));
    while (tiers.length < target) tiers.push({ productId: null, count: 0 });
    return { ...f, tiers };
  }
  const tiers: Tier[] = [];
  for (const old of f.tiers) {
    let lots = old.productId ? fitLots(old.lots, old.count, old.productId) : [];
    for (let i = 0; i < def.slots; i++) {
      const [rest, taken] = takeOldest(lots, def.capacity);
      lots = rest;
      const count = taken.reduce((n, l) => n + l.qty, 0);
      tiers.push({ productId: count || i === 0 ? old.productId : null, count, lots: taken });
    }
  }
  return { ...f, tiers };
}
