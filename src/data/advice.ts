import { productById } from './products';
import type { ReviewReason } from './reviews';
import { fitLots, needsCold, shelfLife, spoilRate, type Lot } from './freshness';
import { warehouseTier, WAREHOUSE_TIERS } from './warehouse';
import type { Weather } from './weather';
import type { AnalyticsState } from './analytics';

/** Bảng mở ra khi bấm nút của một gợi ý. */
export type AdviceAction = 'order' | 'arrange' | 'prices' | 'staff';

export const ACTION_LABEL: Record<AdviceAction, string> = {
  order: '📦 Nhập hàng', arrange: '🧺 Xếp kệ', prices: '🏷️ Đổi giá', staff: '👥 Nhân viên',
};

/** Lần khách không mua được, theo "lý do:mã món" (vd. "stock:mi"); bỏ về vì chờ lâu là "wait:". */
export type MissLog = Record<string, number>;

export const missKey = (reason: ReviewReason, productId?: string) => `${reason}:${productId ?? ''}`;

// ───── GĐ131: định lượng doanh thu/lãi bỏ lỡ vì kệ/kho hết hàng ở tiệm CHÍNH ─────
// Đóng vòng phản hồi chi-vốn-lặp lại lớn nhất còn là hộp đen: mua kệ/kho có ROI.
// THUẦN đọc từ `missLog` đã có — không đổi SAVE_VERSION/persist/kinh tế.

export interface StoreMissRow {
  id: string;
  name: string;
  count: number;
  /** Còn trong kho không (0 = kho cũng hết → cần nhập; >0 = kho còn → chỉ thiếu chỗ bày). */
  inStorage: number;
  /** Lãi ước tính bỏ lỡ: (sell − buy) × count — món khách muốn mà kệ trống. */
  estLoss: number;
}

export interface StoreMissRevenue {
  rows: StoreMissRow[];
  totalLoss: number;
  /** Số món lỡ mà còn hàng trong kho (kết luận "bày thêm lên kệ"). */
  inStorageCount: number;
  /** Số món lỡ mà kho cũng hết (kết luận "nhập thêm"). */
  outOfStockCount: number;
}

/** Quy mọi lần "khách tìm món mà kệ trống" (missLog['stock:<id>']) ra lãi bỏ lỡ. null khi không có món nào lỡ. */
export function storeMissRevenue(log: MissLog | undefined, inStorage: Record<string, number>): StoreMissRevenue | null {
  const rows = Object.entries(log ?? {})
    .filter(([key]) => key.startsWith('stock:'))
    .map(([key, count]) => {
      const p = productById(key.slice('stock:'.length));
      if (!p) return null;
      return { id: p.id, name: p.name, count, inStorage: inStorage[p.id] ?? 0, estLoss: (p.sell - p.buy) * count };
    })
    .filter((x): x is StoreMissRow => x !== null)
    .sort((a, b) => b.estLoss - a.estLoss);
  if (!rows.length) return null;
  const totalLoss = rows.reduce((n, r) => n + r.estLoss, 0);
  return {
    rows,
    totalLoss,
    inStorageCount: rows.filter((r) => r.inStorage > 0).length,
    outOfStockCount: rows.filter((r) => r.inStorage === 0).length,
  };
}

// ───── GĐ133: bản kê NGƯỢC "đêm qua món nào hỏng, tốn bao nhiêu, vì sao" ─────
// Đóng nửa "sau" của vòng lặp quan trọng nhất (nhập → hỏng đêm → thấy số → chỉnh đơn).
// Khác expiringSoon/nearExpiry (cảnh báo TRƯỚC) và khác storeMissRevenue (lãi bỏ lỡ vì THIẾU hàng);
// cái này = THỪA/HỎNG đã xảy ra. THUẦN đọc từ `analytics.items[id][].spoiled` — không đổi state/kinh tế.

