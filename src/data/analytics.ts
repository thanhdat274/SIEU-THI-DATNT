/**
 * Sổ phân tích kinh doanh dài hạn: ghi lại từng ngày một dòng số liệu theo món (bán được bao nhiêu,
 * lời bao nhiêu, hỏng bao nhiêu, lỡ bán bao nhiêu) giữ lại 30 ngày, rồi từ đó tính "sức khoẻ" từng
 * món, phân tích ABC, gợi ý nhập/bỏ/chuyển kệ, và đo tác động của combo, giờ vàng bằng cách so sánh
 * ngày có chạy với ngày không chạy.
 * Chỉ có dữ liệu và hàm thuần; ghi vào trạng thái ở `core/slices/endDay`, vẽ ở `ui/panels/AnalyticsPanel`.
 */
import { caseSize, productById, unlockedProducts } from './products';

export const ANALYTICS_DAYS = 30;

/** Một dòng sổ theo món của một ngày. */
export interface ItemDayRecord {
  day: number;
  qty: number;
  revenue: number;
  cost: number;
  /** Số món hết hạn phải bỏ đi đêm đó. */
  spoiled: number;
  /** Số lượt khách tìm mà không mua được (mọi lý do). */
  lost: number;
}

/** Cờ kinh doanh của một ngày, để đo tác động combo/giờ vàng/quảng cáo về sau. */
export interface DayFlag { combo: boolean; happyHour: boolean; ads?: boolean }

export interface AnalyticsState {
  /** Sổ theo món: id → các dòng cũ trước mới sau, tối đa 30 ngày. */
  items: Record<string, ItemDayRecord[]>;
  /** Cờ theo ngày (khoá là ngày game). Giữ cùng độ dài với sổ món cho đỡ phình. */
  flags: Record<string, DayFlag>;
}

export const newAnalytics = (): AnalyticsState => ({ items: {}, flags: {} });

/** Ghi một ngày vào sổ: cắt bớt dòng cũ quá 30 ngày. */
export function logAnalyticsDay(
  a: AnalyticsState,
  day: number,
  byItem: Record<string, { qty: number; revenue: number; cost: number }>,
  lostPerItem: Record<string, number>,
  spoiledPerItem: Record<string, number>,
  flag: DayFlag,
): AnalyticsState {
  const items: Record<string, ItemDayRecord[]> = { ...a.items };
  for (const [id, l] of Object.entries(byItem)) {
    items[id] = [...(items[id] ?? []), { day, qty: l.qty, revenue: l.revenue, cost: l.cost, spoiled: spoiledPerItem[id] ?? 0, lost: lostPerItem[id] ?? 0 }].slice(-ANALYTICS_DAYS);
  }
  // Món không bán mà vẫn hỏng/lỡ bán thì cũng ghi một dòng 0 để đủ mốc so sánh
  for (const id of new Set([...Object.keys(lostPerItem), ...Object.keys(spoiledPerItem)])) {
    if (items[id]?.at(-1)?.day === day) continue;
    items[id] = [...(items[id] ?? []), { day, qty: 0, revenue: 0, cost: 0, spoiled: spoiledPerItem[id] ?? 0, lost: lostPerItem[id] ?? 0 }].slice(-ANALYTICS_DAYS);
  }
  const flags: Record<string, DayFlag> = { ...a.flags, [day]: flag };
  const cutoff = day - ANALYTICS_DAYS;
  for (const k of Object.keys(flags)) if (Number(k) <= cutoff) delete flags[k];
  return { items, flags };
}

/** Sức khoẻ một món sau 30 ngày. */
export interface ItemHealth {
  id: string;
  name: string;
  /** Số món bán ra và tổng lời lỗ trong 30 ngày (lời = thu − vốn). */
  qty30: number;
  profit30: number;
  revenue30: number;
  /** Lời lỗ của 21 ngày gần nhất (≈ 3 tuần), để nhận ra món lỗ kéo dài dù cả tháng hoà. */
  profit21: number;
  /** Lợi nhuận trên 1đ doanh thu. */
  margin: number;
  /** Bán trung bình bao nhiêu món/ngày theo 14 ngày gần nhất. */
  dailyQty: number;
  /** Còn bao nhiêu ngày hết hàng với tốc độ bán hiện tại (kho + kệ chia trung bình ngày); null nếu không bán. */
  daysLeft: number | null;
  /** Phần hàng hỏng trên tổng số món chảy qua (bán + hỏng) trong 30 ngày. */
  spoilShare: number;
  /** Phần lượt khách tìm không mua được trên tổng lượt (mua + lỡ). */
  lostShare: number;
  abc: 'A' | 'B' | 'C';
}

