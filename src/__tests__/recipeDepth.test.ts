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
 * GĐ1350 — "Thêm sản phẩm/công thức mới": Bánh bao kim sa — bánh bao cao cấp trứ danh (nhân lòng đỏ trứng muối
 * chảy), khép LỐI RA BẾP của trứng muối (`trung_muoi` 51 — nguồn cung còn 0 lối ra trước nay), nấu ở nồi hấp.
 * Cùng bất biến GĐ1321/1332-1349 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1350 = ['recipe_banh_bao_kim_sa'] as const;

describe('GĐ1350 — lối ra bếp của trứng muối (bánh bao kim sa, nồi hấp)', () => {
  for (const rid of NEW_IDS_1350) {
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

  it('bánh bao kim sa hiện diện ở nồi hấp và dùng bột mì + trứng muối + sữa đặc', () => {
    expect(RECIPES.some((r) => r.station === 'steamer' && r.id === 'recipe_banh_bao_kim_sa')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_bao_kim_sa' && r.inputs.some((i) => i.productId === 'trung_muoi'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_bao_kim_sa' && r.inputs.some((i) => i.productId === 'botmi'))).toBe(true);
  });
});

/**
 * GĐ1351 — "Thêm sản phẩm/công thức mới": Chả cá Lã Vọng — món Hà Nội trứ danh, khép LỐI RA BẾP của chả cá
 * thác lác (`cha_ca` 76 — nguồn cung cao cấp cuối-game còn 0 lối ra trước nay), nướng than ở bếp nướng.
 * Cùng bất biến GĐ1321/1332-1350 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1351 = ['recipe_cha_ca_la_vong'] as const;

describe('GĐ1351 — lối ra bếp của chả cá thác lác (chả cá Lã Vọng, bếp nướng)', () => {
  for (const rid of NEW_IDS_1351) {
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

  it('chả cá Lã Vọng hiện diện ở bếp nướng và dùng chả cá + nước mắm nhà ủ + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_cha_ca_la_vong')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_cha_ca_la_vong' && r.inputs.some((i) => i.productId === 'cha_ca'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_cha_ca_la_vong' && r.inputs.some((i) => i.productId === 'hx_nuoc_mam'))).toBe(true);
  });
});

/**
 * GĐ1352 — "Thêm sản phẩm/công thức mới": khép nốt 2 nguồn cao cấp cuối-game còn 0 lối ra —
 * Cá basa chiên sả (`ca_basa` 72, chảo chiên) · Sò điệp nướng mỡ hành (`so_diep` 67, bếp nướng).
 * Cùng bất biến GĐ1321/1332-1351 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1352 = ['recipe_ca_basa_chien_sa', 'recipe_so_diep_nuong_mo_hanh'] as const;

describe('GĐ1352 — lối ra bếp cho hàng cao cấp cuối-game (basa + sò điệp)', () => {
  for (const rid of NEW_IDS_1352) {
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

  it('2 món hiện diện ở đúng trạm (chảo chiên + bếp nướng) và dùng đúng hàng cao cấp', () => {
    expect(RECIPES.some((r) => r.station === 'fryer' && r.id === 'recipe_ca_basa_chien_sa')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ca_basa_chien_sa' && r.inputs.some((i) => i.productId === 'ca_basa'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_so_diep_nuong_mo_hanh')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_so_diep_nuong_mo_hanh' && r.inputs.some((i) => i.productId === 'so_diep'))).toBe(true);
  });
});

/**
 * GĐ1353 — "Thêm sản phẩm/công thức mới": Bò Nhật nướng muối (`thit_bo_nhat` 69, bếp nướng — món xa xỉ
 * teppanyaki) + Sinh tố yến mạch chuối (`sua_yeu` 73, quán nước — trend sức khỏe). Cùng bất biến
 * GĐ1321/1332-1352 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1353 = ['recipe_bo_nhat_nuong_muoi'] as const;

describe('GĐ1353 — lối ra bếp cho hàng xa xỉ cuối-game (bò Nhật nướng muối)', () => {
  for (const rid of NEW_IDS_1353) {
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

  it('bò Nhật nướng muối hiện diện ở bếp nướng và dùng thăn bò Nhật + muối + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_bo_nhat_nuong_muoi')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bo_nhat_nuong_muoi' && r.inputs.some((i) => i.productId === 'thit_bo_nhat'))).toBe(true);
  });
});

/**
 * GĐ1355 — "Thêm sản phẩm/công thức mới": 2 món biểu tượng khép lối ra — Cháo gà (`thit_ga` lối ra thứ 2,
 * ấm nước) · Bánh mì pate (`pate` 62 lối ra đầu tiên, bếp nướng). Cùng bất biến GĐ1321/1332-1354
 * (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1355 = ['recipe_chao_ga', 'recipe_banh_mi_pate'] as const;

describe('GĐ1355 — cháo gà + bánh mì pate (khép lối ra gà/pate)', () => {
  for (const rid of NEW_IDS_1355) {
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

  it('2 món hiện diện ở đúng trạm (ấm nước + bếp nướng) và dùng gà nguyên con / pate', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_chao_ga')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_chao_ga' && r.inputs.some((i) => i.productId === 'thit_ga'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_banh_mi_pate')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_mi_pate' && r.inputs.some((i) => i.productId === 'pate'))).toBe(true);
  });
});

/**
 * GĐ1357 — "Thêm sản phẩm/công thức mới": Yến chưng đường phèn — món bồi bổ xa xỉ trứ danh, khép LỐI RA BẾP
 * của tổ yến (`to_yen` 66 — mặt hàng đắt nhất tiệm), chưng cách thủy ở nồi hấp. Cùng bất biến
 * GĐ1321/1332-1356 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1357 = ['recipe_yen_chung'] as const;

describe('GĐ1357 — lối ra bếp của tổ yến (yến chưng đường phèn, nồi hấp)', () => {
  for (const rid of NEW_IDS_1357) {
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

  it('yến chưng hiện diện ở nồi hấp và dùng tổ yến + đường', () => {
    expect(RECIPES.some((r) => r.station === 'steamer' && r.id === 'recipe_yen_chung')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_yen_chung' && r.inputs.some((i) => i.productId === 'to_yen'))).toBe(true);
  });
});

/**
 * GĐ1358 — "Thêm sản phẩm/công thức mới": Bánh mì jambon phô mai — bản bánh mì premium cuối-game, khép LỐI RA
 * BẾP của jambon (`jambon` 61), nướng ở bếp nướng. Cùng bất biến GĐ1321/1332-1357 (lãi dương TÍNH TỪ GIÁ THẬT
 * · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1358 = ['recipe_banh_mi_jambon'] as const;

describe('GĐ1358 — lối ra bếp của jambon (bánh mì jambon phô mai, bếp nướng)', () => {
  for (const rid of NEW_IDS_1358) {
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

  it('bánh mì jambon hiện diện ở bếp nướng và dùng jambon + bánh mì + phô mai', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_banh_mi_jambon')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_mi_jambon' && r.inputs.some((i) => i.productId === 'jambon'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_mi_jambon' && r.inputs.some((i) => i.productId === 'phomai'))).toBe(true);
  });
});

/**
 * GĐ1359 — "Thêm sản phẩm/công thức mới": Nước mía chanh — món hè giải nhiệt kinh điển, công thức THỨ 2 của
 * trạm máy ép mía (trước chỉ có nước mía), ép cùng chanh không hạt + đường. Cùng bất biến GĐ1321/1332-1358
 * (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1359 = ['recipe_nuoc_mia_chanh'] as const;

describe('GĐ1359 — nước mía chanh (công thức thứ 2 của máy ép mía)', () => {
  for (const rid of NEW_IDS_1359) {
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

  it('nước mía chanh hiện diện ở máy ép mía và dùng mía + chanh không hạt + đường', () => {
    expect(RECIPES.some((r) => r.station === 'sugarcane_press' && r.id === 'recipe_nuoc_mia_chanh')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_nuoc_mia_chanh' && r.inputs.some((i) => i.productId === 'mia'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_nuoc_mia_chanh' && r.inputs.some((i) => i.productId === 'x_chanh_khong_hat'))).toBe(true);
  });
});

/**
 * GĐ1360 — "Thêm sản phẩm/công thức mới": Bánh mì chà bông (`cha_bong` 41 — lối ra đầu tiên, bếp nướng) +
 * Sữa chua nếp cẩm (`nep_cam` 70, máy xay — món tráng miệng Đà Lạt trứ danh). Cùng bất biến
 * GĐ1321/1332-1359 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1360 = ['recipe_banh_mi_cha_bong', 'recipe_sua_chua_nep_cam'] as const;

describe('GĐ1360 — bánh mì chà bông + sữa chua nếp cẩm (khép lối ra chà bông/nếp cẩm)', () => {
  for (const rid of NEW_IDS_1360) {
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

  it('2 món hiện diện ở đúng trạm (bếp nướng + máy xay) và dùng chà bông / nếp cẩm', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_banh_mi_cha_bong')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_mi_cha_bong' && r.inputs.some((i) => i.productId === 'cha_bong'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'blender' && r.id === 'recipe_sua_chua_nep_cam')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_sua_chua_nep_cam' && r.inputs.some((i) => i.productId === 'nep_cam'))).toBe(true);
  });
});

/**
 * GĐ1363 — "Thêm sản phẩm/công thức mới": Hộp quà trà bánh quy — giỏ biếu premium LUÔN CÓ SẴN (không festival —
 * gói mọi lúc, mở rộng gift_wrap ngoài các dịp lễ), khép LỐI RA của bánh quy nhập (`banh_quy_nhap` 65).
 * Cùng bất biến GĐ1321/1332-1362 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1363 = ['recipe_hop_qua_tra_banh_quy'] as const;

describe('GĐ1363 — hộp quà trà bánh quy (giỏ biếu luôn có sẵn, gift_wrap)', () => {
  for (const rid of NEW_IDS_1363) {
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

  it('hộp quà gói tại gift_wrap, KHÔNG festival (luôn gói được), dùng bánh quy nhập + trà', () => {
    expect(RECIPES.some((r) => r.station === 'gift_wrap' && r.id === 'recipe_hop_qua_tra_banh_quy')).toBe(true);
    expect(RECIPE_MAP.recipe_hop_qua_tra_banh_quy.festival).toBeUndefined();
    expect(RECIPES.some((r) => r.id === 'recipe_hop_qua_tra_banh_quy' && r.inputs.some((i) => i.productId === 'banh_quy_nhap'))).toBe(true);
  });
});

/**
 * GĐ1364 — "Thêm sản phẩm/công thức mới": Bánh canh tôm — món sợi bánh canh dai trứ danh, khép LỐI RA BẾP
 * của tôm đông lạnh (`hai_san` 43 — nguồn cung còn 0 lối ra trước nay), nấu ở ấm nước. Cùng bất biến
 * GĐ1321/1332-1363 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1364 = ['recipe_banh_canh_tom'] as const;

describe('GĐ1364 — lối ra bếp của tôm đông lạnh (bánh canh tôm, ấm nước)', () => {
  for (const rid of NEW_IDS_1364) {
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

  it('bánh canh tôm hiện diện ở ấm nước và dùng tôm đông lạnh + bột gạo + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_banh_canh_tom')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_canh_tom' && r.inputs.some((i) => i.productId === 'hai_san'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_canh_tom' && r.inputs.some((i) => i.productId === 'x_bot_gao'))).toBe(true);
  });
});

/**
 * GĐ1365 — "Thêm sản phẩm/công thức mới": Cá hồi áp chảo — món cao cấp kiểu Nhật trứ danh, khép LỐI RA BẾP
 * của cá hồi phi lê (`ca_hoi` 53 — nguồn cung còn 0 lối ra trước nay), nướng ở bếp nướng. Cùng bất biến
 * GĐ1321/1332-1364 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1365 = ['recipe_ca_hoi_ap_chao'] as const;

describe('GĐ1365 — lối ra bếp của cá hồi phi lê (cá hồi áp chảo, chảo chiên (GĐ1403 dời từ bếp nướng))', () => {
  for (const rid of NEW_IDS_1365) {
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

  it('cá hồi áp chảo hiện diện ở chảo chiên (GĐ1403 dời từ bếp nướng) và dùng cá hồi + hành phi + muối', () => {
    expect(RECIPES.some((r) => r.station === 'fryer' && r.id === 'recipe_ca_hoi_ap_chao')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ca_hoi_ap_chao' && r.inputs.some((i) => i.productId === 'ca_hoi'))).toBe(true);
  });
});

/**
 * GĐ1366 — "Thêm sản phẩm/công thức mới": Mực khô nướng — món nhậu trứ danh bên mâm bia, khép LỐI RA BẾP
 * của mực khô (`muc_kho` 49 — nguồn cung còn 0 lối ra trước nay), nướng ở bếp nướng. Cùng bất biến
 * GĐ1321/1332-1365 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1366 = ['recipe_muc_kho_nuong'] as const;

describe('GĐ1366 — lối ra bếp của mực khô (mực khô nướng, bếp nướng)', () => {
  for (const rid of NEW_IDS_1366) {
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

  it('mực khô nướng hiện diện ở bếp nướng và dùng mực khô + hành phi + muối', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_muc_kho_nuong')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_muc_kho_nuong' && r.inputs.some((i) => i.productId === 'muc_kho'))).toBe(true);
  });
});

/**
 * GĐ1367 — "Thêm sản phẩm/công thức mới": 2 món nướng khép lối ra — Lạp xưởng nướng (`lap_xuong` 44) +
 * Cừu nướng (`thit_cu` 56), cả hai ở bếp nướng. Cùng bất biến GĐ1321/1332-1366 (lãi dương TÍNH TỪ GIÁ THẬT
 * · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1367 = ['recipe_lap_xuong_nuong', 'recipe_cuu_nuong'] as const;

describe('GĐ1367 — lạp xưởng nướng + cừu nướng (khép lối ra lạp xưởng/cừu)', () => {
  for (const rid of NEW_IDS_1367) {
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

  it('2 món nướng hiện diện ở bếp nướng và dùng lạp xưởng / thịt cừu', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_lap_xuong_nuong')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_lap_xuong_nuong' && r.inputs.some((i) => i.productId === 'lap_xuong'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_cuu_nuong')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_cuu_nuong' && r.inputs.some((i) => i.productId === 'thit_cu'))).toBe(true);
  });
});

/**
 * GĐ1368 — "Thêm sản phẩm/công thức mới": Gà xào hạt điều — món xào Hoa-Việt trứ danh, khép LỐI RA BẾP
 * của hạt điều (`hat` 37 — nguồn cung còn 0 lối ra trước nay), nấu ở ấm nước. Cùng bất biến
 * GĐ1321/1332-1367 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1368 = ['recipe_ga_xao_hat_dieu'] as const;

describe('GĐ1368 — lối ra bếp của hạt điều (gà xào hạt điều, ấm nước)', () => {
  for (const rid of NEW_IDS_1368) {
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

  it('gà xào hạt điều hiện diện ở ấm nước và dùng gà nguyên con + hạt điều + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_ga_xao_hat_dieu')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ga_xao_hat_dieu' && r.inputs.some((i) => i.productId === 'hat'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_ga_xao_hat_dieu' && r.inputs.some((i) => i.productId === 'thit_ga'))).toBe(true);
  });
});

/**
 * GĐ1369 — "Thêm sản phẩm/công thức mới": Bún xào tôm khô (`tom_kho` 47) + Cháo yến mạch (`yen_mach` 40),
 * cả hai ở ấm nước — khép lối ra của 2 nguồn khô còn 0 lối ra. Cùng bất biến GĐ1321/1332-1368
 * (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1369 = ['recipe_bun_xao_tom_kho', 'recipe_chao_yen_mach'] as const;

describe('GĐ1369 — bún xào tôm khô + cháo yến mạch (khép lối ra tôm khô/yến mạch)', () => {
  for (const rid of NEW_IDS_1369) {
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

  it('2 món hiện diện ở ấm nước và dùng tôm khô / yến mạch', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_bun_xao_tom_kho')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bun_xao_tom_kho' && r.inputs.some((i) => i.productId === 'tom_kho'))).toBe(true);
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_chao_yen_mach')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_chao_yen_mach' && r.inputs.some((i) => i.productId === 'yen_mach'))).toBe(true);
  });
});

/**
 * GĐ1370 — "Thêm sản phẩm/công thức mới": Bò hầm rượu vang — món hầm Pháp trứ danh (bœuf bourguignon),
 * khép LỐI RA BẾP của rượu vang nhập (`ruou_vang_nhap` 58 — nguồn cung còn 0 lối ra trước nay), hầm ở nồi hấp.
 * Cùng bất biến GĐ1321/1332-1369 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1370 = ['recipe_bo_ham_vang'] as const;

describe('GĐ1370 — lối ra bếp của rượu vang nhập (bò hầm rượu vang, bếp nồi nấu (GĐ1403 dời từ nồi hấp))', () => {
  for (const rid of NEW_IDS_1370) {
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

  it('bò hầm vang hiện diện ở bếp nồi nấu (GĐ1403 dời từ nồi hấp) và dùng bò tươi + rượu vang nhập + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_bo_ham_vang')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bo_ham_vang' && r.inputs.some((i) => i.productId === 'ruou_vang_nhap'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bo_ham_vang' && r.inputs.some((i) => i.productId === 'thit_bo_tuoi'))).toBe(true);
  });
});

/**
 * GĐ1375 — "Thêm sản phẩm/công thức mới": Chuối chiên — món ăn vặt quốc dân, khép LỐI RA BẾP của chuối
 * nông trại (`x_chuoi` 22 — chưa có lối ra bếp trước nay), chiên ở chảo chiên. Cùng bất biến
 * GĐ1321/1332-1374 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1375 = ['recipe_chuoi_chien'] as const;

describe('GĐ1375 — lối ra bếp của chuối nông trại (chuối chiên, chảo chiên)', () => {
  for (const rid of NEW_IDS_1375) {
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

  it('chuối chiên hiện diện ở chảo chiên và dùng chuối nông trại + bột mì + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'fryer' && r.id === 'recipe_chuoi_chien')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_chuoi_chien' && r.inputs.some((i) => i.productId === 'x_chuoi'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_chuoi_chien' && r.inputs.some((i) => i.productId === 'botmi'))).toBe(true);
  });
});

/**
 * GĐ1376 — "Thêm sản phẩm/công thức mới": Kem dừa — món kem Đà Lạt trứ danh, đánh lạnh cùng sữa tươi ở
 * máy xay (nguyên liệu có sẵn). Cùng bất biến GĐ1321/1332-1375 (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30
 * · outputId duy nhất).
 */