/** Hệ số chi phí vốn của món: số món hỏng × giá nhập (đúng công thức `spoilOvernight`). */
export interface SpoilRow {
  id: string;
  name: string;
  spoiled: number;
  cost: number;
  /** Nguyên nhân gần đúng ("~" ước tính): cần lạnh để ngoài tủ / món tươi short-life / để lâu hết hạn. */
  kind: 'cold' | 'short' | 'age';
}

export interface SpoilNightReport {
  rows: SpoilRow[];
  totalCost: number;
}

const SHORT_LIFE_DAYS = 3;

/** Bản kê hàng hỏng đáng giá trong đêm vừa chốt (`closedDay`). null khi không món nào hỏng. */
export function spoilNightReport(analytics: AnalyticsState | undefined, closedDay: number): SpoilNightReport | null {
  const items = analytics?.items;
  if (!items) return null;
  const rows: SpoilRow[] = [];
  for (const [id, recs] of Object.entries(items)) {
    const rec = recs.find((r) => r.day === closedDay);
    const spoiled = rec?.spoiled ?? 0;
    if (spoiled <= 0) continue;
    const p = productById(id);
    const cost = spoiled * p.buy;
    const kind = needsCold(id) ? 'cold' as const : shelfLife(id) <= SHORT_LIFE_DAYS ? 'short' as const : 'age' as const;
    rows.push({ id, name: p.name, spoiled, cost, kind });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => b.cost - a.cost);
  return { rows, totalCost: rows.reduce((n, r) => n + r.cost, 0) };
}

// ───── GĐ134: "🧊 Tủ lạnh kho đầy" — định lượng hàng cần lạnh vượt khả năng giữ lạnh ─────
// Bổ sung cho GĐ133 (kê hàng hỏng): trỏ tới NGUYÊN NHÂN tắc vòng lạnh — tủ kho chỉ giữ lạnh
// `cold` món, phần dư để ngoài hỏng nhanh hơn (spoilRate chỗ 'storage' > 'coldStorage').
// THUẦN đọc `storage` + `warehouseTier(i).cold` — không đổi state/kinh tế; chỉ xuất hiện khi tràn.

export interface ColdOverflowItem {
  id: string;
  name: string;
  qty: number;
  /** Tốc độ mất hạn khi để ngoài kho (chỗ 'storage') — cho người chơi thấy "hỏng nhanh gấp ~N×". */
  penalty: number;
}

export interface ColdOverflow {
  /** Tổng món cần lạnh đang nằm trong kho. */
  coldQty: number;
  /** Khả năng giữ lạnh của tủ kho hiện tại (`warehouseTier(i).cold`). */
  capacity: number;
  /** Số món dư ra phải để ngoài (nhiệt độ thường), hỏng nhanh hơn. */
  overflow: number;
  /** Khả năng giữ lạnh nếu nâng một bậc kho (null khi đã tối đa). */
  nextCapacity: number | null;
  /** Các món cần lạnh chiếm nhiều nhất trong kho (theo số món) để dễ nhận diện. */
  items: ColdOverflowItem[];
}

/** Báo khi hàng cần lạnh trong kho vượt khả năng giữ lạnh của tủ kho. null khi chưa tràn. */
export function coldOverflow(
  storage: Record<string, number> | undefined,
  tierIndex: number,
  weather: Weather,
): ColdOverflow | null {
  const capacity = warehouseTier(tierIndex).cold;
  const coldItems: { id: string; qty: number }[] = [];
  let coldQty = 0;
  for (const [id, qty] of Object.entries(storage ?? {})) {
    if (qty > 0 && needsCold(id)) {
      coldItems.push({ id, qty });
      coldQty += qty;
    }
  }
  if (coldQty <= capacity) return null;
  const items: ColdOverflowItem[] = coldItems
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3)
    .map(({ id, qty }) => ({
      id,
      name: productById(id).name,
      qty,
      penalty: spoilRate(id, 'storage', weather),
    }));
  return {
    coldQty,
    capacity,
    overflow: coldQty - capacity,
    nextCapacity: WAREHOUSE_TIERS[tierIndex + 1]?.cold ?? null,
    items,
  };
}

