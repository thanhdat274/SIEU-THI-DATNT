/**
 * GĐ1322 — "Chuỗi sản xuất chế biến từ sản phẩm hàng xóm/đặc sản vùng": đưa nguồn cung GĐ1321 (khô bò mối lái,
 * bánh cuốn bà Tám, chả lụa quê) thành NGUYÊN LIỆU nấu 2 món (bóp gỏi khô bò, bánh cuốn chả lụa).
 * Khép chuỗi "mối lái/hàng xóm → bếp", biến nguồn cung mới thành hàng có lối ra bếp (không phải món "dead stock").
 * Test THUẦN (không import store): (a) món tồn tại trong RECIPES + COOKED_PRODUCTS, (b) mẻ lãi DƯƠNG
 * TÍNH TỪ GIÁ THẬT ghi sẵn (Nguyên tắc c — không bịa), (c) unlock sau mốc golden sim 30 → kinh tế mốc không đổi,
 * (d) nguyên liệu KHÔ PHẢI món nấu sẵn — là nguồn cung ngoài (NGUYÊN LIỆU có chỉ đúng mối bán), (e) outputId duy nhất.
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, RECIPE_MAP, COOKED_PRODUCTS } from '../data/recipes';
import { productById } from '../data/products';
import { REGION_PRODUCTS } from '../data/regionSpecialty';
import { NEIGHBOR2_PRODUCTS } from '../data/homemade';

const GOLDEN_SMOOTH = 30;

/** Nguồn cung ngoài (mối lái + bà Tám) — phải là nguyên liệu có mối bán, không phải món nấu sẵn. */
const COOKED_IDS = new Set(COOKED_PRODUCTS.map((c) => c.id));
const SUPPLIED_IDS = new Set([...REGION_PRODUCTS, ...NEIGHBOR2_PRODUCTS].map((p) => p.id));

const NEW_IDS = ['recipe_bo_gio_kho_bo', 'recipe_banh_cuon_cha_lua'] as const;

describe('GĐ1322 — chuỗi sản xuất chế biến từ cung ngoài (hướng chiều sâu "chuỗi sản xuất")', () => {
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
      const cost = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).buy, 0);
      const value = recipe.outputQty * productById(recipe.outputId).sell;
      expect(value).toBeGreaterThan(cost);
      // nấu HỜI hơn bán thẳng nguyên liệu thô (lý do nấu)
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: nguyên liệu là nguồn cung ngoài có mối bán (KHÔNG phải món nấu sẵn — vốn dĩ đã bán được)`, () => {
      // Mỗi món "chuỗi sản xuất" phải có ÍT NHẤT 1 nguyên liệu là nguồn cung ngoài (mối lái/hàng xóm),
      // không phải món nấu sẵn — nếu nguyên liệu là món nấu sẵn thì "nấu" chẳng thêm lối ra nào (bịa công thức).
      const mains = recipe.inputs.filter((i) => SUPPLIED_IDS.has(i.productId));
      expect(mains.length).toBeGreaterThanOrEqual(1);
      for (const m of mains) expect(COOKED_IDS.has(m.productId)).toBe(false);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('2 món hiện diện ở đúng trạm (bếp nướng + nồi hấp) và dùng đúng món GĐ1321', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_bo_gio_kho_bo')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bo_gio_kho_bo' && r.inputs.some((i) => i.productId === 'rg_kho_bo'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'steamer' && r.id === 'recipe_banh_cuon_cha_lua')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_cuon_cha_lua' && r.inputs.some((i) => i.productId === 'hx_banh_cuon'))).toBe(true);
  });
});

/**
 * GĐ1323 — tiếp tục chuỗi sản xuất chế biến từ cung ngoài: đưa 2 đặc sản vùng còn lại của mối lái
 * (khô tôm rg_kho_tom, lạp xưởng miền rg_lap_xuong) thành NGUYÊN LIỆU nấu 2 món xôi cao cấp tại quây xôi
 * (xôi khô tôm, xôi lạp xưởng miền) — khép nốt chuỗi "mối lái → quây xôi" cho đặc sản vùng, không để
 * nguồn cung GĐ1321 thành món "dead stock" chỉ bán thẳng. Cùng bất biến GĐ1322 (món thêm mới có LỐI RA BẾP).
 */
const NEW_IDS_1323 = ['recipe_xoi_kho_tom', 'recipe_xoi_lap_xuong'] as const;

describe('GĐ1323 — chuỗi sản xuất chế biến từ đặc sản vùng (mối lái → quây xôi)', () => {
  for (const rid of NEW_IDS_1323) {
    const recipe = RECIPE_MAP[rid];
    it(`${recipe.name}: có trong RECIPES và COOKED_PRODUCTS`, () => {
      expect(recipe).toBeDefined();
      expect(recipe.id).toBe(rid);
    });

    it(`${recipe.name}: mở sau mốc golden sim 30 → economySim mốc không đổi`, () => {
      expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
    });

    it(`${recipe.name}: mẻ lãi dương TÍNH TỪ GIÁ THẬT (không bịa con số)`, () => {
      const cost = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).buy, 0);
      const value = recipe.outputQty * productById(recipe.outputId).sell;
      expect(value).toBeGreaterThan(cost);
      // nấu HỜI hơn bán thẳng nguyên liệu thô (lý do nấu)
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: nguyên liệu là đặc sản vùng có mối bán (KHÔNG phải món nấu sẵn)`, () => {
      const mains = recipe.inputs.filter((i) => SUPPLIED_IDS.has(i.productId));
      expect(mains.length).toBeGreaterThanOrEqual(1);
      for (const m of mains) expect(COOKED_IDS.has(m.productId)).toBe(false);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('2 xôi mới hiện diện ở quây xôi và dùng đúng đặc sản vùng GĐ1321', () => {
    expect(RECIPES.some((r) => r.station === 'rice_station' && r.id === 'recipe_xoi_kho_tom')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_xoi_kho_tom' && r.inputs.some((i) => i.productId === 'rg_kho_tom'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'rice_station' && r.id === 'recipe_xoi_lap_xuong')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_xoi_lap_xuong' && r.inputs.some((i) => i.productId === 'rg_lap_xuong'))).toBe(true);
  });
});