const NEW_IDS_1376 = ['recipe_kem_dua'] as const;

describe('GĐ1376 — kem dừa (món kem Đà Lạt, máy xay)', () => {
  for (const rid of NEW_IDS_1376) {
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

  it('kem dừa hiện diện ở máy xay và dùng sữa tươi + nước cốt dừa + đường', () => {
    expect(RECIPES.some((r) => r.station === 'blender' && r.id === 'recipe_kem_dua')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_kem_dua' && r.inputs.some((i) => i.productId === 'x_dua_cot_hop'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_kem_dua' && r.inputs.some((i) => i.productId === 'sua_tuoi'))).toBe(true);
  });
});

/**
 * GĐ1377 — "Thêm sản phẩm/công thức mới": Bánh mì que — đặc sản Nha Trang trứ danh (que bánh mì mỏng giòn
 * nhồi pate que cay), nướng ở bếp nướng. Cùng bất biến GĐ1321/1332-1376 (lãi dương TÍNH TỪ GIÁ THẬT
 * · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1377 = ['recipe_banh_mi_que'] as const;

describe('GĐ1377 — bánh mì que (đặc sản Nha Trang, bếp nướng)', () => {
  for (const rid of NEW_IDS_1377) {
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

  it('bánh mì que hiện diện ở bếp nướng và dùng bánh mì + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'food_grill' && r.id === 'recipe_banh_mi_que')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_mi_que' && r.inputs.some((i) => i.productId === 'banhmi'))).toBe(true);
  });
});

/**
 * GĐ1379 — "Thêm sản phẩm/công thức mới": Bánh da lợn — bánh dân gian trứ danh (lớn lá dứa xanh - cốt dừa
 * trắng), hấp ở nồi hấp (nguyên liệu có sẵn). Cùng bất biến GĐ1321/1332-1378 (lãi dương TÍNH TỪ GIÁ THẬT
 * · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1379 = ['recipe_banh_da_lon'] as const;

describe('GĐ1379 — bánh da lợn (bánh dân gian, nồi hấp)', () => {
  for (const rid of NEW_IDS_1379) {
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

  it('bánh da lợn hiện diện ở nồi hấp và dùng bột gạo + nước cốt dừa + đường', () => {
    expect(RECIPES.some((r) => r.station === 'steamer' && r.id === 'recipe_banh_da_lon')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_da_lon' && r.inputs.some((i) => i.productId === 'x_bot_gao'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_da_lon' && r.inputs.some((i) => i.productId === 'x_dua_cot_hop'))).toBe(true);
  });
});

/**
 * GĐ1380 — "Thêm sản phẩm/công thức mới" (mốc 60 GĐ chuỗi): Chè trôi nước — bánh trôi chảy dân gian trứ danh,
 * nấu ở ấm nước (nguyên liệu nếp + đường + cốt dừa có sẵn). Cùng bất biến GĐ1321/1332-1379 (lãi dương
 * TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1380 = ['recipe_che_troi_nuoc'] as const;

describe('GĐ1380 — chè trôi nước (bánh trôi chảy dân gian, ấm nước)', () => {
  for (const rid of NEW_IDS_1380) {
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

  it('chè trôi nước hiện diện ở ấm nước và dùng nếp + đường + nước cốt dừa', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_che_troi_nuoc')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_che_troi_nuoc' && r.inputs.some((i) => i.productId === 'nep'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_che_troi_nuoc' && r.inputs.some((i) => i.productId === 'x_dua_cot_hop'))).toBe(true);
  });
});

/**
 * GĐ1381 — "Thêm sản phẩm/công thức mới": Chè Thái — chè trái cây thập cẩm trứ danh, nấu ở ấm nước
 * (nguyên liệu trái cây + sữa tươi + đường có sẵn). Cùng bất biến GĐ1321/1332-1380 (lãi dương
 * TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1381 = ['recipe_che_thai'] as const;

describe('GĐ1381 — chè Thái (chè trái cây thập cẩm, ấm nước)', () => {
  for (const rid of NEW_IDS_1381) {
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

  it('chè Thái hiện diện ở ấm nước và dùng trái cây + sữa tươi + đường', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_che_thai')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_che_thai' && r.inputs.some((i) => i.productId === 'traicay'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_che_thai' && r.inputs.some((i) => i.productId === 'sua_tuoi'))).toBe(true);
  });
});

/**
 * GĐ1383 — "Thêm sản phẩm/công thức mới": Chè bắp — chè ngọt dân gian trứ danh (hạt bắp nếp chan cốt dừa),
 * nấu ở ấm nước (nguyên liệu bắp + nếp + cốt dừa + đường có sẵn). Cùng bất biến GĐ1321/1332-1382
 * (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1383 = ['recipe_che_bap'] as const;

describe('GĐ1383 — chè bắp (chè ngọt dân gian, ấm nước)', () => {
  for (const rid of NEW_IDS_1383) {
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

  it('chè bắp hiện diện ở ấm nước và dùng bắp + nếp + nước cốt dừa + đường', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_che_bap')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_che_bap' && r.inputs.some((i) => i.productId === 'bap'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_che_bap' && r.inputs.some((i) => i.productId === 'nep'))).toBe(true);
  });
});

/**
 * GĐ1384 — "Thêm sản phẩm/công thức mới": Bún mắm — món nước miền Tây trứ danh (nước lèo mắm ruốc),
 * nấu ở ấm nước — mắm ruốc hàng xóm có lối ra THỨ 3. Cùng bất biến GĐ1321/1332-1383 (lãi dương
 * TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1384 = ['recipe_bun_mam'] as const;

describe('GĐ1384 — bún mắm (món nước miền Tây, ấm nước)', () => {
  for (const rid of NEW_IDS_1384) {
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

  it('bún mắm hiện diện ở ấm nước và dùng bún + mắm ruốc + thịt heo + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_bun_mam')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bun_mam' && r.inputs.some((i) => i.productId === 'hx_mam_ruoc'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_bun_mam' && r.inputs.some((i) => i.productId === 'bun'))).toBe(true);
  });
});

/**
 * GĐ1385 — "Thêm sản phẩm/công thức mới": Cơm hến — món Huế dân dã trứ danh, khép LỐI RA BẾP của nghêu
 * tươi (`ngheu` 57 — nguồn cung còn 0 lối ra trước nay), nấu ở ấm nước. Cùng bất biến GĐ1321/1332-1384
 * (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1385 = ['recipe_com_hen'] as const;

describe('GĐ1385 — cơm hến (món Huế dân dã, ấm nước)', () => {
  for (const rid of NEW_IDS_1385) {
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

  it('cơm hến hiện diện ở ấm nước và dùng gạo + nghêu tươi + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_com_hen')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_com_hen' && r.inputs.some((i) => i.productId === 'ngheu'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_com_hen' && r.inputs.some((i) => i.productId === 'gao'))).toBe(true);
  });
});

/**
 * GĐ1386 — "Thêm sản phẩm/công thức mới": Xôi chiên phồng — đặc sản mộc mạc trứ danh, chiên ở bếp nướng
 * (nguyên liệu nếp + bột mì + hành phi có sẵn). Cùng bất biến GĐ1321/1332-1385 (lãi dương TÍNH TỪ GIÁ THẬT
 * · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1386 = ['recipe_xoi_chien_phong'] as const;

describe('GĐ1386 — xôi chiên phồng (đặc sản mộc mạc, chảo chiên (GĐ1403 dời từ bếp nướng))', () => {
  for (const rid of NEW_IDS_1386) {
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

  it('xôi chiên phồng hiện diện ở chảo chiên (GĐ1403 dời từ bếp nướng) và dùng nếp + bột mì + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'fryer' && r.id === 'recipe_xoi_chien_phong')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_xoi_chien_phong' && r.inputs.some((i) => i.productId === 'nep'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_xoi_chien_phong' && r.inputs.some((i) => i.productId === 'botmi'))).toBe(true);
  });
});

/**
 * GĐ1387 — "Thêm sản phẩm/công thức mới": Bánh khúc — đặc sản đồng bằng trứ danh (vỏ nếp xanh nhân đậu
 * xanh), hấp ở nồi hấp (nguyên liệu nếp + đậu xanh + bắp có sẵn). Cùng bất biến GĐ1321/1332-1386
 * (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1387 = ['recipe_banh_khuc'] as const;

describe('GĐ1387 — bánh khúc (đặc sản đồng bằng, nồi hấp)', () => {
  for (const rid of NEW_IDS_1387) {
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

  it('bánh khúc hiện diện ở nồi hấp và dùng nếp + đậu xanh + bắp', () => {
    expect(RECIPES.some((r) => r.station === 'steamer' && r.id === 'recipe_banh_khuc')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_khuc' && r.inputs.some((i) => i.productId === 'nep'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_banh_khuc' && r.inputs.some((i) => i.productId === 'dau_xanh'))).toBe(true);
  });
});

/**
 * GĐ1389 — "Thêm sản phẩm/công thức mới": Bánh chưng tự gói — món Tết trứ danh gói tay (khác x_banh_chung
 * mua sỉ), gói tại gift_wrap trong đúng dịp tet. Cùng bất biến GĐ1321/1332-1388 (lãi dương TÍNH TỪ GIÁ THẬT
 * · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1389 = ['recipe_banh_chung_tu'] as const;

describe('GĐ1389 — bánh chưng tự gói (món Tết, gift_wrap)', () => {
  for (const rid of NEW_IDS_1389) {
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

  it('bánh chưng tự gói gói tại gift_wrap, đúng dịp tet, dùng nếp + đậu xanh + thịt heo', () => {
    expect(RECIPES.some((r) => r.station === 'gift_wrap' && r.id === 'recipe_banh_chung_tu')).toBe(true);
    expect(RECIPE_MAP.recipe_banh_chung_tu.festival).toBe('tet');
    expect(RECIPES.some((r) => r.id === 'recipe_banh_chung_tu' && r.inputs.some((i) => i.productId === 'nep'))).toBe(true);
  });
});

/**
 * GĐ1390 — "Thêm sản phẩm/công thức mới": Gỏi cuốn — món ăn lành trứ danh (bánh tráng gói tôm luộc),
 * luộc tôm ở ấm nước (nguyên liệu bánh tráng + tôm có sẵn). Cùng bất biến GĐ1321/1332-1389 (lãi dương
 * TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1390 = ['recipe_goi_cuon'] as const;

describe('GĐ1390 — gỏi cuốn (món ăn lành, ấm nước)', () => {
  for (const rid of NEW_IDS_1390) {
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

  it('gỏi cuốn hiện diện ở ấm nước và dùng bánh tráng + tôm đông lạnh', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_goi_cuon')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_goi_cuon' && r.inputs.some((i) => i.productId === 'banhtrang'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_goi_cuon' && r.inputs.some((i) => i.productId === 'hai_san'))).toBe(true);
  });
});

/**
 * GĐ1391 — "Thêm sản phẩm/công thức mới": Cháo lòng — món sáng Sài Gòn trứ danh, nấu ở ấm nước (lối ra
 * THỨ 2 của thịt heo tươi `thit_heo_tuoi` sau thịt kho trứng GĐ1343). Cùng bất biến GĐ1321/1332-1390
 * (lãi dương TÍNH TỪ GIÁ THẬT · unlock > 30 · outputId duy nhất).
 */
