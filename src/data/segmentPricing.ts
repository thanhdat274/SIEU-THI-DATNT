// ───── GĐ1284 — "Giá này đang đuổi đi phân khúc nào?" (định giá theo thành phần khách) ─────
// Giá hiện tại `priceBuyOdds` (GĐ1222) đo bằng khách VÃNG LAI với sensitivity=1 — nhưng mô phỏng thật
// cho mỗi khách `sensitivity = regular?.priceSensitivity ?? profession?.sensitivity ?? 1`
// (customerEntity.ts:164) rồi `keepChance(want, price, c.sensitivity)` (customers.ts:442) → khi giá cao
// hơn gợi ý thị trường, những phân khúc NHẠY GIÁ bị đuổi đi TRƯỚC, phân khúc "bền" còn chịu mua. Số này
// chưa ai đo riêng theo khách. Helper THUẦN ĐỌC: tái dựng đúng keepChance với sensitivity của TỪNG nghề
// (chỉ tính các nghề ưa món này — likes đã mở khóa + đúng mùa, cùng nguồn professionWants) → cho chủ biết
// "hạ giá về ~reference thì ai quay lại / giữ giá cao thì ai bỏ". KHÔNG import store (co-op an toàn),
// không đổi kinh tế/save/seed (Luật 5), không bịa số khách (chỉ nói PHẦN TRĂM lượt của nghề bị đuổi).
import { PROFESSIONS, type ProfessionDef } from './professions';
import { keepChance, referenceSell } from './pricing';
import { likedProducts } from './segmentHurt';
import { productById } from './products';
import { fmtNum } from '../core/format';

export interface SegmentPriceRow {
  profession: ProfessionDef;
  /** Độ nhạy giá trong hồ sơ nghề (~1 thường; <0.9 bền, >1.3 kén). */
  sensitivity: number;
  /** Tỉ lệ khách nghề này vẫn cưới mua ở giá hiện tại (đúng keepChance sim). */
  keep: number;
  /** Tỉ lệ khách nghề này bị giá đuổi đi (phần trăm lượt). */
  losePct: number;
}

export interface SegmentPriceFallout {
  productId: string;
  name: string;
  /** Giá đang bày / giá gợi ý thị trường (>1 = đắt hơn; ≤1 thì không ai bị đuổi). */
  ratio: number;
  /** Giá gợi ý thị trường hiện hành. */
  reference: number;
  /** Các phân khúc ưa món này, xếp theo phần trăm bị đuổi giảm dần. */
  rows: SegmentPriceRow[];
}

/**
 * Với một món ở một giá, liệt kê PHÂN KHÚC nào đang bị giá đuổi đi (đúng keepChance × sensitivity của
 * từng nghề ưa món). Trả null khi giá ≤ gợi ý (ai cũng mua — không ồn) hoặc không nghề nào ưa món bị
 * đuổi. THUẦN — cùng đầu vào ⇒ cùng kết quả, không RNG/state.
 */
export function segmentPriceFallout(opts: {
  productId: string;
  price: number;
  level: number;
  day: number;
}): SegmentPriceFallout | null {
  const { productId, price, level, day } = opts;
  const reference = referenceSell(productId);
  const ratio = price / reference;
  if (ratio <= 1) return null;

  const rows: SegmentPriceRow[] = [];
  for (const p of PROFESSIONS) {
    if (!likedProducts(p, level, day).includes(productId)) continue;
    const keep = keepChance(productId, price, p.sensitivity);
    if (keep >= 1) continue; // nghề này còn mua trọn — không bị đuổi
    rows.push({ profession: p, sensitivity: p.sensitivity, keep, losePct: Math.round((1 - keep) * 100) });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => b.losePct - a.losePct || a.profession.id.localeCompare(b.profession.id));
  return { productId, name: productById(productId)?.name ?? productId, ratio, reference, rows };
}

/** Một dòng ngắn cho bề mặt định giá: phân khúc bị đuổi nhiều nhất + típ hạ giá. */
export function segmentPriceLine(f: SegmentPriceFallout): string {
  const top = f.rows[0];
  const refTxt = fmtNum(f.reference);
  return `Giá ${f.name} đắt hơn gợi ý ${(f.ratio).toFixed(1)}×: ${top.profession.icon} ${top.profession.name} (nhạy ${top.sensitivity}) bỏ ~${top.losePct}% lượt — hạ về ~${refTxt}đ giữ họ.`;
}
