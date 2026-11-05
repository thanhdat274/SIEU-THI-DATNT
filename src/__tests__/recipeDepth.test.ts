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

/**
 * GĐ1340 — "Thêm sản phẩm/công thức mới": Sữa chua trái cây — món mát trứ danh Đà Lạt, làm dày trạm máy xay
 * (trước chỉ 3 món). Cùng bất biến GĐ1321/1332-1339 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1340 = ['recipe_sua_chua_trai_cay'] as const;

describe('GĐ1340 — thêm công thức mát máy xay (sữa chua trái cây)', () => {
  for (const rid of NEW_IDS_1340) {
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

  it('sữa chua trái cây hiện diện ở trạm máy xay và dùng sữa chua + trái cây + đường', () => {
    expect(RECIPES.some((r) => r.station === 'blender' && r.id === 'recipe_sua_chua_trai_cay')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_sua_chua_trai_cay' && r.inputs.some((i) => i.productId === 'suachua'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_sua_chua_trai_cay' && r.inputs.some((i) => i.productId === 'traicay'))).toBe(true);
  });
});

/**
 * GĐ1341 — "Thêm sản phẩm/công thức mới": Hủ tiếu nam vang — món hủ tiếu Sa Đéc trứ danh; nguyên liệu hủ tiếu
 * chưa có → thêm sản phẩm tạp hóa mới `hut_tieu` (biên 1.5 chuẩn, unlock 34 > 30) + công thức nấu ở ấm nước.
 * Cùng bất biến GĐ1321/1332-1340 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1341 = ['recipe_hut_tieu_nam_vang'] as const;

describe('GĐ1341 — thêm sản phẩm tạp hóa + công thức biểu tượng (hủ tiếu → hủ tiếu nam vang)', () => {
  it('hủ tiếu: có trong PRODUCTS, biên ≥1.5, mở 34 sau mốc golden 30', async () => {
    const { PRODUCTS, productById } = await import('../data/products');
    const ht = productById('hut_tieu');
    expect(ht).toBeDefined();
    expect(PRODUCTS.some((p) => p.id === 'hut_tieu')).toBe(true);
    expect(ht.sell / ht.buy).toBeGreaterThanOrEqual(1.5);
    expect(ht.unlock).toBe(34);
    expect(ht.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });

  for (const rid of NEW_IDS_1341) {
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

  it('hủ tiếu nam vang hiện diện ở trạm ấm nước và dùng hủ tiếu + thịt + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_hut_tieu_nam_vang')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_hut_tieu_nam_vang' && r.inputs.some((i) => i.productId === 'hut_tieu'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_hut_tieu_nam_vang' && r.inputs.some((i) => i.productId === 'thit'))).toBe(true);
  });
});

/**
 * GĐ1342 — "Thêm sản phẩm/công thức mới": 2 món nướng của hàng THỊT CÁ TƯƠI (nguồn cung còn trống — 0 lối ra
 * trước nay): Gà ta nướng muối ớt (`ga_ta_tuoi` 34) + Cá lóc nướng muối (`ca_loc_tuoi` 33) ở bếp nướng.
 * Cùng bất biến GĐ1321/1332-1341 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1342 = ['recipe_ga_ta_nuong_muoi', 'recipe_ca_loc_nuong_muoi'] as const;

describe('GĐ1342 — lối ra bếp cho hàng thịt cá tươi còn trống (nướng muối)', () => {
  for (const rid of NEW_IDS_1342) {
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

  it('2 món nướng hiện diện ở bếp nướng và dùng đúng hàng thịt cá tươi (gà ta · cá lóc)', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_ga_ta_nuong_muoi')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ga_ta_nuong_muoi' && r.inputs.some((i) => i.productId === 'ga_ta_tuoi'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_ca_loc_nuong_muoi')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ca_loc_nuong_muoi' && r.inputs.some((i) => i.productId === 'ca_loc_tuoi'))).toBe(true);
  });
});

/**
 * GĐ1343 — "Thêm sản phẩm/công thức mới": khép nốt 3 mục quầy thịt cá còn 0 lối ra sau GĐ1342 —
 * Thịt kho trứng (`thit_heo_tuoi` 32, ấm nước) · Cá rô phi chiên (`ca_ro_phi_tuoi` 35, chảo chiên) ·
 * Bò kho (`thit_bo_tuoi` 38, ấm nước). Cùng bất biến GĐ1321/1332-1342 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30).
 */
const NEW_IDS_1343 = ['recipe_thit_kho_trung', 'recipe_ca_ro_phi_chien', 'recipe_bo_kho'] as const;

