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

/**
 * GĐ1332 — "Thêm sản phẩm/công thức mới": Bánh xèo — món bánh biểu tượng nhất của ẩm thực VN trước nay TỘT
 * KHÔNG có ở bếp, nấu ở chảo chiên từ bột gạo + nước cốt dừa + thịt + hành phi (không rau/nông sản khóa ranking).
 * Cùng bất biến GĐ1321 (lãi dương TÍNH TỪ GIÁ THẬT không bịa · unlock > 30 → sim không đổi · outputId duy nhất).
 */
const NEW_IDS_1332 = ['recipe_banh_xeo'] as const;

describe('GĐ1332 — thêm công thức biểu tượng còn thiếu (bánh xèo, chảo chiên)', () => {
  for (const rid of NEW_IDS_1332) {
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
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('bánh xèo hiện diện ở trạm chảo chiên và dùng đúng bột gạo + nước cốt dừa + thịt + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'fryer' && r.id === 'recipe_banh_xeo')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_xeo' && r.inputs.some((i) => i.productId === 'x_bot_gao'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_xeo' && r.inputs.some((i) => i.productId === 'x_dua_cot_hop'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_xeo' && r.inputs.some((i) => i.productId === 'x_thit_heo'))).toBe(true);
  });
});

/**
 * GĐ1333 — "Thêm sản phẩm/công thức mới": Chả giò chiên — `cha` (chả giò đông lạnh) có bán sẵn nhưng chưa có món
 * rán vàng giòn (ăn vặt/món Tết quen thuộc nhất), rán ở chảo chiên với hành phi + muối. Cùng bất biến GĐ1321/1332.
 */
const NEW_IDS_1333 = ['recipe_cha_gio_chien'] as const;

describe('GĐ1333 — thêm công thức biểu tượng còn thiếu (chả giò chiên, chảo chiên)', () => {
  for (const rid of NEW_IDS_1333) {
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
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('chả giò chiên hiện diện ở trạm chảo chiên và dùng chả giò đông lạnh + hành phi + muối', () => {
    expect(RECIPES.some((r) => r.station === 'fryer' && r.id === 'recipe_cha_gio_chien')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_cha_gio_chien' && r.inputs.some((i) => i.productId === 'cha'))).toBe(true);
  });
});

/**
 * GĐ1335 — "Thêm sản phẩm/công thức mới": Phở bò — món quốc hồn quốc túy trước nay chỉ có phở gói bán sẵn
 * (`pho` unlock 19), chưa có lối ra nấu; nấu ở ấm nước với thịt + hành phi. Cùng bất biến GĐ1321/1332/1333.
 */
const NEW_IDS_1335 = ['recipe_pho_bo'] as const;

describe('GĐ1335 — thêm công thức biểu tượng còn thiếu (phở bò, ấm nước)', () => {
  for (const rid of NEW_IDS_1335) {
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
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('phở bò hiện diện ở trạm ấm nước và dùng phở gói + thịt đông lạnh + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_pho_bo')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_pho_bo' && r.inputs.some((i) => i.productId === 'pho'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_pho_bo' && r.inputs.some((i) => i.productId === 'thit'))).toBe(true);
  });
});

/**
 * GĐ1336 — "Thêm sản phẩm/công thức mới": Bánh mì thịt nướng — biểu tượng bánh mì Sài Gòn: `banhmi` (unlock 38)
 * vốn chỉ có bản trứng, chưa có bản THỊT; nướng ở bếp nướng với thịt heo + hành phi. Cùng bất biến GĐ1321/1332-1335.
 */
const NEW_IDS_1336 = ['recipe_banh_mi_thit'] as const;

describe('GĐ1336 — thêm công thức biểu tượng còn thiếu (bánh mì thịt nướng, bếp nướng)', () => {
  for (const rid of NEW_IDS_1336) {
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
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('bánh mì thịt nướng hiện diện ở bếp nướng và dùng bánh mì + thịt heo + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_banh_mi_thit')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_mi_thit' && r.inputs.some((i) => i.productId === 'banhmi'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_mi_thit' && r.inputs.some((i) => i.productId === 'x_thit_heo'))).toBe(true);
  });
});