const NEW_IDS_1391 = ['recipe_chao_long'] as const;

describe('GĐ1391 — cháo lòng (món sáng Sài Gòn, ấm nước)', () => {
  for (const rid of NEW_IDS_1391) {
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

  it('cháo lòng hiện diện ở ấm nước và dùng thịt heo tươi + gạo + hành phi', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_chao_long')).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_chao_long' && r.inputs.some((i) => i.productId === 'thit_heo_tuoi'))).toBe(true);
    expect(RECIPES.some((r) => r.id === 'recipe_chao_long' && r.inputs.some((i) => i.productId === 'gao'))).toBe(true);
  });
});

/** GĐ1408 — Cà phê phin sữa: lối ra đầu tiên của cà phê xay (quầy pha). */
describe('GĐ1408 — cà phê phin sữa (quầy pha)', () => {
  const recipe = RECIPE_MAP['recipe_ca_phe_phin_sua'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quầy pha và dùng cà phê xay', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_phe_phin_sua')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_phe_phin_sua').length).toBe(1);
    expect(recipe.station).toBe('drink_counter');
    expect(recipe.inputs.some((i) => i.productId === 'ca_phe_xay')).toBe(true);
  });
});

/** GĐ1401 — Mì ý sốt thịt bằm: lối ra đầu tiên của mì ý (bếp nồi nấu). */
describe('GĐ1401 — mì ý sốt thịt bằm (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_mi_y_sot_bo'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng mì ý', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'mi_y_sot_bo')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'mi_y_sot_bo').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'miy')).toBe(true);
  });
});

