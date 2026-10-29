/**
 * GĐ215 "Đơn gọi nhà lời ròng bao nhiêu?" — CON SỐ THẬT khi khách gọi điện đặt hàng.
 * Khi nhận cuộc gọi, chủ tiệm chỉ thấy GIÁ (gross, `phoneOrderValue`) — không biết món đó
 * mình bỏ ra chi phí bao nhiêu: mua nhập (buy) cho đơn thường/VIP, hoặc tiền nguyên liệu
 * bỏ bếp cho ĐƠN NẤU (món nhà làm). Helper này THUẦN ĐỌC: trừ chi phí đúng dung lượng
 * (đơn nấu quy số mẻ `ceil(qty/outputQty)` × tổng tiền nguyên liệu; đơn thường = buy × q)
 * → lời ròng + tỉ lệ lời, để biết đơn này có đáng nhận hay không (nhất là đơn nấu phải
 * tự đứng bếp). Không đổi state/kinh tế/SAVE_VERSION.
 */

import { productById } from './products';
import { RECIPES } from './recipes';
import { phoneOrderValue, type PhoneOrder } from './phoneOrders';

const recipeFor = (outputId: string) => RECIPES.find((r) => r.outputId === outputId);

/** Một dòng trong đơn: chi phí thật (mua nhập hoặc nguyên liệu bếp theo số mẻ cần). */
export interface PhoneNetLine {
  id: string;
  name: string;
  qty: number;
  cost: number;
}

export interface PhoneNet {
  /** Doanh thu đơn theo giá đang bán (đã nhân premium nếu có). */
  gross: number;
  /** Chi phí đúng của số hàng/nguyên liệu trong đơn. */
  cost: number;
  /** gross − cost — lời ròng của đơn. */
  net: number;
  /** net / gross (âm = lỗ nếu trả qua chi phí). */
  marginRatio: number;
  lines: PhoneNetLine[];
}

/** Chi phí thật của (id, qty) — đơn nấu quy số mẻ bếp. */
export function phoneCostUnit(id: string, qty: number): number {
  const r = recipeFor(id);
  if (r) return Math.ceil(qty / r.outputQty) * r.inputs.reduce((n, i) => n + productById(i.productId).buy * i.quantity, 0);
  return productById(id).buy * qty;
}

export function phoneNetProfit(order: PhoneOrder, priceOf: (id: string) => number): PhoneNet {
  const gross = phoneOrderValue(order, priceOf);
  const lines: PhoneNetLine[] = Object.entries(order.items).map(([id, q]) => ({
    id,
    name: productById(id).name,
    qty: q,
    cost: phoneCostUnit(id, q),
  }));
  const cost = lines.reduce((n, l) => n + l.cost, 0);
  return { gross, cost, net: gross - cost, marginRatio: gross > 0 ? (gross - cost) / gross : 0, lines };
}
