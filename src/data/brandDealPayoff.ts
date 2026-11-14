/**
 * Hệ 4 — CHIỀU SÂU "SOI SÁNG" BỎ MỐI ĐẠI LÝ (SPEC §4.5c, L15 GĐ2343). Thẻ hợp đồng đang ký mới chỉ hiện
 * `brandDealValue`/kỳ + kho nhãn have/qty — chưa cho người chơi biết ký đại lý "được-mất" ra sao so với bán lẻ
 * nhãn: đại lý trả ~82–92% giá bán lẻ nhưng tiêu SỐ LƯỢNG LỚN chắc chắn mỗi kỳ, còn bán lẻ nhãn ăn trọn +R%
 * theo bậc uy tín nhưng không chắc bán hết. Helper này ra con số so sánh: giá trị kỳ đại lý vs giá trị nếu bán lẻ
 * cùng số đơn vị → chênh bao nhiêu để đổi lấy bán số lượng lớn. THUẦN, tất định (không RNG): đọc BrandDealerDef +
 * productById + brandPremium; không đổi state/sim/save/kinh tế → golden không đụng.
 */
import { brandPremium, type BrandDealerDef } from './brand';
import { productById } from './products';
import { fmtNum } from '../core/format';

export interface BrandDealPayoffRow {
  productId: string;
  name: string;
  /** Số đơn vị mỗi kỳ giao. */
  qty: number;
  /** Giá mua lại so với giá bán lẻ (0.82..0.92). */
  pricePerUnit: number;
  /** Đại lý trả mỗi kỳ (Σ sell×qty×pricePerUnit, như brandDealValue). */
  dealValue: number;
  /** Giá bán lẻ nhãn/đơn vị theo bậc uy tín (sell × (1+rate)). */
  retailPrice: number;
  /** Giá trị nếu bán lẻ cùng số đơn vị ở giá nhãn. */
  retailValue: number;
  /** Bỏ qua bao nhiêu so với bán lẻ (retailValue − dealValue) để đổi lấy bán số lượng lớn chắc chắn. */
  gap: number;
  line: string;
}

export const fmt = (n: number) => fmtNum(n);

export function brandDealPayoff(def: BrandDealerDef, productId: string, rep: number): BrandDealPayoffRow {
  const sell = productById(productId)?.sell ?? 0;
  const rate = brandPremium(rep);
  const dealValue = Math.round(sell * def.qty * def.pricePerUnit);
  const retailPrice = Math.round(sell * (1 + rate));
  const retailValue = Math.round(def.qty * retailPrice);
  const gap = retailValue - dealValue;
  const line = `đại lý trả ${fmt(dealValue)}đ/kỳ cho ${def.qty}đv · bán lẻ nhãn cùng số này ≈ ${fmt(retailValue)}đ · chênh ${fmt(gap)}đ để đổi lấy bán số lượng lớn chắc chắn`;
  return { productId, name: productById(productId)?.name ?? productId, qty: def.qty, pricePerUnit: def.pricePerUnit, dealValue, retailPrice, retailValue, gap, line };
}