export interface Advice {
  icon: string;
  text: string;
  action?: AdviceAction;
}

/** Ngưỡng: một món bị lỡ từ chừng này lần trở lên mới đáng nhắc. */
const MIN_REPEAT = 2;

/**
 * Gợi ý việc nên làm từ những lần khách không mua được hôm nay, việc lỡ nhiều nhất lên trước.
 * `inStorage` để phân biệt "kho còn mà kệ hết" (bày thêm) với "kho cũng hết" (nhập thêm).
 */
export function walkoutAdvice(log: MissLog, inStorage: Record<string, number>, priceOf: (id: string) => number, max = 4): Advice[] {
  const rows = Object.entries(log)
    .map(([key, count]) => {
      const [reason, id] = key.split(':') as [ReviewReason, string];
      return { reason, id, count };
    })
    .filter((r) => r.count >= MIN_REPEAT || r.reason === 'wait')
    .sort((a, b) => b.count - a.count);
  const out: Advice[] = [];
  for (const r of rows) {
    if (out.length >= max) break;
    if (r.reason === 'wait') {
      out.push({ icon: '⏳', text: `${r.count} khách bỏ về vì chờ quầy lâu: thuê thu ngân, mở thêm quầy hoặc đứng quầy giờ cao điểm.`, action: 'staff' });
      continue;
    }
    const p = productById(r.id);
    if (!p) continue;
    if (r.reason === 'stock') {
      const kho = inStorage[r.id] ?? 0;
      out.push(kho > 0
        ? { icon: '🧺', text: `${p.name}: ${r.count} lần kệ trống trong khi kho còn ${kho}. Bày thêm lên kệ hoặc thuê người châm hàng.`, action: 'arrange' as const }
        : { icon: '📦', text: `${p.name}: ${r.count} lần khách hỏi mà hết hàng. Nhập thêm ở bàn nhận hàng.`, action: 'order' as const });
    } else if (r.reason === 'price') {
      const now = priceOf(r.id);
      const suggest = Math.max(p.buy, Math.round(Math.min(now, p.sell) * 0.95 / 500) * 500);
      out.push({ icon: '💸', text: `${p.name}: ${r.count} lần khách chê đắt ở giá ${now.toLocaleString('vi-VN')}đ. Thử hạ về khoảng ${suggest.toLocaleString('vi-VN')}đ.`, action: 'prices' });
    }
  }
  return out;
}

/** Hàng còn chừng này ngày trở xuống thì báo sắp hỏng. */
export const EXPIRY_WARN_DAYS = 2;

export interface ExpiringLine {
  id: string;
  qty: number;
  /** Hạn ngắn nhất còn lại (ngày). */
  life: number;
  inStorage: number;
  onShelf: number;
}

/** Hàng sắp hết hạn trong kho và trên kệ, gộp theo món, hạn ngắn nhất lên trước. */
export function expiringSoon(
  storage: Record<string, number>,
  storageLots: Record<string, Lot[]>,
  shelves: { productId: string | null; count: number; lots?: Lot[] }[],
): ExpiringLine[] {
  const rows = new Map<string, ExpiringLine>();
  const add = (id: string, lots: Lot[], where: 'inStorage' | 'onShelf') => {
    for (const l of lots) {
      if (l.life > EXPIRY_WARN_DAYS) continue;
      const row = rows.get(id) ?? { id, qty: 0, life: Infinity, inStorage: 0, onShelf: 0 };
      row.qty += l.qty;
      row[where] += l.qty;
      row.life = Math.min(row.life, l.life);
      rows.set(id, row);
    }
  };
  for (const [id, qty] of Object.entries(storage)) if (qty > 0) add(id, fitLots(storageLots[id], qty, id), 'inStorage');
  for (const t of shelves) if (t.productId && t.count > 0) add(t.productId, fitLots(t.lots, t.count, t.productId), 'onShelf');
  return [...rows.values()].sort((a, b) => a.life - b.life || b.qty - a.qty);
}