describe('GĐ1343 — khép nốt lối ra bếp cho quầy thịt cá (3 món biểu tượng)', () => {
  for (const rid of NEW_IDS_1343) {
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

  it('3 món hiện diện ở đúng trạm và khép nốt đủ 5 mục quầy thịt cá', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_thit_kho_trung')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_thit_kho_trung' && r.inputs.some((i) => i.productId === 'thit_heo_tuoi'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'fryer' && r.id === 'recipe_ca_ro_phi_chien')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ca_ro_phi_chien' && r.inputs.some((i) => i.productId === 'ca_ro_phi_tuoi'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_bo_kho')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bo_kho' && r.inputs.some((i) => i.productId === 'thit_bo_tuoi'))).toBe(true);
    // Đủ 5 mục quầy thịt cá đều có lối ra bếp sau GĐ1342+1343
    for (const meat of ['thit_heo_tuoi', 'ca_loc_tuoi', 'ga_ta_tuoi', 'ca_ro_phi_tuoi', 'thit_bo_tuoi']) {
      expect(RECIPES.some((r) => r.inputs.some((i) => i.productId === meat))).toBe(true);
    }
  });
});

/**
 * GĐ1344 — "Thêm sản phẩm/công thức mới": Thịt kho dưa — món kho Nam Bộ trứ danh, khép LỐI RA BẾP ĐẦU TIÊN
 * của dưa muối nhà hàng xóm (`hx_dua_muoi` 14 — nguồn cung còn 0 lối ra trước nay), nấu ở ấm nước.
 * Cùng bất biến GĐ1321/1332-1343 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1344 = ['recipe_thit_kho_dua'] as const;

describe('GĐ1344 — lối ra bếp đầu tiên của dưa muối hàng xóm (thịt kho dưa)', () => {
  for (const rid of NEW_IDS_1344) {
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

  it('thịt kho dưa hiện diện ở trạm ấm nước và dùng thịt heo + dưa muối hàng xóm + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_thit_kho_dua')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_thit_kho_dua' && r.inputs.some((i) => i.productId === 'hx_dua_muoi'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_thit_kho_dua' && r.inputs.some((i) => i.productId === 'x_thit_heo'))).toBe(true);
  });
});

/**
 * GĐ1345 — "mở rộng thực đơn giỏ quà lễ": Giỏ quà Giáng sinh — lễ tặng quà lớn duy nhất còn thiếu giỏ
 * (Tết/8-3/20-11/Trung thu đã có), giỏ premium đầu tiên có rượu vang, gói trong đúng dịp giang_sinh.
 * Cùng bất biến GĐ1321/1332-1344 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1345 = ['recipe_gio_giang_sinh'] as const;

describe('GĐ1345 — mở rộng giỏ quà lễ (Giỏ quà Giáng sinh)', () => {
  for (const rid of NEW_IDS_1345) {
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

  it('giỏ Giáng sinh gói tại gift_wrap, đúng dịp giang_sinh, dùng rượu vang + bánh + trà', () => {
    expect(RECIPES.some((r) => r.station === 'gift_wrap' && r.id === 'recipe_gio_giang_sinh')).toBe(true);
    expect(RECIPE_MAP.recipe_gio_giang_sinh.festival).toBe('giang_sinh');
    expect(RECIPES.some((r) => r.id === 'recipe_gio_giang_sinh' && r.inputs.some((i) => i.productId === 'ruou'))).toBe(true);
  });
});

/**
 * GĐ1346 — "mở rộng thực đơn giỏ quà lễ": Giỏ quà Valentine — giỏ cặp đôi (mỹ phẩm + bánh + kẹo mút),
 * gói trong đúng dịp valentine. Cùng bất biến GĐ1321/1332-1345 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30).
 */
const NEW_IDS_1346 = ['recipe_gio_valentine'] as const;

describe('GĐ1346 — mở rộng giỏ quà lễ (Giỏ quà Valentine)', () => {
  for (const rid of NEW_IDS_1346) {
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

  it('giỏ Valentine gói tại gift_wrap, đúng dịp valentine, dùng mỹ phẩm + bánh + kẹo mút', () => {
    expect(RECIPES.some((r) => r.station === 'gift_wrap' && r.id === 'recipe_gio_valentine')).toBe(true);
    expect(RECIPE_MAP.recipe_gio_valentine.festival).toBe('valentine');
    expect(RECIPES.some((r) => r.id === 'recipe_gio_valentine' && r.inputs.some((i) => i.productId === 'mypham'))).toBe(true);
  });
});
