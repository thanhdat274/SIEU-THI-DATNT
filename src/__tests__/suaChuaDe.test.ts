import { describe, expect, it } from 'vitest';
import { RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { QUAN_RECIPES } from '../data/quanRecipes';
import { PRODUCTS, productById } from '../data/products';
import { ANIMALS, CROPS } from '../data/garden';
import { recipeNetMargin, cookOrSellRaw } from '../data/kitchenValue';

describe('GĐ1094b — Sữa chua dê (khép loạt: mọi sản phẩm chăn nuôi đều có lối ra bếp)', () => {
  it('Sữa chua dê có trong PRODUCTS, giá bán > giá nhập, mở cấp 40', () => {
    expect(PRODUCTS.filter((p) => p.id === 'sua_chua_de')).toHaveLength(1);
    const p = productById('sua_chua_de');
    expect(p.sell).toBeGreaterThan(p.buy);
    expect(p.unlock).toBe(40);
    expect(p.category).toBe('cold');
    expect(new Set(PRODUCTS.map((x) => x.id)).size).toBe(PRODUCTS.length);
  });

  it('có công thức ở máy xay (blender), dùng sữa dê + trái cây + đường', () => {
    expect(RECIPES.filter((x) => x.id === 'recipe_sua_chua_de')).toHaveLength(1);
    const r = RECIPES.find((x) => x.id === 'recipe_sua_chua_de')!;
    expect(r.station).toBe('blender');
    expect(r.outputId).toBe('sua_chua_de');
    expect(r.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['sua_de', 'traicay', 'x_duong']));
    expect(COOKED_PRODUCTS.filter((p) => p.id === 'sua_chua_de')).toHaveLength(1);
  });

  it('mở 40 ≥ cấp mở dê 27 → tự nuôi được trước khi mở món; cấp 30 (mốc golden) chưa mở món', () => {
    expect(ANIMALS.goat.unlock).toBe(27);
    expect(RECIPES.filter((x) => x.unlock <= 30).map((x) => x.outputId)).not.toContain('sua_chua_de');
  });

  it('mẻ lãi dương và nấu hời hơn bán nguyên liệu rời (cookOrSellRaw → cook)', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_sua_chua_de')!;
    expect(recipeNetMargin(r)).toBeGreaterThan(0);
    expect(cookOrSellRaw(r).verdict).toBe('cook');
  });

  it('hai món thịt cuối cùng: chả lụa hấp (heo) & gà Đông Tảo nướng, đều lãi dương và verdict cook', () => {
    for (const [rid, oid, unlock] of [['recipe_cha_lua', 'cha_lua', 40], ['recipe_ga_dt_nuong', 'ga_dt_nuong', 42]] as const) {
      const r = RECIPES.find((x) => x.id === rid)!;
      expect(r.outputId).toBe(oid);
      expect(r.unlock).toBe(unlock);
      expect(RECIPES.filter((x) => x.unlock <= 30).map((x) => x.outputId)).not.toContain(oid);
      expect(recipeNetMargin(r)).toBeGreaterThan(0);
      expect(cookOrSellRaw(r).verdict).toBe('cook');
    }
  });

  it('khép loạt GĐ1088–1094: không còn nông sản nhà (trồng/nuôi) nào thiếu lối ra bếp/pha', () => {
    const used = new Set<string>();
    for (const r of RECIPES) for (const i of r.inputs) used.add(i.productId);
    for (const q of QUAN_RECIPES) for (const u of q.uses) used.add(u.id);
    const homegrown = [
      ...CROPS.map((c) => c.productId),
      ...Object.values(ANIMALS).map((a) => a.productId),
    ];
    for (const id of homegrown) expect(used.has(id)).toBe(true);
  });
});
