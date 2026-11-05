import { describe, expect, it } from 'vitest';
import { homegrownDrinkDecision, farmVsDrinks, drinkableProducts, homegrownImpact, orderSellNote } from '../data/farmQuanValue';
import { quanRecipeById, QUAN_RECIPES } from '../data/quanRecipes';
import { productById } from '../data/products';

describe('GĐ1093 — Farm ↔ Quán nước: soi sáng "pha hay bán lẻ" (kết nối nông sản nhà với món pha)', () => {
  it('vải nhà trồng: Trà vải là nơi bõ nhất ở quán — pha hời hơn bán lẻ (verdict brew)', () => {
    const q = farmVsDrinks('x_vai');
    expect(q.best).not.toBeNull();
    expect(q.best!.recipe.id).toBe('tra_vai');
    expect(q.best!.glasses).toBe(4);
    // 1 vải → 4 ly × 20k = 80k; trừ trà/đường/đá theo tỷ lệ ly và cơ hội phí bán lẻ ×1,2 vẫn dương
    expect(q.best!.revenue).toBe(80_000);
    expect(q.best!.otherCost).toBeGreaterThan(0);
    expect(q.best!.homegrownNet).toBeGreaterThan(0);
    expect(q.verdict).toBe('brew');
    // đúng cơ hội phí: homegrownNet = revenue − otherCost − bán lẻ nhà trồng (×1,2)
    expect(q.best!.homegrownNet).toBe(q.best!.revenue - q.best!.otherCost - q.sellPerUnit);
    expect(q.sellPerUnit).toBe(Math.round(productById('x_vai').sell * 1.2));
  });

  it('ổi & chuối nhà trồng: sinh tố tương ứng được nhận diện, pha hời hơn bán lẻ', () => {
    // GĐ1353: thêm Sinh tố yến mạch chuối (30k/ly > sinh_to_chuoi 24k) → chuối nông trại bõ nhất ở món mới
    // (đúng ngữ nghĩa "nơi bõ nhất" của soi sáng farm↔quán — đổi CÓ CHỦ Ý theo nội dung mới).
    for (const [p, mon] of [['x_oi', 'sinh_to_oi'], ['x_chuoi', 'sinh_to_yen_mach_chuoi']] as const) {
      const q = farmVsDrinks(p);
      expect(q.best!.recipe.id).toBe(mon);
      expect(q.verdict).toBe('brew');
    }
  });

  it('mía nhà trồng: Nước mía (quán) và mẻ ép (bếp) đều thấy — drinks không lẫn với bếp', () => {
    const q = farmVsDrinks('mia');
    expect(q.drinks.map((d) => d.recipe.id)).toContain('nuoc_mia');
    // homegrownDrinkDecision trả null cho món không dùng nông sản này
    expect(homegrownDrinkDecision(quanRecipeById('cam_vat')!, 'mia')).toBeNull();
    expect(homegrownDrinkDecision(quanRecipeById('cam_vat')!, 'x_cam')).not.toBeNull();
  });

  it('nông sản không có món pha nào (gạo): drinks rỗng, best null, verdict sell', () => {
    const q = farmVsDrinks('gao');
    expect(q.drinks).toHaveLength(0);
    expect(q.best).toBeNull();
    expect(q.verdict).toBe('sell');
  });

  it('drinkableProducts chứa mọi nông sản trái cây mới (GĐ1088–1092) và không lẫn id lạ', () => {
    const ids = drinkableProducts();
    for (const p of ['x_chanh_day', 'x_cam', 'x_xoai', 'x_vai', 'x_oi', 'x_chuoi', 'mia', 'traicay']) {
      expect(ids).toContain(p);
    }
    // mọi id dùng trong món pha đều là sản phẩm thật
    for (const id of ids) expect(() => productById(id)).not.toThrow();
  });

  it('minUnlock theo đúng quy ước farmVsCook (giữ món unlock ≥ minUnlock): ngưỡng 35 lọc hết sinh tố ổi', () => {
    expect(farmVsDrinks('x_oi', 35).drinks).toHaveLength(0); // sinh_to_oi mở 34 < 35
    expect(farmVsDrinks('x_oi', 34).drinks.map((d) => d.recipe.id)).toContain('sinh_to_oi');
    // mốc golden 30: không món pha mới nào (≥34) mở trước đó → không lệch sim mốc
    expect(QUAN_RECIPES.filter((r) => r.unlock <= 30).map((r) => r.id)).not.toContain('tra_vai');
    expect(QUAN_RECIPES.filter((r) => r.unlock <= 30).map((r) => r.id)).not.toContain('sinh_to_oi');
    expect(QUAN_RECIPES.filter((r) => r.unlock <= 30).map((r) => r.id)).not.toContain('sinh_to_chuoi');
  });
});

describe('GĐ1109 — homegrownImpact: xếp dòng tư vấn theo mức tác động', () => {
  it('vải (pha Trà vải +36k) có impact dương; sản phẩm ngoài bếp/pha (bia) → -Infinity', () => {
    const vai = homegrownImpact('x_vai');
    expect(vai).toBeGreaterThan(0);
    expect(homegrownImpact('bia')).toBe(-Infinity);
  });

  it('món nấu cũng được tính: nếp có xôi (nấu) → impact dương dù không có món pha', () => {
    expect(homegrownImpact('nep')).toBeGreaterThan(0);
  });
});

describe('GĐ1111 — orderSellNote: nhắc đơn quán xóm trên dòng tư vấn', () => {
  const order = { from: 'Quán Chè Bà Tư', items: [{ productId: 'x_vai', qty: 5 }, { productId: 'x_cam', qty: 4 }], bonus: 1.3, dueDay: 10, id: 1 };

  it('đơn chứa nông sản & đủ hàng → ghi chú kèm số lượng và hệ số', () => {
    expect(orderSellNote('x_vai', order, 6)).toBe(' · 📦 Quán Chè Bà Tư mua 5 ×1.3');
  });

  it('không đủ hàng giao / đơn không chứa / không đơn / bonus 1 → chuỗi rỗng', () => {
    expect(orderSellNote('x_vai', order, 4)).toBe('');
    expect(orderSellNote('x_oi', order, 9)).toBe('');
    expect(orderSellNote('x_vai', undefined, 9)).toBe('');
    expect(orderSellNote('x_vai', { ...order, bonus: 1 }, 6)).toBe('');
  });
});

describe('GĐ1139 — farmVsDrinks lọc theo thực đơn quán (không tư vấn pha món không có trên menu)', () => {
  it('menu có tra_vai → tư vấn như cũ; menu khác (sinh_to_oi) → vải verdict sell', () => {
    expect(farmVsDrinks('x_vai', 0, ['tra_vai']).verdict).toBe('brew');
    expect(farmVsDrinks('x_vai', 0, ['sinh_to_oi']).verdict).toBe('sell');
  });

  it('menu rỗng (quán đóng) → không gợi pha; không truyền → hành vi cũ (tất cả món)', () => {
    expect(farmVsDrinks('x_vai', 0, []).verdict).toBe('sell');
    expect(farmVsDrinks('x_vai').verdict).toBe('brew');
  });

  it('homegrownImpact nhận menu: vải với menu tra_vai > 0, với menu khác → chỉ còn lãi bếp (nếu có) hoặc -Inf', () => {
    expect(homegrownImpact('x_vai', ['tra_vai'])).toBeGreaterThan(0);
    expect(homegrownImpact('x_vai', ['sinh_to_oi'])).toBe(-Infinity); // vải không vào bếp nào
  });
});