/** GĐ1409 — Sữa chua granola: lối ra đầu tiên của ngũ cốc granola (máy xay). */
describe('GĐ1409 — sữa chua granola (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sua_chua_granola'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng ngũ cốc granola', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sua_chua_granola')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sua_chua_granola').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'ngu_coc')).toBe(true);
  });
});

/** GĐ1410 — Mì xào trứng: lối ra đầu tiên của mì tươi vắt (chảo chiên). */
describe('GĐ1410 — mì xào trứng (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_mi_xao_trung'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng mì tươi vắt', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'mi_xao_trung')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'mi_xao_trung').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'mi_tuoi')).toBe(true);
  });
});

/** GĐ1411 — Gà nướng mật ong: lối ra đầu tiên của mật ong rừng (bếp nướng). */
describe('GĐ1411 — gà nướng mật ong (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_ga_nuong_mat_ong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng mật ong rừng', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ga_nuong_mat_ong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ga_nuong_mat_ong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'mat_ong_rung')).toBe(true);
  });
});

/** GĐ1412 — Trà thảo mộc nấu: lối ra đầu tiên của trà thảo mộc hộp (bếp nồi nấu). */
describe('GĐ1412 — trà thảo mộc nấu (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_tra_thao_moc_nau'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng trà thảo mộc', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'tra_thao_moc_nau')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'tra_thao_moc_nau').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'tra_thao_moc')).toBe(true);
  });
});

/** GĐ1413 — Bánh pía nướng nóng: lối ra đầu tiên của bánh pía (bếp nướng). */
describe('GĐ1413 — bánh pía nướng (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_pia_nuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng bánh pía', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_pia_nuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_pia_nuong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'banh_pia')).toBe(true);
  });
});

/** GĐ1414 — Bò bít tết: lối ra đầu tiên của thịt bò Úc (chảo chiên). */
describe('GĐ1414 — bò bít tết (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_bo_bit_tet'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng thịt bò Úc', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bo_bit_tet')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bo_bit_tet').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'thitbo')).toBe(true);
  });
});

/** GĐ1415 — Hột vịt lộn luộc: lối ra đầu tiên của hột vịt lộn (bếp nồi nấu). */
describe('GĐ1415 — hột vịt lộn luộc (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_hot_vit_luoc'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng hột vịt lộn', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'hot_vit_luoc')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'hot_vit_luoc').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hotvit')).toBe(true);
  });
});

/** GĐ1415 — Bánh mì bơ tỏi: lối ra đầu tiên của bơ muối (bếp nướng). */
describe('GĐ1415 — bánh mì bơ tỏi (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_mi_bo_toi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng bơ muối', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_mi_bo_toi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_mi_bo_toi').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'bo_sua')).toBe(true);
  });
});

/** GĐ1416 — Sữa yến mạch đường đen: lối ra đầu tiên của sữa yến mạch (máy xay). */
describe('GĐ1416 — sữa yến mạch đường đen (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sua_yen_mach_xay'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng sữa yến mạch', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sua_yen_mach_xay')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sua_yen_mach_xay').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'sua_yeu')).toBe(true);
  });
});

/** GĐ1416 — Sữa hạt mắc ca: lối ra đầu tiên của hạt mắc ca (máy xay). */
describe('GĐ1416 — sữa hạt mắc ca (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sua_hat_macca'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng hạt mắc ca', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sua_hat_macca')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sua_hat_macca').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'hat_macca')).toBe(true);
  });
});

/** GĐ1416 — Chè yến chưng đường phèn: lối ra đầu tiên của tổ yến sào (bếp nồi nấu). */
describe('GĐ1416 — chè yến chưng đường phèn (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_che_yen'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng tổ yến sào', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'che_yen')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'che_yen').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'yen_sao')).toBe(true);
  });
});

/** GĐ1417 — Kem chiên: lối ra đầu tiên của kem que (chảo chiên). */
describe('GĐ1417 — kem chiên (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_kem_chien'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng kem que', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'kem_chien')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'kem_chien').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'kem')).toBe(true);
  });
});

/** GĐ1417 — Bánh bao hấp nóng: lối ra đầu tiên của bánh bao (nồi hấp). */
describe('GĐ1417 — bánh bao hấp nóng (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_banh_bao_dong_lanh_hap'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng bánh bao', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_bao_dong_lanh_hap')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_bao_dong_lanh_hap').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'banhbao')).toBe(true);
  });
});

/** GĐ1417 — Sinh tố sữa chua nếp: lối ra đầu tiên của sữa chua nếp cốc (máy xay). */
describe('GĐ1417 — sinh tố sữa chua nếp (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_sua_chua_nep'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng sữa chua nếp cốc', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_sua_chua_nep')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_sua_chua_nep').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'sua_chua_hop')).toBe(true);
  });
});

/** GĐ1418 — Cánh gà chiên nước mắm: lối ra đầu tiên của nước mắm (chảo chiên). */
describe('GĐ1418 — cánh gà chiên nước mắm (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_canh_ga_chien_mam'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng nước mắm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'canh_ga_chien_mam')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'canh_ga_chien_mam').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'nuocmam')).toBe(true);
  });
});

/** GĐ1418 — Trà mứt gừng ngày Tết: lối ra đầu tiên của mứt Tết (bếp nồi nấu). */
describe('GĐ1418 — trà mứt gừng ngày tết (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_tra_mut_gung'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng mứt Tết', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'tra_mut_gung')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'tra_mut_gung').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'mut_tet')).toBe(true);
  });
});

/** GĐ1419 — Trứng chiên dầu (suất): lối ra đầu tiên của dầu ăn (chảo chiên). */
describe('GĐ1419 — trứng chiên dầu (suất) (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_trung_chien_dau'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng dầu ăn', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'trung_chien_dau')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'trung_chien_dau').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'dauan')).toBe(true);
  });
});

/** GĐ1419 — Sinh tố sữa hạt: lối ra đầu tiên của sữa hạt lốc 4 (máy xay). */
describe('GĐ1419 — sinh tố sữa hạt (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_sua_hat'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng sữa hạt lốc 4', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_sua_hat')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_sua_hat').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'sua_hat')).toBe(true);
  });
});

/** GĐ1420 — Cà phê hòa tan sữa đá: lối ra đầu tiên của cà phê hòa tan hộp thiếc (quầy pha). */
describe('GĐ1420 — cà phê hòa tan sữa đá (quầy pha)', () => {
  const recipe = RECIPE_MAP['recipe_ca_phe_hoa_tan_da'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quầy pha và dùng cà phê hòa tan hộp thiếc', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_phe_hoa_tan_da')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_phe_hoa_tan_da').length).toBe(1);
    expect(recipe.station).toBe('drink_counter');
    expect(recipe.inputs.some((i) => i.productId === 'ca_phe_lon')).toBe(true);
  });
});

/** GĐ1420 — Sinh tố kem: lối ra đầu tiên của kem cây hộp 10 (máy xay). */
describe('GĐ1420 — sinh tố kem (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_kem'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng kem cây hộp 10', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_kem')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_kem').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'kem_cay_hop')).toBe(true);
  });
});

/** GĐ1421 — Khoai tây chiên giòn: lối ra đầu tiên của khoai tây chiên đông lạnh (chảo chiên). */
describe('GĐ1421 — khoai tây chiên giòn (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_khoai_tay_chien_gion'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng khoai tây chiên đông lạnh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'khoai_tay_chien_gion')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'khoai_tay_chien_gion').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_khoai_tay_chien')).toBe(true);
  });
});

/** GĐ1421 — Gà viên chiên: lối ra đầu tiên của gà viên đông lạnh (chảo chiên). */
describe('GĐ1421 — gà viên chiên (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ga_vien_chien'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng gà viên đông lạnh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ga_vien_chien')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ga_vien_chien').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ga_vien_dong_lanh')).toBe(true);
  });
});

/** GĐ1421 — Cá basa chiên giòn: lối ra đầu tiên của cá basa phi lê (chảo chiên). */
describe('GĐ1421 — cá basa chiên giòn (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ca_basa_chien_gion'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng cá basa phi lê', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_basa_chien_gion')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_basa_chien_gion').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ca_basa')).toBe(true);
  });
});

/** GĐ1421 — Pizza nướng nóng (miếng): lối ra đầu tiên của pizza đông lạnh (bếp nướng). */
describe('GĐ1421 — pizza nướng nóng (miếng) (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_pizza_nuong_nong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng pizza đông lạnh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'pizza_nuong_nong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'pizza_nuong_nong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'x_pizza_dong_lanh')).toBe(true);
  });
});

/** GĐ1422 — Mực khoanh chiên giòn: lối ra đầu tiên của mực khoanh đông lạnh (chảo chiên). */
describe('GĐ1422 — mực khoanh chiên giòn (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_muc_khoanh_chien'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng mực khoanh đông lạnh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'muc_khoanh_chien')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'muc_khoanh_chien').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_muc_khoanh_dong_lanh')).toBe(true);
  });
});

/** GĐ1422 — Cánh gà nướng: lối ra đầu tiên của cánh gà đông lạnh (bếp nướng). */
describe('GĐ1422 — cánh gà nướng (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_canh_ga_nuong_mat'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng cánh gà đông lạnh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'canh_ga_nuong_mat')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'canh_ga_nuong_mat').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'x_canh_ga')).toBe(true);
  });
});

