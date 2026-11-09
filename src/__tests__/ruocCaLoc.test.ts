import { describe, expect, it } from 'vitest';
import { NEIGHBOR2_IDS, NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { productById } from '../data/products';
import { SUPPLIERS, supplierSells } from '../data/suppliers';

describe('GĐ1848 — ruốc cá lóc nhà làm', () => {
  const p = productById('hx_ruoc_ca_loc');
  it('chỉ nhà hàng xóm bán, mở sau golden 30, đặc sản ≥50k biên ≥35%', () => {
    expect(NEIGHBOR2_IDS.has('hx_ruoc_ca_loc')).toBe(true);
    expect(NEIGHBOR_ONLY_IDS.has('hx_ruoc_ca_loc')).toBe(true);
    expect(p.unlock).toBeGreaterThan(30);
    expect(p.sell).toBeGreaterThanOrEqual(50000);
    expect((p.sell - p.buy) / p.sell).toBeGreaterThanOrEqual(0.35);
    const sellers = SUPPLIERS.filter((s) => supplierSells(s, 'hx_ruoc_ca_loc')).map((s) => s.id);
    expect(sellers).toContain('hangxom2');
    expect(sellers.length).toBe(1);
  });
});
