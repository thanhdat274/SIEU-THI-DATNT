/**
 * GĐ239 "Khu hàng nào đang gánh lời / khu nào đang chảy máu?" — gộp lời 30 ngày theo DANH MỤC.
 *
 * profitMix (GĐ218) gộp lời theo TỪNG món; shelfSlotValue (GĐ226) theo ô kệ; chưa ai gộp theo KHU
 * hàng (category: khô/uống/mát/đông/gia dụng/tươi/thịt) — câu trả lời "nên sắp xếp/quyết định khu nào,
 * khu nào đang lỗ kéo dài". Helper này THUẦN ĐỌC từ ItemHealth đã tin cậy (ánh xạ category qua resolver
 * để tách rời, test dễ) — không đổi state/save/kinh tế, không RNG.
 */
import type { ItemHealth } from './analytics';
import { CATEGORIES, type Category } from './products';

export interface CategoryLine {
  category: Category;
  label: string;
  itemCount: number;
  profit30: number;
  revenue30: number;
  /** Lợi nhuận trên 1đ doanh thu của cả khu (0 khi không có doanh thu). */
  margin: number;
}

export interface CategoryMix {
  /** Các khu có món đã bán, xếp theo lời 30 ngày giảm dần. */
  lines: CategoryLine[];
  /** Khu lời cao nhất. */
  best: CategoryLine | null;
  /** Khu lời thấp nhất (có thể âm). */
  worst: CategoryLine | null;
  /** Những khu đang LỖ 30 ngày (profit30 < 0). */
  losing: CategoryLine[];
  /** Tổng lời 30 ngày của các khu kể trên. */
  totalProfit30: number;
}

export function categoryMix(list: ItemHealth[], categoryOf: (id: string) => Category): CategoryMix {
  const buckets = new Map<Category, { count: number; profit30: number; revenue30: number }>();
  for (const h of list) {
    const c = categoryOf(h.id);
    const b = buckets.get(c) ?? { count: 0, profit30: 0, revenue30: 0 };
    b.count++;
    b.profit30 += h.profit30;
    b.revenue30 += h.revenue30;
    buckets.set(c, b);
  }

  const lines: CategoryLine[] = [];
  for (const [category, b] of buckets) {
    lines.push({
      category,
      label: CATEGORIES[category] ?? category,
      itemCount: b.count,
      profit30: b.profit30,
      revenue30: b.revenue30,
      margin: b.revenue30 > 0 ? b.profit30 / b.revenue30 : 0,
    });
  }
  lines.sort((a, b) => b.profit30 - a.profit30);

  const totalProfit30 = lines.reduce((n, l) => n + l.profit30, 0);
  const best = lines[0] ?? null;
  const worst = lines.length ? lines[lines.length - 1] : null;
  const losing = lines.filter((l) => l.profit30 < 0);

  return { lines, best, worst, losing, totalProfit30 };
}
