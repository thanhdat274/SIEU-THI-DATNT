import { describe, it, expect } from 'vitest';
import { brandDealPayoff } from '../data/brandDealPayoff';
import { brandPremium, brandDealerById, BRAND_DEALERS, type BrandDealerDef } from '../data/brand';
import { productById } from '../data/products';

const def: BrandDealerDef = BRAND_DEALERS[0]; // Sạp chợ huyện: qty 40, pricePerUnit 0.82

describe('brandDealPayoff — soi sáng được-mất khi ký đại lý', () => {
  it('dealValue khớp brandDealValue (sell×qty×pricePerUnit)', () => {
    const p = brandDealPayoff(def, 'hx_nuoc_mam', 60);
    const sell = productById('hx_nuoc_mam')!.sell;
    expect(p.dealValue).toBe(Math.round(sell * def.qty * def.pricePerUnit));
  });

  it('giá bán lẻ nhãn theo bậc uy tín, retailValue = qty × giá nhãn', () => {
    const rep = 80;
    const p = brandDealPayoff(def, 'hx_nuoc_mam', rep);
    const sell = productById('hx_nuoc_mam')!.sell;
    const rate = brandPremium(rep);
    expect(p.retailPrice).toBe(Math.round(sell * (1 + rate)));
    expect(p.retailValue).toBe(Math.round(def.qty * p.retailPrice));
    expect(p.gap).toBe(p.retailValue - p.dealValue);
    expect(p.gap).toBeGreaterThan(0); // bán lẻ nhãn luôn cao hơn ký đại lý (đại lý chiết khấu)
  });

  it('line chứa cả 3 con số quyết định', () => {
    const p = brandDealPayoff(def, 'hx_nuoc_mam', 45);
    expect(p.line).toContain('đại lý trả');
    expect(p.line).toContain('bán lẻ nhãn cùng số này');
    expect(p.line).toContain('chênh');
  });

  it('tất định: cùng def + product + rep → cùng kết quả', () => {
    expect(brandDealPayoff(def, 'hx_nuoc_mam', 60)).toEqual(brandDealPayoff(def, 'hx_nuoc_mam', 60));
  });

  it('đại lý mạnh (giá cao hơn) → chênh TRÊN MỖI ĐƠN VỊ nhỏ hơn', () => {
    const big = brandDealerById('dai_ly_xuat_tinh_xa')!; // pricePerUnit 0.92
    const small = brandDealerById('sap_cho_huyen')!; // 0.82
    // chênh/đơn vị = retailPrice − sell×pricePerUnit, không phụ thuộc qty → so sánh được giữa các đại lý khác qty.
    const gapPerUnit = (pricePerUnit: number) => {
      const sell = productById('hx_nuoc_mam')!.sell;
      return Math.round(sell * (1 + brandPremium(60))) - Math.round(sell * pricePerUnit);
    };
    expect(gapPerUnit(big.pricePerUnit)).toBeLessThan(gapPerUnit(small.pricePerUnit));
  });
});
