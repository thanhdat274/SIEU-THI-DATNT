import { describe, expect, it } from 'vitest';
import { NEIGHBOR2_IDS, NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { productById } from '../data/products';
import { SUPPLIERS, supplierSells } from '../data/suppliers';

describe('GĐ1845 — tỏi đen nhà ủ', () => {
  const p = productById('hx_toi_den');
  it('chỉ nhà hàng xóm bán, mở sau golden 30, đặc sản ≥50k biên ≥35%', () => {
    expect(NEIGHBOR2_IDS.has('hx_toi_den')).toBe(true);
    expect(NEIGHBOR_ONLY_IDS.has('hx_toi_den')).toBe(true);
    expect(p.unlock).toBeGreaterThan(30);
    expect(p.sell).toBeGreaterThanOrEqual(50000);
    expect((p.sell - p.buy) / p.sell).toBeGreaterThanOrEqual(0.35);
    const sellers = SUPPLIERS.filter((s) => supplierSells(s, 'hx_toi_den')).map((s) => s.id);
    expect(sellers).toContain('hangxom2');
    expect(sellers.length).toBe(1);
  });
});
