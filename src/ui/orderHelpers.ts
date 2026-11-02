import { useGame } from '../core/store';
import { caseSize, productById, unlockedProducts } from '../data/products';
import { shelfLife } from '../data/freshness';
import { furnitureDef } from '../data/furniture';
import { dayTraffic } from '../data/weather';
import { supplierSells, type Supplier } from '../data/suppliers';
import { buyCostTone, tomorrowCostDir, type AssessLineOut, type BuyTone, type Dir } from '../data/procure';
import { weekendPullOf, weekendSellingDays } from '../data/weekendRestock';

/** GĐ946: tách khỏi OrderPanel (nguyên văn): gợi ý số thùng nhập + nhãn dự phóng + tone giá mối. */
/** Món mới mở ở cấp này hoặc cấp trước, chưa ai hỏi mua: gợi ý nhập thử chừng này (thùng). */
export const TRIAL_CASES = 1;

/** Tiệm có kệ/tủ bày được món này không (không có chỗ bày thì nhập về chỉ nằm kho). */
export function displayable(productId: string) {
  const cat = productById(productId).category;
  return useGame.getState().furniture.some((f) => furnitureDef(f.type).categories.includes(cat));
}

/** Số món đang có: trong kho + trên kệ. */
export function onHand(productId: string) {
  const s = useGame.getState();
  let n = s.storage[productId] ?? 0;
  for (const f of s.furniture) for (const t of f.tiers) if (t.productId === productId) n += t.count;
  return n;
}

export const incoming = (productId: string) =>
  useGame.getState().deliveries.reduce((sum, d) => sum + (d.items[productId] ?? 0), 0);

/** Sức bày của món: tổng số món kệ/tủ tiệm đang chứa được cho ngành hàng của món này. */
export function displayCapacityFor(productId: string) {
  const cat = productById(productId).category;
  const s = useGame.getState();
  let slots = 0;
  for (const f of s.furniture) {
    const def = furnitureDef(f.type);
    if (!def.categories.includes(cat)) continue;
    slots += f.tiers.length * def.capacity;
  }
  return slots;
}

/**
 * Gợi ý nhập (số thùng): đủ bán ~2 ngày theo nhu cầu (hàng giao sáng mai thì cần dự phòng nhiều hơn),
 * hàng hot tính dư 50%, món mới chưa ai hỏi thì nhập thử một thùng.
 * Thông minh hơn: tính cả lượt khách hỏi hôm nay (kể cả lượt bị từ chối vì hết hàng — món đang "hụt hơi"),
 * và không nhập quá sức bày của món (nhập về thừa chỉ nằm kho chết hạn).
 */
export function suggestQty(productId: string, supplier: Supplier, hot: boolean, isNew: boolean) {
  const s = useGame.getState();
  // Không có chỗ bày thì khỏi nhập (nhập về chỉ nằm kho)
  if (!displayable(productId)) return 0;
  // Nhu cầu = trung bình nhiều ngày, hoặc hôm nay nếu hôm nay khách hỏi nhiều hơn (món đang hụt hơi)
  const demand = Math.max(s.demand[productId] ?? 0, s.demandToday[productId] ?? 0);
  // Hàng dễ hỏng thì chỉ nhập đủ bán trước khi hết hạn
  const days = Math.min(supplier.delayDays ? 2.5 : 1.5, shelfLife(productId) * 0.8);
  const fresh = isNew && s.level - productById(productId).unlock <= 1;
  const size = caseSize(productId);
  let target = demand ? Math.ceil(demand * days * (hot ? 1.5 : 1) * forecastTraffic(supplier)) : fresh || hot ? TRIAL_CASES * size : 0;
  // GĐ266: lô bán vào cuối tuần mà món thuộc nhóm ăn vặt (khách thèm thật — GĐ255) → nhân thêm
  // hệ số kéo cầu, để chiều thứ Sáu gợi ý đã biết trữ nhiều hơn (chỉ khi có cầu thật, không nhân món nhập thử)
  target = Math.ceil(target * weekendPullOf(productId, demand, weekendSellingDays(s.day, supplier.delayDays)));
  // Chặn trên: sức bày của món + một thùng dự phòng kho, để không nhập về nằm ứ
  target = Math.min(target, displayCapacityFor(productId) + size);
  const need = target - onHand(productId) - incoming(productId);
  return need > 0 ? Math.ceil(need / size) : 0;
}

/** Khách dự kiến so với ngày thường trong những ngày lô hàng này sẽ bán (hàng giao sáng mai thì tính từ mai). */
export function forecastTraffic(supplier: Supplier) {
  const s = useGame.getState();
  if (!supplier.delayDays) return dayTraffic(s.weatherSeed, s.day, s.weather);
  return (dayTraffic(s.weatherSeed, s.day + 1, s.forecast[0]) + dayTraffic(s.weatherSeed, s.day + 2, s.forecast[1])) / 2;
}

/** Text dự phóng của một dòng: gọn ≤ ~70 ký tự để ô tên món giữ tối đa 2 dòng. */
export function assessText(a: AssessLineOut, capacity: number): string {
  const share = `chiếm ${a.caseUse}/${capacity} thùng kho`;
  if (a.level === 'over') {
    if (a.overWhy === 'kho') return `⚠️ kho không đủ chỗ: ${share}`;
    const d = Math.max(1, Math.round(a.sellDays ?? 0));
    return `⚠️ nhập dư: chừng ${d} ngày hết hàng > hạn ${Math.round(a.shelfDays)} ngày, ước hỏng ${a.spoil} món`;
  }
  if (a.level === 'near') {
    const d = Math.max(1, Math.round(a.sellDays ?? 0));
    return `⏳ bán chậm — chừng ${d} ngày hết hàng, cân nhắc bớt`;
  }
  // Chưa có dữ liệu bán (cầu < 0.5/ngày hoặc chưa bán lần nào) → xám, không ước ngày vô nghĩa.
  return a.sellDays !== null ? `📦 chừng ${Math.max(1, Math.round(a.sellDays))} ngày hết hàng · ${share}` : `📦 chưa có dữ liệu bán — theo dõi thêm`;
}

/** Tóm tắt tone giá một mối hôm nay: độ lệch pct trung bình + nhãn rẻ/đắt theo đa số các món bán được đã mở khóa. */
export function supplierTone(s: Supplier, level: number, day: number): { pct: number; tone: BuyTone } | null {
  const rows = unlockedProducts(level).filter((p) => supplierSells(s, p.id));
  if (!rows.length) return null;
  const pct = Math.round(rows.reduce((a, p) => a + buyCostTone(s, p.id, day).pct, 0) / rows.length);
  const cheap = rows.filter((p) => buyCostTone(s, p.id, day).tone === 'cheap').length;
  const pricey = rows.filter((p) => buyCostTone(s, p.id, day).tone === 'pricey').length;
  const tone: BuyTone = pricey > cheap ? 'pricey' : cheap > pricey ? 'cheap' : 'normal';
  return { pct, tone };
}

/** Hướng giá mai của một mối theo đa số món (chỉ hướng, giữ phán đoán). */
export function supplierTomorrow(s: Supplier, level: number, day: number): Dir {
  const rows = unlockedProducts(level).filter((p) => supplierSells(s, p.id));
  if (!rows.length) return 'flat';
  const cheaper = rows.filter((p) => tomorrowCostDir(s, p.id, day) === 'cheaper').length;
  const pricier = rows.filter((p) => tomorrowCostDir(s, p.id, day) === 'pricier').length;
  return pricier > cheaper ? 'pricier' : cheaper > pricier ? 'cheaper' : 'flat';
}

