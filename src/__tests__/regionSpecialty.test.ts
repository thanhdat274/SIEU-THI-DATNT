import { describe, expect, it } from 'vitest';
import { REGION_IDS, REGION_PRODUCTS } from '../data/regionSpecialty';
import { NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { PRODUCTS, productById, unlockedProducts } from '../data/products';
import { SUPPLIERS, supplierSells, unitCost } from '../data/suppliers';
import { makeOnlineOrder } from '../data/online';

describe('GĐ1086 — mối lái đặc sản vùng (nhập hàng ngoài tạp hóa, hướng 2)', () => {
  const ds = SUPPLIERS.find((s) => s.id === 'dacsan')!;

  it('đặc sản vùng có trong PRODUCTS, id duy nhất, giá bán > giá nhập, mở ≥42', () => {
    expect(REGION_PRODUCTS.length).toBeGreaterThanOrEqual(3);
    for (const h of REGION_PRODUCTS) {
      expect(h.unlock).toBeGreaterThanOrEqual(42);
      expect(PRODUCTS.filter((p) => p.id === h.id)).toHaveLength(1);
      expect(productById(h.id).sell).toBeGreaterThan(productById(h.id).buy);
      expect(h.unlock).toBe(productById(h.id).unlock);
    }
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
  });

  it('chỉ mối lái đặc sản bán; mối chuẩn, hàng xóm, bà Tám không bán', () => {
    for (const id of REGION_IDS) {
      expect(supplierSells(ds, id)).toBe(true);
      for (const s of SUPPLIERS.filter((x) => x !== ds)) expect(supplierSells(s, id)).toBe(false);
    }
    for (const p of PRODUCTS.filter((x) => !REGION_IDS.has(x.id))) expect(supplierSells(ds, p.id)).toBe(false);
    // đặc sản vùng KHÔNG thuộc set "hàng xóm" (NEIGHBOR_ONLY) nhưng vẫn là hàng độc quyền bày kệ:
    // được lọc khỏi bể cầu bằng REGION_IDS riêng (GĐ1086) để không nở rộng sim
    for (const id of REGION_IDS) expect(NEIGHBOR_ONLY_IDS.has(id)).toBe(false);
    expect(REGION_IDS.size).toBeGreaterThanOrEqual(3);
  });

  it('giá nhập ngày hữu hạn và đặc sản cấp cao an toàn với mốc golden (không có ở cấp ≤40)', () => {
    for (const h of REGION_PRODUCTS) {
      expect(Number.isFinite(unitCost(ds, h.id, 5))).toBe(true);
      expect(Number.isFinite(unitCost(ds, h.id, 60))).toBe(true);
    }
    expect(ds.unlock).toBeLessThanOrEqual(Math.min(...REGION_PRODUCTS.map((h) => productById(h.id).unlock)));
    // ở cấp 40 (mọi sim chặt) chưa mở đặc sản → RNG mốc golden giữ nguyên
    const at40 = unlockedProducts(40).filter((p) => REGION_IDS.has(p.id));
    expect(at40.length).toBe(0);
  });

  it('GĐ1086: đặc sản vùng là hàng độc quyền bày kệ — không lọt đơn online/chợ phiên (giữ cân bằng sim)', () => {
    for (const lv of [40, 60]) {
      for (let id = 1; id <= 120; id++) {
        const o = makeOnlineOrder(id, lv, 480, Math.random);
        for (const pid of Object.keys(o.items)) expect(REGION_IDS.has(pid)).toBe(false);
      }
    }
  });
});
