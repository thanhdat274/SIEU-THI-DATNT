/**
 * GĐ213 "Kho đang chôn bao nhiêu vốn?" — lượng tiền bị đóng băng trong tồn kho.
 * Hệ thống kho vốn chỉ báo chỗ + sắp hết; KHÔNG báo bằng TIỀN đang nằm dưới chân kệ/kho.
 * Helper này THUẦN ĐỌC: với mỗi món còn trong kho, tính vốn CHÔN theo giá nhập (`buy`) và
 * trị giá bán lẻ hiện tại (priceOf), gộp tổng + top món đắt nhất. Cung cấp con số để trả lời
 * "mình có xả sỉ (GĐ211) / mua thêm kệ / tái cơ cấu kho không, vốn đang dồn ở đâu".
 * Không đổi state/kinh tế/SAVE_VERSION.
 */

import { productById } from './products';

export interface StockCapitalLine {
  id: string;
  name: string;
  qty: number;
  /** Vốn chôn 1 món theo giá nhập. */
  cost: number;
  /** Trị giá bán lẻ 1 món hiện tại. */
  retail: number;
  /** Tổng vốn chôn (qty × cost). */
  costTotal: number;
  /** Tổng trị giá bán lẻ (qty × retail). */
  retailTotal: number;
}

export interface StockCapital {
  /** Tổng vốn chôn trong kho theo giá nhập (đ). */
  totalCost: number;
  /** Tổng trị giá nếu bán hết theo giá lẻ hiện tại (đ). */
  totalRetail: number;
  /** Số loại món đang còn trong kho. */
  kinds: number;
  /** Các món vốn chôn nhiều nhất (giảm dần), tối đa `topN`. */
  lines: StockCapitalLine[];
}

/** Trả null khi kho rỗng. `topN` giới hạn dòng chi tiết (tổng vẫn đủ). */
export function stockCapital(
  storage: Record<string, number>,
  priceOf: (id: string) => number,
  topN = 5,
): StockCapital | null {
  const entries = Object.entries(storage).filter(([, q]) => q > 0);
  if (!entries.length) return null;
  const lines: StockCapitalLine[] = entries.map(([id, qty]) => {
    const p = productById(id);
    const cost = p.buy;
    const retail = priceOf(id);
    return { id, name: p.name, qty, cost, retail, costTotal: qty * cost, retailTotal: qty * retail };
  });
  const sorted = [...lines].sort((a, b) => b.costTotal - a.costTotal);
  return {
    totalCost: lines.reduce((n, l) => n + l.costTotal, 0),
    totalRetail: lines.reduce((n, l) => n + l.retailTotal, 0),
    kinds: lines.length,
    lines: sorted.slice(0, topN),
  };
}

export interface PendingCapital {
  /** Số đơn cung ứng đang chờ giao (sáng mai). */
  orders: number;
  /** Tổng vốn giá nhập đã chốt nhưng hàng chưa về (đ). */
  cost: number;
  /** Trị giá nếu bán hết theo giá lẻ hiện tại (đ). */
  retail: number;
  /** Số loại món đang trên đường. */
  kinds: number;
}

/**
 * GĐ1179 — vốn đã CHỐT nhưng hàng đang trên đường (đơn cung ứng chưa giao). Tiền đã trừ khỏi két lúc
 * đặt (placeOrder) mà hàng chưa về kho — cùng là "vốn chôn" như `stockCapital` nhưng nằm ngoài `storage`
 * nên bị bỏ sót. THUẦN đọc: đếm theo `items` từng đơn, giá nhập = productById(id).buy (khớp tiền đã trừ).
 */
export const pendingCapital = (
  deliveries: { items: Record<string, number> }[],
  priceOf: (id: string) => number,
): PendingCapital => {
  let orders = 0, cost = 0, retail = 0;
  const seen = new Set<string>();
  for (const d of deliveries) {
    orders += 1;
    for (const [id, qty] of Object.entries(d.items)) {
      if (qty <= 0) continue;
      const p = productById(id);
      cost += qty * p.buy;
      retail += qty * priceOf(id);
      seen.add(id);
    }
  }
  return { orders, cost, retail, kinds: seen.size };
};
