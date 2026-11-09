import { describe, expect, it } from 'vitest';
import { NEIGHBOR2_IDS, NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { productById } from '../data/products';
import { SUPPLIERS, supplierSells } from '../data/suppliers';
import { RECIPES } from '../data/recipes';

describe('GĐ1875 — chuối sấy giòn nhà làm + cháo chuối sấy', () => {
  const p = productById('hx_chuoi_say');
  it('chỉ nhà hàng xóm bán, mở sau golden 30, đặc sản ≥50k biên ≥35%', () => {
    expect(NEIGHBOR2_IDS.has('hx_chuoi_say')).toBe(true);
    expect(NEIGHBOR_ONLY_IDS.has('hx_chuoi_say')).toBe(true);
    expect(p.unlock).toBeGreaterThan(30);
    expect(p.sell).toBeGreaterThanOrEqual(50000);
    expect((p.sell - p.buy) / p.sell).toBeGreaterThanOrEqual(0.35);
    const sellers = SUPPLIERS.filter((s) => supplierSells(s, 'hx_chuoi_say')).map((s) => s.id);
    expect(sellers).toContain('hangxom2');
    expect(sellers.length).toBe(1);
  });
  const r = RECIPES.find((x) => x.id === 'recipe_chao_chuoi_say')!;
  it('đúng trạm, mở sau golden 30 và sau nguyên liệu, mẻ lãi hơn bán thẳng', () => {
    expect(r.station).toBe('hot_kettle');
    expect(r.unlock).toBeGreaterThan(30);
    expect(r.unlock).toBeGreaterThanOrEqual(p.unlock);
    const cost = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = r.outputQty * productById(r.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
    expect(RECIPES.filter((x) => x.outputId === r.outputId).length).toBe(1);
  });
});
