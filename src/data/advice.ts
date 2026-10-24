import { productById } from './products';
import type { ReviewReason } from './reviews';
import { fitLots, needsCold, type Lot } from './freshness';

/** Bảng mở ra khi bấm nút của một gợi ý. */
export type AdviceAction = 'order' | 'arrange' | 'prices' | 'staff';

export const ACTION_LABEL: Record<AdviceAction, string> = {
  order: '📦 Nhập hàng', arrange: '🧺 Xếp kệ', prices: '🏷️ Đổi giá', staff: '👥 Nhân viên',
};

/** Lần khách không mua được, theo "lý do:mã món" (vd. "stock:mi"); bỏ về vì chờ lâu là "wait:". */
export type MissLog = Record<string, number>;

export const missKey = (reason: ReviewReason, productId?: string) => `${reason}:${productId ?? ''}`;

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