/** Giá trị đang bày trên kệ của từng món. */
export function shelfCount(furniture: { tiers: { productId: string | null; count: number }[] }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of furniture) for (const t of f.tiers) {
    if (!t.productId || t.count <= 0) continue;
    out[t.productId] = (out[t.productId] ?? 0) + t.count;
  }
  return out;
}

/**
 * Bảng sức khoẻ mọi món đã từng ghi sổ (món nhập được ở cấp hiện tại đứng trước).
 * `stock` là kho, `onShelf` là số món đang bày, `demand` là cầu trung bình.
 */
export function itemHealthList(
  a: AnalyticsState,
  level: number,
  stock: Record<string, number>,
  onShelf: Record<string, number>,
  demand: Record<string, number>,
): ItemHealth[] {
  const list: ItemHealth[] = [];
  for (const [id0, days] of Object.entries(a.items)) {
    const id: string = id0;
    if (!days.length) continue;
    const qty30 = days.reduce((n, d) => n + d.qty, 0);
    const revenue30 = days.reduce((n, d) => n + d.revenue, 0);
    const cost30 = days.reduce((n, d) => n + d.cost, 0);
    const revenue21 = days.slice(-21).reduce((n, d) => n + d.revenue, 0);
    const cost21 = days.slice(-21).reduce((n, d) => n + d.cost, 0);
    const spoiled = days.reduce((n, d) => n + d.spoiled, 0);
    const lost = days.reduce((n, d) => n + d.lost, 0);
    const recent = days.slice(-14);
    const dailyQty = recent.reduce((n, d) => n + d.qty, 0) / Math.max(1, recent.length);
    const have = (stock[id] ?? 0) + (onShelf[id] ?? 0);
    list.push({
      id,
      name: productById(id).name,
      qty30,
      profit30: revenue30 - cost30,
      revenue30,
      profit21: revenue21 - cost21,
      margin: revenue30 > 0 ? (revenue30 - cost30) / revenue30 : 0,
      dailyQty,
      daysLeft: dailyQty > 0.1 ? have / dailyQty : null,
      spoilShare: qty30 + spoiled > 0 ? spoiled / (qty30 + spoiled) : 0,
      lostShare: qty30 + lost > 0 ? lost / (qty30 + lost) : 0,
      abc: 'C',
    });
  }
  // ABC: xếp theo lời giảm dần, 80% lời đầu là A, tới 95% là B, còn lại C (món lỗ thuộc C)
  const sorted = [...list].sort((x, y) => y.profit30 - x.profit30);
  const total = sorted.reduce((n, h) => n + Math.max(0, h.profit30), 0);
  let acc = 0;
  for (const h of sorted) {
    const share = total > 0 ? acc / total : 1;
    h.abc = share < 0.8 ? 'A' : share < 0.95 ? 'B' : 'C';
    acc += Math.max(0, h.profit30);
  }
  return list.filter((h) => productById(h.id).unlock <= level || unlockedProducts(level).some((p) => p.id === h.id))
    .sort((x, y) => y.profit30 - x.profit30);
}

/** Một gợi ý việc cần làm dựa trên sổ. */
export interface Advice { icon: string; text: string }

/**
 * Gợi ý từ bảng sức khoẻ: nhập thêm món sắp cạn, bỏ món lỗ lâu ngày, chuyển món đắt khách lên kệ
 * đông người hơn (dựa heatmap kệ), và món hỏng nhiều thì nhập ít lại.
 */