/** Việc nên làm với hàng sắp hỏng: kho còn thì đem bày, đã bày thì giảm giá; hàng lạnh nằm kho thì nhắc cất tủ. */
export function expiryAdvice(lines: ExpiringLine[], max = 3): Advice[] {
  return lines.slice(0, max).map((l) => {
    const p = productById(l.id);
    const when = l.life <= 1 ? 'hỏng trong đêm nay' : `còn ${Math.floor(l.life)} ngày`;
    if (l.inStorage > 0) {
      const cold = needsCold(l.id) ? ' Hàng cần lạnh để ngoài kho hỏng nhanh gấp đôi, nên cất tủ mát.' : '';
      return { icon: '🥀', text: `${p.name}: ${l.qty} món ${when} (${l.inStorage} trong kho). Đem bày bán trước.${cold}`, action: 'arrange' as const };
    }
    return { icon: '🥀', text: `${p.name}: ${l.qty} món trên kệ ${when}. Hàng cận hạn tự giảm giá; hạ giá thêm để bán hết.`, action: 'prices' as const };
  });
}

export interface HourStat { hour: number; customers: number; revenue: number }

/** Giờ đông khách nhất và giờ vắng nhất (chỉ tính giờ có khách). */
export function peakHours(byHour: Record<number, { customers: number; revenue: number }> | undefined) {
  const keys = Object.keys(byHour ?? {}).map(Number);
  // Lấp cả giờ không có khách ở giữa để biểu đồ đúng nhịp thời gian
  const hours: HourStat[] = [];
  for (let h = Math.min(...keys); h <= Math.max(...keys); h++) hours.push({ hour: h, customers: 0, revenue: 0, ...byHour?.[h] });
  const busy = hours.filter((h) => h.customers > 0);
  const peak = [...busy].sort((a, b) => b.customers - a.customers)[0];
  const quiet = busy.length >= 3 ? [...busy].sort((a, b) => a.customers - b.customers)[0] : undefined;
  return { hours, peak, quiet };
}

/** Gợi ý theo giờ: giờ cao điểm mà có khách bỏ về vì chờ thì nhắc xếp người đứng quầy giờ đó. */
export function peakAdvice(peak: HourStat | undefined, waitMisses: number): Advice[] {
  if (!peak || peak.customers < 4) return [];
  const slot = `${peak.hour}h–${peak.hour + 1}h`;
  return waitMisses > 0
    ? [{ icon: '⏰', text: `Đông nhất lúc ${slot} (${peak.customers} khách) và có ${waitMisses} khách bỏ về vì chờ. Xếp ca thu ngân trùm giờ này.`, action: 'staff' }]
    : [{ icon: '⏰', text: `Đông nhất lúc ${slot} (${peak.customers} khách). Châm đầy kệ món bán chạy trước giờ này.`, action: 'arrange' }];
}

/**
 * GĐ120: Khoảnh khắc phục vụ 'khách sốt ruột' (GĐ119) → phản hồi cuối ngày định lượng.
 * Đọc thuần state có sẵn (stats.missed.wait, stats.byHour, stats.customers) — không đổi
 * save/kinh tế. Trả về bức tranh 'mất khách vì chờ quầy' để vẽ thẻ dạy chơi trong Tổng kết
 * ngày, hoặc null khi hôm đó không có ai bỏ vì chờ (không nhiễu ngày yên ả).
 */
export interface WaitLossView {
  /** Số khách bỏ về vì chờ quầy. */
  count: number;
  /** Tỉ lệ so với tổng khách ghé (0–1). */
  pct: number;
  /** Giờ đông khách nhất trong ngày (nếu có), để trỏ tới gợi ý xếp ca. */
  peakHour: number | null;
}
export function waitLossStats(
  byHour: Record<number, { customers: number; revenue: number }> | undefined,
  missed: { wait?: number } | undefined,
  customers: number,
): WaitLossView | null {
  const count = missed?.wait ?? 0;
  if (count <= 0) return null;
  const peak = peakHours(byHour).peak;
  return { count, pct: customers > 0 ? count / customers : 1, peakHour: peak ? peak.hour : null };
}
