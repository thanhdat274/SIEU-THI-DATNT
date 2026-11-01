import { describe, expect, it } from 'vitest';
import {
  homegrownRecipeDecision, farmVsCook, cookableProducts, ingredientQty,
} from '../data/farmKitchenValue';
import { RECIPES } from '../data/recipes';
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

describe('farmVsCook', () => {
  it('rau: best là cơm sườn (+501600), verdict cook', () => {
    const f = farmVsCook('rau');
    expect(f.sellPerUnit).toBe(19200);
    expect(f.best!.recipe.id).toBe('recipe_com_suon');
    expect(f.best!.homegrownNet).toBe(501600);
    expect(f.verdict).toBe('cook');
    // 3 công thức rau: cơm sườn, cơm hộp, canh — sắp lãi giảm dần
    expect(f.recipes.map((d) => d.recipe.id)).toEqual(['recipe_com_suon', 'recipe_com_hop_ga', 'recipe_canh']);
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

  it('trái cây có 4 công thức thường (bỏ giỏ quà 8/3 mùa lễ), best là trà đào cam sả (+35000)', () => {
    const f = farmVsCook('traicay');
    expect(f.recipes).toHaveLength(4);
    expect(f.recipes.map((d) => d.recipe.id).sort())
      .toEqual(['recipe_banh_trang', 'recipe_kem', 'recipe_sinh_to', 'recipe_tra_dao']);
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

describe('cookableProducts', () => {
  it('liệt kê được hết nông sản nhà trồng/nuôi có công thức nấu', () => {
    const ids = cookableProducts();
    for (const p of ['rau', 'bap', 'mia', 'traicay', 'trung']) {
      expect(ids).toContain(p);
    }
    expect(ids).toContain('banhmi');
  });
});
