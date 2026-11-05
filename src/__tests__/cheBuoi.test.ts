import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { PRODUCTS, productById } from '../data/products';
import { CROPS, cropById } from '../data/garden';
import { recipeNetMargin, cookOrSellRaw } from '../data/kitchenValue';

describe('GĐ1089 — Chè bưởi (liên hệ nông trại → ấm nước, kích hoạt x_buoi ngủ đông)', () => {
  it('Chè bưởi là thành phẩm nấu có trong PRODUCTS, giá bán > giá nhập, mở cấp 38', () => {
    expect(PRODUCTS.filter((p) => p.id === 'che_buoi')).toHaveLength(1);
    const p = productById('che_buoi');
    expect(p.sell).toBeGreaterThan(p.buy);
    expect(p.unlock).toBe(38);
    expect(p.category).toBe('fresh');
    expect(new Set(PRODUCTS.map((x) => x.id)).size).toBe(PRODUCTS.length);
  });

  it('có công thức Chè bưởi ở ấm nước (hot_kettle), dùng bưởi nông trại (x_buoi) + đường', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_che_buoi')!;
    expect(r).toBeDefined();
    expect(r.station).toBe('hot_kettle');
    expect(r.outputId).toBe('che_buoi');
    expect(r.outputQty).toBeGreaterThan(0);
    expect(r.inputs.some((i) => i.productId === 'x_buoi')).toBe(true);
    expect(r.inputs.some((i) => i.productId === 'x_duong')).toBe(true);
    expect(RECIPES.filter((x) => x.id === 'recipe_che_buoi')).toHaveLength(1);
  });

  it('mở cấp 38 = đúng cấp mở giống bưởi; cấp 30 (mốc golden) chưa mở → không lệch sim mốc', () => {
    const c = cropById('buoi');
    expect(c.unlock).toBe(38);
    expect(RECIPES.find((x) => x.id === 'recipe_che_buoi')!!.unlock).toBe(c.unlock);
    expect(RECIPES.filter((x) => x.unlock <= 30).map((x) => x.outputId)).not.toContain('che_buoi');
    expect(CROPS.filter((x) => x.unlock <= 30).map((x) => x.productId)).not.toContain('x_buoi');
  });

  it('mẻ chè bưởi có lãi dương và nấu hời hơn bán nguyên liệu rời (cookOrSellRaw → cook)', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_che_buoi')!;
    expect(recipeNetMargin(r)).toBeGreaterThan(0);
    expect(cookOrSellRaw(r).verdict).toBe('cook');
  });
});
