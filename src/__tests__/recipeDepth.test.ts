/**
 * GĐ1321 — "Thêm sản phẩm/công thức mới" (hướng chiều sâu 1, GĐ1076): 2 món cao cấp cuối-game
 * tại tiệm xôi (xôi nếp cẩm) và ấm nước (chè hạt sen).
 * Test THUẦN: xác minh (a) món tồn tại đúng trong RECIPES + COOKED_PRODUCTS, (b) mẻ lãi DƯƠNG
 * TÍNH TỪ GIÁ THẬT ghi sẵn (Nguyên tắc c — không bịa con số), (c) unlock sau mốc golden sim 30
 * → kinh tế mốc không đổi (economySim an toàn), (d) outputId duy nhất.
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, RECIPE_MAP, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';

/** Mốc golden sim — recipe unlock > 30 thì autoplay mốc không nhặt món này (không đổi RNG/kinh tế). */
const GOLDEN_SMOOTH = 30;

const NEW_IDS = ['recipe_xoi_nep_cam', 'recipe_che_hat_sen'] as const;

describe('GĐ1321 — thêm công thức cao cấp cuối-game (hướng 1)', () => {
  for (const rid of NEW_IDS) {
    const recipe = RECIPE_MAP[rid];
    it(`${recipe.name}: có trong RECIPES và COOKED_PRODUCTS`, () => {
      expect(recipe).toBeDefined();
      expect(recipe.id).toBe(rid);
    });

    it(`${recipe.name}: mở sau mốc golden sim 30 → economySim mốc không đổi`, () => {
      expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
    });

    it(`${recipe.name}: mẻ lãi dương TÍNH TỪ GIÁ THẬT (không bịa con số)`, () => {
      // chi phí mẻ = tổng nguyên liệu × giá NHẬP thật
      const cost = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).buy, 0);
      // giá trị mẻ = số phần × giá BÁN thật của thành phẩm
      const value = recipe.outputQty * productById(recipe.outputId).sell;
      expect(value).toBeGreaterThan(cost);
      // nấu HỜI hơn bán thẳng nguyên liệu thô (lý do nấu)
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('2 món mới hiện diện ở đúng trạm (quây xôi + ấm nước)', () => {
    expect(RECIPES.some((r) => r.station === 'rice_station' && r.id === 'recipe_xoi_nep_cam')).toBe(true);
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_che_hat_sen')).toBe(true);
  });
});
