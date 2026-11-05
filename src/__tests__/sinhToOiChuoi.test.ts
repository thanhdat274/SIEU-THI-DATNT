import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES, quanRecipeById, quanRecipesAt, cleanMenu } from '../data/quanRecipes';
import { CROPS } from '../data/garden';

describe('GĐ1092 — Sinh tố ổi & chuối (liên hệ nông trại → quán nước, kích hoạt x_oi/x_chuoi ngủ đông)', () => {
  const mons = [
    { id: 'sinh_to_oi', productId: 'x_oi', unlock: 34 },
    { id: 'sinh_to_chuoi', productId: 'x_chuoi', unlock: 35 },
  ];

  it.each(mons.map((m) => [m.id, m]))('món %s duy nhất trong QUAN_RECIPES, mở cấp %d, giá bán dương', (_name, m) => {
    expect(QUAN_RECIPES.filter((r) => r.id === m.id)).toHaveLength(1);
    const r = quanRecipeById(m.id)!;
    expect(r.unlock).toBe(m.unlock);
    expect(r.price).toBeGreaterThan(0);
    expect(r.hot).toBeFalsy();
  });

  it.each(mons.map((m) => [m.id, m]))('món %s dùng trái cây nhà (%s) + sữa đặc + đá', (_name, m) => {
    const r = quanRecipeById(m.id)!;
    expect(r.uses.map((u) => u.id)).toEqual(expect.arrayContaining([m.productId, 'x_sua_dac', 'x_nuoc_da']));
    expect(r.uses.every((u) => u.cups > 0)).toBe(true);
  });

  it('giống mở cấp 22 ≤ món mở 34/35 → tự cung được trước khi mở món; cấp 30 (mốc golden) chưa có món nào', () => {
    for (const m of mons) {
      const c = CROPS.find((x) => x.productId === m.productId)!;
      expect(c.unlock).toBe(22);
      expect(c.unlock).toBeLessThanOrEqual(m.unlock);
      expect(quanRecipesAt(30).map((r) => r.id)).not.toContain(m.id);
      expect(quanRecipesAt(m.unlock).map((r) => r.id)).toContain(m.id);
    }
  });

  it('cleanMenu chặn cả hai ở cấp 33, nhận đúng cấp mở', () => {
    expect(cleanMenu(['sinh_to_oi', 'sinh_to_chuoi'], 33)).toEqual([]);
    expect(cleanMenu(['sinh_to_oi', 'sinh_to_chuoi'], 34)).toEqual(['sinh_to_oi']);
    expect(cleanMenu(['sinh_to_oi', 'sinh_to_chuoi'], 35)).toEqual(['sinh_to_oi', 'sinh_to_chuoi']);
  });
});
