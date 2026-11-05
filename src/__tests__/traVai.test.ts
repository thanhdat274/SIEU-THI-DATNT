import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES, quanRecipeById, quanRecipesAt, cleanMenu } from '../data/quanRecipes';
import { CROPS } from '../data/garden';

describe('GĐ1090 — Trà vải (liên hệ nông trại → quán nước, kích hoạt x_vai ngủ đông)', () => {
  it('Trà vải là món pha quán nước duy nhất mang id tra_vai, mở cấp 34, giá bán dương', () => {
    expect(QUAN_RECIPES.filter((r) => r.id === 'tra_vai')).toHaveLength(1);
    const r = quanRecipeById('tra_vai')!;
    expect(r.unlock).toBe(34);
    expect(r.price).toBeGreaterThan(0);
    expect(r.hot).toBeFalsy(); // món đá
  });

  it('dùng vải nông trại (x_vai) + trà + đường + đá làm nguyên liệu', () => {
    const r = quanRecipeById('tra_vai')!;
    expect(r.uses.map((u) => u.id)).toEqual(expect.arrayContaining(['x_vai', 'tra', 'x_duong', 'x_nuoc_da']));
    expect(r.uses.every((u) => u.cups > 0)).toBe(true);
  });

  it('giống vải mở cấp 32 ≤ món mở 34 → tự cung được trước khi mở món; cấp 30 (mốc golden) chưa có món', () => {
    const c = CROPS.find((x) => x.productId === 'x_vai')!;
    expect(c.unlock).toBe(32);
    expect(c.unlock).toBeLessThanOrEqual(quanRecipeById('tra_vai')!.unlock);
    expect(quanRecipesAt(30).map((r) => r.id)).not.toContain('tra_vai');
    expect(quanRecipesAt(34).map((r) => r.id)).toContain('tra_vai');
  });

  it('món vào thực đơn hợp lệ từ cấp 34, không lọt ở cấp 33 (cleanMenu)', () => {
    expect(cleanMenu(['tra_vai'], 33)).toEqual([]);
    expect(cleanMenu(['tra_vai'], 34)).toEqual(['tra_vai']);
  });
});
