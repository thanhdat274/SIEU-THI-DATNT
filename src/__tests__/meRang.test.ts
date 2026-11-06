import { describe, expect, it } from 'vitest';
import { HOMEMADE_IDS, NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { productById } from '../data/products';
import { SUPPLIERS, supplierSells } from '../data/suppliers';
import { RECIPES } from '../data/recipes';

describe('GĐ1486 — mè rang nhà phơi (hàng xóm)', () => {
  const p = productById('hx_me_rang');
  it('chỉ nhà hàng xóm bán, mở sau golden 30, đặc sản ≥50k biên ≥35%', () => {
    expect(HOMEMADE_IDS.has('hx_me_rang')).toBe(true);
    expect(NEIGHBOR_ONLY_IDS.has('hx_me_rang')).toBe(true);
    expect(p.unlock).toBeGreaterThan(30);
    expect(p.sell).toBeGreaterThanOrEqual(50000);
    expect((p.sell - p.buy) / p.sell).toBeGreaterThanOrEqual(0.35);
    const sellers = SUPPLIERS.filter((s) => supplierSells(s, 'hx_me_rang')).map((s) => s.id);
    expect(sellers).toContain('hangxom');
    expect(sellers.length === 1).toBe(true);
  });
  it('có lối ra trong sổ nấu', () => {
    expect(RECIPES.some((r) => r.inputs.some((i) => i.productId === 'hx_me_rang'))).toBe(true);
  });
});
