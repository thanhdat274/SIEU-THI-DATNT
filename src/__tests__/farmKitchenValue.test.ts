import { describe, expect, it } from 'vitest';
import {
  homegrownRecipeDecision, farmVsCook, cookableProducts, ingredientQty,
} from '../data/farmKitchenValue';
import { RECIPES, type Recipe } from '../data/recipes';
import { homegrownSell } from '../data/farmValue';

// Giá trị chính xác (từ dữ liệu thật) — khớp homegrownSell = round(sell × 1,2).
const hg = { rau: 19200, bap: 14400, mia: 21600, traicay: 45600, trung: 39600 };
expect(hg.rau).toBe(homegrownSell('rau'));
expect(hg.traicay).toBe(homegrownSell('traicay'));
expect(hg.trung).toBe(homegrownSell('trung'));

describe('ingredientQty', () => {
  it('trả đúng lượng nguyên liệu, 0 khi không phải nguyên liệu', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_nuoc_mia')!;
    expect(ingredientQty(r, 'mia')).toBe(4);
    expect(ingredientQty(r, 'rau')).toBe(0);
  });
});

describe('homegrownRecipeDecision', () => {
  it('trả null khi nông sản không phải nguyên liệu món', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_nuoc_mia')!;
    expect(homegrownRecipeDecision(r, 'trung')).toBeNull();
  });

  it('nước mía: dùng 4 mía, bán lẻ lot 86400, lãi món tính theo cơ hội phí nhà trồng = 4600', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_nuoc_mia')!;
    const d = homegrownRecipeDecision(r, 'mia')!;
    expect(d.recipe.id).toBe('recipe_nuoc_mia');
    expect(d.quantity).toBe(4);
    expect(d.sellLot).toBe(86400);            // 21600 × 4
    expect(d.grossBeforeOwn).toBe(91000);     // nuoc_mia doanh thu 9100×10, không nguyên liệu khác
    expect(d.homegrownNet).toBe(4600);
    expect(d.deltaVsSell).toBe(4600);
    expect(d.verdict).toBe('cook');           // nấu vẫn lời hơn bán lẻ, nhưng mỏng
  });

  it('cơm sườn với rau: rau bõ nhất ở đây, lãi món 501600 (món lãi to nhất cho rau)', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_com_suon')!; // rau qty 2
    const d = homegrownRecipeDecision(r, 'rau')!;
    expect(d.quantity).toBe(2);
    expect(d.sellLot).toBe(38400);            // 19200 × 2
    expect(d.grossBeforeOwn).toBe(540000);    // com_suon 22000×50 − (gao 80000 + thit 8×60000=480000)
    expect(d.homegrownNet).toBe(501600);
    expect(d.verdict).toBe('cook');
  });

  it('bánh tráng với trái cây: lãi món 15600 — mỏng hơn nhiều so với bán lẻ trái cây 45600/lot', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_banh_trang')!;
    const d = homegrownRecipeDecision(r, 'traicay')!;
    expect(d.quantity).toBe(1);
    expect(d.sellLot).toBe(45600);
    expect(d.grossBeforeOwn).toBe(61200);     // banh_trang 12700×6 − banhtrang 3×8000=24000
    expect(d.homegrownNet).toBe(15600);
    expect(d.verdict).toBe('cook');
  });

  it('lãi món >0 nghĩa là nấu vẫn hời hơn bán lẻ (kể cả khi đã cộng nhãn nhà trồng)', () => {
    // Mọi công thức dùng nông sản nhà trồng — kiểm tra tất cả đều 'cook' (bếp luôn cộng thêm giá trị).
    const rauRecipes = RECIPES.filter((r) => r.inputs.some((i) => i.productId === 'rau'));
    expect(rauRecipes.length).toBeGreaterThan(0);
    for (const r of rauRecipes) {
      expect(homegrownRecipeDecision(r, 'rau')!.verdict).toBe('cook');
      expect(homegrownRecipeDecision(r, 'rau')!.homegrownNet).toBeGreaterThan(0);
    }
  });
});

