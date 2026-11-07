import { describe, expect, it } from 'vitest';
import { HOMEMADE_IDS, NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { productById } from '../data/products';
import { SUPPLIERS, supplierSells } from '../data/suppliers';
import { RECIPES } from '../data/recipes';

describe('GĐ1485 — nấm mèo nhà phơi (hàng xóm)', () => {
  const p = productById('hx_nam_meo');
  it('chỉ nhà hàng xóm bán, mở sau golden 30, đặc sản ≥50k biên ≥35%', () => {
    expect(HOMEMADE_IDS.has('hx_nam_meo')).toBe(true);
    expect(NEIGHBOR_ONLY_IDS.has('hx_nam_meo')).toBe(true);
    expect(p.unlock).toBeGreaterThan(30);
    expect(p.sell).toBeGreaterThanOrEqual(50000);
    expect((p.sell - p.buy) / p.sell).toBeGreaterThanOrEqual(0.35);
    const sellers = SUPPLIERS.filter((s) => supplierSells(s, 'hx_nam_meo')).map((s) => s.id);
    expect(sellers).toContain('hangxom');
    expect(sellers.length === 1).toBe(true);
  });
  it('có lối ra trong sổ nấu', () => {
    expect(RECIPES.some((r) => r.inputs.some((i) => i.productId === 'hx_nam_meo'))).toBe(true);
  });
});