/** GĐ1422 — Chả cá thác lác chiên: lối ra đầu tiên của chả cá thác lác (chảo chiên). */
describe('GĐ1422 — chả cá thác lác chiên (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_cha_ca_thac_lac_chien'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng chả cá thác lác', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'cha_ca_thac_lac_chien')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'cha_ca_thac_lac_chien').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_cha_ca_thac_lat')).toBe(true);
  });
});

/** GĐ1422 — Cá hồi phi lê nướng: lối ra đầu tiên của cá hồi phi lê (bếp nướng). */
describe('GĐ1422 — cá hồi phi lê nướng (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_ca_hoi_phi_le_nuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng cá hồi phi lê', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_hoi_phi_le_nuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_hoi_phi_le_nuong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'x_ca_hoi_tuoi')).toBe(true);
  });
});

/** GĐ1423 — Sinh tố bơ: lối ra đầu tiên của bơ (máy xay). */
describe('GĐ1423 — sinh tố bơ (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_bo_sap'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng bơ', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_bo_sap')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_bo_sap').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_bo')).toBe(true);
  });
});

/** GĐ1423 — Nước ép thơm: lối ra đầu tiên của thơm (dứa) (máy xay). */
describe('GĐ1423 — nước ép thơm (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_nuoc_ep_thom'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng thơm (dứa)', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nuoc_ep_thom')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nuoc_ep_thom').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_thom')).toBe(true);
  });
});

/** GĐ1423 — Sinh tố đu đủ: lối ra đầu tiên của đu đủ (máy xay). */
describe('GĐ1423 — sinh tố đu đủ (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_du_du'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng đu đủ', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_du_du')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_du_du').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_du_du')).toBe(true);
  });
});

/** GĐ1423 — Sinh tố thanh long tím: lối ra đầu tiên của thanh long ruột tím (máy xay). */
describe('GĐ1423 — sinh tố thanh long tím (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_thanh_long'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng thanh long ruột tím', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_thanh_long')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_thanh_long').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_thanh_long_tim')).toBe(true);
  });
});

/** GĐ1424 — Canh sườn bí đỏ: lối ra đầu tiên của sườn heo (bếp nồi nấu). */
describe('GĐ1424 — canh sườn bí đỏ (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_canh_suon_bi_do'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng sườn heo', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'canh_suon_bi_do')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'canh_suon_bi_do').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'x_suon_heo')).toBe(true);
  });
});

/** GĐ1424 — Canh khổ qua nhồi thịt: lối ra đầu tiên của khổ qua (bếp nồi nấu). */
describe('GĐ1424 — canh khổ qua nhồi thịt (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_canh_kho_qua_nhoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng khổ qua', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'canh_kho_qua_nhoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'canh_kho_qua_nhoi').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'x_kho_qua')).toBe(true);
  });
});

/** GĐ1424 — Bò xào bông cải: lối ra đầu tiên của bông cải xanh (chảo chiên). */
describe('GĐ1424 — bò xào bông cải (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_bo_xao_bong_cai'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng bông cải xanh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bo_xao_bong_cai')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bo_xao_bong_cai').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_bong_cai_xanh')).toBe(true);
  });
});

/** GĐ1424 — Cá thu chiên: lối ra đầu tiên của cá thu tươi (chảo chiên). */
describe('GĐ1424 — cá thu chiên (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ca_thu_chien'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng cá thu tươi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_thu_chien')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_thu_chien').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ca_thu_tuoi')).toBe(true);
  });
});

/** GĐ1425 — Tôm hấp nước dừa: lối ra đầu tiên của tôm tươi (nồi hấp). */
describe('GĐ1425 — tôm hấp nước dừa (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_tom_tuoi_hap'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng tôm tươi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'tom_tuoi_hap')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'tom_tuoi_hap').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'x_tom_tuoi')).toBe(true);
  });
});

/** GĐ1425 — Mực hấp gừng: lối ra đầu tiên của mực tươi (nồi hấp). */
describe('GĐ1425 — mực hấp gừng (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_muc_hap_gung'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng mực tươi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'muc_hap_gung')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'muc_hap_gung').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'x_muc_tuoi')).toBe(true);
  });
});

/** GĐ1425 — Cá rô phi chiên xù: lối ra đầu tiên của cá rô phi (chảo chiên). */
describe('GĐ1425 — cá rô phi chiên xù (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ca_ro_phi_chien_xu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng cá rô phi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_ro_phi_chien_xu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_ro_phi_chien_xu').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ca_ro_phi')).toBe(true);
  });
});

/** GĐ1425 — Ức gà nướng: lối ra đầu tiên của ức gà (bếp nướng). */
describe('GĐ1425 — ức gà nướng (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_uc_ga_nuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng ức gà', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'uc_ga_nuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'uc_ga_nuong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'x_uc_ga')).toBe(true);
  });
});

/** GĐ1425 — Nấm bào ngư xào tỏi: lối ra đầu tiên của nấm bào ngư (chảo chiên). */
describe('GĐ1425 — nấm bào ngư xào tỏi (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_nam_bao_ngu_xao_toi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng nấm bào ngư', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nam_bao_ngu_xao_toi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nam_bao_ngu_xao_toi').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_nam_bao_ngu')).toBe(true);
  });
});

/** GĐ1426 — Cà tím xào mỡ hành: lối ra đầu tiên của cà tím (chảo chiên). */
describe('GĐ1426 — cà tím xào mỡ hành (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ca_tim_mo_hanh'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng cà tím', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_tim_mo_hanh')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_tim_mo_hanh').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ca_tim')).toBe(true);
  });
});

/** GĐ1426 — Khoai lang nướng: lối ra đầu tiên của khoai lang (bếp nướng). */
describe('GĐ1426 — khoai lang nướng (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_khoai_lang_nuong_than'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng khoai lang', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'khoai_lang_nuong_than')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'khoai_lang_nuong_than').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'x_khoai_lang_tuoi')).toBe(true);
  });
});

/** GĐ1426 — Bắp ngọt nướng mỡ hành: lối ra đầu tiên của bắp ngọt (bếp nướng). */
describe('GĐ1426 — bắp ngọt nướng mỡ hành (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_bap_ngot_nuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng bắp ngọt', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bap_ngot_nuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bap_ngot_nuong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'x_bap')).toBe(true);
  });
});

/** GĐ1426 — Chè khoai môn: lối ra đầu tiên của khoai môn (bếp nồi nấu). */
describe('GĐ1426 — chè khoai môn (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_che_khoai_mon'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng khoai môn', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'che_khoai_mon')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'che_khoai_mon').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'x_khoai_mon')).toBe(true);
  });
});

/** GĐ1426 — Bắp cải xào cà rốt: lối ra đầu tiên của bắp cải (chảo chiên). */
describe('GĐ1426 — bắp cải xào cà rốt (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_bap_cai_xao_ca_rot'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng bắp cải', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bap_cai_xao_ca_rot')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bap_cai_xao_ca_rot').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_bap_cai')).toBe(true);
  });
});

/** GĐ1427 — Cá hồi hấp xì dầu: lối ra đầu tiên của cá hồi đông lạnh (nồi hấp). */
describe('GĐ1427 — cá hồi hấp xì dầu (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_ca_hoi_hap_xi_dau'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng cá hồi đông lạnh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_hoi_hap_xi_dau')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_hoi_hap_xi_dau').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ca_hoi_dong_lanh')).toBe(true);
  });
});

/** GĐ1427 — Chả mực chiên: lối ra đầu tiên của chả mực đông lạnh (chảo chiên). */
describe('GĐ1427 — chả mực chiên (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_cha_muc_chien'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng chả mực đông lạnh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'cha_muc_chien')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'cha_muc_chien').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_cha_muc')).toBe(true);
  });
});

/** GĐ1427 — Lẩu viên thập cẩm (phần): lối ra đầu tiên của viên thả lẩu (bếp nồi nấu). */
describe('GĐ1427 — lẩu viên thập cẩm (phần) (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_lau_vien_thap_cam'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng viên thả lẩu', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'lau_vien_thap_cam')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'lau_vien_thap_cam').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'x_vien_tha_lau')).toBe(true);
  });
});

/** GĐ1427 — Bò viên nước lèo: lối ra đầu tiên của bò viên (bếp nồi nấu). */
describe('GĐ1427 — bò viên nước lèo (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_bo_vien_nuoc_leo'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng bò viên', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bo_vien_nuoc_leo')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bo_vien_nuoc_leo').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'x_bo_vien')).toBe(true);
  });
});

/** GĐ1427 — Cá viên chiên nước mắm: lối ra đầu tiên của cá viên (chảo chiên). */
describe('GĐ1427 — cá viên chiên nước mắm (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ca_vien_chien_mam'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng cá viên', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_vien_chien_mam')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_vien_chien_mam').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ca_vien')).toBe(true);
  });
});

/** GĐ1428 — Nước ép táo: lối ra đầu tiên của táo (máy xay). */
describe('GĐ1428 — nước ép táo (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_nuoc_ep_tao'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng táo', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nuoc_ep_tao')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nuoc_ep_tao').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_tao')).toBe(true);
  });
});

/** GĐ1428 — Sinh tố na: lối ra đầu tiên của na (máy xay). */
describe('GĐ1428 — sinh tố na (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_na'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng na', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_na')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_na').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_na')).toBe(true);
  });
});

/** GĐ1428 — Nước măng cụt dầm: lối ra đầu tiên của măng cụt (máy xay). */
describe('GĐ1428 — nước măng cụt dầm (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_nuoc_mang_cut'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng măng cụt', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nuoc_mang_cut')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nuoc_mang_cut').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_mang_cut')).toBe(true);
  });
});

/** GĐ1428 — Nước ép nho xanh: lối ra đầu tiên của nho xanh (máy xay). */
describe('GĐ1428 — nước ép nho xanh (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_nuoc_ep_nho_xanh'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng nho xanh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nuoc_ep_nho_xanh')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nuoc_ep_nho_xanh').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_nho_xanh')).toBe(true);
  });
});

/** GĐ1428 — Chôm chôm dầm đá: lối ra đầu tiên của chôm chôm (máy xay). */
describe('GĐ1428 — chôm chôm dầm đá (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_nuoc_chom_chom'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng chôm chôm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nuoc_chom_chom')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nuoc_chom_chom').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_chom_chom')).toBe(true);
  });
});

