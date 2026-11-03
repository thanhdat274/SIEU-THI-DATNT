import { describe, expect, it } from 'vitest';
import { HOMEMADE_IDS, HOMEMADE_PRODUCTS } from '../data/homemade';
import { PRODUCTS, productById } from '../data/products';
import { SUPPLIERS, supplierSells, unitCost } from '../data/suppliers';

describe('GĐ1077 — món hàng xóm tự làm + nhà hàng xóm', () => {
  const hx = SUPPLIERS.find((s) => s.id === 'hangxom')!;

  it('món nhà làm có trong PRODUCTS, id duy nhất, giá bán > giá nhập', () => {
    for (const h of HOMEMADE_PRODUCTS) {
      expect(PRODUCTS.filter((p) => p.id === h.id)).toHaveLength(1);
      expect(productById(h.id).sell).toBeGreaterThan(productById(h.id).buy);
    }
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
  });

  it('chỉ nhà hàng xóm bán món nhà làm; mối chuẩn không bán', () => {
    for (const id of HOMEMADE_IDS) {
      expect(supplierSells(hx, id)).toBe(true);
      for (const s of SUPPLIERS.filter((x) => x !== hx)) expect(supplierSells(s, id)).toBe(false);
    }
  });

  it('nhà hàng xóm không bán đồ công nghiệp', () => {
    for (const p of PRODUCTS.filter((x) => !HOMEMADE_IDS.has(x.id))) expect(supplierSells(hx, p.id)).toBe(false);
  });

  it('biên lời món nhà làm ≥35% (đáng đổi chỗ kệ) và giá nhập ngày hữu hạn', () => {
    for (const h of HOMEMADE_PRODUCTS) {
      expect((h.sell - h.buy) / h.sell).toBeGreaterThanOrEqual(0.35);
      expect(Number.isFinite(unitCost(hx, h.id, 5))).toBe(true);
    }
  });

  it('mở khoá nhà hàng xóm không sớm hơn món đầu tiên của nó', () => {
    expect(hx.unlock).toBeLessThanOrEqual(Math.min(...HOMEMADE_PRODUCTS.map((h) => productById(h.id).unlock)));
  });
});
