import { describe, expect, it } from 'vitest';
import { regionFlagPayoff, regionFlagPayoffLine } from '../data/regionFlagPayoff';
import { REGION_FLAGS } from '../data/regionFlags';
import { REGION_PRODUCTS } from '../data/regionSpecialty';
import { decorVisitBoost } from '../data/layout';
import { customersPerDay } from '../data/levels';

// GĐ2215 — định lượng bảng hiệu vinh danh đặc sản: decor kéo khách/ngày + đặc sản miền lời thêm/lượt.
describe('GĐ2215 — regionFlagPayoff (bảng hiệu vinh danh đáng bao nhiêu khách/đ)', () => {
  const tayNguyen = REGION_FLAGS.find((f) => f.name === 'Tây Nguyên')!;
  const bac = REGION_FLAGS.find((f) => f.name === 'Bắc')!;

  it('bậc 0 (chưa đủ bộ): không decor, không +% giá → không thêm gì', () => {
    const p = regionFlagPayoff(tayNguyen, 0, 5, 50);
    expect(p.decorDelta).toBe(0);
    expect(p.decorBoost).toBe(0);
    expect(p.extraKhach).toBe(0);
    expect(p.pricePct).toBe(0);
    for (const r of p.priceRows) expect(r.extraPerSale).toBe(0);
  });

  it('decor side khớp công thức decorPayoff: boost = decorVisitBoost(delta, sao), khách = boost × cpd', () => {
    for (const tier of [1, 2] as const) {
      const p = regionFlagPayoff(tayNguyen, tier, 5, 50);
      const delta = p.decorDelta;
      expect(p.decorBoost).toBeCloseTo(decorVisitBoost(delta, 5), 6);
      expect(p.extraKhach).toBe(Math.round(p.decorBoost * customersPerDay(50)));
      // delta đúng mốc: đủ bộ +4, vinh danh +12
      expect(delta).toBe(tier === 1 ? 4 : 12);
    }
  });

  it('giá lời thêm mỗi lượt khớp premium sales.ts:89 = Math.round(sell × pct)', () => {
    // Tây Nguyên: khô bò sell 106000, mắc khén 98600
    const p = regionFlagPayoff(tayNguyen, 2, 5, 50); // vinh danh +5%
    const khoBo = p.priceRows.find((r) => r.id === 'rg_kho_bo')!;
    const macKhen = p.priceRows.find((r) => r.id === 'rg_mac_khen')!;
    expect(khoBo.extraPerSale).toBe(Math.round(106000 * 0.05));
    expect(macKhen.extraPerSale).toBe(Math.round(98600 * 0.05));
    // bậc 1 +2%
    const p1 = regionFlagPayoff(tayNguyen, 1, 5, 50);
    const khoBo1 = p1.priceRows.find((r) => r.id === 'rg_kho_bo')!;
    expect(khoBo1.extraPerSale).toBe(Math.round(106000 * 0.02));
  });

  it('pricePerDay = Σ extraPerSale × vol khi kê số lượt bán/ngày (0 nếu không kê)', () => {
    const pNone = regionFlagPayoff(tayNguyen, 2, 5, 50);
    expect(pNone.pricePerDay).toBe(0);
    // bán 3 khô bò + 2 mắc khén /ngày ở vinh danh
    const pVol = regionFlagPayoff(tayNguyen, 2, 5, 50, 0, { rg_kho_bo: 3, rg_mac_khen: 2 });
    const expectDay = 3 * Math.round(106000 * 0.05) + 2 * Math.round(98600 * 0.05);
    expect(pVol.pricePerDay).toBe(expectDay);
  });

  it('mọi đặc sản của 4 miền ra priceRow từ giá thật, số dương ở bậc 1/2', () => {
    for (const flag of REGION_FLAGS) {
      for (const tier of [1, 2] as const) {
        const p = regionFlagPayoff(flag, tier, 5, 50);
        expect(p.priceRows.length).toBe(flag.items.length);
        for (const r of p.priceRows) {
          const prod = REGION_PRODUCTS.find((x) => x.id === r.id)!;
          expect(r.sell).toBe(prod.sell);
          expect(r.extraPerSale).toBeGreaterThan(0);
        }
      }
    }
  });

  it('regionFlagPayoffLine đọc được khách/ngày và giá đặc sản; bậc 0 nhắc chưa đủ bộ', () => {
    const line = regionFlagPayoffLine(regionFlagPayoff(tayNguyen, 2, 5, 50));
    expect(line).toContain('Bảng Tây Nguyên');
    expect(line).toContain('khách/ngày');
    expect(line).toContain('+5%');
    const zero = regionFlagPayoffLine(regionFlagPayoff(bac, 0, 5, 50));
    expect(zero).toContain('chưa đủ bộ');
  });

  it('kê vol số lượt bán hôm nay → line hiện đ/ngày SỐNG "hôm nay lời thêm"', () => {
    // bán 3 khô bò + 2 mắc khén hôm nay ở vinh danh
    const p = regionFlagPayoff(tayNguyen, 2, 5, 50, 0, { rg_kho_bo: 3, rg_mac_khen: 2 });
    expect(p.pricePerDay).toBe(3 * Math.round(106000 * 0.05) + 2 * Math.round(98600 * 0.05));
    const line = regionFlagPayoffLine(p);
    expect(line).toContain('hôm nay lời thêm');
    expect(line).toContain(p.pricePerDay.toLocaleString('vi-VN'));
    // không kê vol → không thấy "hôm nay lời thêm" (chỉ vd. /lượt)
    expect(regionFlagPayoffLine(regionFlagPayoff(tayNguyen, 2, 5, 50))).not.toContain('hôm nay lời thêm');
  });
});