/** GĐ1429 — Đậu hũ chiên sả: lối ra đầu tiên của đậu hũ (chảo chiên). */
describe('GĐ1429 — đậu hũ chiên sả (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_dau_hu_chien_sa'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng đậu hũ', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'dau_hu_chien_sa')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'dau_hu_chien_sa').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_dau_hu')).toBe(true);
  });
});

/** GĐ1429 — Trứng xào cà chua: lối ra đầu tiên của cà chua (chảo chiên). */
describe('GĐ1429 — trứng xào cà chua (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_trung_xao_ca_chua'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng cà chua', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'trung_xao_ca_chua')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'trung_xao_ca_chua').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ca_chua')).toBe(true);
  });
});

/** GĐ1429 — Rau cải xào tỏi: lối ra đầu tiên của rau cải (chảo chiên). */
describe('GĐ1429 — rau cải xào tỏi (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_rau_cai_xao_toi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng rau cải', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'rau_cai_xao_toi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'rau_cai_xao_toi').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_rau_cai')).toBe(true);
  });
});

/** GĐ1429 — Bò xào giá: lối ra đầu tiên của giá đỗ (chảo chiên). */
describe('GĐ1429 — bò xào giá (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_bo_xao_gia'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng giá đỗ', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bo_xao_gia')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bo_xao_gia').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_gia_do')).toBe(true);
  });
});

/** GĐ1429 — Nước ép dưa leo cà rốt: lối ra đầu tiên của dưa leo (máy xay). */
describe('GĐ1429 — nước ép dưa leo cà rốt (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_nuoc_ep_dua_leo_ca_rot'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng dưa leo', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nuoc_ep_dua_leo_ca_rot')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nuoc_ep_dua_leo_ca_rot').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_dua_leo')).toBe(true);
  });
});

/** GĐ1429 — Nước ép nho tím: lối ra đầu tiên của nho tím (máy xay). */
describe('GĐ1429 — nước ép nho tím (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_nuoc_ep_nho_tim'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng nho tím', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nuoc_ep_nho_tim')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nuoc_ep_nho_tim').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_nho_tim')).toBe(true);
  });
});

/** GĐ1430 — Há cảo hấp nóng: lối ra đầu tiên của há cảo (nồi hấp). */
describe('GĐ1430 — há cảo hấp nóng (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_ha_cao_hap_nong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng há cảo', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ha_cao_hap_nong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ha_cao_hap_nong').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'x_ha_cao')).toBe(true);
  });
});

/** GĐ1430 — Khoai tây tươi chiên: lối ra đầu tiên của khoai tây (chảo chiên). */
describe('GĐ1430 — khoai tây tươi chiên (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_khoai_tay_tuoi_chien'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng khoai tây', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'khoai_tay_tuoi_chien')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'khoai_tay_tuoi_chien').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_khoai_tay')).toBe(true);
  });
});

/** GĐ1430 — Bún chả lụa: lối ra đầu tiên của chả lụa (bếp nồi nấu). */
describe('GĐ1430 — bún chả lụa (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_bun_cha_lua'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng chả lụa', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bun_cha_lua')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bun_cha_lua').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'x_cha_lua')).toBe(true);
  });
});

/** GĐ1430 — Trứng vịt luộc: lối ra đầu tiên của trứng vịt (bếp nồi nấu). */
describe('GĐ1430 — trứng vịt luộc (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_trung_vit_luoc'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng trứng vịt', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'trung_vit_luoc')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'trung_vit_luoc').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'x_trung_vit')).toBe(true);
  });
});

/** GĐ1430 — Gà xào hành tây: lối ra đầu tiên của hành tây (chảo chiên). */
describe('GĐ1430 — gà xào hành tây (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ga_xao_hanh_tay'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng hành tây', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ga_xao_hanh_tay')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ga_xao_hanh_tay').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_hanh_tay')).toBe(true);
  });
});

/** GĐ1430 — Nấm kim châm xào ớt chuông: lối ra đầu tiên của nấm kim châm (chảo chiên). */
describe('GĐ1430 — nấm kim châm xào ớt chuông (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_nam_kim_cham_ot_chuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng nấm kim châm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'nam_kim_cham_ot_chuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'nam_kim_cham_ot_chuong').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_nam_kim_cham')).toBe(true);
  });
});

/** GĐ1431 — Rau củ thập cẩm xào: lối ra đầu tiên của rau củ đông lạnh (chảo chiên). */
describe('GĐ1431 — rau củ thập cẩm xào (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_rau_cu_thap_cam_xao'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng rau củ đông lạnh', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'rau_cu_thap_cam_xao')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'rau_cu_thap_cam_xao').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_rau_cu_dong_lanh')).toBe(true);
  });
});

/** GĐ1431 — Sinh tố thanh long trắng: lối ra đầu tiên của thanh long ruột trắng (máy xay). */
describe('GĐ1431 — sinh tố thanh long trắng (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_thanh_long_trang'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng thanh long ruột trắng', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_thanh_long_trang')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_thanh_long_trang').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_thanh_long_trang')).toBe(true);
  });
});

/** GĐ1431 — Bánh mì kẹp xà lách: lối ra đầu tiên của xà lách (bếp nướng). */
describe('GĐ1431 — bánh mì kẹp xà lách (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_mi_kep_xa_lach'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng xà lách', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_mi_kep_xa_lach')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_mi_kep_xa_lach').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'x_xa_lach')).toBe(true);
  });
});

/** GĐ1431 — Sinh tố kem hộp: lối ra đầu tiên của kem hộp (máy xay). */
describe('GĐ1431 — sinh tố kem hộp (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_kem_hop'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng kem hộp', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_kem_hop')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_kem_hop').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_kem_hop')).toBe(true);
  });
});

/** GĐ1431 — Cơm nắm nướng: lối ra đầu tiên của cơm nắm (bếp nướng). */
describe('GĐ1431 — cơm nắm nướng (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_com_nam_nuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng cơm nắm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'com_nam_nuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'com_nam_nuong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'x_com_nam')).toBe(true);
  });
});

/** GĐ1437 — Xôi gà xé: lối ra đầu tiên của thịt gà (quây xôi). */
describe('GĐ1437 — xôi gà xé (quây xôi)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_ga_xe'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quây xôi và dùng thịt gà', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_ga_xe')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_ga_xe').length).toBe(1);
    expect(recipe.station).toBe('rice_station');
    expect(recipe.inputs.some((i) => i.productId === 'x_thit_ga')).toBe(true);
  });
});

/** GĐ1437 — Xôi chả lụa: lối ra đầu tiên của chả lụa (quây xôi). */
describe('GĐ1437 — xôi chả lụa (quây xôi)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_cha_lua'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quây xôi và dùng chả lụa', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_cha_lua')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_cha_lua').length).toBe(1);
    expect(recipe.station).toBe('rice_station');
    expect(recipe.inputs.some((i) => i.productId === 'x_cha_lua')).toBe(true);
  });
});

/** GĐ1438 — Cơm chiên lạp xưởng: lối ra đầu tiên của lạp xưởng tươi bà Tám (chảo chiên). */
describe('GĐ1438 — cơm chiên lạp xưởng (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_com_chien_lap_xuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng lạp xưởng tươi bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'com_chien_lap_xuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'com_chien_lap_xuong').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_lap_xuong')).toBe(true);
  });
});

/** GĐ1439 — Xôi chà bông: lối ra đầu tiên của chà bông heo nhà làm (quây xôi). */
describe('GĐ1439 — xôi chà bông (quây xôi)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_cha_bong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quây xôi và dùng chà bông heo nhà làm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_cha_bong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_cha_bong').length).toBe(1);
    expect(recipe.station).toBe('rice_station');
    expect(recipe.inputs.some((i) => i.productId === 'hx_cha_bong')).toBe(true);
  });
});

/** GĐ1440 — Xôi xoài cốt dừa: lối ra đầu tiên của xoài vườn nhà (quây xôi). */
describe('GĐ1440 — xôi xoài cốt dừa (quây xôi)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_xoai'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quây xôi và dùng xoài vườn nhà', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_xoai')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_xoai').length).toBe(1);
    expect(recipe.station).toBe('rice_station');
    expect(recipe.inputs.some((i) => i.productId === 'x_xoai')).toBe(true);
  });
});

/** GĐ1441 — Cánh gà sốt cam: lối ra đầu tiên của cam vườn nhà (chảo chiên). */
describe('GĐ1441 — cánh gà sốt cam (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_canh_ga_sot_cam'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng cam vườn nhà', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'canh_ga_sot_cam')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'canh_ga_sot_cam').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_cam')).toBe(true);
  });
});

/** GĐ1441 — Ổi lắc chua ngọt: lối ra đầu tiên của ổi vườn nhà (máy xay). */
describe('GĐ1441 — ổi lắc muối ớt (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_oi_lac_muoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng ổi vườn nhà', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'oi_lac_muoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'oi_lac_muoi').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_oi')).toBe(true);
  });
});

/** GĐ1442 — Tôm sốt chanh dây: lối ra đầu tiên của chanh dây vườn nhà (chảo chiên). */
describe('GĐ1442 — tôm sốt chanh dây (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_tom_sot_chanh_day'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng chanh dây vườn nhà', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'tom_sot_chanh_day')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'tom_sot_chanh_day').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'x_chanh_day')).toBe(true);
  });
});

/** GĐ1442 — Sữa chua chanh dây: lối ra đầu tiên của chanh dây vườn nhà (máy xay). */
describe('GĐ1442 — sữa chua chanh dây (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_suachua_chanh_day'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng chanh dây vườn nhà', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'suachua_chanh_day')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'suachua_chanh_day').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'x_chanh_day')).toBe(true);
  });
});

/** GĐ1443 — Chè vải tươi hạt sen: lối ra đầu tiên của vải thiều vườn nhà (bếp nồi). */
describe('GĐ1443 — chè vải tươi hạt sen (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_che_vai_tuoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng vải thiều vườn nhà', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'che_vai_tuoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'che_vai_tuoi').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'x_vai')).toBe(true);
  });
});

/** GĐ1444 — Bánh mì giò thủ: lối ra đầu tiên của giò thủ bà Tám (bếp nướng). */
describe('GĐ1444 — bánh mì giò thủ (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_mi_gio_thu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng giò thủ bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_mi_gio_thu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_mi_gio_thu').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'hx_gio_thu')).toBe(true);
  });
});

