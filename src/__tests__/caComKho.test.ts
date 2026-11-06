import { describe, expect, it } from 'vitest';
import { NEIGHBOR2_IDS, NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { productById } from '../data/products';
import { SUPPLIERS, supplierSells } from '../data/suppliers';
import { RECIPES } from '../data/recipes';

describe('GĐ1488 — cá cơm khô bà Tám', () => {
  const p = productById('hx_ca_kho');
  it('chỉ nhà hàng xóm bán, mở sau golden 30, đặc sản ≥50k biên ≥35%', () => {
    expect(NEIGHBOR2_IDS.has('hx_ca_kho')).toBe(true);
    expect(NEIGHBOR_ONLY_IDS.has('hx_ca_kho')).toBe(true);
    expect(p.unlock).toBeGreaterThan(30);
    expect(p.sell).toBeGreaterThanOrEqual(50000);
    expect((p.sell - p.buy) / p.sell).toBeGreaterThanOrEqual(0.35);
    const sellers = SUPPLIERS.filter((s) => supplierSells(s, 'hx_ca_kho')).map((s) => s.id);
    expect(sellers).toContain('hangxom2');
    expect(sellers.length === 1).toBe(true);
  });
  it('có lối ra trong sổ nấu', () => {
    expect(RECIPES.some((r) => r.inputs.some((i) => i.productId === 'hx_ca_kho'))).toBe(true);
  });
});
