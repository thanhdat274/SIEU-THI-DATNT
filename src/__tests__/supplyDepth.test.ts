/**
 * GĐ1321 — mở rộng nguồn cung "ngoài tạp hóa" + "nhiều nguồn hàng xóm" (hướng 2 & 3, GĐ1076):
 * +2 đặc sản vùng (mối lái dacsan), +2 đồ nhà làm (nhà hàng xóm hangxom + bà Tám hangxom2).
 * Test THUẦN: mỗi món (a) có trong PRODUCTS, (b) biên bán/nhập ≥1.5 (không bịa giá — từ số ghi sẵn),
 * (c) mở sau mốc golden sim 30 → economySim không đổi, (d) CHỈ bán ở đúng mối, không lẫn mối chuẩn.
 */
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../data/products';
import { HOMEMADE_PRODUCTS, NEIGHBOR2_PRODUCTS } from '../data/homemade';
import { REGION_PRODUCTS } from '../data/regionSpecialty';
import { SUPPLIERS, supplierById } from '../data/suppliers';

const GOLDEN = 30; // mốc golden sim — unlock > 30 thì autoplay mốc không nhặt (kinh tế không đổi)

const all = [...REGION_PRODUCTS, ...HOMEMADE_PRODUCTS, ...NEIGHBOR2_PRODUCTS];
const price = (id: string) => all.find((p) => p.id === id)!;

/** món này chỉ bán ở các mối có `only` này. */
const sellerIds = (id: string) =>
  SUPPLIERS.filter((s) => s.only?.has(id) === true).map((s) => s.id);

describe('GĐ1321 — nguồn cung ngoài + hàng xóm (hướng 2 & 3)', () => {
  const newItems = [
    'rg_banh_phong', // đặc sản vùng (mối lái)
    'rg_kho_bo',
    'hx_tuong_ot', // nhà hàng xóm
    'hx_banh_cuon', // nhà bà Tám
  ] as const;

  for (const id of newItems) {
    it(`${id}: có trong PRODUCTS và dữ liệu nguồn`, () => {
      expect(PRODUCTS.some((p) => p.id === id)).toBe(true);
      expect(price(id)).toBeDefined();
    });

    it(`${id}: biên bán/nhập ≥1.5 (giá ghi sẵn — không bịa)`, () => {
      const p = price(id);
      expect(p.sell).toBeGreaterThan(0);
      expect(p.sell / p.buy).toBeGreaterThanOrEqual(1.5);
    });

    it(`${id}: mở sau mốc golden sim 30 → kinh tế mốc không đổi`, () => {
      expect(price(id).unlock).toBeGreaterThan(GOLDEN);
    });
  }

  it('đặc sản vùng chỉ bán ở mối lái dacsan (không lẫn mối chuẩn)', () => {
    for (const id of ['rg_banh_phong', 'rg_kho_bo']) {
      expect(sellerIds(id)).toEqual(['dacsan']);
      expect(supplierById('daily').only ?? []).not.toContain(id);
    }
  });

  it('đồ nhà làm: tương ớt ở hangxom, bánh cuốn ở hangxom2 (nhiều nguồn hàng xóm)', () => {
    expect(sellerIds('hx_tuong_ot')).toEqual(['hangxom']);
    expect(sellerIds('hx_banh_cuon')).toEqual(['hangxom2']);
  });
});