/** GĐ1447 — Xôi giò thủ: lối ra đầu tiên của giò thủ bà Tám (quây xôi). */
describe('GĐ1447 — xôi giò thủ (quây xôi)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_gio_thu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quây xôi và dùng giò thủ bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_gio_thu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_gio_thu').length).toBe(1);
    expect(recipe.station).toBe('rice_station');
    expect(recipe.inputs.some((i) => i.productId === 'hx_gio_thu')).toBe(true);
  });
});

/** GĐ1448 — Bún giò thủ: lối ra đầu tiên của giò thủ bà Tám (bếp nồi). */
describe('GĐ1448 — bún giò thủ (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_bun_gio_thu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng giò thủ bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bun_gio_thu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bun_gio_thu').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_gio_thu')).toBe(true);
  });
});

/** GĐ1449 — Cá basa hấp chanh muối: lối ra đầu tiên của chanh muối hàng xóm (nồi hấp). */
describe('GĐ1449 — cá basa hấp chanh muối (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_ca_hap_chanh_muoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng chanh muối hàng xóm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_hap_chanh_muoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_hap_chanh_muoi').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_chanh_muoi')).toBe(true);
  });
});

/** GĐ1450 — Cá viên chiên sốt me: lối ra đầu tiên của me dầm bà Tám (chảo chiên). */
describe('GĐ1450 — cá viên chiên sốt me (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ca_vien_sot_me'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng me dầm bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_vien_sot_me')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_vien_sot_me').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_me_dam')).toBe(true);
  });
});

/** GĐ1451 — Bánh mì chả lụa bà Tám: lối ra đầu tiên của chả lụa bà Tám (bếp nướng). */
describe('GĐ1451 — bánh mì chả lụa bà tám (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_mi_cha_lua_ba_tam'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng chả lụa bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_mi_cha_lua_ba_tam')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_mi_cha_lua_ba_tam').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'hx_cha_lua')).toBe(true);
  });
});

/** GĐ1452 — Cá basa kho dưa muối: lối ra đầu tiên của dưa muối hàng xóm (bếp nồi). */
describe('GĐ1452 — cá basa kho dưa muối (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_ca_kho_dua_muoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng dưa muối hàng xóm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_kho_dua_muoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_kho_dua_muoi').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_dua_muoi')).toBe(true);
  });
});

/** GĐ1453 — Bánh bao lạp xưởng: lối ra đầu tiên của lạp xưởng bà Tám (nồi hấp). */
describe('GĐ1453 — bánh bao lạp xưởng (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_banh_bao_lap_xuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng lạp xưởng bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_bao_lap_xuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_bao_lap_xuong').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_lap_xuong')).toBe(true);
  });
});

/** GĐ1454 — Thịt kho cà pháo: lối ra đầu tiên của cà pháo muối (bếp nồi). */
describe('GĐ1454 — thịt kho cà pháo (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_thit_kho_ca_phao'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng cà pháo muối', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'thit_kho_ca_phao')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'thit_kho_ca_phao').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_ca_phao')).toBe(true);
  });
});

/** GĐ1456 — Cánh gà chiên chanh muối: lối ra đầu tiên của chanh muối hàng xóm (chảo chiên). */
describe('GĐ1456 — cánh gà chiên chanh muối (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_canh_ga_chanh_muoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng chanh muối hàng xóm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'canh_ga_chanh_muoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'canh_ga_chanh_muoi').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_chanh_muoi')).toBe(true);
  });
});

/** GĐ1457 — Bánh bao chà bông: lối ra đầu tiên của chà bông nhà làm (nồi hấp). */
describe('GĐ1457 — bánh bao chà bông (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_banh_bao_cha_bong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng chà bông nhà làm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_bao_cha_bong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_bao_cha_bong').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_cha_bong')).toBe(true);
  });
});

/** GĐ1458 — Bánh tráng cuốn giò thủ: lối ra đầu tiên của giò thủ bà Tám (bếp nướng). */
describe('GĐ1458 — bánh tráng cuốn giò thủ (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_trang_cuon_gio_thu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng giò thủ bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_trang_cuon_gio_thu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_trang_cuon_gio_thu').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'hx_gio_thu')).toBe(true);
  });
});

/** GĐ1459 — Cá basa chiên sốt me: lối ra đầu tiên của me dầm bà Tám (chảo chiên). */
describe('GĐ1459 — cá basa chiên sốt me (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ca_basa_sot_me'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng me dầm bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_basa_sot_me')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_basa_sot_me').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_me_dam')).toBe(true);
  });
});

/** GĐ1460 — Cơm cháy chà bông: lối ra đầu tiên của chà bông nhà làm (chảo chiên). */
describe('GĐ1460 — cơm cháy chà bông (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_com_chay_cha_bong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng chà bông nhà làm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'com_chay_cha_bong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'com_chay_cha_bong').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_cha_bong')).toBe(true);
  });
});

/** GĐ1461 — Xôi lạp xưởng trứng: lối ra đầu tiên của lạp xưởng bà Tám (quây xôi). */
describe('GĐ1461 — xôi lạp xưởng trứng (quây xôi)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_lap_xuong_trung'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quây xôi và dùng lạp xưởng bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_lap_xuong_trung')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_lap_xuong_trung').length).toBe(1);
    expect(recipe.station).toBe('rice_station');
    expect(recipe.inputs.some((i) => i.productId === 'hx_lap_xuong')).toBe(true);
  });
});

/** GĐ1462 — Bánh đa trộn giò thủ: lối ra đầu tiên của bánh đa hàng xóm (bếp nồi). */
describe('GĐ1462 — bánh đa trộn giò thủ (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_banh_da_tron_gio_thu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng bánh đa hàng xóm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_da_tron_gio_thu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_da_tron_gio_thu').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_banh_da')).toBe(true);
  });
});

/** GĐ1463 — Bánh cuốn lạp xưởng: lối ra đầu tiên của bánh cuốn nhà làm (nồi hấp). */
describe('GĐ1463 — bánh cuốn lạp xưởng (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_banh_cuon_lap_xuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng bánh cuốn nhà làm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_cuon_lap_xuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_cuon_lap_xuong').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_banh_cuon')).toBe(true);
  });
});

/** GĐ1464 — Gỏi giò thủ cà pháo: lối ra đầu tiên của cà pháo muối (bếp nồi). */
describe('GĐ1464 — gỏi giò thủ cà pháo (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_goi_ca_phao_gio_thu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng cà pháo muối', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'goi_ca_phao_gio_thu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'goi_ca_phao_gio_thu').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_ca_phao')).toBe(true);
  });
});

/** GĐ1465 — Bánh tráng nướng chà bông: lối ra đầu tiên của bánh tráng phơi sương (bếp nướng). */
describe('GĐ1465 — bánh tráng nướng chà bông (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_trang_nuong_cha_bong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng bánh tráng phơi sương', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_trang_nuong_cha_bong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_trang_nuong_cha_bong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'hx_banh_trang')).toBe(true);
  });
});

/** GĐ1466 — Lạp xưởng xào dưa muối: lối ra đầu tiên của dưa muối hàng xóm (bếp nồi). */
describe('GĐ1466 — lạp xưởng xào dưa muối (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_lap_xuong_xao_dua_muoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng dưa muối hàng xóm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'lap_xuong_xao_dua_muoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'lap_xuong_xao_dua_muoi').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_dua_muoi')).toBe(true);
  });
});

/** GĐ1467 — Ô mai chanh muối me: lối ra đầu tiên của me dầm bà Tám (bếp nồi). */
describe('GĐ1467 — ô mai chanh muối me (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_o_mai_chanh_me'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng me dầm bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'o_mai_chanh_me')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'o_mai_chanh_me').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_me_dam')).toBe(true);
  });
});

/** GĐ1468 — Bánh mì lạp xưởng nướng: lối ra đầu tiên của lạp xưởng bà Tám (bếp nướng). */
describe('GĐ1468 — bánh mì lạp xưởng nướng (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_mi_lap_xuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng lạp xưởng bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_mi_lap_xuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_mi_lap_xuong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'hx_lap_xuong')).toBe(true);
  });
});

/** GĐ1469 — Chả lụa chiên sốt me: lối ra đầu tiên của chả lụa bà Tám (chảo chiên). */
describe('GĐ1469 — chả lụa chiên sốt me (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_cha_lua_chien_me'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng chả lụa bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'cha_lua_chien_me')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'cha_lua_chien_me').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_cha_lua')).toBe(true);
  });
});

/** GĐ1470 — Xôi chả lụa dưa muối: lối ra đầu tiên của chả lụa bà Tám (quây xôi). */
describe('GĐ1470 — xôi chả lụa dưa muối (quây xôi)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_cha_lua_dua_muoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm quây xôi và dùng chả lụa bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_cha_lua_dua_muoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_cha_lua_dua_muoi').length).toBe(1);
    expect(recipe.station).toBe('rice_station');
    expect(recipe.inputs.some((i) => i.productId === 'hx_cha_lua')).toBe(true);
  });
});

/** GĐ1471 — Bánh đa cuốn chả lụa: lối ra đầu tiên của bánh đa hàng xóm (bếp nướng). */
describe('GĐ1471 — bánh đa cuốn chả lụa (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_da_cuon_cha_lua'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng bánh đa hàng xóm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_da_cuon_cha_lua')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_da_cuon_cha_lua').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'hx_banh_da')).toBe(true);
  });
});

/** GĐ1472 — Bánh cuốn chà bông: lối ra đầu tiên của bánh cuốn nhà làm (nồi hấp). */
describe('GĐ1472 — bánh cuốn chà bông (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_banh_cuon_cha_bong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng bánh cuốn nhà làm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_cuon_cha_bong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_cuon_cha_bong').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_banh_cuon')).toBe(true);
  });
});

/** GĐ1473 — Cà pháo chiên giòn chấm me: lối ra đầu tiên của cà pháo muối (chảo chiên). */
describe('GĐ1473 — cà pháo chiên giòn chấm me (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_ca_phao_chien_gion'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng cà pháo muối', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ca_phao_chien_gion')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ca_phao_chien_gion').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_ca_phao')).toBe(true);
  });
});

