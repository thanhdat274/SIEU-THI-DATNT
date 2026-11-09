/**
 * GĐ1941 — "Gắn lối ra nấu cho nguyên liệu nhà làm hàng chết": 10 nguyên liệu trong homemade.ts vốn mất lối ra
 * (chỉ bán thẳng) nay được gắn món CHÍNH CÓ THẬT ngoài đời (đã tra cứu — không chế bừa). Mỗi món tuân thủ bất biến
 * giống recipeDepth.test.ts: (a) tồn tại đúng trong RECIPES + COOKED_PRODUCTS, (b) mẻ lãi DƯƠNG TÍNH TỪ GIÁ THẬT
 * (không bịa con số) và nấu HỜI hơn bán thẳng nguyên liệu, (c) unlock sau mốc golden sim 30 → kinh tế mốc không đổi,
 * (d) outputId duy nhất, (e) đúng trạm + dùng nguyên liệu chính tương ứng.
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, RECIPE_MAP, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';

const GOLDEN_SMOOTH = 30;

/** 10 món: recipeId → { trạm nấu, nguyên liệu chính (món đứng tên), outputId }. */
const NEW_IDS = [
  { rid: 'recipe_ca_ri_ga', station: 'hot_kettle', key: 'hx_bot_ca_ri', pid: 'ca_ri_ga' },
  { rid: 'recipe_hu_tieu_sa_te', station: 'hot_kettle', key: 'hx_sate_tom', pid: 'hu_tieu_sa_te' },
  { rid: 'recipe_bun_mam_nem', station: 'hot_kettle', key: 'hx_mam_nem', pid: 'bun_mam_nem' },
  { rid: 'recipe_ga_nuong_muoi_sa', station: 'food_grill', key: 'hx_muoi_sa', pid: 'ga_nuong_muoi_sa' },
  { rid: 'recipe_banh_cuon_tom_chua', station: 'steamer', key: 'hx_tom_chua', pid: 'banh_cuon_tom_chua' },
  { rid: 'recipe_banh_mi_ruoc', station: 'food_grill', key: 'hx_ruoc_ca_loc', pid: 'banh_mi_ruoc' },
  { rid: 'recipe_che_dau_den', station: 'hot_kettle', key: 'hx_dau_den', pid: 'che_dau_den' },
  { rid: 'recipe_che_me_den', station: 'hot_kettle', key: 'hx_me_den', pid: 'che_me_den' },
  { rid: 'recipe_ca_kho_tuong', station: 'hot_kettle', key: 'hx_tuong_hot', pid: 'ca_kho_tuong' },
  { rid: 'recipe_xoai_lac_muoi_tom', station: 'blender', key: 'hx_muoi_tom', pid: 'xoai_lac_muoi_tom' },
] as const;

describe('GĐ1941 — lối ra nấu cho nguyên liệu nhà làm hàng chết (món chính có thật)', () => {
  for (const { rid, station, key, pid } of NEW_IDS) {
    const recipe = RECIPE_MAP[rid];
    it(`${recipe.name}: có trong RECIPES và COOKED_PRODUCTS, outputId khớp`, () => {
      expect(recipe).toBeDefined();
      expect(recipe.outputId).toBe(pid);
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });

    it(`${recipe.name}: mở sau mốc golden sim 30 và sau mọi nguyên liệu`, () => {
      expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
      for (const i of recipe.inputs) expect(recipe.unlock).toBeGreaterThanOrEqual(productById(i.productId).unlock);
    });

    it(`${recipe.name}: mẻ lãi dương TÍNH TỪ GIÁ THẬT và nấu hời hơn bán thẳng nguyên liệu`, () => {
      const cost = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).buy, 0);
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      const value = recipe.outputQty * productById(recipe.outputId).sell;
      expect(value).toBeGreaterThan(cost);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: nấu ở trạm ${station} và dùng nguyên liệu chính ${key}`, () => {
      expect(recipe.station).toBe(station);
      expect(recipe.inputs.some((i) => i.productId === key)).toBe(true);
    });
  }
});
