import { describe, it, expect } from 'vitest';
import { brandLinePayoff } from '../data/brandLinePayoff';
import { brandPremium, type BrandState } from '../data/brand';
import { productById } from '../data/products';

const line = (productId: string, made: number, sold: number, since = 1) => ({ productId, since, made, sold });

const base = (rep: number, lines: BrandState['lines']): BrandState => ({
  name: 'Nhãn test', rep, maxRep: rep, lines, stock: {}, repLog: [], franchises: [], franchiseDue: {},
  workshop: { bought: 0, staff: 0 }, lastPackDay: 0,
} as unknown as BrandState);

describe('brandLinePayoff — soi sáng giá trị từng dòng nhãn', () => {
  it('không có dòng: rỗng, headline báo chưa có', () => {
    const p = brandLinePayoff(base(60, []));
    expect(p.rows).toHaveLength(0);
    expect(p.headline).toContain('Chưa có dòng nhãn');
    expect(p.rate).toBe(brandPremium(60));
  });

  it('một dòng: lời thêm/đơn vị = giá bán lẻ × rate theo bậc uy tín', () => {
    const b = base(80, [line('hx_nuoc_mam', 200, 60)]);
    const p = brandLinePayoff(b);
    const r = p.rows[0];
    const sell = productById('hx_nuoc_mam')!.sell; // 47000
    expect(r.rate).toBe(0.25); // bậc 'Thương hiệu quốc dân' ở rep 80
    expect(r.premiumPerUnit).toBe(Math.round(sell * 0.25));
    expect(r.line).toContain('+25%');
  });

  it('kho nhãn: nếu bán hết cộng thêm stockUnits × lời/đơn vị', () => {
    const stock = { hx_nuoc_mam: 40 };
    const b: BrandState = { ...base(80, [line('hx_nuoc_mam', 200, 60)]), stock };
    const r = brandLinePayoff(b).rows[0];
    expect(r.stockUnits).toBe(40);
    expect(r.stockPremium).toBe(40 * r.premiumPerUnit);
    expect(r.line).toContain('kho 40đv');
    expect(r.line).toContain('nếu bán hết');
  });

  it('nhiều dòng: tổng kho nhãn cộng dồn + headline', () => {
    const b: BrandState = {
      ...base(65, [line('hx_nuoc_mam', 200, 60), line('hx_mam_tep', 150, 30)]),
      stock: { hx_nuoc_mam: 10, hx_mam_tep: 5 },
    };
    const p = brandLinePayoff(b);
    expect(p.rows).toHaveLength(2);
    expect(p.totalUnits).toBe(15);
    expect(p.totalPremium).toBe(p.rows[0].stockPremium + p.rows[1].stockPremium);
    expect(p.headline).toContain('2 dòng nhãn');
  });

  it('tất định: cùng state → cùng kết quả', () => {
    const b = base(45, [line('hx_nuoc_mam', 90, 10)]);
    expect(brandLinePayoff(b)).toEqual(brandLinePayoff(b));
  });
});
