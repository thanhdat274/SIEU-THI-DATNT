import { productById } from './products';
import type { ReviewReason } from './reviews';

/** Lần khách không mua được, theo "lý do:mã món" (vd. "stock:mi"); bỏ về vì chờ lâu là "wait:". */
export type MissLog = Record<string, number>;

export const missKey = (reason: ReviewReason, productId?: string) => `${reason}:${productId ?? ''}`;

export interface Advice {
  icon: string;
  text: string;
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
      out.push({ icon: '⏳', text: `${r.count} khách bỏ về vì chờ quầy lâu: thuê thu ngân, mở thêm quầy hoặc đứng quầy giờ cao điểm.` });
      continue;
    }
    const p = productById(r.id);
    if (!p) continue;
    if (r.reason === 'stock') {
      const kho = inStorage[r.id] ?? 0;
      out.push(kho > 0
        ? { icon: '🧺', text: `${p.name}: ${r.count} lần kệ trống trong khi kho còn ${kho}. Bày thêm lên kệ hoặc thuê người châm hàng.` }
        : { icon: '📦', text: `${p.name}: ${r.count} lần khách hỏi mà hết hàng. Nhập thêm ở bàn nhận hàng.` });
    } else if (r.reason === 'price') {
      const now = priceOf(r.id);
      const suggest = Math.max(p.buy, Math.round(Math.min(now, p.sell) * 0.95 / 500) * 500);
      out.push({ icon: '💸', text: `${p.name}: ${r.count} lần khách chê đắt ở giá ${now.toLocaleString('vi-VN')}đ. Thử hạ về khoảng ${suggest.toLocaleString('vi-VN')}đ.` });
    }
  }
  return out;
}