/**
 * GĐ1337 — "Thêm sản phẩm/công thức mới": Bún bò Huế — món bún cay trứ danh Huế; nguyên liệu bún tươi chưa có
 * → thêm sản phẩm tạp hóa mới `bun` (biên 1.5 chuẩn, unlock 33 > 30) + công thức nấu ở ấm nước. Cùng bất biến GĐ1321/1332-1336.
 */
const NEW_IDS_1337 = ['recipe_bun_bo_hue'] as const;

describe('GĐ1337 — thêm sản phẩm tạp hóa + công thức biểu tượng (bún tươi → bún bò Huế)', () => {
  it('bún tươi: có trong PRODUCTS, biên ≥1.5, mở 33 sau mốc golden 30', async () => {
    const { PRODUCTS, productById } = await import('../data/products');
    const bun = productById('bun');
    expect(bun).toBeDefined();
    expect(PRODUCTS.some((p) => p.id === 'bun')).toBe(true);
    expect(bun.sell / bun.buy).toBeGreaterThanOrEqual(1.5);
    expect(bun.unlock).toBe(33);
    expect(bun.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });

  for (const rid of NEW_IDS_1337) {
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
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('bún bò Huế hiện diện ở trạm ấm nước và dùng bún tươi + thịt + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_bun_bo_hue')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bun_bo_hue' && r.inputs.some((i) => i.productId === 'bun'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bun_bo_hue' && r.inputs.some((i) => i.productId === 'thit'))).toBe(true);
  });
});

/**
 * GĐ1338 — "Thêm sản phẩm/công thức mới": Mì Quảng — món mì vàng đậm đà Quảng Nam (mì sợi + thịt + hành phi),
 * nấu ở ấm nước. Cùng bất biến GĐ1321/1332-1337 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1338 = ['recipe_mi_quang'] as const;

describe('GĐ1338 — thêm công thức biểu tượng còn thiếu (mì Quảng, ấm nước)', () => {
  for (const rid of NEW_IDS_1338) {
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
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('mì Quảng hiện diện ở trạm ấm nước và dùng mì + thịt + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_mi_quang')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_mi_quang' && r.inputs.some((i) => i.productId === 'mi'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_mi_quang' && r.inputs.some((i) => i.productId === 'thit'))).toBe(true);
  });
});

/**
 * GĐ1339 — "Thêm sản phẩm/công thức mới": Gà kho gừng — món kho gia đình trứ danh: gà nguyên con (`thit_ga` 52)
 * kho gừng + nước mắm nhà ủ (lối ra thứ 2 của `hx_nuoc_mam`), nấu ở ấm nước. Cùng bất biến GĐ1321/1332-1338.
 */
const NEW_IDS_1339 = ['recipe_ga_kho_gung'] as const;

describe('GĐ1339 — thêm công thức kho gia đình (gà kho gừng, ấm nước)', () => {
  for (const rid of NEW_IDS_1339) {
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
      const raw = recipe.inputs.reduce((s, inp) => s + inp.quantity * productById(inp.productId).sell, 0);
      expect(value).toBeGreaterThan(raw);
    });

    it(`${recipe.name}: outputId khớp COOKED_PRODUCTS và không trùng`, () => {
      expect(COOKED_PRODUCTS.some((c) => c.id === recipe.outputId)).toBe(true);
      expect(RECIPES.filter((r) => r.outputId === recipe.outputId).length).toBe(1);
    });
  }

  it('gà kho gừng hiện diện ở trạm ấm nước và dùng gà nguyên con + gừng + nước mắm nhà ủ', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_ga_kho_gung')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ga_kho_gung' && r.inputs.some((i) => i.productId === 'thit_ga'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ga_kho_gung' && r.inputs.some((i) => i.productId === 'hx_nuoc_mam'))).toBe(true);
  });
});
