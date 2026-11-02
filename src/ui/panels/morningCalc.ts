import { comboById } from '../../data/combos';
import { productById } from '../../data/products';
import { RECIPES } from '../../data/recipes';
import { kitchenValue } from '../../data/kitchenValue';
import { pickEveningPrep } from '../../data/cookSchedule';
import type { ComboDayStat } from '../../core/slices/comboDay';

/** GĐ124/944: combo đang chạy nhưng hôm qua ít bán (≤3) hoặc lỗ cả cặp — tối đa 2 dòng, tệ nhất trước. Thuần. */
export function weakYesterdayCombos(snap: Record<string, ComboDayStat>, running: string[], priceOf: (id: string) => number) {
  return running
    .map((id) => {
      const def = comboById(id);
      const t = snap[id];
      if (!def || !t || !t.count) return null;
      const [a, b] = def.items.map(productById);
      const full = priceOf(a.id) + priceOf(b.id);
      const cut = Math.round((full * def.discount) / 100) * 100;
      const margin = full - cut - a.buy - b.buy;
      return { def, t, margin };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter((r) => r.margin < 0 || r.t.count <= 3)
    .sort((x, y) => (x.margin === y.margin ? x.t.count - y.t.count : x.margin - y.margin))
    .slice(0, 2);
}

/** GĐ161/944: món mẻ dài nhất vẫn kịp giờ vàng tối, chỉ trong khung 13–17h. cSpeed/bBoost do UI đọc từ store. Thuần. */
export function eveningPrepFor(o: {
  nowMinutes: number; level: number; furniture: { type: string }[]; storage: Record<string, number>; cSpeed: number; bBoost: number;
}) {
  if (o.nowMinutes < 13 * 60 || o.nowMinutes >= 17 * 60) return null;
  const cands = RECIPES
    .filter((r) => !r.festival && o.level >= r.unlock
      && o.furniture.some((f) => f.type === r.station)
      && r.inputs.every((i) => (o.storage[i.productId] ?? 0) >= i.quantity))
    .map((r) => ({
      id: r.id,
      name: r.name,
      durationMin: Math.ceil(r.durationMin / (o.cSpeed * (r.station === 'drink_counter' ? o.bBoost : 1))),
      perMinute: kitchenValue(r).perMinute,
    }));
  return pickEveningPrep(cands, o.nowMinutes);
}
