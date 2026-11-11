import { describe, it, expect } from 'vitest';
import { brandWorkshopPayoff } from '../data/brandWorkshopPayoff';
import { brandPremium, brandWorkshopCapacity, BRAND_PACK_FEE, BRAND_WORKSHOP_WAGE, type BrandState } from '../data/brand';
import { productById } from '../data/products';

const line = (productId: string, made = 100, sold = 100) => ({ productId, since: 1, made, sold });

const base = (rep: number, staff: number, lines: BrandState['lines']): BrandState => ({
  name: 'Nhãn test', rep, maxRep: rep, lines, stock: {}, repLog: [], franchises: [], franchiseDue: [],
  workshop: { open: true, staff, tier: 0 }, lastPackDay: 1,
} as unknown as BrandState);

describe('brandWorkshopPayoff — mô phỏng một đêm gói hàng', () => {
  it('chưa thuê thợ: công suất 0, xưởng đứng', () => {
    const p = brandWorkshopPayoff(base(80, 0, [line('hx_nuoc_mam')]), { hx_nuoc_mam: 10 });
    expect(p.capacity).toBe(0);
    expect(p.packed).toBe(0);
    expect(p.line).toContain('chưa thuê thợ');
  });

  it('chưa có dòng nhãn: xưởng đứng dù có thợ', () => {
    const p = brandWorkshopPayoff(base(80, 1, []), { hx_nuoc_mam: 10 });
    expect(p.line).toContain('chưa có dòng nhãn');
  });

  it('một đêm gói hết công suất: lời ròng = đv×premium − bao bì − lương', () => {
    const b = base(80, 1, [line('hx_nuoc_mam')]); // capacity = 1*CAPACITY[0] = 20
    const storage = { hx_nuoc_mam: 20 };
    const p = brandWorkshopPayoff(b, storage);
    const sell = productById('hx_nuoc_mam')!.sell;
    const tend = Math.round(sell * 0.25); // premiumPerUnit rep 80
    expect(p.capacity).toBe(brandWorkshopCapacity({ staff: 1, tier: 0 }));
    expect(p.packed).toBe(20);
    expect(p.grossPremium).toBe(20 * tend);
    expect(p.fee).toBe(Math.round(20 * sell * BRAND_PACK_FEE / 100) * 100);
    expect(p.wage).toBe(BRAND_WORKSHOP_WAGE);
    expect(p.net).toBe(p.grossPremium - p.fee - p.wage);
    expect(p.net).toBeGreaterThan(0); // 20 đv premium đủ bù lương 1 thợ
  });

  it('giới hạn bởi nguyên liệu kho (không đủ công suất)', () => {
    const b = base(80, 2, [line('hx_nuoc_mam')]); // capacity 40
    const p = brandWorkshopPayoff(b, { hx_nuoc_mam: 5 });
    expect(p.packed).toBe(5);
    expect(p.line).toContain('gói 5/40đv');
  });

  it('hết nguyên liệu: packed 0, nhắc đứng xưởng', () => {
    const p = brandWorkshopPayoff(base(80, 1, [line('hx_nuoc_mam')]), {});
    expect(p.packed).toBe(0);
    expect(p.line).toContain('Không gói được');
  });

  it('tất định: cùng state + storage → cùng kết quả', () => {
    const b = base(60, 1, [line('hx_nuoc_mam')]);
    const s = { hx_nuoc_mam: 7 };
    expect(brandWorkshopPayoff(b, s)).toEqual(brandWorkshopPayoff(b, s));
  });
});
