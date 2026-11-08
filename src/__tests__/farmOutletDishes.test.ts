import { describe, expect, it } from 'vitest';
import { RECIPE_MAP, RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';
import { FESTIVALS } from '../data/calendar';
import { PROFESSIONS } from '../data/professions';

// GĐ1728 + GĐ1730 (gộp GĐ1731) + GĐ1734 + GĐ1736 + GĐ1737 + GĐ1741 + GĐ1744: lối ra bếp thứ hai cho nông sản trại (trái cây + sữa dê).
const CASES: [string, string, string[]][] = [
  ['recipe_goi_buoi_tom', 'goi_buoi_tom', ['x_buoi', 'x_tom_tuoi']],
  ['recipe_mit_chien_gion', 'mit_chien_gion', ['x_mit', 'dauan']],
  ['recipe_goi_xoai_tom_kho', 'goi_xoai_tom_kho', ['x_xoai', 'x_tom_kho']],
  ['recipe_nhan_da_xay', 'nhan_da_xay', ['x_nhan']],
  ['recipe_vai_da_xay', 'vai_da_xay', ['x_vai']],
  ['recipe_che_gac', 'che_gac', ['x_gac']],
  ['recipe_kem_sua_de', 'kem_sua_de', ['sua_de']],
];

describe.each(CASES)('%s', (rid, out, ings) => {
  const r = RECIPE_MAP[rid];
  it('đúng nguyên liệu, mở sau golden 30, công thức duy nhất, nguyên liệu mở trước', () => {
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(ings));
    expect(r.unlock).toBeGreaterThan(30);
    expect(COOKED_PRODUCTS.some((c) => c.id === out)).toBe(true);
    expect(RECIPES.filter((x) => x.outputId === out).length).toBe(1);
    for (const i of r.inputs) expect(productById(i.productId).unlock).toBeLessThanOrEqual(r.unlock);
  });
  it('mẻ lãi hơn bán thẳng nguyên liệu', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    expect(r.outputQty * productById(r.outputId).sell).toBeGreaterThan(raw);
  });
});

// GĐ1729: Tết rơi đúng mùa bưởi (12–2) → gỏi bưởi tôm là hàng hot Tết.
describe('Tết hút gỏi bưởi tôm', () => {
  it('goi_buoi_tom trong hot Tết Nguyên Đán', () => {
    expect(FESTIVALS.find((f) => f.id === 'tet')!.hot).toContain('goi_buoi_tom');
  });
});

// GĐ1732: học sinh mua mít chiên giòn ăn vặt sau giờ học.
describe('học sinh thích mít chiên giòn', () => {
  it('likes của student_highschool có mit_chien_gion', () => {
    expect(PROFESSIONS.find((p) => p.id === 'student_highschool')!.likes).toContain('mit_chien_gion');
  });
});

// GĐ1735: Lễ 30/4 rơi đúng mùa xoài (3–6) → gỏi xoài tôm khô là hàng hot dịp đi chơi lễ.
describe('Lễ 30/4 hút gỏi xoài tôm khô', () => {
  it('goi_xoai_tom_kho trong hot le_30_4', () => {
    expect(FESTIVALS.find((f) => f.id === 'le_30_4')!.hot).toContain('goi_xoai_tom_kho');
  });
});

// GĐ1739: Mùa hè (6/1–15/8) trùng mùa vải (5–7) và nhãn (7–9) → hai món đá xay hot hè.
describe('Mùa hè hút vải/nhãn đá xay', () => {
  it.each(['vai_da_xay', 'nhan_da_xay', 'kem_sua_de'])('%s trong hot he', (id) => {
    expect(FESTIVALS.find((f) => f.id === 'he')!.hot).toContain(id);
  });
});

// GĐ1748: gấc đỏ là màu Tết → chè gấc hot Tết Nguyên Đán.
describe('Tết hút chè gấc', () => {
  it('che_gac trong hot tet', () => {
    expect(FESTIVALS.find((f) => f.id === 'tet')!.hot).toContain('che_gac');
  });
});

// GĐ1750: sinh viên mua vải đá xay giải khát giữa giờ.
describe('sinh viên thích vải đá xay', () => {
  it('likes của student_college có vai_da_xay', () => {
    expect(PROFESSIONS.find((p) => p.id === 'student_college')!.likes).toContain('vai_da_xay');
  });
});

// GĐ1751: mẹ mua kem sữa dê cho con.
describe('bà nội trợ thích kem sữa dê', () => {
  it('likes của mom có kem_sua_de', () => {
    expect(PROFESSIONS.find((p) => p.id === 'mom')!.likes).toContain('kem_sua_de');
  });
});
