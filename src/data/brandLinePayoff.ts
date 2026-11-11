/**
 * Hệ 4 — CHIỀU SÂU "SOI SÁNG" DÒNG NHÃN (SPEC §4.5b, L13 GĐ2341). LinesTab mới chỉ hiện "đóng N · bán M" +
 * tổng hàng nhãn trong kho — chưa cho người chơi biết MỖI DÒNG đáng giá bao nhiêu tiền: hàng mang nhãn bán
 * thêm +R% theo bậc uy tín (brandPremium), tức lời thêm ~ R%×giá bán lẻ mỗi đơn vị; kho nhãn đang nằm đó nếu
 * bán hết sẽ cộng thêm bao nhiêu. THUẦN, tất định (không RNG): đọc BrandState + productById + brandPremium;
 * không đổi state/sim/save/kinh tế → golden không đụng (mọi mốc Hệ 4 ≥ 100).
 */
import { brandPremium, type BrandState } from './brand';
import { productById } from './products';

export interface BrandLinePayoffRow {
  productId: string;
  name: string;
  /** Giá bán lẻ gốc (referenceSell / đơn vị). */
  basePrice: number;
  /** Phần trăm tăng của hàng nhãn theo bậc uy tín (0.05..0.25). */
  rate: number;
  /** Lời thêm mỗi đơn vị nếu bán ở giá nhãn (≈ basePrice × rate). */
  premiumPerUnit: number;
  /** Số đơn vị hàng nhãn đang nằm trong kho. */
  stockUnits: number;
  /** Lời thêm nếu bán hết số hàng nhãn đang trong kho. */
  stockPremium: number;
  made: number;
  sold: number;
  line: string;
}

export const fmt = (n: number) => n.toLocaleString('vi-VN');

export function brandLinePayoff(b: BrandState): {
  rows: BrandLinePayoffRow[];
  rate: number;
  totalUnits: number;
  totalPremium: number;
  headline: string;
} {
  const rate = brandPremium(b.rep);
  const rows: BrandLinePayoffRow[] = b.lines.map((l) => {
    const sell = productById(l.productId)?.sell ?? 0;
    const premiumPerUnit = Math.round(sell * rate);
    const stockUnits = b.stock[l.productId] ?? 0;
    const stockPremium = stockUnits * premiumPerUnit;
    const line =
      `giá nhãn ≈ ${fmt(sell)}đ +${Math.round(rate * 100)}% → lời thêm ≈ ${fmt(premiumPerUnit)}đ/đơn vị` +
      (stockUnits > 0 ? ` · kho ${stockUnits}đv → +${fmt(stockPremium)}đ nếu bán hết` : '');
    return {
      productId: l.productId,
      name: productById(l.productId)?.name ?? l.productId,
      basePrice: sell, rate, premiumPerUnit, stockUnits, stockPremium,
      made: l.made, sold: l.sold, line,
    };
  });
  const totalUnits = rows.reduce((n, r) => n + r.stockUnits, 0);
  const totalPremium = rows.reduce((n, r) => n + r.stockPremium, 0);
  const headline =
    rows.length === 0
      ? 'Chưa có dòng nhãn — bên dưới là món nhà làm đủ điều kiện.'
      : `${rows.length} dòng nhãn, bậc uy tín +${Math.round(rate * 100)}% · ${fmt(totalUnits)}đv kho nhãn → +${fmt(totalPremium)}đ nếu bán hết.`;
  return { rows, rate, totalUnits, totalPremium, headline };
}
