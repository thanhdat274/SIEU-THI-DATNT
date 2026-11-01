/**
 * GĐ212 "Cận hạn đêm nay đáng bao nhiêu — đừng để mất trắng" (hệ quả tiền của HUD GĐ43).
 * Cảnh báo "Sắp hết hạn" vốn chỉ liệt kê MÓN + số lượng; KHÔNG cho biết bằng tiền mình
 * đang rủi ro mất bao nhiêu nếu không xử lý (bày bán/giảm giá/bán sỉ — xem GĐ211).
 * Helper này THUẦN ĐỌC: lấy các lô cận hạn (tái dùng `nearExpiryItems`), tính giá trị
 * RÚT VỀ ở giá lẻ SAU giảm cận hạn (`markdown`) × số lượng → tổng tiền đang gần hạn và
 * riêng "hỏng đêm nay" (life === 1). Không đổi state/kinh tế/SAVE_VERSION.
 */

import { markdown, nearExpiryItems, type NearExpiryItem } from './freshness';

export interface SpoilRiskLine extends NearExpiryItem {
  /** Giá lẻ sau giảm cận hạn (đ/món) — mức bạn thực tế thu nếu bán hôm nay. */
  unitReduced: number;
  /** qty × unitReduced = tiền mất nếu không bán kịp để hỏng. */
  value: number;
}

export interface SpoilRisk {
  /** Số dòng cận hạn trong ngưỡng. */
  count: number;
  /** Tổng tiền đang ở ngưỡng cận hạn. */
  totalValue: number;
  /** Riêng phần hỏng ĐÊM NAY (life === 1). */
  tonightValue: number;
  lines: SpoilRiskLine[];
}

/** Trả null khi không có hàng cận hạn trong ngưỡng. `threshold` là số ngày cận hạn (mặc định 2). */
export function spoilRiskValue(
  storage: Record<string, number>,
  storageLots: Record<string, Array<{ qty: number; life: number }>> | undefined,
  shelves: { productId: string | null; count: number; lots?: Array<{ qty: number; life: number }> }[],
  priceOf: (id: string) => number,
  threshold = 2,
): SpoilRisk | null {
  const items = nearExpiryItems(storage, storageLots, shelves, threshold, 999);
  if (!items.length) return null;
  const lines: SpoilRiskLine[] = items.map((i) => {
    const unitReduced = Math.round(priceOf(i.id) * (1 - markdown(i.id, i.days)));
    return { ...i, unitReduced, value: i.qty * unitReduced };
  });
  return {
    count: lines.length,
    totalValue: lines.reduce((n, l) => n + l.value, 0),
    tonightValue: lines.filter((l) => l.days === 1).reduce((n, l) => n + l.value, 0),
    lines,
  };
}