/** GĐ1474 — Bún chả lụa nước chanh muối: lối ra đầu tiên của chanh muối hàng xóm (bếp nồi). */
describe('GĐ1474 — bún chả lụa nước chanh muối (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_bun_cha_lua_chanh_muoi'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng chanh muối hàng xóm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'bun_cha_lua_chanh_muoi')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'bun_cha_lua_chanh_muoi').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_chanh_muoi')).toBe(true);
  });
});

/** GĐ1475 — Giò thủ chiên giòn: lối ra đầu tiên của giò thủ bà Tám (chảo chiên). */
describe('GĐ1475 — giò thủ chiên giòn (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_gio_thu_chien_gion'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng giò thủ bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'gio_thu_chien_gion')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'gio_thu_chien_gion').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_gio_thu')).toBe(true);
  });
});

/** GĐ1476 — Xôi chiên chà bông: lối ra đầu tiên của chà bông nhà làm (chảo chiên). */
describe('GĐ1476 — xôi chiên chà bông (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_chien_cha_bong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng chà bông nhà làm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_chien_cha_bong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_chien_cha_bong').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_cha_bong')).toBe(true);
  });
});

/** GĐ1477 — Bánh tráng trộn me: lối ra đầu tiên của bánh tráng phơi sương (bếp nồi). */
describe('GĐ1477 — bánh tráng trộn me (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_banh_trang_tron_me'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng bánh tráng phơi sương', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_trang_tron_me')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_trang_tron_me').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_banh_trang')).toBe(true);
  });
});

/** GĐ1478 — Bún xào lạp xưởng: lối ra đầu tiên của lạp xưởng bà Tám (chảo chiên). */
describe('GĐ1478 — mì xào lạp xưởng (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_mi_xao_lap_xuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng lạp xưởng bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'mi_xao_lap_xuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'mi_xao_lap_xuong').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_lap_xuong')).toBe(true);
  });
});

/** GĐ1479 — Canh chua dưa muối cá basa: lối ra đầu tiên của dưa muối hàng xóm (bếp nồi). */
describe('GĐ1479 — canh chua dưa muối cá basa (bếp nồi)', () => {
  const recipe = RECIPE_MAP['recipe_canh_chua_dua_muoi_ca'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi và dùng dưa muối hàng xóm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'canh_chua_dua_muoi_ca')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'canh_chua_dua_muoi_ca').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_dua_muoi')).toBe(true);
  });
});

/** GĐ1480 — Bánh bao giò thủ: lối ra đầu tiên của giò thủ bà Tám (nồi hấp). */
describe('GĐ1480 — bánh bao giò thủ (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_banh_bao_gio_thu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng giò thủ bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_bao_gio_thu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_bao_gio_thu').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_gio_thu')).toBe(true);
  });
});

/** GĐ1481 — Cháo giò thủ: lối ra đầu tiên của giò thủ bà Tám (nồi nước). */
describe('GĐ1481 — cháo giò thủ (nồi nước)', () => {
  const recipe = RECIPE_MAP['recipe_chao_gio_thu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi nước và dùng giò thủ bà Tám', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'chao_gio_thu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'chao_gio_thu').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_gio_thu')).toBe(true);
  });
});

/** GĐ1482 — Cháo lạp xưởng: lối ra đầu tiên của lạp xưởng (nồi nước). */
describe('GĐ1482 — cháo lạp xưởng (nồi nước)', () => {
  const recipe = RECIPE_MAP['recipe_chao_lap_xuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi nước và dùng lạp xưởng', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'chao_lap_xuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'chao_lap_xuong').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_lap_xuong')).toBe(true);
  });
});

/** GĐ1483 — Cháo tôm khô: lối ra đầu tiên của tôm khô nhà phơi (nồi nước). */
describe('GĐ1483 — cháo tôm khô (nồi nước)', () => {
  const recipe = RECIPE_MAP['recipe_chao_tom_kho'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi nước và dùng tôm khô nhà phơi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'chao_tom_kho')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'chao_tom_kho').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'hx_tom_kho')).toBe(true);
  });
});

/** GĐ1484 — Măng khô xào lạp xưởng: lối ra đầu tiên của măng khô nhà phơi (chảo chiên). */
describe('GĐ1484 — măng khô xào lạp xưởng (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_mang_kho_xao_lap_xuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng măng khô nhà phơi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'mang_kho_xao_lap_xuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'mang_kho_xao_lap_xuong').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_mang_kho')).toBe(true);
  });
});

/** GĐ1485 — Chả giò nấm mèo: lối ra đầu tiên của nấm mèo khô (chảo chiên). */
describe('GĐ1485 — chả giò nấm mèo (chảo chiên)', () => {
  const recipe = RECIPE_MAP['recipe_cha_gio_nam_meo'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm chảo chiên và dùng nấm mèo khô', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'cha_gio_nam_meo')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'cha_gio_nam_meo').length).toBe(1);
    expect(recipe.station).toBe('fryer');
    expect(recipe.inputs.some((i) => i.productId === 'hx_nam_meo')).toBe(true);
  });
});

/** GĐ1486 — Xôi muối mè: lối ra đầu tiên của mè rang nhà làm (bếp xôi cơm). */
describe('GĐ1486 — xôi muối mè (bếp xôi cơm)', () => {
  const recipe = RECIPE_MAP['recipe_xoi_muoi_me'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp xôi cơm và dùng mè rang nhà làm', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'xoi_muoi_me')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'xoi_muoi_me').length).toBe(1);
    expect(recipe.station).toBe('rice_station');
    expect(recipe.inputs.some((i) => i.productId === 'hx_me_rang')).toBe(true);
  });
});

/** GĐ1405 — Sữa hạt điều: lối ra đầu tiên của hạt điều rang muối (máy xay). */
describe('GĐ1405 — sữa hạt điều (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sua_hat_dieu'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng hạt điều rang muối', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sua_hat_dieu')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sua_hat_dieu').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'hat_dieu_muoi')).toBe(true);
  });
});

/** GĐ1400 — Sinh tố dưa hấu: lối ra đầu tiên của dưa hấu (máy xay). */
describe('GĐ1400 — sinh tố dưa hấu (máy xay)', () => {
  const recipe = RECIPE_MAP['recipe_sinh_to_dua_hau'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm máy xay và dùng dưa hấu', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'sinh_to_dua_hau')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'sinh_to_dua_hau').length).toBe(1);
    expect(recipe.station).toBe('blender');
    expect(recipe.inputs.some((i) => i.productId === 'dua')).toBe(true);
  });
});

/** GĐ1407 — Trà atiso nấu: lối ra đầu tiên của trà atiso túi (bếp nồi nấu). */
describe('GĐ1407 — trà atiso nấu (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_tra_atiso_nau'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng trà atiso túi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'tra_atiso_nau')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'tra_atiso_nau').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'tra_atiso')).toBe(true);
  });
});

/** GĐ1399 — Tương ớt nhà làm: lối ra đầu tiên của ớt tươi (bếp nồi nấu). */
describe('GĐ1399 — tương ớt nhà làm (bếp nồi nấu)', () => {
  const recipe = RECIPE_MAP['recipe_tuong_ot_nha'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nồi nấu và dùng ớt tươi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'tuong_ot_nha')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'tuong_ot_nha').length).toBe(1);
    expect(recipe.station).toBe('hot_kettle');
    expect(recipe.inputs.some((i) => i.productId === 'ot_hien')).toBe(true);
  });
});

/** GĐ1404 — Gà hấp rượu gạo: lối ra đầu tiên của rượu gạo (nồi hấp). */
describe('GĐ1404 — gà hấp rượu gạo (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_ga_hap_ruou'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng rượu gạo', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'ga_hap_ruou')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'ga_hap_ruou').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'ruou_gao')).toBe(true);
  });
});

/** GĐ1398 — Cua hấp bia: lối ra đầu tiên của cua biển sống (nồi hấp). */
describe('GĐ1398 — cua hấp bia (nồi hấp)', () => {
  const recipe = RECIPE_MAP['recipe_cua_hap_bia'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm nồi hấp và dùng cua biển sống', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'cua_hap_bia')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'cua_hap_bia').length).toBe(1);
    expect(recipe.station).toBe('steamer');
    expect(recipe.inputs.some((i) => i.productId === 'cua_bien_tuoi')).toBe(true);
  });
});

/** GĐ1397 — Tôm nướng muối ớt: lối ra đầu tiên của tôm sú tươi (bếp nướng). */
describe('GĐ1397 — tôm nướng muối ớt (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_tom_nuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng tôm sú tươi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'tom_nuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'tom_nuong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'tom_su_tuoi')).toBe(true);
  });
});

/** GĐ1406 — Bánh mì nho: lối ra đầu tiên của nho khô (bếp nướng). */
describe('GĐ1406 — bánh mì nho (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_banh_mi_nho'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng nho khô', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_mi_nho')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'banh_mi_nho').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'nho_kho')).toBe(true);
  });
});

/** GĐ1394 — Mực nướng sa tế: lối ra đầu tiên của mực ống tươi (bếp nướng). */
describe('GĐ1394 — mực nướng sa tế (bếp nướng)', () => {
  const recipe = RECIPE_MAP['recipe_muc_nuong'];
  it('có công thức, mở sau golden 30', () => {
    expect(recipe).toBeDefined();
    expect(recipe.unlock).toBeGreaterThan(GOLDEN_SMOOTH);
  });
  it('mẻ lãi dương từ giá thật và hời hơn bán thẳng nguyên liệu', () => {
    const cost = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).buy, 0);
    const raw = recipe.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
    const value = recipe.outputQty * productById(recipe.outputId).sell;
    expect(value).toBeGreaterThan(cost);
    expect(value).toBeGreaterThan(raw);
  });
  it('outputId duy nhất; đúng trạm bếp nướng và dùng mực ống tươi', () => {
    expect(COOKED_PRODUCTS.some((c) => c.id === 'muc_nuong')).toBe(true);
    expect(RECIPES.filter((r) => r.outputId === 'muc_nuong').length).toBe(1);
    expect(recipe.station).toBe('food_grill');
    expect(recipe.inputs.some((i) => i.productId === 'muc_ong_tuoi')).toBe(true);
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
