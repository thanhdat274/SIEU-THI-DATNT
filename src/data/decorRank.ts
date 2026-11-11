/**
 * GĐ2217 — "Mua decor nào trước?" (xếp món trang trí theo hiệu quả vốn).
 *
 * GĐ2216 (decorBuyPayoff) cho biết TỪNG món decor kéo bao nhiêu khách/đ; còn "nên mua món nào
 * TRƯỚC khi ngân sách chưa đủ" thì chưa ai trả lời. Món decor nào kéo được nhiều khách nhất trên
 * mỗi đồng mua là đáng mua trước. Hiệu quả = khách-kéo (chưa làm tròn, dùng boost×cpd để khỏi sái
 * ở cấp thấp) chia cho giá mua, quy về "khách/100.000đ".
 * Helper THUẦN, chỉ đọc FURNITURE + decorBuyPayoff + cpd: KHÔNG đổi state/save/kinh tế/seed
 * (decor mở cấp thấp nhưng helper chỉ đọc, không bị autoplay gọi thêm → sim đứng).
 */
import { FURNITURE, furnitureDef } from './furniture';
import { decorBuyPayoff } from './decorBuyPayoff';
import { decorVisitBoost } from './layout';
import { customersPerDay } from './levels';

export interface DecorRankRow {
  type: string;
  name: string;
  price: number;
  decorDelta: number;
  /** Khách kéo thêm/ngày làm tròn (bản đồ UI). */
  extraKhach: number;
  /** Khách kéo/ngày chưa làm tròn (nền xếp hạng — không sái ở cấp thấp). */
  khachFrac: number;
  /** Hiệu quả vốn = khachFrac / price × 100_000 → "khách/100.000đ". */
  eff: number;
}

/**
 * Xếp món decor đang mở khóa (chưa mua) theo hiệu quả vốn giảm dần.
 * `bought` (tập kiểu đã có) để bỏ món đã sở hữu khỏi danh-sách-mua-trước.
 */
export function decorRank(
  level: number,
  overallStars: number,
  avgPerVisit = 0,
  bought?: ReadonlySet<string>,
): DecorRankRow[] {
  const cpd = customersPerDay(level);
  const rows: DecorRankRow[] = [];
  for (const f of FURNITURE) {
    const def = furnitureDef(f.type);
    const decor = def.decor ?? 0;
    if (decor <= 0) continue;
    if (def.unlock > level) continue;
    if (bought?.has(f.type)) continue;
    const price = def.price ?? 0;
    const p = decorBuyPayoff(price, decor, overallStars, level, avgPerVisit);
    const khachFrac = decorVisitBoost(decor, overallStars) * cpd;
    rows.push({
      type: f.type,
      name: def.name,
      price,
      decorDelta: decor,
      extraKhach: p.extraKhach,
      khachFrac,
      eff: price > 0 ? Math.round((khachFrac / price) * 100_000 * 10) / 10 : 0,
    });
  }
  return rows.sort((a, b) => b.eff - a.eff);
}

/** Dòng gợi ý "mua decor nào trước" (top N món hiệu quả vốn nhất). */
export function decorRankLine(rows: DecorRankRow[], topN = 3): string {
  const top = rows.slice(0, topN);
  if (!top.length) return '';
  const list = top
    .map((r) => `${r.name} (+${r.decorDelta}🩷 ~${r.extraKhach} khách)`)
    .join(' · ');
  return `⭐ Mua decor trước (theo khách/100.000₫): ${list}`;
}
