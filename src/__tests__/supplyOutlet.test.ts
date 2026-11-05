import { describe, expect, it } from 'vitest';
import { RECIPES, RECIPE_MAP } from '../data/recipes';
import { productById } from '../data/products';
import { supplyOutletOf } from '../data/supplyOutlet';

/**
 * GĐ1327 — "soi quyết định" nguồn cung ngoài: món nấu dùng nguyên liệu là hàng NGOÀI tạp hóa (mối lái vùng xa /
 * nhà bà Tám / nhà hàng xóm). THUẦN: chỉ gộp số ghi sẵn KHÔNG bịa (Nguyên tắc c), không import store → không đổi
 * kinh tế/save/seed. Test bắt (a) nhãn nơi mua đúng theo nguồn thật, (b) mọi món chuỗi sản xuất nấu HỜI hơn bán
 * thẳng nguyên liệu (lý do nấu), (c) món mối thường trả null (không phình nhãn bừa).
 */
describe('GĐ1327 — supplyOutletOf: nơi mua nguyên liệu của món chuỗi sản xuất', () => {
  // [id công thức] → [nguyên liệu ngoài chính, nơi mua] (khớp dữ liệu thật, không bịa)
  const CHAIN: Record<string, readonly [string, string]> = {
    recipe_bo_gio_kho_bo: ['rg_kho_bo', 'mối lái vùng xa'],
    recipe_xoi_kho_tom: ['rg_kho_tom', 'mối lái vùng xa'],
    recipe_xoi_lap_xuong: ['rg_lap_xuong', 'mối lái vùng xa'],
    recipe_banh_cuon_cha_lua: ['hx_banh_cuon', 'nhà bà Tám'],
    recipe_nem_chua_ran: ['hx_nem_chua', 'nhà bà Tám'],
    recipe_che_vai: ['hx_vai_say', 'nhà hàng xóm'],
    recipe_xoi_mam_tep: ['hx_mam_tep', 'nhà hàng xóm'],
    recipe_mam_ruoc_chung_thit: ['hx_mam_ruoc', 'nhà hàng xóm'],
    recipe_banh_trang_nuong: ['hx_banh_trang', 'nhà hàng xóm'],
    recipe_banh_da_tron: ['hx_banh_da', 'nhà bà Tám'],
    recipe_thit_tuong_ban: ['hx_tuong_ban', 'nhà hàng xóm'],
    recipe_ca_kho_to: ['hx_nuoc_mam', 'nhà hàng xóm'],
  };
  const SUPPLY_ING = new Set(Object.values(CHAIN).map(([ing]) => ing));

  for (const [rid, [ing, source]] of Object.entries(CHAIN)) {
    it(`${rid}: báo đúng nguyên liệu ngoài ${ing} (${source}) — tên lấy từ giá thật`, () => {
      const so = supplyOutletOf(RECIPE_MAP[rid]);
      expect(so).not.toBeNull();
      expect(so!.ingredientId).toBe(ing);
      expect(so!.source).toBe(source);
      expect(so!.name).toBe(productById(ing).name);
    });

    it(`${rid}: nấu hời hơn bán thẳng nguyên liệu (lý do nấu — khớp bất biến GĐ1322–1326)`, () => {
      const so = supplyOutletOf(RECIPE_MAP[rid])!;
      expect(so!.batchValue).toBeGreaterThan(so!.rawValue);
      expect(so!.beatsRaw).toBe(true);
    });
  }

  it('món dùng toàn nguyên liệu mối thường → null (không phình nhãn)', () => {
    const normal = RECIPES.find((r) => !r.inputs.some((i) => SUPPLY_ING.has(i.productId)));
    expect(normal).toBeDefined();
    expect(supplyOutletOf(normal!)).toBeNull();
  });

  it('xác định: cùng công thức chạy hai lần ra cùng kết quả', () => {
    expect(supplyOutletOf(RECIPE_MAP.recipe_xoi_kho_tom))
      .toEqual(supplyOutletOf(RECIPE_MAP.recipe_xoi_kho_tom));
  });
});