describe('GĐ1044 — homegrownRecipeDecision: verdict SELL / EVEN (nhánh <02 và ==0, dòng 62)', () => {
  // Mọi công thức thật đều 'cook' (bếp luôn cộng giá trị) nên <0 và ==0 chưa từng chạy;
  // dựng món TỰ CHẾ với số thật để buộc chạy đúng ý — "bán lẻ hời hơn nấu" / "ngang".
  it('rau qty1 → bán lẻ (19200) hời hơn nấu món bán chín 5000 → verdict sell', () => {
    const r = {
      id: 't_sell', name: 'Món lỗ', station: 'food_grill',
      inputs: [{ productId: 'rau', quantity: 1 }],
      outputId: 'mi', outputQty: 1, durationMin: 1, unlock: 1, reputationGain: 0,
    } satisfies Recipe;
    const d = homegrownRecipeDecision(r, 'rau')!;
    expect(d.sellLot).toBe(19200);       // homegrownSell('rau') × 1
    expect(d.grossBeforeOwn).toBe(5000); // mi bán 5000, không nguyên liệu khác
    expect(d.homegrownNet).toBe(-14200);
    expect(d.verdict).toBe('sell');
  });

  it('rau qty5 bán 96000 = nấu chín rau qty6 bán 96000 → verdict even (Δ0)', () => {
    // rau sell 16000, homegrownSell 16000×1.2=19200; outRev 16000×6 = 96000 = sellLot 19200×5
    const r = {
      id: 't_even', name: 'Món cân bằng', station: 'food_grill',
      inputs: [{ productId: 'rau', quantity: 5 }],
      outputId: 'rau', outputQty: 6, durationMin: 1, unlock: 1, reputationGain: 0,
    } satisfies Recipe;
    const d = homegrownRecipeDecision(r, 'rau')!;
    expect(d.sellLot).toBe(96000);
    expect(d.grossBeforeOwn).toBe(96000);
    expect(d.homegrownNet).toBe(0);
    expect(d.verdict).toBe('even');
  });
});

describe('farmVsCook', () => {
  it('rau: best là cơm sườn (+501600), verdict cook', () => {
    const f = farmVsCook('rau');
    expect(f.sellPerUnit).toBe(19200);
    expect(f.best!.recipe.id).toBe('recipe_com_suon');
    expect(f.best!.homegrownNet).toBe(501600);
    expect(f.verdict).toBe('cook');
    // 7 công thức rau (GĐ1094 thêm hột vịt lộn, gà Đông Tảo nướng; GĐ1322 thêm bóp gỏi khô bò, bánh cuốn chả lụa):
    // cơm sườn, cơm hộp, gà DT nướng, bóp gỏi khô bò, canh, bánh cuốn chả lụa, hột vịt lộn — sắp lãi giảm dần
    expect(f.recipes.map((d) => d.recipe.id)).toEqual(['recipe_com_suon', 'recipe_com_hop_ga', 'recipe_ga_dt_nuong', 'recipe_bo_gio_kho_bo', 'recipe_canh', 'recipe_banh_cuon_cha_lua', 'recipe_hot_vit_lon']);
  });

  it('trứng: best là bánh bao (+148400), verdict cook', () => {
    const f = farmVsCook('trung');
    expect(f.sellPerUnit).toBe(39600);
    expect(f.best!.recipe.id).toBe('recipe_banh_bao');
    expect(f.best!.homegrownNet).toBe(148400);
    expect(f.verdict).toBe('cook');
  });

  it('mía: chỉ 1 món nước mía, verdict cook (lãi mỏng 4600)', () => {
    const f = farmVsCook('mia');
    expect(f.recipes).toHaveLength(1);
    expect(f.recipes[0].recipe.id).toBe('recipe_nuoc_mia');
    expect(f.best!.homegrownNet).toBe(4600);
    expect(f.verdict).toBe('cook');
  });

  it('nông sản không vào được bếp (sữa bò): recipes rỗng, verdict sell', () => {
    const f = farmVsCook('sua_tuoi');
    expect(f.recipes).toHaveLength(0);
    expect(f.best).toBeNull();
    expect(f.verdict).toBe('sell');
  });

  it('trái cây có 5 công thức thường (bỏ giỏ quà 8/3 mùa lễ; GĐ1094 thêm sữa chua dê), best là trà đào cam sả (+35000)', () => {
    const f = farmVsCook('traicay');
    expect(f.recipes).toHaveLength(5);
    expect(f.recipes.map((d) => d.recipe.id).sort())
      .toEqual(['recipe_banh_trang', 'recipe_kem', 'recipe_sinh_to', 'recipe_sua_chua_de', 'recipe_tra_dao']);
    expect(f.best!.recipe.id).toBe('recipe_tra_dao');
    expect(f.best!.homegrownNet).toBe(35000);
    expect(f.verdict).toBe('cook');
  });

  it('không tính món lễ (giỏ quà) vào ranking nấu thường', () => {
    // giỏ quà 8/3 dùng traicay nhưng là món dịp lễ — không được chọn làm best.
    const f = farmVsCook('traicay');
    expect(f.recipes.some((d) => d.recipe.id === 'recipe_gio_83')).toBe(false);
  });
});

