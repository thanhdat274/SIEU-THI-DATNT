import { describe, expect, it } from 'vitest';
import { RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { PRODUCTS, productById } from '../data/products';
import { CROPS } from '../data/garden';
import { recipeNetMargin, cookOrSellRaw } from '../data/kitchenValue';

describe('GĐ1091 — Chè nhãn (liên hệ nông trại → ấm nước, kích hoạt x_nhan ngủ đông)', () => {
  it('Chè nhãn là thành phẩm nấu có trong PRODUCTS, giá bán > giá nhập, mở cấp 36', () => {
    expect(PRODUCTS.filter((p) => p.id === 'che_nhan')).toHaveLength(1);
    const p = productById('che_nhan');
    expect(p.sell).toBeGreaterThan(p.buy);
    expect(p.unlock).toBe(36);
    expect(p.category).toBe('fresh');
    expect(new Set(PRODUCTS.map((x) => x.id)).size).toBe(PRODUCTS.length);
  });

  it('có công thức Chè nhãn ở ấm nước (hot_kettle), dùng nhãn nông trại (x_nhan) + đường', () => {
    expect(RECIPES.filter((x) => x.id === 'recipe_che_nhan')).toHaveLength(1);
    const r = RECIPES.find((x) => x.id === 'recipe_che_nhan')!;
    expect(r.station).toBe('hot_kettle');
    expect(r.outputId).toBe('che_nhan');
    expect(r.inputs.some((i) => i.productId === 'x_nhan')).toBe(true);
    expect(r.inputs.some((i) => i.productId === 'x_duong')).toBe(true);
  });

  it('mở cấp 36 ≥ cấp giống nhãn 32; cấp 30 (mốc golden) chưa mở món lẫn giống → không lệch sim mốc', () => {
    const c = CROPS.find((x) => x.productId === 'x_nhan')!;
    expect(c.unlock).toBe(32);
    expect(RECIPES.find((x) => x.id === 'recipe_che_nhan')!.unlock).toBeGreaterThanOrEqual(c.unlock);
    expect(RECIPES.filter((x) => x.unlock <= 30).map((x) => x.outputId)).not.toContain('che_nhan');
    expect(CROPS.filter((x) => x.unlock <= 30).map((x) => x.productId)).not.toContain('x_nhan');
  });

  it('mẻ chè nhãn có lãi dương và nấu hời hơn bán nguyên liệu rời (cookOrSellRaw → cook)', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_che_nhan')!;
    expect(recipeNetMargin(r)).toBeGreaterThan(0);
    expect(cookOrSellRaw(r).verdict).toBe('cook');
    expect(COOKED_PRODUCTS.filter((p) => p.id === 'che_nhan')).toHaveLength(1);
  });
});
