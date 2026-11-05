// ───── GĐ1285 — "Khách quen nào sắp bị phụ / bỏ mình?" (giữ chân theo từng khách vàng) ─────
// segmentHurt (GĐ1276) soi theo PHÂN KHÚC nghề; nhưng khách quen (REGULARS) là NHỮNG NGƯỜI cụ thể
// (Bà Năm, Chú Ba xe ôm...) có món ưa riêng (`favorites`) + độ nhạy giá + kiên nhẫn. Khi món ưa của một
// khách quen bị hụt (missLog) hoặc bị nhắc chê (reviews), khách đó là "khách vàng đang bị phụ" — ghé mãi
// mà không mua được thứ thích → sắp rời (mất doanh thu lặp lại mỗi lượt). Số này chưa ai chẻ theo NGƯỜI.
// Helper THUẦN ĐỌC: quy missLog + reviews về đúng `favorites` của từng khách quen → danh sách khách vàng
// bị phụ, xếp theo mức hụt. KHÔNG import store (co-op an toàn), không đổi kinh tế/save/seed (Luật 5),
// không bịa số (chỉ dùng tín hiệu miss/chê thật trên đúng món ưa của khách đó).
import { REGULARS, type RegularDef } from './regulars';
import type { Review } from './reviews';
import type { MissLog } from './advice';

export interface RegularHit {
  /** Món ưa của khách bị hụt/chê (id sản phẩm). */
  productId: string;
  count: number;
}

export interface RegularHurt {
  regular: RegularDef;
  /** Món ưa của khách này bị hụt/chê, xếp theo số lượt giảm dần. */
  hitFavorites: RegularHit[];
  /** Tổng tín hiệu hụt (missLog trên món ưa + lời chê nhắc món ưa). */
  hurts: number;
}

/**
 * Quy mọi tín hiệu "khách không mua được / chê" về đúng NGƯỜI khách quen qua `favorites` của họ:
 * - missLog `<reason>:<productId>`: món ưa mà kệ trống / giá cao / cận hạn;
 * - reviews có `reason` + `productId` là món ưa của khách.
 * Trả các khách quen có hurts > 0, xếp giảm dần (không ồn khi ai cũng ổn). THUẦN — không RNG/state.
 */
export function regularChurn(opts: {
  missLog?: MissLog;
  reviews?: Review[];
}): RegularHurt[] {
  const { missLog, reviews } = opts;
  const out: RegularHurt[] = [];

  for (const reg of REGULARS) {
    const favs = new Set(reg.favorites);
    const perFav = new Map<string, number>();
    let hurts = 0;
    for (const [key, n] of Object.entries(missLog ?? {})) {
      const pid = key.split(':')[1];
      if (pid && favs.has(pid)) { perFav.set(pid, (perFav.get(pid) ?? 0) + n); hurts += n; }
    }
    for (const r of reviews ?? []) {
      if (r.reason && r.productId && favs.has(r.productId)) { perFav.set(r.productId, (perFav.get(r.productId) ?? 0) + 1); hurts += 1; }
    }
    if (hurts > 0) {
      const hitFavorites: RegularHit[] = [...perFav.entries()]
        .map(([productId, count]) => ({ productId, count }))
        .sort((a, b) => b.count - a.count);
      out.push({ regular: reg, hitFavorites, hurts });
    }
  }
  return out.sort((a, b) => b.hurts - a.hurts);
}

/** Một dòng ngắn cho bề mặt khách quen: người đang bị phụ nhiều nhất. */
export function regularChurnLine(r: RegularHurt): string {
  const top = r.hitFavorites[0];
  return `💔 ${r.regular.name} hay mua mà đang hụt "${top.productId}" (${top.count} lần) — bày/điều giá món ưa kẻo khách quen này bỏ.`;
}