export function analyticsAdvice(
  list: ItemHealth[],
  shelfHeat: Record<number, number>,
  shelfIds: number[],
): Advice[] {
  const out: Advice[] = [];
  for (const h of list) {
    if (h.daysLeft !== null && h.daysLeft <= 1.5 && h.daysLeft > 0 && h.dailyQty > 0) {
      const cases = Math.max(1, Math.ceil((h.dailyQty * 4 - (h.daysLeft * h.dailyQty)) / caseSize(h.id)));
      out.push({ icon: '📦', text: `Nhập thêm ~${cases} thùng ${h.name}: chỉ còn ${h.daysLeft.toFixed(1)} ngày là cạn hàng` });
    }
    if (h.profit21 < 0 && h.qty30 > 5) {
      out.push({ icon: '🪦', text: `Cân nhắc bỏ ${h.name}: 3 tuần gần nhất lỗ ${Math.round(-h.profit21).toLocaleString('vi-VN')}đ dù bán ${h.qty30} món/tháng` });
    }
    if (h.spoilShare > 0.25 && h.qty30 > 0) {
      out.push({ icon: '🗑️', text: `${h.name} hỏng ${Math.round(h.spoilShare * 100)}% số hàng — nhập ít đi hoặc giảm giá sớm` });
    }
    if (h.lostShare > 0.3 && h.qty30 > 5) {
      out.push({ icon: '🚶', text: `${Math.round(h.lostShare * 100)}% lượt tìm ${h.name} không mua được — bày đầy kệ hơn` });
    }
  }
  // Chuyển kệ: món bán chạy mà đang nằm ở kệ vắng khách
  const heatTotal = shelfIds.reduce((n, uid) => n + (shelfHeat[uid] ?? 0), 0);
  if (shelfIds.length >= 2 && heatTotal > 0) {
    const avg = heatTotal / shelfIds.length;
    const cold = shelfIds.filter((uid) => (shelfHeat[uid] ?? 0) < avg * 0.5);
    const movers = list.filter((h) => h.dailyQty >= 2).slice(0, 2);
    if (cold.length && movers.length) {
      out.push({ icon: '🔄', text: `${movers.map((m) => m.name).join(', ')} bán chạy — thử chuyển lên kệ đông khách hơn (kệ đang kém khách: ${cold.length} kệ)` });
    }
  }
  return out.slice(0, 6);
}

/** Tác động combo / giờ vàng: doanh thu & lời trung bình ngày có chạy so với ngày không. */
export interface PromoEffect { withAvg: number; withoutAvg: number; withDays: number; withoutDays: number }

/**
 * GĐ123 — "Kệ cần chú ý": chọn 2–3 món ĐANG GẶP RẮC RỐI nhất từ bảng sức khoẻ để trình bày ngay ở
 * Sổ đầu ngày dưới dạng việc cần làm (bấm mở sổ phân tích). Mỗi món chỉ trả DÒNG CẤP CAO NHẤT
 * (một lý do gọn, không lặp) — mồi tối ưu hàng cho người chơi cấp cao, nơi bán hàng đã auto.
 * Thuần đọc — không đổi state/kinh tế/save/quest (đúng ĐỊNH HƯỚNG chiều sâu: làm nổi dữ liệu
 * analytics có sẵn thay vì thêm hệ thống mới).
 */
export interface ShelfAttention {
  /** product id của món cần chú ý (để dòng bấm mở đúng món trong sổ). */
  id: string;
  icon: string;
  /** Lời gọn nhất (một dòng) cho món này. */
  text: string;
}

export function shelfAttention(list: ItemHealth[], max = 3): ShelfAttention[] {
  const out: ShelfAttention[] = [];
  for (const h of list) {
    if (out.length >= max) break;
    // Ưu tiên: sắp cạn hàng (mất doanh ngay) > lỗ 3 tuần kéo dài (đang đốt vốn) > khách tìm không mua được.
    if (h.dailyQty > 0 && h.daysLeft !== null && h.daysLeft > 0 && h.daysLeft <= 1.5) {
      out.push({ id: h.id, icon: '📦', text: `${h.name}: còn ~${h.daysLeft.toFixed(1)} ngày là cạn hàng` });
    } else if (h.profit21 < 0 && h.qty30 > 5) {
      out.push({ id: h.id, icon: '🪦', text: `${h.name}: 3 tuần lỗ ${Math.round(-h.profit21).toLocaleString('vi-VN')}đ — cân nhắc bỏ` });
    } else if (h.lostShare > 0.3 && h.qty30 > 5) {
      out.push({ id: h.id, icon: '🚶', text: `${h.name}: ${Math.round(h.lostShare * 100)}% lượt tìm không mua được — bày đầy kệ hơn` });
    }
  }
  return out;
}

export function promoEffect(
  a: AnalyticsState,
  history: { day: number; profit: number; revenue: number }[],
  kind: 'combo' | 'happyHour' | 'ads',
): PromoEffect | null {
  const withDays: number[] = [];
  const withoutDays: number[] = [];
  for (const h of history) {
    const flag = a.flags[h.day];
    if (!flag) continue;
    (flag[kind] ? withDays : withoutDays).push(h.revenue);
  }
  if (!withDays.length || !withoutDays.length) return null;
  const avg = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
  return { withAvg: avg(withDays), withoutAvg: avg(withoutDays), withDays: withDays.length, withoutDays: withoutDays.length };
}
