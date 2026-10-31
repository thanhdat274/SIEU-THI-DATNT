/**
 * GĐ211 "Bán sỉ cho người bán rong có đáng không?" — mặt QUYẾT ĐỊNH của buổi sáng bán sỉ.
 * Người bán rong ghé quầy từng có (Hud) chỉ chìa tổng tiền sỉ; KHÔNG cho biết món nào nên
 * nhả (gần hạn / ứ kho — bán sỉ còn hơn mất trắng hoặc ứ vốn) vs món nào nên giữ bán lẻ
 * (còn tươi, lời hơn). Helper này THUẦN ĐỌC 100%: so giá sỉ trả (`wholesaleUnit`) với
 *   (a) mức giá lẻ sau giảm cận hạn (markdown theo lô trẻ nhất trong kho) và
 *   (b) độ đủ / ứ của kho (`nearestLife` + `storage`)
 * → phán từng món 'bán ngay / để lại / tùy' kèm lý do. Không đổi state/save/kinh tế/SAVE_VERSION.
 */

import type { Lot } from './freshness';
import { markdown, nearestLife } from './freshness';
import { productById } from './products';
import { vendorById, wholesaleTotal, wholesaleUnit, type VendorOffer } from './wholesale';

/** Còn ≤ chừng này ngày coi là cận hạn đáng nhả sỉ (khớp ý EXPIRY_WARN_DAYS của advice). */
export const WHOLESALE_SELL_DAYS = 2;

export type WholesaleVerdict = 'sell' | 'keep' | 'neutral';

export interface WholesaleLineAdvice {
  id: string;
  name: string;
  /** Người bán rong muốn lấy bao nhiêu món. */
  qty: number;
  /** Có bao nhiêu trong kho. */
  inStorage: number;
  /** Ngày còn hạn của lô trẻ nhất trong kho (sàn 1); null = không có lô/có lô không hết hạn. */
  life: number | null;
  /** Giá sỉ trả 1 món (đ) — nguồn chân lý: wholesale.wholesaleUnit. */
  wholesaleUnit: number;
  /** Giá lẻ đang niêm yết 1 món (đ). */
  retailUnit: number;
  /** Giá lẻ trừ giảm cận hạn (markdown × retail) — cái giá bạn NGÀY MAI có thể phải hạ. */
  markedRetailUnit: number;
  verdict: WholesaleVerdict;
  reason: string;
}

export interface WholesaleAdvice {
  vendorId: string;
  vendorName: string;
  /** Tổng tiền sỉ cả đơn. */
  total: number;
  lines: WholesaleLineAdvice[];
  /** Số món nên nhả sỉ (verdict 'sell'). */
  sells: number;
  /** Đủ hàng cả đơn không (nếu thiếu thì đừng nhận lời). */
  canFulfill: boolean;
  /** Có ít nhất một món cận hạn đang nên nhả — lý do mạnh nhất để bán sỉ hôm nay. */
  clearEmerging: boolean;
}

/**
 * Đọc đơn sỉ của người bán rong, phán từng món. Trả null khi offer rỗng (không có món nào).
 * Mặc định trung thực: không có hộp đen — lý do phụ thuộc dữ liệu sẵn có (hạn, số lượng kho).
 */
export function wholesaleAdvice(
  offer: VendorOffer,
  storage: Record<string, number>,
  storageLots: Record<string, Lot[]> | undefined,
  priceOf: (id: string) => number,
): WholesaleAdvice | null {
  const entries = Object.entries(offer.items);
  if (!entries.length) return null;
  const v = vendorById(offer.vendorId);
  const lines = entries.map(([id, qty]): WholesaleLineAdvice => {
    const p = productById(id);
    const inStorage = storage[id] ?? 0;
    const life = nearestLife(storageLots?.[id]);
    const wu = wholesaleUnit(id, priceOf);
    const retailUnit = priceOf(id);
    const markedRetailUnit = Math.round(retailUnit * (1 - (life == null ? 0 : markdown(id, life))));
    let verdict: WholesaleVerdict;
    let reason: string;
    if (inStorage < qty) {
      verdict = 'keep';
      reason = `Kho chỉ còn ${inStorage} món, không đủ đơn sỉ (cần ${qty}) — đừng nhận lời, để bán lẻ.`;
    } else if (life != null && life <= WHOLESALE_SELL_DAYS) {
      verdict = 'sell';
      reason = `Cận hạn còn ${life} ngày — nhả ${qty} món cho sỉ đỡ mất trắng nếu không kịp bán lẻ.`;
    } else if (wu >= markedRetailUnit) {
      verdict = 'sell';
      reason = `Giá sỉ ${wu.toLocaleString('vi-VN')}đ từng bằng/trên giá lẻ sau giảm cận hạn (${markedRetailUnit.toLocaleString('vi-VN')}đ) — bán ngay gọn lời.`;
    } else if (inStorage >= qty * 3) {
      verdict = 'sell';
      reason = `Kho còn nhiều (${inStorage} món) — bán sỉ giải phóng chỗ, không ứ vốn dưới kệ.`;
    } else {
      verdict = 'neutral';
      reason = 'Hàng còn tươi và bán chạy — bán lẻ lời hơn; chỉ nhả khi gần hạn hoặc kho ứ.';
    }
    return { id, name: p.name, qty, inStorage, life, wholesaleUnit: wu, retailUnit, markedRetailUnit, verdict, reason };
  });
  const sells = lines.filter((l) => l.verdict === 'sell').length;
  return {
    vendorId: offer.vendorId,
    vendorName: v?.name ?? '',
    total: wholesaleTotal(offer.items, priceOf),
    lines,
    sells,
    canFulfill: lines.every((l) => l.inStorage >= l.qty),
    clearEmerging: lines.some((l) => l.verdict === 'sell' && l.life != null && l.life <= WHOLESALE_SELL_DAYS),
  };
}