describe('farmVsCook verdict sell — best có homegrownNet < 0 (nấu lỗ, nhánh dòng 102)', () => {
  // GĐ1210: trước đây `homegrownRecipeDecision` có <0/==0 nhưng `farmVsCook` mới chạy
  // được 'cook' (best dương) và 'sell' khi RỖNG recipes; nhánh "có best mà best NEGATIVE"
  // chưa ai chạy với dữ liệu THẬT (ngưỡng homegrownSell ×1,2 đẩy vài nông sản phẩm cao
  // sang "bán lẻ hời hơn nấu"). Khóa bằng sản phẩm thật — UI phải nói "bán lẻ" đừng tư vấn nấu.

  it('thit_ga_dt (gà Đông Tảo): bán lẻ hời hơn nấu gà nướng (best -15000) → verdict sell', () => {
    const f = farmVsCook('thit_ga_dt');
    expect(f.recipes).toHaveLength(1);
    expect(f.best!.recipe.id).toBe('recipe_ga_dt_nuong');
    expect(f.best!.homegrownNet).toBeLessThan(0); // -15000 (cơ hội phí bán lẻ nhà trồng vượt doanh thu món)
    expect(f.best!.verdict).toBe('sell');
    expect(f.verdict).toBe('sell');
    // Bán lẻ luôn HớN hơn — không bao giờ tư vấn chế món này.
    expect(f.sellPerUnit).toBe(homegrownSell('thit_ga_dt'));
  });

  it('trung_goos: best âm nhất (-27000 qua bánh flan) → verdict sell', () => {
    const f = farmVsCook('trung_goos');
    expect(f.best!.recipe.id).toBe('recipe_banh_flan');
    expect(f.best!.homegrownNet).toBe(-27000);
    expect(f.verdict).toBe('sell');
  });

  it('x_dua_nao: best âm (-5800 qua xôi đậu) → verdict sell', () => {
    const f = farmVsCook('x_dua_nao');
    expect(f.best!.recipe.id).toBe('recipe_xoi_dua');
    expect(f.best!.homegrownNet).toBe(-5800);
    expect(f.verdict).toBe('sell');
  });
});

describe('cookableProducts', () => {
  it('liệt kê được hết nông sản nhà trồng/nuôi có công thức nấu', () => {
    const ids = cookableProducts();
    for (const p of ['rau', 'bap', 'mia', 'traicay', 'trung']) {
      expect(ids).toContain(p);
    }
    expect(ids).toContain('banhmi');
  });
});

describe('GĐ1140 — farmVsCook lọc theo cấp + trạm đã xây (không tư vấn món chưa nấu được)', () => {
  it('cơm sườn (mở 40): cấp 30 + không trạm → recipes rỗng verdict sell; cấp 45 + trạm mở → cook', () => {
    const noStation = () => false;
    const withGrill = (st: string) => st === 'food_grill';
    expect(farmVsCook('rau', 0, { level: 30, stationOpen: noStation }).verdict).toBe('sell');
    // cấp 30 + grill: cơm sườn (40) bị loại, còn Cơm hộp gà (mở 30) → best là cơm hộp, không phải cơm sườn
    const at30 = farmVsCook('rau', 0, { level: 30, stationOpen: withGrill });
    expect(at30.best!.recipe.id).toBe('recipe_com_hop_ga');
    const full = farmVsCook('rau', 0, { level: 45, stationOpen: withGrill });
    expect(full.best!.recipe.id).toBe('recipe_com_suon');
    expect(full.verdict).toBe('cook');
  });

  it('không truyền opts → hành vi cũ (tất cả công thức, kể cả chưa mở — tương thích test cũ)', () => {
    expect(farmVsCook('rau').best!.recipe.id).toBe('recipe_com_suon');
  });
});
