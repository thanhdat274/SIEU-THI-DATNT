/**
 * Tồn kho cả tiệm quay bao lâu một vòng (GĐ235)?
 *
 * stockCapital (GĐ213) đếm kho chôn BAO NHIÊU VỐN; chưa trả lời "BAO LÂU xoay hết" theo GIÁ TRỊ.
 * `stockTurn` gộp theo giá trị (số món đang có × giá mua) để ra: số ngày trung bình có xoay hết tồn
 * kho, và món nào CHÔN VỐN LÂU NHẤT theo giá trị (nên xả sớm / giảm nhập). Chỉ đọc ItemHealth
 * (daysLeft: còn mấy ngày hết hàng theo tốc độ bán) + giá mua productById(buy). THUẦN ĐỌC, không
 * đổi state/kinh tế.
 */
import type { ItemHealth } from './analytics';
import { productById } from './products';

export interface StockTurnItem {
  id: string;
  name: string;
  /** Vốn đang nằm ở món này (số có × giá mua). */
  value: number;
  /** Còn mấy ngày hết hàng (null = không bán → chôn không hẹn). */
  daysLeft: number | null;
}

export interface StockTurn {
  /** Tổng vốn hàng đang giữ (kệ + kho) theo giá mua. */
  totalValue: number;
  /** Đã tính được ngày xoay cho phần tổng này. */
  valueWithDays: number;
  /** Trung bình số ngày xoay hết tồn kho (weighted theo giá trị); null nếu không ước được. */
  avgDays: number | null;
  /** Món chôn vốn nhiều nhất theo giá trị mà bán chậm/không bán (daysLeft null hoặc > ngưỡng). */
  topStale: StockTurnItem[];
  /** Có món lâu ngày đáng xả không. */
  actionable: boolean;
}

/** Xem như "bán chậm đáng chú ý" khi còn ≥ ngưỡng ngày. */
export const STOCK_STALE_DAYS = 20;

export function stockTurn(list: ItemHealth[], stock: Record<string, number>, onShelf: Record<string, number>): StockTurn {
  let totalValue = 0;
  let valueWithDays = 0;
  let totalDays = 0;
  const stale: StockTurnItem[] = [];
  for (const h of list) {
    const have = (stock[h.id] ?? 0) + (onShelf[h.id] ?? 0);
    if (have <= 0) continue;
    const value = have * productById(h.id).buy;
    totalValue += value;
    if (h.daysLeft != null) {
      totalDays += value * h.daysLeft;
      valueWithDays += value;
    }
    if (h.daysLeft == null || h.daysLeft >= STOCK_STALE_DAYS) stale.push({ id: h.id, name: h.name, value, daysLeft: h.daysLeft });
  }
  stale.sort((a, b) => b.value - a.value);
  const avgDays = valueWithDays > 0 ? totalDays / valueWithDays : null;
  return {
    totalValue,
    valueWithDays,
    avgDays,
    topStale: stale.slice(0, 4),
    actionable: stale.length > 0 && (stale[0]?.value ?? 0) > 0,
  };
}
