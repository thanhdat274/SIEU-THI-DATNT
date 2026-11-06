import { describe, it, expect } from 'vitest';
import { QUAN_RECIPES, recipeCupCost } from '../data/quanRecipes';
import { productById } from '../data/products';

/** GĐ1436 — quán nước có món từ trái cây catalog (dứa, táo, bơ). */
describe('GĐ1436 — món quán từ trái cây', () => {
  for (const id of ['tra_dua_da', 'ep_tao_da', 'sinh_to_bo_quan']) {
    it(`${id}: có, mở > 30, lời so với vốn/ly, nguyên liệu mở trước món`, () => {
      const r = QUAN_RECIPES.find((x) => x.id === id)!;
      expect(r).toBeDefined();
      expect(r.unlock).toBeGreaterThan(30);
      expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
      for (const u of r.uses) expect(productById(u.id).unlock).toBeLessThanOrEqual(r.unlock);
    });
  }
});
