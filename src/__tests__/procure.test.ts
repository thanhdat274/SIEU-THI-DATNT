import { describe, expect, it } from 'vitest';
import { SUPPLIERS, orderTotal, priceSwing, supplierById, supplierSells, unitCost } from '../data/suppliers';
import { productById, unlockedProducts } from '../data/products';
import { buyCostTone, cheapestSupplier, cheapTodayIds, tomorrowCostDir, type BuyTone } from '../data/procure';

/** GĐ57 "Mua khi rẻ": minh bạch chi phí nhập (đà giá MUA) — helpers thuần đọc, không đổi kinh tế/save. */

const PRODUCTS = ['bia', 'gao', 'nuoc'];

describe('GĐ57 buyCostTone (band ±vol/2)', () => {
  it('tone theo đúng swing, pct = swing×100; đủ cả 3 tone ở dải 4 mối × ngày (không thoái hóa)', () => {
    const seen = new Set<BuyTone>();
    for (const s of SUPPLIERS) {
      const half = s.volatility / 2;
      for (let d = 1; d <= 220; d++) {
        for (const pid of PRODUCTS) {
          const swing = priceSwing(s, pid, d);
          const { tone, pct } = buyCostTone(s, pid, d);
          const expectTone: BuyTone = swing > half ? 'pricey' : swing < -half ? 'cheap' : 'normal';
          expect(tone).toBe(expectTone);
          expect(pct).toBe(Math.round(swing * 100));
          seen.add(tone);
        }
      }
    }
    // Cơ chế không thoái hóa: quét đủ dải phải gặp cả 3 tone.
    expect(seen.has('cheap')).toBe(true);
    expect(seen.has('normal')).toBe(true);
    expect(seen.has('pricey')).toBe(true);
  });

  it('deterministic + thuần (gọi lại cùng tham số → cùng kết quả, không đổi unitCost)', () => {
    const s = supplierById('cho');
    const a = buyCostTone(s, 'bia', 17);
    const b = buyCostTone(s, 'bia', 17);
    expect(a).toEqual(b);
    const before = unitCost(s, 'bia', 17);
    buyCostTone(s, 'bia', 17);
    tomorrowCostDir(s, 'bia', 17);
    expect(unitCost(s, 'bia', 17)).toBe(before); // chỉ đọc, không đổi giá
  });
});

describe('GĐ57 tomorrowCostDir', () => {
  it('khớp so sánh unitCost(day) vs unitCost(day+1) thật + có đủ 2 hướng', () => {
    const dirs = new Set<string>();
    for (const s of SUPPLIERS) {
      for (let d = 1; d <= 60; d++) {
        for (const pid of PRODUCTS) {
          const today = unitCost(s, pid, d);
          const next = unitCost(s, pid, d + 1);
          const dir = tomorrowCostDir(s, pid, d);
          expect(dir).toBe(next < today ? 'cheaper' : next > today ? 'pricier' : 'flat');
          dirs.add(dir);
        }
      }
    }
    // Không thoái hóa thành toàn 'flat': trên dải ngày phải có cả rẻ hơn lẫn đắt hơn.
    expect(dirs.has('cheaper')).toBe(true);
    expect(dirs.has('pricier')).toBe(true);
  });
});

describe('GĐ57 cheapestSupplier', () => {
  it('chọn mối min orderTotal cho giỏ + delta đúng so mối kế', () => {
    const items = { bia: 12, nuoc: 8 };
    const day = 7;
    const byTotal = SUPPLIERS
      .map((s) => ({ s, total: orderTotal(s, items, day) }))
      .sort((a, b) => a.total - b.total);
    const c = cheapestSupplier(items, day, 100)!;
    expect(c.best.id).toBe(byTotal[0].s.id);
    expect(c.total).toBe(byTotal[0].total);
    expect(c.rival!.id).toBe(byTotal[1].s.id);
    expect(c.delta).toBe(byTotal[1].total - byTotal[0].total);
  });

  it('chỉ so mối bán được CẢ giỏ (bỏ mối thiếu ngành) và tôn trọng cấp mở khóa', () => {
    // Cấp 1 chỉ mở daily → không đủ 2 mối → null (mới chơi chưa có gì để so).
    expect(cheapestSupplier({ bia: 12, nuoc: 8 }, 7, 1)).toBeNull();
    // Giỏ rỗng → null
    expect(cheapestSupplier({}, 7, 100)).toBeNull();
    // Giỏ chỉ số lượng 0 → null
    expect(cheapestSupplier({ bia: 0 }, 7, 100)).toBeNull();
    // Giỏ có món đông lạnh (kem, ngành 'frozen') — cho chỉ bán dry/drink/fresh/cold/meat nên bị loại khỏi cuộc so.
    const cKem = cheapestSupplier({ bia: 12, kem: 5 }, 7, 100)!;
    expect(cKem.best.id).not.toBe('cho');
    expect(cKem.rival!.id).not.toBe('cho');
    // Mọi mối được so đều bán được cả giỏ.
    for (const s of [cKem.best, cKem.rival!]) {
      expect(supplierSells(s, 'bia')).toBe(true);
      expect(supplierSells(s, 'kem')).toBe(true);
    }
  });

  it('đúng cấp: ở cấp 18 (kho mở) so đủ daily/cho/hoatoc/kho; delta dương', () => {
    const c = cheapestSupplier({ bia: 12, nuoc: 8 }, 7, 18)!;
    expect(c.delta >= 0).toBe(true);
    expect(c.best.unlock).toBeLessThanOrEqual(18);
    expect(c.rival!.unlock).toBeLessThanOrEqual(18);
  });
});

describe('GĐ57 cheapTodayIds', () => {
  it('chỉ món mở khóa + mối bán được + nằm band cheap; giới hạn n', () => {
    const s = supplierById('cho');
    const ids = cheapTodayIds(s, 5, 3, 10);
    for (const id of ids) {
      expect(productById(id).unlock).toBeLessThanOrEqual(3);
      expect(supplierSells(s, id)).toBe(true);
      expect(buyCostTone(s, id, 5).tone).toBe('cheap');
    }
    expect(ids.length).toBeLessThanOrEqual(10);
    // Giới hạn n đúng: lấy n nhỏ hơn tổng số món cheap → đủ n.
    const all = cheapTodayIds(s, 5, 3, 1000);
    expect(cheapTodayIds(s, 5, 3, 2).length).toBe(Math.min(2, all.length));
    // Ở cấp thấp (1) chỉ món cấp ≤ 1.
    for (const id of cheapTodayIds(s, 5, 1, 1000)) expect(productById(id).unlock).toBeLessThanOrEqual(1);
  });
});

describe('GĐ57 kinh tế không đổi', () => {
  it('unitCost/orderTotal vẫn đúng công thức gốc (procure chỉ đọc, không can thiệp)', () => {
    const s = supplierById('cho');
    // unitCost = round(buy×(1−discount)×(1+swing)×cm /100)×100, cm=1 trong môi trường test.
    expect(unitCost(s, 'bia', 10)).toBe(
      Math.round(productById('bia').buy * (1 - s.discount) * (1 + priceSwing(s, 'bia', 10)) / 100) * 100,
    );
    // orderTotal một món bằng unitCost (không bulk).
    expect(orderTotal(s, { bia: 1 }, 10)).toBe(unitCost(s, 'bia', 10));
    // cheapTodayIds trả id món có thật trong deck.
    for (const id of cheapTodayIds(s, 5, 100, 5)) expect(unlockedProducts(100).some((p) => p.id === id)).toBe(true);
  });
});
