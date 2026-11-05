import { describe, expect, it } from 'vitest';
import { RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { PRODUCTS, productById } from '../data/products';
import { ANIMALS } from '../data/garden';
import { recipeNetMargin, cookOrSellRaw } from '../data/kitchenValue';

describe('GĐ1094 — Hột vịt lộn & Bánh flan (kích hoạt trứng vịt/ngỗng chăn nuôi "ngủ đông")', () => {
  it('hai thành phẩm có trong PRODUCTS, giá bán > giá nhập, mở cấp 34/39', () => {
    expect(PRODUCTS.filter((p) => p.id === 'hot_vit_lon')).toHaveLength(1);
    expect(PRODUCTS.filter((p) => p.id === 'banh_flan')).toHaveLength(1);
    expect(productById('hot_vit_lon').unlock).toBe(34);
    expect(productById('banh_flan').unlock).toBe(39);
    expect(productById('hot_vit_lon').sell).toBeGreaterThan(productById('hot_vit_lon').buy);
    expect(productById('banh_flan').sell).toBeGreaterThan(productById('banh_flan').buy);
    expect(new Set(PRODUCTS.map((x) => x.id)).size).toBe(PRODUCTS.length);
  });

  it('hột vịt lộn ở ấm nước: 1 trứng vịt + rau + muối → 10 phần; bánh flan ở nồi hấp: trứng ngỗng + sữa đặc + đường → 24 cái', () => {
    expect(RECIPES.filter((x) => x.id === 'recipe_hot_vit_lon')).toHaveLength(1);
    expect(RECIPES.filter((x) => x.id === 'recipe_banh_flan')).toHaveLength(1);
    const h = RECIPES.find((x) => x.id === 'recipe_hot_vit_lon')!;
    expect(h.station).toBe('hot_kettle');
    expect(h.outputId).toBe('hot_vit_lon');
    expect(h.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['trung_vit', 'rau', 'x_muoi']));
    const f = RECIPES.find((x) => x.id === 'recipe_banh_flan')!;
    expect(f.station).toBe('steamer');
    expect(f.outputId).toBe('banh_flan');
    expect(f.inputs.map((i) => i.productId)).toEqual(expect.arrayContaining(['trung_goos', 'x_sua_dac', 'x_duong']));
    expect(COOKED_PRODUCTS.filter((p) => p.id === 'hot_vit_lon' || p.id === 'banh_flan')).toHaveLength(2);
  });

  it('mở 34/39 ≥ cấp mở vịt 16/ngỗng 18 → tự nuôi được trước khi mở món; cấp 30 (mốc golden) chưa mở món nào', () => {
    expect(ANIMALS.duck.unlock).toBe(16);
    expect(ANIMALS.goose.unlock).toBe(18);
    expect(RECIPES.filter((x) => x.unlock <= 30).map((x) => x.outputId)).not.toContain('hot_vit_lon');
    expect(RECIPES.filter((x) => x.unlock <= 30).map((x) => x.outputId)).not.toContain('banh_flan');
  });

  it('cả hai mẻ lãi dương và nấu hời hơn bán nguyên liệu rời (cookOrSellRaw → cook)', () => {
    const h = RECIPES.find((x) => x.id === 'recipe_hot_vit_lon')!;
    const f = RECIPES.find((x) => x.id === 'recipe_banh_flan')!;
    expect(recipeNetMargin(h)).toBeGreaterThan(0);
    expect(recipeNetMargin(f)).toBeGreaterThan(0);
    expect(cookOrSellRaw(h).verdict).toBe('cook');
    expect(cookOrSellRaw(f).verdict).toBe('cook');
  });
});
